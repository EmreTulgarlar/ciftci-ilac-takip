import os
import json
import time
import sqlite3
import datetime
import math
import threading
import smtplib
from email.mime.text import MIMEText
from email.header import Header
from flask import Flask, jsonify, request, send_from_directory

app = Flask(__name__, static_folder='.', static_url_path='')

DB_FILE = 'tarim_takip.db'
CONFIG_FILE = 'config.json'

# Initialize SQLite database
def init_db():
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS sprays (
            id TEXT PRIMARY KEY,
            crop TEXT NOT NULL,
            pesticide TEXT NOT NULL,
            date TEXT NOT NULL,
            duration INTEGER NOT NULL,
            phi INTEGER NOT NULL,
            dosage TEXT,
            pest TEXT,
            notes TEXT,
            emailed_protection INTEGER DEFAULT 0,
            emailed_harvest INTEGER DEFAULT 0
        )
    ''')
    conn.commit()
    conn.close()

# Load/Save SMTP Configuration
def load_config():
    if not os.path.exists(CONFIG_FILE):
        default = {
            "smtp_server": "smtp.gmail.com",
            "smtp_port": 587,
            "smtp_username": "",
            "smtp_password": "",
            "recipient_email": ""
        }
        with open(CONFIG_FILE, 'w', encoding='utf-8') as f:
            json.dump(default, f, indent=4)
        return default
    with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_config(config):
    with open(CONFIG_FILE, 'w', encoding='utf-8') as f:
        json.dump(config, f, indent=4)

# Email sending utility
def send_email(subject, body, config):
    if not config.get('smtp_username') or not config.get('recipient_email'):
        print("SMTP credentials or recipient email is missing.")
        return False
    try:
        msg = MIMEText(body, 'plain', 'utf-8')
        msg['Subject'] = Header(subject, 'utf-8')
        msg['From'] = config['smtp_username']
        msg['To'] = config['recipient_email']
        
        server = smtplib.SMTP(config['smtp_server'], config['smtp_port'])
        server.starttls()
        server.login(config['smtp_username'], config['smtp_password'])
        server.sendmail(config['smtp_username'], [config['recipient_email']], msg.as_string())
        server.quit()
        print(f"Email sent successfully: {subject}")
        return True
    except Exception as e:
        print(f"Email sending failed: {e}")
        return False

# Background checker thread logic
def check_sprays_loop():
    while True:
        try:
            config = load_config()
            if config.get('smtp_username') and config.get('recipient_email'):
                conn = sqlite3.connect(DB_FILE)
                conn.row_factory = sqlite3.Row
                c = conn.cursor()
                c.execute('SELECT * FROM sprays')
                rows = c.fetchall()
                
                now = datetime.datetime.now()
                
                for row in rows:
                    spray_time = datetime.datetime.fromisoformat(row['date'])
                    duration_days = datetime.timedelta(days=row['duration'])
                    phi_days = datetime.timedelta(days=row['phi'])
                    
                    protection_end_time = spray_time + duration_days
                    harvest_safety_end_time = spray_time + phi_days
                    
                    protection_expired = now >= protection_end_time
                    harvest_safe = now >= harvest_safety_end_time
                    
                    updated = False
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
            
        time.sleep(300) # Check every 5 minutes (adjust to 3600 for hourly or keep at 5 mins for responsive checks)

# API Routes
@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/api/sprays', methods=['GET'])
def get_sprays():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute('SELECT * FROM sprays')
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
    data = request.json
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute('''
        INSERT INTO sprays (id, crop, pesticide, date, duration, phi, dosage, pest, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        data['id'],
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
    return jsonify({"status": "success", "message": "Spray logged successfully."})

@app.route('/api/sprays/<spray_id>', methods=['PUT'])
def update_spray(spray_id):
    data = request.json
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute('''
        UPDATE sprays
        SET crop = ?, pesticide = ?, date = ?, duration = ?, phi = ?, dosage = ?, pest = ?, notes = ?,
            emailed_protection = 0, emailed_harvest = 0
        WHERE id = ?
    ''', (
        data['crop'],
        data['pesticide'],
        data['date'],
        int(data['duration']),
        int(data['phi']),
        data.get('dosage', ''),
        data.get('pest', ''),
        data.get('notes', ''),
        spray_id
    ))
    conn.commit()
    conn.close()
    return jsonify({"status": "success", "message": "Spray updated successfully."})

@app.route('/api/sprays/<spray_id>', methods=['DELETE'])
def delete_spray(spray_id):
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute('DELETE FROM sprays WHERE id = ?', (spray_id,))
    conn.commit()
    conn.close()
    return jsonify({"status": "success", "message": "Spray deleted successfully."})

@app.route('/api/settings', methods=['GET'])
def get_settings():
    config = load_config()
    # Mask password for security when sending to frontend
    masked_config = config.copy()
    if masked_config['smtp_password']:
        masked_config['smtp_password'] = '••••••••••••'
    return jsonify(masked_config)

@app.route('/api/settings', methods=['POST'])
def save_settings():
    new_settings = request.json
    current_config = load_config()
    
    # If password is '••••••••••••' (masked), retain current password
    if new_settings.get('smtp_password') == '••••••••••••':
        new_settings['smtp_password'] = current_config['smtp_password']
        
    save_config(new_settings)
    return jsonify({"status": "success", "message": "SMTP settings saved successfully."})

@app.route('/api/test-email', methods=['POST'])
def test_email():
    config = request.json
    current_config = load_config()
    
    if config.get('smtp_password') == '••••••••••••':
        config['smtp_password'] = current_config['smtp_password']
        
    subject = "🧪 TarımTakip - E-posta Kurulum Testi"
    body = "Tebrikler! TarımTakip e-posta entegrasyon ayarlarınız başarıyla kurulmuştur. İlaç etki süreleri bittiğinde veya hasat güvenli hale geldiğinde buradan otomatik uyarı alacaksınız."
    
    success = send_email(subject, body, config)
    if success:
        return jsonify({"status": "success", "message": "Test mail sent successfully."})
    else:
        return jsonify({"status": "error", "message": "Failed to send test email. Please check your SMTP settings."})

if __name__ == '__main__':
    init_db()
    
    # Start background checker thread
    checker = threading.Thread(target=check_sprays_loop, daemon=True)
    checker.start()
    
    print("TarımTakip Flask Backend started on http://127.0.0.1:5000")
    app.run(host='127.0.0.1', port=5000, debug=False)
