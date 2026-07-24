// controllers/ocrController.js
const { GoogleGenerativeAI } = require("@google/generative-ai");
const sharp = require("sharp");
const jsQR = require("jsqr");
const BusinessCard = require("../models/BusinessCard");
const authMiddleware = require("../middlewares/authMiddleware"); // Güvenlik kapısı

// Buffer'ı Gemini API formatına çeviren yardımcı fonksiyon
function fileToGenerativePart(buffer, mimeType) {
    return {
        inlineData: { data: buffer.toString("base64"), mimeType },
    };
}

// Görselden QR Kodu okuyan yardımcı fonksiyon
async function _decodeQRFromBuffer(buffer) {
    try {
        const { data, info } = await sharp(buffer)
            .resize(1000, 1000, { fit: 'inside', withoutEnlargement: true })
            .grayscale()
            .normalize()
            .ensureAlpha()
            .raw()
            .toBuffer({ resolveWithObject: true });

        const uint8 = new Uint8ClampedArray(data);
        const code = jsQR(uint8, info.width, info.height, { inversionAttempts: "attemptBoth" });
        
        if (code) {
            return code.data;
        }
        return null;
    } catch (err) {
        return null;
    }
}

// Ana API Metotları
exports.assignMethods = function (app, upload) {

    /**
     * 1. TEKLİ KARTVİZİT ANALİZİ
     * POST /api/ocr/extract_business_card
     */
    app.post('/api/ocr/extract_business_card', authMiddleware, upload.single('image'), async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({ success: false, message: "Lütfen bir resim dosyası yükleyin." });
            }

            const apiKey = process.env.GEMINI_API_KEY || "BURAYA_KENDI_API_KEYINIZI_GELECEK"; 
            if (!apiKey || apiKey.includes("BURAYA_KENDI")) {
                return res.status(500).json({ success: false, message: "Google Gemini API Key eksik." });
            }

            let optimizedBuffer = req.file.buffer;
            try {
                optimizedBuffer = await sharp(req.file.buffer)
                    .resize({ width: 1024, withoutEnlargement: true })
                    .jpeg({ quality: 80 })
                    .toBuffer();
            } catch (imgErr) {
                console.error("[SHARP] Görsel optimize edilemedi:", imgErr.message);
            }

            let rawQrData = await _decodeQRFromBuffer(optimizedBuffer);

            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({
                model: "gemini-2.5-flash",
                generationConfig: { responseMimeType: "application/json" }
            });

            let prompt = `Sen profesyonel bir kartvizit veri ayrıştırıcısısın. Amacın verilen görselden kişi iletişim bilgilerini eksiksiz çıkarmaktır.`;

            if (rawQrData) {
                prompt += `\nÖNEMLİ BİLGİ: Sistem QR Kodu okudu. İçeriği: ${rawQrData}\nBilgileri öncelikle buradan çek.`;
            }

            prompt += `
            Kurallar:
            1. Çıktı kesinlikle JSON formatında olmalı.
            2. Okunamayan alanlara "" (boş string) yaz.
            3. notlar alanını HER ZAMAN boş bırak.

            İstenen JSON Şeması:
            {
               "ad_soyad": "Kişinin adı soyadı",
               "unvan": "Ünvanı",
               "sirket": "Şirket adı",
               "telefon": "Telefon numarası",
               "email": "E-posta",
               "adres": "Adres",
               "website": "Web sitesi",
               "qr_veri": "Varsa QR içeriği yoksa boş string"
            }`;

            const imagePart = fileToGenerativePart(optimizedBuffer, 'image/jpeg');
            const result = await model.generateContent([prompt, imagePart]);
            const response = await result.response;
            
            let text = response.text().trim();
            if (text.startsWith("```json")) text = text.replace(/```json/g, "");
            if (text.endsWith("```")) text = text.replace(/```/g, "");
            text = text.trim();

            console.log("=> [GEMINI RESP]:", text);

            let parsedData = JSON.parse(text);

            if (rawQrData) { parsedData.qr_veri = rawQrData; }
            parsedData.notlar = "";

            return res.json({ success: true, data: parsedData, qr_detected: !!rawQrData });

        } catch (error) {
            console.error("❌ [CRITICAL OCR ERROR]:", error);
            res.status(500).json({ success: false, message: "Yapay zeka analizi hatası.", error: error.message });
        }
    });

    /**
     * 🔥 YENİ EKLENEN MADDE: 2. TOPLU KARTVİZİT YÜKLEME VE EŞZAMANLI İŞLEME (BATCH PROCESSING)
     * POST /api/ocr/bulk_extract_business_card
     * Tek seferde maksimum 10 adet görseli paralel havuzda işler ve doğrudan veritabanına yazar.
     */
    app.post('/api/ocr/bulk_extract_business_card', authMiddleware, upload.array('images', 10), async (req, res) => {
        try {
            if (!req.files || req.files.length === 0) {
                return res.status(400).json({ success: false, message: "Lütfen en az bir resim dosyası seçin." });
            }

            const apiKey = process.env.GEMINI_API_KEY || "BURAYA_KENDI_API_KEYINIZI_GELECEK";
            if (!apiKey || apiKey.includes("BURAYA_KENDI")) {
                return res.status(500).json({ success: false, message: "Google Gemini API Key eksik." });
            }

            const currentUserId = req.user.id;
            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({
                model: "gemini-2.5-flash",
                generationConfig: { responseMimeType: "application/json" }
            });

            console.log(`=> [BATCH PROCESSING] ${req.files.length} adet kartvizit eşzamanlı işleme alınıyor... 🚀`);

            // AKADEMİK SİHİR: Tüm dosyaları bir Promise dizisine mapleyip Promise.all ile paralel başlatıyoruz
            const batchPromises = req.files.map(async (file, index) => {
                try {
                    // A. Görsel Optimizasyon (Sharp)
                    let optimizedBuffer = file.buffer;
                    try {
                        optimizedBuffer = await sharp(file.buffer)
                            .resize({ width: 1024, withoutEnlargement: true })
                            .jpeg({ quality: 80 })
                            .toBuffer();
                    } catch (e) {
                        console.error(`[SHARP BATCH HATA] Dosya indeks ${index}:`, e.message);
                    }

                    // B. Karekod Taraması
                    let rawQrData = await _decodeQRFromBuffer(optimizedBuffer);

                    // C. Gemini Prompt Hazırlığı
                    let prompt = `Sen profesyonel bir kartvizit veri ayrıştırıcısısın. Görselden verileri çek ve kesinlikle JSON şemasında dön.`;
                    if (rawQrData) {
                        prompt += `\nQR Kod Verisi: ${rawQrData}\nÖncelikle burayı kullan.`;
                    }
                    prompt += `\nŞema:\n{"ad_soyad":"","unvan":"","sirket":"","telefon":"","email":"","website":"","adres":"","qr_veri":""}`;

                    const imagePart = fileToGenerativePart(optimizedBuffer, 'image/jpeg');
                    const result = await model.generateContent([prompt, imagePart]);
                    const response = await result.response;

                    let text = response.text().trim();
                    if (text.startsWith("```json")) text = text.replace(/```json/g, "");
                    if (text.endsWith("```")) text = text.replace(/```/g, "");
                    text = text.trim();

                    let parsedData = JSON.parse(text);
                    if (rawQrData) { parsedData.qr_veri = rawQrData; }

                    if (!parsedData.ad_soyad) {
                        return { success: false, filename: file.originalname, error: "İsim okunamadı." };
                    }

                    // D. Veri Madenciliği ile Mükerrer Kontrolü (Deduplication)
                    let existingCard = null;
                    if (parsedData.email) {
                        existingCard = await BusinessCard.findOne({ where: { email: parsedData.email, user_id: currentUserId } });
                    } else {
                        existingCard = await BusinessCard.findOne({ 
                            where: { ad_soyad: parsedData.ad_soyad, sirket: parsedData.sirket || "", user_id: currentUserId } 
                        });
                    }

                    if (existingCard) {
                        // Var olan kartı güncelle
                        await existingCard.update({
                            unvan: parsedData.unvan || "",
                            sirket: parsedData.sirket || "",
                            telefon: parsedData.telefon || "",
                            website: parsedData.website || "",
                            adres: parsedData.adres || "",
                            qr_veri: parsedData.qr_veri || ""
                        });
                        return { success: true, status: "updated", name: parsedData.ad_soyad };
                    } else {
                        // Yeni kart oluştur
                        const uniqueCode = new Date().getTime().toString() + index;
                        await BusinessCard.create({
                            user_id: currentUserId,
                            code: uniqueCode,
                            ad_soyad: parsedData.ad_soyad,
                            unvan: parsedData.unvan || "",
                            sirket: parsedData.sirket || "",
                            telefon: parsedData.telefon || "",
                            email: parsedData.email || "",
                            website: parsedData.website || "",
                            adres: parsedData.adres || "",
                            qr_veri: parsedData.qr_veri || ""
                        });
                        return { success: true, status: "inserted", name: parsedData.ad_soyad };
                    }

                } catch (cardError) {
                    console.error(`[BATCH TEKİL DOSYA HATASI] İndeks ${index}:`, cardError.message);
                    return { success: false, filename: file.originalname, error: cardError.message };
                }
            });

            // Tüm asenkron süreçleri burada tam eşzamanlı olarak bekliyoruz (Concurrency Resolution)
            const summaryResults = await Promise.all(batchPromises);

            // Sonuç istatistiklerini hesapla
            let insertedCount = 0;
            let updatedCount = 0;
            let failedCount = 0;

            summaryResults.forEach(r => {
                if (r.success) {
                    if (r.status === "inserted") insertedCount++;
                    if (r.status === "updated") updatedCount++;
                } else {
                    failedCount++;
                }
            });

            return res.json({
                success: true,
                message: "Toplu işlem başarıyla tamamlandı.",
                stats: {
                    total: summaryResults.length,
                    inserted: insertedCount,
                    updated: updatedCount,
                    failed: failedCount
                },
                details: summaryResults
            });

        } catch (error) {
            console.error("Toplu İşlem Sunucu Hatası:", error);
            res.status(500).json({ success: false, message: "Toplu işleme esnasında sistemsel bir hata oluştu." });
        }
    });

    /**
     * 3. KARTVİZİTİ VERİTABANINA MANUEL KAYDETME
     * POST /api/ocr/save_to_sap
     */
    app.post('/api/ocr/save_to_sap', authMiddleware, async (req, res) => {
        try {
            const params = req.body;
            const currentUserId = req.user.id;

            if (!params.ad_soyad) {
                return res.status(400).json({ success: false, message: "Ad Soyad alanı zorunludur." });
            }

            let existingCard = null;
            if (params.email) {
                existingCard = await BusinessCard.findOne({ where: { email: params.email, user_id: currentUserId } });
            } else {
                existingCard = await BusinessCard.findOne({ 
                    where: { ad_soyad: params.ad_soyad, sirket: params.sirket || "", user_id: currentUserId } 
                });
            }

            if (existingCard) {
                await existingCard.update({
                    unvan: params.unvan || "",
                    sirket: params.sirket || "",
                    telefon: params.telefon || "",
                    website: params.website || "",
                    adres: params.adres || "",
                    notlar: params.notlar || "",
                    qr_veri: params.qr_veri || ""
                });
                return res.json({ success: true, message: "Kartvizit güncellendi!", code: existingCard.code });
            } else {
                const uniqueCode = new Date().getTime().toString();
                const newCard = await BusinessCard.create({
                    user_id: currentUserId,
                    code: uniqueCode,
                    ad_soyad: params.ad_soyad,
                    unvan: params.unvan || "",
                    sirket: params.sirket || "",
                    telefon: params.telefon || "",
                    email: params.email || "",
                    website: params.website || "",
                    adres: params.adres || "",
                    notlar: params.notlar || "",
                    qr_veri: params.qr_veri || ""
                });
                return res.json({ success: true, message: "Kartvizit başarıyla kaydedildi.", code: newCard.code });
            }
        } catch (error) {
            console.error("Postgres Kayıt Hatası:", error);
            res.status(500).json({ success: false, message: "Veritabanı kayıt hatası." });
        }
    });

    /**
     * 4. GEÇMİŞ KARTVİZİT TARAMALARINI LİSTELEME
     * GET /api/ocr/get_history
     */
    app.get('/api/ocr/get_history', authMiddleware, async (req, res) => {
        try {
            const currentUserId = req.user.id;
            const results = await BusinessCard.findAll({
                where: { user_id: currentUserId },
                order: [['createdAt', 'DESC']]
            });
            return res.json({ success: true, data_set: results });
        } catch (error) {
            res.status(500).json({ success: false, message: "Geçmiş kayıtlar alınamadı." });
        }
    });

    console.log("=> OCR (Business Card) PostgreSQL Servis Uçları Aktif Edildi! 🚀");
};