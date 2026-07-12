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
import requests
from email.mime.text import MIMEText
from email.header import Header
from flask import Flask, jsonify, request, send_from_directory

app = Flask(__name__, static_folder='.', static_url_path='')

DB_FILE = 'tarim_takip.db'

# Designated admin email addresses
ADMIN_EMAILS = [
    'admin@tarimtakip.com',
    'admin@example.com',
    'emretulgarlar@gmail.com'
]

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
            name TEXT,
            farm_type TEXT DEFAULT 'Belirtilmedi',
            location TEXT DEFAULT 'Belirtilmedi'
        )
    ''')
    
    # Migration checks for existing databases
    c.execute("PRAGMA table_info(users)")
    user_columns = [col[1] for col in c.fetchall()]
    if 'farm_type' not in user_columns:
        print("Migration: Adding farm_type column to users table...")
        c.execute("ALTER TABLE users ADD COLUMN farm_type TEXT DEFAULT 'Belirtilmedi'")
    if 'location' not in user_columns:
        print("Migration: Adding location column to users table...")
        c.execute("ALTER TABLE users ADD COLUMN location TEXT DEFAULT 'Belirtilmedi'")
        
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
            pesticide_cost REAL DEFAULT 0.0,
            emailed_protection INTEGER DEFAULT 0,
            emailed_harvest INTEGER DEFAULT 0,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    ''')
    
    c.execute("PRAGMA table_info(sprays)")
    spray_columns = [col[1] for col in c.fetchall()]
    if 'pesticide_cost' not in spray_columns:
        print("Migration: Adding pesticide_cost column to sprays table...")
        c.execute("ALTER TABLE sprays ADD COLUMN pesticide_cost REAL DEFAULT 0.0")
        
    c.execute('''
        CREATE TABLE IF NOT EXISTS irrigations (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            date TEXT NOT NULL,
            water_amount REAL DEFAULT 0.0,
            water_cost REAL DEFAULT 0.0,
            notes TEXT,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    ''')
    
    c.execute('''
        CREATE TABLE IF NOT EXISTS other_expenses (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            title TEXT NOT NULL,
            category TEXT NOT NULL,
            amount REAL NOT NULL,
            date TEXT NOT NULL,
            notes TEXT,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    ''')
    
    c.execute('''
        CREATE TABLE IF NOT EXISTS fertilizations (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            crop TEXT NOT NULL,
            fertilizer_name TEXT NOT NULL,
            amount REAL NOT NULL,
            cost REAL DEFAULT 0.0,
            date TEXT NOT NULL,
            notes TEXT,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    ''')
    
    c.execute('''
        CREATE TABLE IF NOT EXISTS fields (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            name TEXT NOT NULL,
            farm_type TEXT NOT NULL,
            location TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    ''')
    
    # Migrations: Add field_id to sprays, irrigations, fertilizations, other_expenses
    for table_name in ['sprays', 'irrigations', 'fertilizations', 'other_expenses']:
        c.execute(f"PRAGMA table_info({table_name})")
        cols = [col[1] for col in c.fetchall()]
        if 'field_id' not in cols:
            print(f"Migration: Adding field_id column to {table_name} table...")
            c.execute(f"ALTER TABLE {table_name} ADD COLUMN field_id TEXT")
            
    # For every user in the system, if they have no fields, create a default field and bind existing rows
    c.execute("SELECT id, farm_type, location FROM users")
    all_users = c.fetchall()
    for u_id, farm_type, location in all_users:
        c.execute("SELECT id FROM fields WHERE user_id = ?", (u_id,))
        if not c.fetchone():
            default_field_id = f"field-default-{u_id[:8]}-{uuid.uuid4().hex[:6]}"
            f_type = farm_type or "Zeytin"
            loc = location or "Manisa"
            c.execute("INSERT INTO fields (id, user_id, name, farm_type, location) VALUES (?, ?, ?, ?, ?)",
                      (default_field_id, u_id, "Varsayılan Tarla", f_type, loc))
            
            # Now link existing data for this user to this default field
            for table_name in ['sprays', 'irrigations', 'fertilizations', 'other_expenses']:
                c.execute(f"UPDATE {table_name} SET field_id = ? WHERE user_id = ? AND (field_id IS NULL OR field_id = '')", (default_field_id, u_id))
    
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

# Admin check helper
def is_admin_user(user_id):
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute('SELECT email FROM users WHERE id = ?', (user_id,))
    row = c.fetchone()
    conn.close()
    if row and row['email'] in ADMIN_EMAILS:
        return True
    return False

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
            
            c.execute('''
                SELECT s.*, us.smtp_server, us.smtp_port, us.smtp_username, us.smtp_password, us.recipient_email
                FROM sprays s
                JOIN user_settings us ON s.user_id = us.user_id
            ''')
            rows = c.fetchall()
            
            now = datetime.datetime.now()
            updated = False
            
            for row in rows:
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
            
        time.sleep(300)

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
    farm_type = data.get('farm_type', 'Belirtilmedi').strip()
    location = data.get('location', 'Belirtilmedi').strip()
    
    if not email or not password or not name:
        return jsonify({"status": "error", "message": "Ad soyad, e-posta ve şifre alanları zorunludur."}), 400
        
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    
    c.execute('SELECT id FROM users WHERE email = ?', (email,))
    if c.fetchone():
        conn.close()
        return jsonify({"status": "error", "message": "Bu e-posta adresiyle kayıtlı bir kullanıcı zaten var."}), 400
        
    user_id = 'user-' + uuid.uuid4().hex[:12]
    password_hash, salt = hash_password(password)
    
    try:
        c.execute('''
            INSERT INTO users (id, email, password_hash, salt, name, farm_type, location)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (user_id, email, password_hash, salt, name, farm_type, location))
        
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
            "name": user['name'],
            "farm_type": user['farm_type'],
            "location": user['location'],
            "is_admin": user['email'] in ADMIN_EMAILS
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
    c.execute('SELECT email, name, farm_type, location FROM users WHERE id = ?', (user_id,))
    user = c.fetchone()
    conn.close()
    
    if user:
        return jsonify({
            "status": "success",
            "user": {
                "id": user_id,
                "email": user['email'],
                "name": user['name'],
                "farm_type": user['farm_type'],
                "location": user['location'],
                "is_admin": user['email'] in ADMIN_EMAILS
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
    
    field_id = request.args.get('field_id')
    if field_id and field_id != 'all':
        c.execute('SELECT * FROM sprays WHERE user_id = ? AND field_id = ?', (user_id, field_id))
    else:
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
            'notes': r['notes'],
            'pesticide_cost': r['pesticide_cost'],
            'field_id': r.get('field_id', '')
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
        INSERT INTO sprays (id, user_id, crop, pesticide, date, duration, phi, dosage, pest, notes, pesticide_cost, field_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        data.get('notes', ''),
        float(data.get('pesticide_cost', 0.0) or 0.0),
        data.get('field_id', '')
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
        SET crop = ?, pesticide = ?, date = ?, duration = ?, phi = ?, dosage = ?, pest = ?, notes = ?, pesticide_cost = ?,
            emailed_protection = 0, emailed_harvest = 0, field_id = ?
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
        float(data.get('pesticide_cost', 0.0) or 0.0),
        data.get('field_id', ''),
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

# Live Weather Checking API
@app.route('/api/weather/check', methods=['GET'])
def check_weather():
    user_id = get_user_from_request()
    if not user_id:
        return jsonify({"status": "error", "message": "Oturum açılması gerekiyor."}), 401
        
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    field_id = request.args.get('field_id')
    location = None
    if field_id and field_id != 'all':
        c.execute('SELECT location FROM fields WHERE id = ? AND user_id = ?', (field_id, user_id))
        field = c.fetchone()
        if field:
            location = field['location']
            
    if not location:
        c.execute('SELECT location FROM users WHERE id = ?', (user_id,))
        user = c.fetchone()
        if user and user['location'] and user['location'] != 'Belirtilmedi':
            location = user['location']
            
    conn.close()
    
    if not location:
        return jsonify({"status": "error", "message": "Konum bilgisi girilmemiş."}), 400
    
    try:
        headers = {"Accept-Language": "tr"}
        url = f"https://wttr.in/{location}?format=j1"
        res = requests.get(url, headers=headers, timeout=3)
        if res.status_code == 200:
            data = res.json()
            current = data.get('current_condition', [{}])[0]
            temp = current.get('temp_C', 'N/A')
            
            desc = 'Bilinmiyor'
            lang_tr = current.get('lang_tr', [])
            if lang_tr and lang_tr[0].get('value'):
                desc = lang_tr[0]['value']
            else:
                weatherDesc = current.get('weatherDesc', [])
                if weatherDesc:
                    desc = weatherDesc[0].get('value', 'Bilinmiyor')
                    
            precip = float(current.get('precipMM', '0.0'))
            has_rained = precip > 0.5
            
            # Formulate recommendation
            if has_rained:
                recommendation = "Bugün yağmur yağdı! Toprak nemli, sulamayı erteleyerek su tasarrufu yapabilirsiniz."
            elif "yağmur" in desc.lower() or "sağanak" in desc.lower() or precip > 0.1:
                recommendation = "Hava yağışlı görünüyor, sulama yapmanıza gerek olmayabilir."
            else:
                recommendation = "Bölgenizde yağış görünmüyor. Ürünlerinizin gelişimine göre sulama yapılması önerilir."
                
            return jsonify({
                "status": "success",
                "location": location,
                "temp": temp,
                "desc": desc,
                "precip": precip,
                "has_rained": has_rained,
                "recommendation": recommendation
            })
    except Exception as e:
        print(f"Weather API error: {e}")
        
    # Fallback response in case API fails
    return jsonify({
        "status": "error",
        "message": f"Hava durumu verisi {location} için şu an alınamadı."
    }), 500

# Irrigation CRUD APIs
@app.route('/api/irrigations', methods=['GET'])
def get_irrigations():
    user_id = get_user_from_request()
    if not user_id:
        return jsonify({"status": "error", "message": "Oturum açılması gerekiyor."}), 401
        
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    
    field_id = request.args.get('field_id')
    if field_id and field_id != 'all':
        c.execute('SELECT * FROM irrigations WHERE user_id = ? AND field_id = ? ORDER BY date DESC', (user_id, field_id))
    else:
        c.execute('SELECT * FROM irrigations WHERE user_id = ? ORDER BY date DESC', (user_id,))
        
    rows = c.fetchall()
    conn.close()
    
    irr_list = []
    for r in rows:
        irr_list.append({
            'id': r['id'],
            'date': r['date'],
            'water_amount': r['water_amount'],
            'water_cost': r['water_cost'],
            'notes': r['notes'],
            'field_id': r.get('field_id', '')
        })
    return jsonify(irr_list)

@app.route('/api/irrigations', methods=['POST'])
def add_irrigation():
    user_id = get_user_from_request()
    if not user_id:
        return jsonify({"status": "error", "message": "Oturum açılması gerekiyor."}), 401
        
    data = request.json
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute('''
        INSERT INTO irrigations (id, user_id, date, water_amount, water_cost, notes, field_id)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ''', (
        data['id'],
        user_id,
        data['date'],
        float(data.get('water_amount', 0.0) or 0.0),
        float(data.get('water_cost', 0.0) or 0.0),
        data.get('notes', ''),
        data.get('field_id', '')
    ))
    conn.commit()
    conn.close()
    return jsonify({"status": "success", "message": "Sulama kaydı oluşturuldu."})

@app.route('/api/irrigations/<irr_id>', methods=['PUT'])
def update_irrigation(irr_id):
    user_id = get_user_from_request()
    if not user_id:
        return jsonify({"status": "error", "message": "Oturum açılması gerekiyor."}), 401
        
    data = request.json
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    
    # Verify owner
    c.execute('SELECT id FROM irrigations WHERE id = ? AND user_id = ?', (irr_id, user_id))
    if not c.fetchone():
        conn.close()
        return jsonify({"status": "error", "message": "Bu kaydı düzenlemeye yetkiniz yok."}), 403
        
    c.execute('''
        UPDATE irrigations
        SET date = ?, water_amount = ?, water_cost = ?, notes = ?, field_id = ?
        WHERE id = ? AND user_id = ?
    ''', (
        data['date'],
        float(data.get('water_amount', 0.0) or 0.0),
        float(data.get('water_cost', 0.0) or 0.0),
        data.get('notes', ''),
        data.get('field_id', ''),
        irr_id,
        user_id
    ))
    conn.commit()
    conn.close()
    return jsonify({"status": "success", "message": "Sulama kaydı güncellendi."})

@app.route('/api/irrigations/<irr_id>', methods=['DELETE'])
def delete_irrigation(irr_id):
    user_id = get_user_from_request()
    if not user_id:
        return jsonify({"status": "error", "message": "Oturum açılması gerekiyor."}), 401
        
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    
    # Verify owner
    c.execute('SELECT id FROM irrigations WHERE id = ? AND user_id = ?', (irr_id, user_id))
    if not c.fetchone():
        conn.close()
        return jsonify({"status": "error", "message": "Bu kaydı silmeye yetkiniz yok."}), 403
        
    c.execute('DELETE FROM irrigations WHERE id = ? AND user_id = ?', (irr_id, user_id))
    conn.commit()
    conn.close()
    return jsonify({"status": "success", "message": "Sulama kaydı silindi."})

# Other Expenses (Harici Maliyetler) CRUD APIs
@app.route('/api/other-expenses', methods=['GET'])
def get_other_expenses():
    user_id = get_user_from_request()
    if not user_id:
        return jsonify({"status": "error", "message": "Oturum açılması gerekiyor."}), 401
        
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    
    field_id = request.args.get('field_id')
    if field_id and field_id != 'all':
        c.execute('SELECT * FROM other_expenses WHERE user_id = ? AND field_id = ? ORDER BY date DESC', (user_id, field_id))
    else:
        c.execute('SELECT * FROM other_expenses WHERE user_id = ? ORDER BY date DESC', (user_id,))
        
    rows = c.fetchall()
    conn.close()
    
    exp_list = []
    for r in rows:
        exp_list.append({
            'id': r['id'],
            'title': r['title'],
            'category': r['category'],
            'amount': r['amount'],
            'date': r['date'],
            'notes': r['notes'],
            'field_id': r.get('field_id', '')
        })
    return jsonify(exp_list)

@app.route('/api/other-expenses', methods=['POST'])
def add_other_expense():
    user_id = get_user_from_request()
    if not user_id:
        return jsonify({"status": "error", "message": "Oturum açılması gerekiyor."}), 401
        
    data = request.json
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute('''
        INSERT INTO other_expenses (id, user_id, title, category, amount, date, notes, field_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        data['id'],
        user_id,
        data['title'],
        data['category'],
        float(data['amount']),
        data['date'],
        data.get('notes', ''),
        data.get('field_id', '')
    ))
    conn.commit()
    conn.close()
    return jsonify({"status": "success", "message": "Gider kaydı başarıyla oluşturuldu."})

@app.route('/api/other-expenses/<exp_id>', methods=['PUT'])
def update_other_expense(exp_id):
    user_id = get_user_from_request()
    if not user_id:
        return jsonify({"status": "error", "message": "Oturum açılması gerekiyor."}), 401
        
    data = request.json
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    
    # Verify owner
    c.execute('SELECT id FROM other_expenses WHERE id = ? AND user_id = ?', (exp_id, user_id))
    if not c.fetchone():
        conn.close()
        return jsonify({"status": "error", "message": "Bu kaydı düzenlemeye yetkiniz yok."}), 403
        
    c.execute('''
        UPDATE other_expenses
        SET title = ?, category = ?, amount = ?, date = ?, notes = ?, field_id = ?
        WHERE id = ? AND user_id = ?
    ''', (
        data['title'],
        data['category'],
        float(data['amount']),
        data['date'],
        data.get('notes', ''),
        data.get('field_id', ''),
        exp_id,
        user_id
    ))
    conn.commit()
    conn.close()
    return jsonify({"status": "success", "message": "Gider kaydı güncellendi."})

@app.route('/api/other-expenses/<exp_id>', methods=['DELETE'])
def delete_other_expense(exp_id):
    user_id = get_user_from_request()
    if not user_id:
        return jsonify({"status": "error", "message": "Oturum açılması gerekiyor."}), 401
        
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    
    # Verify owner
    c.execute('SELECT id FROM other_expenses WHERE id = ? AND user_id = ?', (exp_id, user_id))
    if not c.fetchone():
        conn.close()
        return jsonify({"status": "error", "message": "Bu kaydı silmeye yetkiniz yok."}), 403
        
    c.execute('DELETE FROM other_expenses WHERE id = ? AND user_id = ?', (exp_id, user_id))
    conn.commit()
    conn.close()
    return jsonify({"status": "success", "message": "Gider kaydı silindi."})

# Raw expenses payload for frontend graphing (instant customizable filtering & grouping)
@app.route('/api/expenses/raw', methods=['GET'])
def get_raw_expenses():
    user_id = get_user_from_request()
    if not user_id:
        return jsonify({"status": "error", "message": "Oturum açılması gerekiyor."}), 401
        
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    
    field_id = request.args.get('field_id')
    if field_id and field_id != 'all':
        # Fetch sprays with cost
        c.execute('SELECT date, pesticide_cost, pesticide FROM sprays WHERE user_id = ? AND field_id = ? AND pesticide_cost > 0', (user_id, field_id))
        sprays = [{"date": r["date"], "amount": r["pesticide_cost"], "type": "pesticide", "name": r["pesticide"]} for r in c.fetchall()]
        
        # Fetch irrigations with cost
        c.execute('SELECT date, water_cost, water_amount FROM irrigations WHERE user_id = ? AND field_id = ? AND water_cost > 0', (user_id, field_id))
        irrigations = [{"date": r["date"], "amount": r["water_cost"], "type": "water", "name": f"{r['water_amount']} Ton Sulama"} for r in c.fetchall()]
        
        # Fetch other expenses
        c.execute('SELECT date, amount, title, category FROM other_expenses WHERE user_id = ? AND field_id = ?', (user_id, field_id))
        other = [{"date": r["date"], "amount": r["amount"], "type": "other", "name": f"{r['title']} ({r['category']})"} for r in c.fetchall()]
        
        # Fetch fertilizations with cost
        c.execute('SELECT date, cost, fertilizer_name, amount FROM fertilizations WHERE user_id = ? AND field_id = ? AND cost > 0', (user_id, field_id))
        fertilizations = [{"date": r["date"], "amount": r["cost"], "type": "fertilizer", "name": f"{r['amount']} kg/lt {r['fertilizer_name']}"} for r in c.fetchall()]
    else:
        # Fetch sprays with cost
        c.execute('SELECT date, pesticide_cost, pesticide FROM sprays WHERE user_id = ? AND pesticide_cost > 0', (user_id,))
        sprays = [{"date": r["date"], "amount": r["pesticide_cost"], "type": "pesticide", "name": r["pesticide"]} for r in c.fetchall()]
        
        # Fetch irrigations with cost
        c.execute('SELECT date, water_cost, water_amount FROM irrigations WHERE user_id = ? AND water_cost > 0', (user_id,))
        irrigations = [{"date": r["date"], "amount": r["water_cost"], "type": "water", "name": f"{r['water_amount']} Ton Sulama"} for r in c.fetchall()]
        
        # Fetch other expenses
        c.execute('SELECT date, amount, title, category FROM other_expenses WHERE user_id = ?', (user_id,))
        other = [{"date": r["date"], "amount": r["amount"], "type": "other", "name": f"{r['title']} ({r['category']})"} for r in c.fetchall()]
        
        # Fetch fertilizations with cost
        c.execute('SELECT date, cost, fertilizer_name, amount FROM fertilizations WHERE user_id = ? AND cost > 0', (user_id,))
        fertilizations = [{"date": r["date"], "amount": r["cost"], "type": "fertilizer", "name": f"{r['amount']} kg/lt {r['fertilizer_name']}"} for r in c.fetchall()]
        
    conn.close()
    
    all_expenses = sprays + irrigations + other + fertilizations
    return jsonify(all_expenses)

# Monthly Expense rollups (legacy support)
@app.route('/api/expenses/monthly', methods=['GET'])
def get_monthly_expenses():
    user_id = get_user_from_request()
    if not user_id:
        return jsonify({"status": "error", "message": "Oturum açılması gerekiyor."}), 401
        
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    
    c.execute('''
        SELECT substr(date, 1, 7) as month, SUM(pesticide_cost) as pesticide_total
        FROM sprays
        WHERE user_id = ?
        GROUP BY month
    ''', (user_id,))
    sprays_cost = {row[0]: row[1] for row in c.fetchall() if row[0]}
    
    c.execute('''
        SELECT substr(date, 1, 7) as month, SUM(water_cost) as water_total
        FROM irrigations
        WHERE user_id = ?
        GROUP BY month
    ''', (user_id,))
    irrigations_cost = {row[0]: row[1] for row in c.fetchall() if row[0]}
    
    c.execute('''
        SELECT substr(date, 1, 7) as month, SUM(amount) as other_total
        FROM other_expenses
        WHERE user_id = ?
        GROUP BY month
    ''', (user_id,))
    other_cost = {row[0]: row[1] for row in c.fetchall() if row[0]}
    
    c.execute('''
        SELECT substr(date, 1, 7) as month, SUM(cost) as fertilizer_total
        FROM fertilizations
        WHERE user_id = ?
        GROUP BY month
    ''', (user_id,))
    fertilizers_cost = {row[0]: row[1] for row in c.fetchall() if row[0]}
    conn.close()
    
    # Merge months
    all_months = sorted(list(set(list(sprays_cost.keys()) + list(irrigations_cost.keys()) + list(other_cost.keys()) + list(fertilizers_cost.keys()))))
    if len(all_months) > 12:
        all_months = all_months[-12:]
        
    data = []
    for m in all_months:
        p_cost = sprays_cost.get(m, 0.0) or 0.0
        w_cost = irrigations_cost.get(m, 0.0) or 0.0
        o_cost = other_cost.get(m, 0.0) or 0.0
        f_cost = fertilizers_cost.get(m, 0.0) or 0.0
        data.append({
            "month": m,
            "pesticide_cost": round(p_cost, 2),
            "water_cost": round(w_cost, 2),
            "other_cost": round(o_cost, 2),
            "fertilizer_cost": round(f_cost, 2),
            "total": round(p_cost + w_cost + o_cost + f_cost, 2)
        })
        
    return jsonify(data)

# Admin Dashboard API Routes
@app.route('/api/admin/users', methods=['GET'])
def admin_get_users():
    user_id = get_user_from_request()
    if not user_id or not is_admin_user(user_id):
        return jsonify({"status": "error", "message": "Yetkisiz erişim. Sadece sistem yöneticileri bu sayfayı görebilir."}), 403
        
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    
    # Query users including farm_type and counts of their sprays
    c.execute('''
        SELECT u.id, u.email, u.name, u.farm_type, COUNT(s.id) as spray_count
        FROM users u
        LEFT JOIN sprays s ON u.id = s.user_id
        GROUP BY u.id
    ''')
    rows = c.fetchall()
    conn.close()
    
    users_list = []
    for r in rows:
        users_list.append({
            'id': r['id'],
            'name': r['name'],
            'email': r['email'],
            'farm_type': r['farm_type'] or 'Belirtilmedi',
            'spray_count': r['spray_count']
        })
    return jsonify(users_list)

@app.route('/api/admin/users/<target_user_id>/sprays', methods=['GET'])
def admin_get_user_sprays(target_user_id):
    user_id = get_user_from_request()
    if not user_id or not is_admin_user(user_id):
        return jsonify({"status": "error", "message": "Yetkisiz erişim. Sadece sistem yöneticileri bu sayfayı görebilir."}), 403
        
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute('SELECT * FROM sprays WHERE user_id = ?', (target_user_id,))
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
            'notes': r['notes'],
            'pesticide_cost': r['pesticide_cost']
        })
    return jsonify(sprays_list)

# Fertilization (Gübreleme) CRUD APIs
@app.route('/api/fertilizations', methods=['GET'])
def get_fertilizations():
    user_id = get_user_from_request()
    if not user_id:
        return jsonify({"status": "error", "message": "Oturum açılması gerekiyor."}), 401
        
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    
    field_id = request.args.get('field_id')
    if field_id and field_id != 'all':
        c.execute('SELECT * FROM fertilizations WHERE user_id = ? AND field_id = ? ORDER BY date DESC', (user_id, field_id))
    else:
        c.execute('SELECT * FROM fertilizations WHERE user_id = ? ORDER BY date DESC', (user_id,))
        
    rows = c.fetchall()
    conn.close()
    
    fert_list = []
    for r in rows:
        fert_list.append({
            'id': r['id'],
            'crop': r['crop'],
            'fertilizer_name': r['fertilizer_name'],
            'amount': r['amount'],
            'cost': r['cost'],
            'date': r['date'],
            'notes': r['notes'],
            'field_id': r.get('field_id', '')
        })
    return jsonify(fert_list)

@app.route('/api/fertilizations', methods=['POST'])
def add_fertilization():
    user_id = get_user_from_request()
    if not user_id:
        return jsonify({"status": "error", "message": "Oturum açılması gerekiyor."}), 401
        
    data = request.json
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute('''
        INSERT INTO fertilizations (id, user_id, crop, fertilizer_name, amount, cost, date, notes, field_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        data['id'],
        user_id,
        data['crop'],
        data['fertilizer_name'],
        float(data['amount']),
        float(data.get('cost', 0.0) or 0.0),
        data['date'],
        data.get('notes', ''),
        data.get('field_id', '')
    ))
    conn.commit()
    conn.close()
    return jsonify({"status": "success", "message": "Gübreleme kaydı başarıyla oluşturuldu."})

@app.route('/api/fertilizations/<fert_id>', methods=['PUT'])
def update_fertilization(fert_id):
    user_id = get_user_from_request()
    if not user_id:
        return jsonify({"status": "error", "message": "Oturum açılması gerekiyor."}), 401
        
    data = request.json
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    
    # Verify owner
    c.execute('SELECT id FROM fertilizations WHERE id = ? AND user_id = ?', (fert_id, user_id))
    if not c.fetchone():
        conn.close()
        return jsonify({"status": "error", "message": "Bu kaydı düzenlemeye yetkiniz yok."}), 403
        
    c.execute('''
        UPDATE fertilizations
        SET crop = ?, fertilizer_name = ?, amount = ?, cost = ?, date = ?, notes = ?, field_id = ?
        WHERE id = ? AND user_id = ?
    ''', (
        data['crop'],
        data['fertilizer_name'],
        float(data['amount']),
        float(data.get('cost', 0.0) or 0.0),
        data['date'],
        data.get('notes', ''),
        data.get('field_id', ''),
        fert_id,
        user_id
    ))
    conn.commit()
    conn.close()
    return jsonify({"status": "success", "message": "Gübreleme kaydı güncellendi."})

@app.route('/api/fertilizations/<fert_id>', methods=['DELETE'])
def delete_fertilization(fert_id):
    user_id = get_user_from_request()
    if not user_id:
        return jsonify({"status": "error", "message": "Oturum açılması gerekiyor."}), 401
        
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    
    # Verify owner
    c.execute('SELECT id FROM fertilizations WHERE id = ? AND user_id = ?', (fert_id, user_id))
    if not c.fetchone():
        conn.close()
        return jsonify({"status": "error", "message": "Bu kaydı silmeye yetkiniz yok."}), 403
        
    c.execute('DELETE FROM fertilizations WHERE id = ? AND user_id = ?', (fert_id, user_id))
    conn.commit()
    conn.close()
    return jsonify({"status": "success", "message": "Gübreleme kaydı silindi."})

# Fields (Tarlalar) CRUD APIs
@app.route('/api/fields', methods=['GET'])
def get_fields():
    user_id = get_user_from_request()
    if not user_id:
        return jsonify({"status": "error", "message": "Oturum açılması gerekiyor."}), 401
        
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute('SELECT * FROM fields WHERE user_id = ? ORDER BY name ASC', (user_id,))
    rows = c.fetchall()
    conn.close()
    
    fields_list = []
    for r in rows:
        fields_list.append({
            'id': r['id'],
            'name': r['name'],
            'farm_type': r['farm_type'],
            'location': r['location']
        })
    return jsonify(fields_list)

@app.route('/api/fields', methods=['POST'])
def add_field():
    user_id = get_user_from_request()
    if not user_id:
        return jsonify({"status": "error", "message": "Oturum açılması gerekiyor."}), 401
        
    data = request.json
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute('''
        INSERT INTO fields (id, user_id, name, farm_type, location)
        VALUES (?, ?, ?, ?, ?)
    ''', (
        data['id'],
        user_id,
        data['name'],
        data['farm_type'],
        data['location']
    ))
    conn.commit()
    conn.close()
    return jsonify({"status": "success", "message": "Tarla başarıyla oluşturuldu."})

@app.route('/api/fields/<field_id>', methods=['DELETE'])
def delete_field(field_id):
    user_id = get_user_from_request()
    if not user_id:
        return jsonify({"status": "error", "message": "Oturum açılması gerekiyor."}), 401
        
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    
    # Verify owner
    c.execute('SELECT id FROM fields WHERE id = ? AND user_id = ?', (field_id, user_id))
    if not c.fetchone():
        conn.close()
        return jsonify({"status": "error", "message": "Bu tarlayı silmeye yetkiniz yok."}), 403
        
    # Count fields left for user (user must have at least one field)
    c.execute('SELECT COUNT(*) FROM fields WHERE user_id = ?', (user_id,))
    count = c.fetchone()[0]
    if count <= 1:
        conn.close()
        return jsonify({"status": "error", "message": "En az bir tarlanızın bulunması zorunludur."}), 400
        
    # Cascade delete all activities on this field manually if cascade is not triggered
    c.execute('DELETE FROM sprays WHERE user_id = ? AND field_id = ?', (user_id, field_id))
    c.execute('DELETE FROM irrigations WHERE user_id = ? AND field_id = ?', (user_id, field_id))
    c.execute('DELETE FROM fertilizations WHERE user_id = ? AND field_id = ?', (user_id, field_id))
    c.execute('DELETE FROM other_expenses WHERE user_id = ? AND field_id = ?', (user_id, field_id))
    
    c.execute('DELETE FROM fields WHERE id = ? AND user_id = ?', (field_id, user_id))
    conn.commit()
    conn.close()
    return jsonify({"status": "success", "message": "Tarla ve tarlaya bağlı tüm faaliyetler silindi."})

if __name__ == '__main__':
    init_db()
    
    # Start background checker thread
    checker = threading.Thread(target=check_sprays_loop, daemon=True)
    checker.start()
    
    print("TarımTakip Multi-User Flask Backend started on http://127.0.0.1:5000")
    app.run(host='127.0.0.1', port=5000, debug=False)
