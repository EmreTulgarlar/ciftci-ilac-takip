import os
import json
import time
import sqlite3
import datetime
import math
import hashlib
import uuid
import threading
import smtplib
from email.mime.text import MIMEText
from email.header import Header
from flask import Flask, jsonify, request, send_from_directory

app = Flask(__name__, static_folder='.', static_url_path='')

DB_FILE = 'tarim_takip.db'

# Initialize SQLite database with multi-user tables
def init_db():
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    
    # Drop existing table if it is single-user (does not contain user_id column)
    c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='sprays'")
    if c.fetchone():
        c.execute("PRAGMA table_info(sprays)")
        columns = [col[1] for col in c.fetchall()]
        if 'user_id' not in columns:
            print("Single-user database structure detected. Migration: Dropping old sprays table to create multi-user structure...")
            c.execute("DROP TABLE sprays")
            
    c.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            salt TEXT NOT NULL,
            name TEXT
        )
    ''')
    
    c.execute('''
        CREATE TABLE IF NOT EXISTS user_settings (
            user_id TEXT PRIMARY KEY,
            smtp_server TEXT,
            smtp_port INTEGER,
            smtp_username TEXT,
            smtp_password TEXT,
            recipient_email TEXT,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    ''')
    
    c.execute('''
        CREATE TABLE IF NOT EXISTS sessions (
            token TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    ''')
    
    c.execute('''
        CREATE TABLE IF NOT EXISTS sprays (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            crop TEXT NOT NULL,
            pesticide TEXT NOT NULL,
            date TEXT NOT NULL,
            duration INTEGER NOT NULL,
            phi INTEGER NOT NULL,
            dosage TEXT,
            pest TEXT,
            notes TEXT,
            emailed_protection INTEGER DEFAULT 0,
            emailed_harvest INTEGER DEFAULT 0,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    ''')
    conn.commit()
    conn.close()

# Password cryptography helpers
def hash_password(password, salt=None):
    if salt is None:
        salt = uuid.uuid4().hex
    dk = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt.encode('utf-8'), 100000)
    return dk.hex(), salt

def verify_password(password, password_hash, salt):
    h, _ = hash_password(password, salt)
    return h == password_hash

def generate_token():
    return uuid.uuid4().hex + uuid.uuid4().hex

# Middleware to resolve user session
def get_user_from_request():
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return None
    token = auth_header.split(' ')[1]
    
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute('SELECT user_id FROM sessions WHERE token = ?', (token,))
    row = c.fetchone()
    conn.close()
    
    if row:
        return row['user_id']
    return None

# Email sending utility
def send_email(subject, body, config):
    if not config.get('smtp_username') or not config.get('recipient_email'):
        return False
    try:
        msg = MIMEText(body, 'plain', 'utf-8')
        msg['Subject'] = Header(subject, 'utf-8')
        msg['From'] = config['smtp_username']
        msg['To'] = config['recipient_email']
        
        server = smtplib.SMTP(config['smtp_server'], int(config['smtp_port']))
        server.starttls()
        server.login(config['smtp_username'], config['smtp_password'])
        server.sendmail(config['smtp_username'], [config['recipient_email']], msg.as_string())
        server.quit()
        print(f"Email sent successfully to {config['recipient_email']}: {subject}")
        return True
    except Exception as e:
        print(f"Email sending failed: {e}")
        return False

# Background checker thread logic (multi-user customized emails)
def check_sprays_loop():
    while True:
        try:
            conn = sqlite3.connect(DB_FILE)
            conn.row_factory = sqlite3.Row
            c = conn.cursor()
            
            # Query sprays along with their user settings
            c.execute('''
                SELECT s.*, us.smtp_server, us.smtp_port, us.smtp_username, us.smtp_password, us.recipient_email
                FROM sprays s
                JOIN user_settings us ON s.user_id = us.user_id
            ''')
            rows = c.fetchall()
            
            now = datetime.datetime.now()
            updated = False
            
            for row in rows:
                # If email configuration is missing, skip
                if not row['smtp_username'] or not row['recipient_email']:
                    continue
                    
                config = {
                    "smtp_server": row['smtp_server'],
                    "smtp_port": row['smtp_port'],
                    "smtp_username": row['smtp_username'],
                    "smtp_password": row['smtp_password'],
                    "recipient_email": row['recipient_email']
                }
                
                spray_time = datetime.datetime.fromisoformat(row['date'])
                duration_days = datetime.timedelta(days=row['duration'])
                phi_days = datetime.timedelta(days=row['phi'])
                
                protection_end_time = spray_time + duration_days
                harvest_safety_end_time = spray_time + phi_days
                
                protection_expired = now >= protection_end_time
                harvest_safe = now >= harvest_safety_end_time
                
                # Check protection expiry
                if protection_expired and row['emailed_protection'] == 0:
                    subject = f"⚠️ TarımTakip Uyarı: {row['pesticide']} Etki Süresi Doldu!"
                    body = (
                        f"Merhaba,\n\n"
                        f"Aşağıdaki ilaçlama kaydına ait pestisit koruma etki süresi sona ermiştir:\n\n"
                        f"• Uygulanan Ürün: {row['crop']}\n"
                        f"• Kullanılan İlaç: {row['pesticide']}\n"
                        f"• İlaçlama Tarihi: {row['date']}\n"
                        f"• Etki Süresi: {row['duration']} Gün\n"
                        f"• Koruması Bittiği Tarih: {protection_end_time.strftime('%d.%m.%Y %H:%M')}\n\n"
                        f"Tarlanızda zararlı kontrolü yapmanız ve gerekirse tekrar ilaçlama planlamanız önerilir.\n\n"
                        f"Bereketli günler dileriz,\nTarımTakip Sistemi"
                    )
                    if send_email(subject, body, config):
                        c.execute('UPDATE sprays SET emailed_protection = 1 WHERE id = ?', (row['id'],))
                        updated = True
                        
                # Check harvest safety wait expiration
                if harvest_safe and row['emailed_harvest'] == 0 and row['phi'] > 0:
                    subject = f"✅ TarımTakip Bildirim: {row['crop']} Hasadı Artık Güvenli!"
                    body = (
                        f"Merhaba,\n\n"
                        f"Aşağıdaki ürünün son ilaçlamasından sonra geçmesi gereken hasat bekleme süresi (kalıntı riski) sona ermiştir:\n\n"
                        f"• Uygulanan Ürün: {row['crop']}\n"
                        f"• Kullanılan İlaç: {row['pesticide']}\n"
                        f"• İlaçlama Tarihi: {row['date']}\n"
                        f"• Hasat Bekleme Süresi (PHI): {row['phi']} Gün\n"
                        f"• Güvenli Hasat Tarihi: {harvest_safety_end_time.strftime('%d.%m.%Y %H:%M')}\n\n"
                        f"Ürününüzü kalıntı riski olmadan güvenle hasat edip satışa sunabilirsiniz.\n\n"
                        f"Bereketli günler ve iyi hasatlar dileriz,\nTarımTakip Sistemi"
                    )
                    if send_email(subject, body, config):
                        c.execute('UPDATE sprays SET emailed_harvest = 1 WHERE id = ?', (row['id'],))
                        updated = True
                        
            if updated:
                conn.commit()
            conn.close()
        except Exception as e:
            print(f"Background check error: {e}")
            
        time.sleep(300) # Check every 5 minutes

# API Routes
@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

# Authentication API Routes
@app.route('/api/auth/register', methods=['POST'])
def register():
    data = request.json
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')
    name = data.get('name', '').strip()
    
    if not email or not password or not name:
        return jsonify({"status": "error", "message": "Ad soyad, e-posta ve şifre alanları zorunludur."}), 400
        
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    
    # Check if email is already taken
    c.execute('SELECT id FROM users WHERE email = ?', (email,))
    if c.fetchone():
        conn.close()
        return jsonify({"status": "error", "message": "Bu e-posta adresiyle kayıtlı bir kullanıcı zaten var."}), 400
        
    user_id = 'user-' + uuid.uuid4().hex[:12]
    password_hash, salt = hash_password(password)
    
    try:
        c.execute('''
            INSERT INTO users (id, email, password_hash, salt, name)
            VALUES (?, ?, ?, ?, ?)
        ''', (user_id, email, password_hash, salt, name))
        
        # Initialize default settings for user
        c.execute('''
            INSERT INTO user_settings (user_id, smtp_server, smtp_port, smtp_username, smtp_password, recipient_email)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (user_id, 'smtp.gmail.com', 587, '', '', ''))
        
        conn.commit()
    except Exception as e:
        conn.close()
        return jsonify({"status": "error", "message": f"Kayıt başarısız: {e}"}), 500
        
    conn.close()
    return jsonify({"status": "success", "message": "Kullanıcı kaydı başarıyla oluşturuldu."})

@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.json
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')
    
    if not email or not password:
        return jsonify({"status": "error", "message": "E-posta ve şifre alanları zorunludur."}), 400
        
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute('SELECT * FROM users WHERE email = ?', (email,))
    user = c.fetchone()
    
    if not user or not verify_password(password, user['password_hash'], user['salt']):
        conn.close()
        return jsonify({"status": "error", "message": "E-posta adresi veya şifre hatalı."}), 401
        
    token = generate_token()
    created_at = datetime.datetime.now().isoformat()
    
    try:
        c.execute('INSERT INTO sessions (token, user_id, created_at) VALUES (?, ?, ?)', (token, user['id'], created_at))
        conn.commit()
    except Exception as e:
        conn.close()
        return jsonify({"status": "error", "message": f"Giriş sırasında hata: {e}"}), 500
        
    conn.close()
    return jsonify({
        "status": "success",
        "token": token,
        "user": {
            "id": user['id'],
            "email": user['email'],
            "name": user['name']
        }
    })

@app.route('/api/auth/logout', methods=['POST'])
def logout():
    auth_header = request.headers.get('Authorization')
    if auth_header and auth_header.startswith('Bearer '):
        token = auth_header.split(' ')[1]
        conn = sqlite3.connect(DB_FILE)
        c = conn.cursor()
        c.execute('DELETE FROM sessions WHERE token = ?', (token,))
        conn.commit()
        conn.close()
    return jsonify({"status": "success", "message": "Başarıyla çıkış yapıldı."})

@app.route('/api/auth/me', methods=['GET'])
def get_me():
    user_id = get_user_from_request()
    if not user_id:
        return jsonify({"status": "error", "message": "Oturumunuz sona ermiş."}), 401
        
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute('SELECT email, name FROM users WHERE id = ?', (user_id,))
    user = c.fetchone()
    conn.close()
    
    if user:
        return jsonify({
            "status": "success",
            "user": {
                "id": user_id,
                "email": user['email'],
                "name": user['name']
            }
        })
    return jsonify({"status": "error", "message": "Kullanıcı bulunamadı."}), 404

# User Scoped Sprays API
@app.route('/api/sprays', methods=['GET'])
def get_sprays():
    user_id = get_user_from_request()
    if not user_id:
        return jsonify({"status": "error", "message": "Oturum açılması gerekiyor."}), 401
        
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute('SELECT * FROM sprays WHERE user_id = ?', (user_id,))
    rows = c.fetchall()
    conn.close()
    
    sprays_list = []
    for r in rows:
        sprays_list.append({
            'id': r['id'],
            'crop': r['crop'],
            'pesticide': r['pesticide'],
            'date': r['date'],
            'duration': r['duration'],
            'phi': r['phi'],
            'dosage': r['dosage'],
            'pest': r['pest'],
            'notes': r['notes']
        })
    return jsonify(sprays_list)

@app.route('/api/sprays', methods=['POST'])
def add_spray():
    user_id = get_user_from_request()
    if not user_id:
        return jsonify({"status": "error", "message": "Oturum açılması gerekiyor."}), 401
        
    data = request.json
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute('''
        INSERT INTO sprays (id, user_id, crop, pesticide, date, duration, phi, dosage, pest, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        data['id'],
        user_id,
        data['crop'],
        data['pesticide'],
        data['date'],
        int(data['duration']),
        int(data['phi']),
        data.get('dosage', ''),
        data.get('pest', ''),
        data.get('notes', '')
    ))
    conn.commit()
    conn.close()
    return jsonify({"status": "success", "message": "İlaçlama kaydı başarıyla oluşturuldu."})

@app.route('/api/sprays/<spray_id>', methods=['PUT'])
def update_spray(spray_id):
    user_id = get_user_from_request()
    if not user_id:
        return jsonify({"status": "error", "message": "Oturum açılması gerekiyor."}), 401
        
    data = request.json
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    
    # Verify owner
    c.execute('SELECT id FROM sprays WHERE id = ? AND user_id = ?', (spray_id, user_id))
    if not c.fetchone():
        conn.close()
        return jsonify({"status": "error", "message": "Bu kaydı güncellemeye yetkiniz yok."}), 403
        
    c.execute('''
        UPDATE sprays
        SET crop = ?, pesticide = ?, date = ?, duration = ?, phi = ?, dosage = ?, pest = ?, notes = ?,
            emailed_protection = 0, emailed_harvest = 0
        WHERE id = ? AND user_id = ?
    ''', (
        data['crop'],
        data['pesticide'],
        data['date'],
        int(data['duration']),
        int(data['phi']),
        data.get('dosage', ''),
        data.get('pest', ''),
        data.get('notes', ''),
        spray_id,
        user_id
    ))
    conn.commit()
    conn.close()
    return jsonify({"status": "success", "message": "İlaçlama kaydı başarıyla güncellendi."})

@app.route('/api/sprays/<spray_id>', methods=['DELETE'])
def delete_spray(spray_id):
    user_id = get_user_from_request()
    if not user_id:
        return jsonify({"status": "error", "message": "Oturum açılması gerekiyor."}), 401
        
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    
    # Verify owner
    c.execute('SELECT id FROM sprays WHERE id = ? AND user_id = ?', (spray_id, user_id))
    if not c.fetchone():
        conn.close()
        return jsonify({"status": "error", "message": "Bu kaydı silmeye yetkiniz yok."}), 403
        
    c.execute('DELETE FROM sprays WHERE id = ? AND user_id = ?', (spray_id, user_id))
    conn.commit()
    conn.close()
    return jsonify({"status": "success", "message": "İlaçlama kaydı başarıyla silindi."})

# User Scoped Settings API
@app.route('/api/settings', methods=['GET'])
def get_settings():
    user_id = get_user_from_request()
    if not user_id:
        return jsonify({"status": "error", "message": "Oturum açılması gerekiyor."}), 401
        
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute('SELECT * FROM user_settings WHERE user_id = ?', (user_id,))
    row = c.fetchone()
    conn.close()
    
    config = {
        "smtp_server": "smtp.gmail.com",
        "smtp_port": 587,
        "smtp_username": "",
        "smtp_password": "",
        "recipient_email": ""
    }
    
    if row:
        config = {
            "smtp_server": row['smtp_server'] or 'smtp.gmail.com',
            "smtp_port": row['smtp_port'] or 587,
            "smtp_username": row['smtp_username'] or '',
            "smtp_password": row['smtp_password'] or '',
            "recipient_email": row['recipient_email'] or ''
        }
        
    # Mask password for security
    masked_config = config.copy()
    if masked_config['smtp_password']:
        masked_config['smtp_password'] = '••••••••••••'
    return jsonify(masked_config)

@app.route('/api/settings', methods=['POST'])
def save_settings():
    user_id = get_user_from_request()
    if not user_id:
        return jsonify({"status": "error", "message": "Oturum açılması gerekiyor."}), 401
        
    new_settings = request.json
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    
    c.execute('SELECT smtp_password FROM user_settings WHERE user_id = ?', (user_id,))
    row = c.fetchone()
    
    password = new_settings.get('smtp_password')
    if password == '••••••••••••' and row:
        password = row['smtp_password']
        
    c.execute('''
        INSERT OR REPLACE INTO user_settings (user_id, smtp_server, smtp_port, smtp_username, smtp_password, recipient_email)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (
        user_id,
        new_settings.get('smtp_server', 'smtp.gmail.com'),
        int(new_settings.get('smtp_port', 587)),
        new_settings.get('smtp_username', ''),
        password,
        new_settings.get('recipient_email', '')
    ))
    conn.commit()
    conn.close()
    return jsonify({"status": "success", "message": "E-posta ayarları başarıyla kaydedildi."})

@app.route('/api/test-email', methods=['POST'])
def test_email():
    user_id = get_user_from_request()
    if not user_id:
        return jsonify({"status": "error", "message": "Oturum açılması gerekiyor."}), 401
        
    config = request.json
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute('SELECT smtp_password FROM user_settings WHERE user_id = ?', (user_id,))
    row = c.fetchone()
    conn.close()
    
    if config.get('smtp_password') == '••••••••••••' and row:
        config['smtp_password'] = row['smtp_password']
        
    subject = "🧪 TarımTakip - Çoklu Kullanıcı E-posta Testi"
    body = "Tebrikler! TarımTakip e-posta bildirim ayarlarınız başarıyla kurulmuştur. İlaç etki süreleriniz bittiğinde veya hasat güvenli hale geldiğinde bu adrese otomatik uyarılar alacaksınız."
    
    success = send_email(subject, body, config)
    if success:
        return jsonify({"status": "success", "message": "Test maili başarıyla gönderildi!"})
    else:
        return jsonify({"status": "error", "message": "Test maili gönderilemedi. Lütfen bilgilerinizi kontrol edin."})

if __name__ == '__main__':
    init_db()
    
    # Start background checker thread
    checker = threading.Thread(target=check_sprays_loop, daemon=True)
    checker.start()
    
    print("TarımTakip Multi-User Flask Backend started on http://127.0.0.1:5000")
    app.run(host='127.0.0.1', port=5000, debug=False)
