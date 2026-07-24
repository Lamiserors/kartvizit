// middlewares/authMiddleware.js
const jwt = require('jsonwebtoken');

// Token şifrelemesi için gizli bir anahtar kelime (Tez jürisinde güvenlik katmanı olarak anlatırsın)
const JWT_SECRET = process.env.JWT_SECRET || "TEZ_KARTVIZIT_GIZLI_KEY_2026";

module.exports = (req, res, next) => {
    // Ön yüzden gelen istek başlığındaki (Headers) Authorization kısmını okuyoruz
    const authHeader = req.headers['authorization'];
    
    // "Bearer <TOKEN_DEGERI>" yapısındaki token kısmını ayıklıyoruz
    const token = authHeader && authHeader.split(' ')[1]; 

    // Eğer istekte token gönderilmediyse kapıyı kapat
    if (!token) {
        return res.status(401).json({ success: false, message: "Yetkisiz erişim: Token bulunamadı." });
    }

    try {
        // Token geçerli mi, süresi dolmuş mu diye kriptografik olarak kontrol ediliyor
        const decoded = jwt.verify(token, JWT_SECRET);
        
        // Token geçerliyse, içindeki kullanıcı bilgilerini (id, email) req.user içine gömüyoruz
        req.user = decoded; 
        
        // Güvenlik kontrolü başarılı! Bir sonraki fonksiyona (örneğin kaydetmeye) geçebilirsin
        next(); 
    } catch (err) {
        // Token sahteyse veya süresi bittiyse geçişi engelle
        return res.status(403).json({ success: false, message: "Geçersiz veya süresi dolmuş token." });
    }
};