# TarımTakip - Çiftçi İlaç Takip & Otomatik Bildirim Sistemi

TarımTakip, çiftçilerin tarlalarında veya bahçelerinde uyguladıkları ilaçların (pestisit, herbisit, fungusit vb.) etki sürelerini ve son ilaçlama ile hasat arasındaki bekleme sürelerini (PHI) takip edebilecekleri, etki süresi bitiminde otomatik e-posta uyarısı gönderen modern bir web uygulamasıdır.

## 🌟 Özellikler

- **Dinamik Gösterge Paneli (Dashboard)**: Aktif koruma, hasat yasağı, güvenli hasat adetlerini tek bakışta izleyin.
- **Güvenli Hasat Takibi (PHI)**: İlaç kalıntılarının geçmesi gereken bekleme gününü hesaplar ve hasat yasağı durumlarını gösterir.
- **Otomatik E-posta Bildirimleri (SMTP)**:
  - İlaç etki süresi bittiğinde e-posta ile uyarır.
  - Hasat bekleme süresi bittiğinde hasadın güvenli olduğunu bildiren e-posta gönderir.
- **Sistem Ayarları Modalı**: SMTP mail ayarlarınızı doğrudan web arayüzü üzerinden kolayca yapılandırıp test edebilirsiniz.
- **Kalıcı Veri Tabanı**: Sunucu tarafında SQLite (`tarim_takip.db`) veri tabanı kullanır.
- **Responsive Tasarım**: Mobil, tablet ve masaüstü cihazlar için tamamen uyumludur.

---

## 🛠️ Kurulum ve Çalıştırma

Projeyi çalıştırmak için bilgisayarınızda **Python 3** yüklü olmalıdır.

1. **Gerekli Python Kütüphanesini Kurun**:
   Terminalde aşağıdaki komutla Flask kütüphanesini yükleyin:
   ```bash
   pip3 install flask
   ```

2. **Sunucuyu Başlatın**:
   Proje dizinine gidin ve sunucu dosyasını çalıştırın:
   ```bash
   python3 server.py
   ```

3. **Uygulamaya Bağlanın**:
   Tarayıcınızı açın ve aşağıdaki adrese gidin:
   [http://127.0.0.1:5000](http://127.0.0.1:5000)

---

## 📧 E-posta Bildirim Kurulumu

Uygulamanın otomatik e-postalar gönderebilmesi için SMTP bilgilerini yapılandırmanız gerekir:

1. TarımTakip arayüzündeki sol menüden **Sistem Ayarları** sekmesini açın.
2. SMTP bilgilerinizi girin (Örn: Gmail kullanıyorsanız Host: `smtp.gmail.com`, Port: `587` ve Google hesabınızdan alacağınız bir *Uygulama Şifresi* kullanmalısınız).
3. **Bağlantıyı Test Et** butonu ile kurulumu test edin.
4. Test başarılıysa **Ayarları Kaydet** butonuna basın.

Sunucu, ilaç koruma ve hasat zamanlarını arka planda otomatik olarak kontrol etmeye başlayacaktır.
