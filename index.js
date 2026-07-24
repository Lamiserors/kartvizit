const express = require('express');
const multer = require('multer');
const { sequelize, connectDB } = require('./configs/db');
const ocrController = require('./controllers/ocrController');
const authController = require('./controllers/authController'); // YENİ EKLENEN SATIR

// Gemini API Key'i kodun algılayabilmesi için buraya ekliyoruz.
// NOT: Google AI Studio'dan aldığın ücretsiz API anahtarını buraya yapıştır!
process.env.GEMINI_API_KEY = ""; 

const app = express();
app.use(express.static('public'));
const PORT = process.env.PORT || 5000;

// Gelen JSON ve Form verilerini okuyabilmek için ara yazılımlar (Middleware)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Multer Konfigürasyonu (Fotoğraf yüklemeleri için RAM üzerinde geçici hafıza)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 } // Maksimum 50MB dosya limiti
});

// CORS Ayarı (Ön yüzün/Frontend'in tarayıcı engeline takılmadan bağlanabilmesi için)
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

// API Uçlarımızı (Routes) Sunucuya Tanıtıyoruz
authController.assignMethods(app); // YENİ EKLENEN SATIR
ocrController.assignMethods(app, upload);

// Sunucuyu ve Veritabanını Başlatan Ana Fonksiyon
const startServer = async () => {
    // 1. PostgreSQL Veritabanına Bağlan
    await connectDB();

    // 2. Tabloları Senkronize Et
    try {
        await sequelize.sync({ force: false });
        console.log('=> Veritabanı tabloları başarıyla senkronize edildi! 📑');
    } catch (err) {
        console.error('!!! Tablo oluşturma/senkronizasyon hatası:', err.message);
    }

    // 3. Portu dinle ve olası hataları yakala
    const server = app.listen(PORT, () => {
        console.log(`\n🚀 ======================================================= 🚀`);
        console.log(`🔥 KARTVİZİT OCR BACKEND SUNUCUSU BAŞARIYLA ÇALIŞTI!`);
        console.log(`🌍 Sunucu Adresi: http://localhost:${PORT}`);
        console.log(`\n👉 Aktif API Uçların (Frontend Bunları Çağıracak):`);
        console.log(`   [POST] http://localhost:${PORT}/api/ocr/extract_business_card -> Analiz`);
        console.log(`   [POST] http://localhost:${PORT}/api/ocr/save_to_sap         -> Veritabanına Kaydet`);
        console.log(`   [GET]  http://localhost:${PORT}/api/ocr/get_history         -> Geçmiş Listesi`);
        console.log(`🚀 ======================================================= 🚀\n`);
    });

    // HATA YAKALAYICI: Eğer port doluysa veya başka bir hata varsa burası yakalar
    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.error(`\n!!! ⚠️ HATA: ${PORT} portu şu an bilgisayarında başka bir program tarafından kullanılıyor!`);
            console.error(`!!! Lütfen index.js içindeki PORT değerini 5000 veya 8080 yapıp tekrar dene.\n`);
        } else {
            console.error('!!! Sunucu başlatılırken beklenmedik bir hata oluştu:', err.message);
        }
    });
};

// Sunucuyu Ateşle!
startServer();