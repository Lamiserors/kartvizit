// public/js/models/CardModel.js

class CardModel {
    constructor() {
        this.allHistory = []; 
    }

    // Ortak yardımcı metot: İstek başlıklarına JWT Token'ı ekler
    _getHeaders() {
        const token = localStorage.getItem('token');
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        };
    }

    // A. KULLANICI GİRİŞ METODU (LOGIN)
    async login(email, password) {
        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const result = await response.json();

            if (result.success && result.token) {
                localStorage.setItem('token', result.token);
                localStorage.setItem('userName', result.user.name);
            }
            return result;
        } catch (err) {
            return { success: false, message: "Giriş servisine bağlanılamadı." };
        }
    }

    // B. YENİ KULLANICI KAYIT METODU (REGISTER)
    async register(name, email, password) {
        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password })
            });
            return await response.json();
        } catch (err) {
            return { success: false, message: "Kayıt servisine bağlanılamadı." };
        }
    }

    // C. TEKLİ KARTVİZİT ANALİZ İSTEĞİ
    async analyzeCardImage(fileBlob) {
        const formData = new FormData();
        formData.append('image', fileBlob);
        const token = localStorage.getItem('token');
        
        const response = await fetch('/api/ocr/extract_business_card', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });
        return await response.json();
    }

    // 🔥 YENİ EKLENEN MADDE: D. TOPLU KARTVİZİT ANALİZ VE OTOMATİK KAYIT İSTEĞİ (BATCH)
    async uploadBulkCards(fileList) {
        const formData = new FormData();
        const token = localStorage.getItem('token');

        // Gelen tüm dosyaları 'images' anahtarı altında FormData'ya ekliyoruz
        for (let i = 0; i < fileList.length; i++) {
            formData.append('images', fileList[i]);
        }

        const response = await fetch('/api/ocr/bulk_extract_business_card', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });
        return await response.json();
    }

    // E. VERİTABANINA MANUEL KAYDETME İSTEĞİ
    async saveCardToDatabase(payload) {
        const response = await fetch('/api/ocr/save_to_sap', {
            method: 'POST',
            headers: this._getHeaders(),
            body: JSON.stringify(payload)
        });
        return await response.json();
    }

    // F. SADECE GİRİŞ YAPAN KULLANICININ GEÇMİŞİNİ ÇEKME
    async fetchHistory() {
        const response = await fetch('/api/ocr/get_history', {
            method: 'GET',
            headers: this._getHeaders()
        });
        const result = await response.json();
        if (result.success) {
            this.allHistory = result.data_set;
        }
        return result;
    }

    // G. GEÇMİŞ TABLOSUNDA YEREL ARAMA/FİLTRELEME
    filterHistory(query) {
        if (!query) return this.allHistory;
        const q = query.toLowerCase();
        return this.allHistory.filter(item => 
            (item.ad_soyad && item.ad_soyad.toLowerCase().includes(q)) ||
            (item.sirket && item.sirket.toLowerCase().includes(q)) ||
            (item.unvan && item.unvan.toLowerCase().includes(q))
        );
    }
}

export default CardModel;