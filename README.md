# Otomatik Kartvizit Okuma

🎴 Digital Business Card Scanner & Management System

Geleneksel kartvizitleri optik karakter tanıma (OCR), yapay zeka (LLM) ve QR kod okuma teknolojilerini kullanarak dijital ortama aktaran, verileri yapılandırılmış olarak PostgreSQL veritabanında saklayan hibrit bir dijital kartvizit işleme platformudur.

🚀 Öne Çıkan Özellikler

📷 QR Kod Algılama: jsQR kütüphanesi ile kartvizitler üzerindeki QR kodları anında tarar ve çözümler.

🤖 AI Destekli Veri Çıkarımı: QR kod içermeyen veya ek metin barındıran kartvizitleri Google Gemini-2.5-Flash API kullanarak analiz eder; ad, soyad, telefon, e-posta, unvan ve şirket bilgilerini yüksek doğrulukla ayıklar.

🖼️ Görüntü İşleme Pipeline'ı: sharp entegrasyonu ile yüklenen görselleri otomatik olarak boyutlandırır, sıkıştırır ve OCR/AI analizi için optimize eder.

💾 Güvenilir Veri Depolama: Yapılandırılmış verileri ve kişi bilgilerini ilişkisel PostgreSQL veritabanında güvenli bir şekilde saklar.

☁️ Bulut Tabanlı Dağıtım: Esnek ve kesintisiz sunucu altyapısı için Railway üzerinde canlıya alınmıştır.

🛠️ Kullanılan Teknolojiler

Alan	Teknolojiler
Backend	Node.js, Express.js

Veritabanı	PostgreSQL

Yapay Zeka / OCR	Google Gemini-2.5-Flash API, jsQR

Görüntü İşleme	Sharp

Deployment / Cloud	Railway

📦 Kurulum ve Çalıştırma

Projeyi yerel ortamınızda çalıştırırken takip edilecek temel adımlar:

Gereksinimler

Node.js (v18 veya üzeri)

PostgreSQL veritabanı

Gemini API Anahtarı

Adımlar

Proje deposunu bilgisayarınıza klonlayın.

Proje ana dizininde npm install komutuyla bağımlılıkları yükleyin.

Kök dizine bir .env dosyası ekleyip PORT, DATABASE_URL ve GEMINI_API_KEY değişkenlerinizi tanımlayın.

Veritabanı tablolarını oluşturduktan sonra npm start ile sunucuyu başlatın.

🏗️ Mimari ve Çalışma Mantığı

Görsel Yükleme: Kartvizit fotoğrafı sisteme aktarılır.

Sharp Optimize: Görsel işlenir, netleştirilir ve küçültülür.

jsQR Taraması: Kart üzerinde QR kod varsa veri doğrudan çözümlenir.

Gemini 2.5 Flash Analizi: QR kod yoksa veya yetersizse, yapay zeka görseldeki metinleri ad, unvan, iletişim gibi alanlara ayırıp JSON formatına getirir.

PostgreSQL Kayıt: Temizlenen veriler veritabanında depolanır.
