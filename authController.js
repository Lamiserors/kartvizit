// controllers/authController.js
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Adım 4'teki gizli anahtar kelimeyle birebir aynı olmalı
const JWT_SECRET = process.env.JWT_SECRET || "TEZ_KARTVIZIT_GIZLI_KEY_2026";

exports.assignMethods = function (app) {

    /**
     * A. SİSTEME YENİ KULLANICI KAYDI (REGISTER)
     * POST /api/auth/register
     */
    app.post('/api/auth/register', async (req, res) => {
        try {
            const { name, email, password } = req.body;

            // Girdi Kontrolü
            if (!name || !email || !password) {
                return res.status(400).json({ success: false, message: "Lütfen tüm alanları doldurunuz." });
            }

            // Bu e-posta adresi veritabanında zaten var mı?
            const existingUser = await User.findOne({ where: { email } });
            if (existingUser) {
                return res.status(400).json({ success: false, message: "Bu e-posta adresi zaten kullanımda." });
            }

            // AKADEMİK GÜVENLİK: Şifreyi veritabanına doğrudan yazmıyoruz! 
            // 10 tur tuzlayarak (salt) kırılması imkansız bir hash haline getiriyoruz.
            const hashedPassword = await bcrypt.hash(password, 10);

            // Kullanıcıyı veritabanına kaydet
            await User.create({
                name,
                email,
                password: hashedPassword
            });

            return res.json({ success: true, message: "Kullanıcı hesabı başarıyla oluşturuldu! Giriş yapabilirsiniz." });

        } catch (error) {
            console.error("Kayıt Hatası:", error);
            res.status(500).json({ success: false, message: "Kayıt işlemi sırasında sunucu hatası oluştu." });
        }
    });

    /**
     * B. KULLANICI GİRİŞİ VE JWT ÜRETİMİ (LOGIN)
     * POST /api/auth/login
     */
    app.post('/api/auth/login', async (req, res) => {
        try {
            const { email, password } = req.body;

            if (!email || !password) {
                return res.status(400).json({ success: false, message: "E-posta ve şifre zorunludur." });
            }

            // Kullanıcıyı e-posta adresinden sorgula
            const user = await User.findOne({ where: { email } });
            if (!user) {
                return res.status(404).json({ success: false, message: "Kullanıcı bulunamadı." });
            }

            // Şifre Doğrulama: Gelen düz şifre ile veritabanındaki hashlenmiş şifreyi güvenli şekilde kıyasla
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                return res.status(400).json({ success: false, message: "Hatalı şifre girdiniz." });
            }

            // AKADEMİK DOĞRULAMA: Giriş başarılıysa kullanıcıya 24 saat geçerli kriptografik JWT token üret
            const token = jwt.sign(
                { id: user.id, email: user.email },
                JWT_SECRET,
                { expiresIn: '24h' }
            );

            // Tokenı ve kullanıcı adını ön yüze (tarayıcıya) gönder
            return res.json({
                success: true,
                message: "Giriş başarılı! Hoş geldiniz.",
                token: token,
                user: { name: user.name, email: user.email }
            });

        } catch (error) {
            console.error("Giriş Hatası:", error);
            res.status(500).json({ success: false, message: "Giriş işlemi sırasında sunucu hatası oluştu." });
        }
    });
};