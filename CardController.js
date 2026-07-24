// public/js/controllers/CardController.js

class CardController {
    constructor(model, view) {
        this.model = model;
        this.view = view;
        this.isRegisterMode = false;
    }

    init() {
        // --- 1. OTURUM VE KİMLİK DOĞRULAMA OLAYLARI ---
        this.view.checkSession();
        
        this.view.linkToggleAuth.addEventListener('click', (e) => {
            e.preventDefault();
            this.handleToggleAuth();
        });
        
        this.view.btnAuthAction.addEventListener('click', () => this.handleAuth());
        this.view.btnLogout.addEventListener('click', () => this.handleLogout());

        // --- 2. KARTVİZİT VE KAMERA OLAYLARI ---
        this.view.btnStartCam.addEventListener('click', () => this.view.startCamera());
        this.view.btnCapture.addEventListener('click', () => this.handleCapture());

        // Dosya Yükleme Olayı (Tekli veya Çoklu Seçimi Yönetir)
        this.view.btnFileUploader.addEventListener('change', (e) => this.handleFileSelect(e));

        this.view.btnSave.addEventListener('click', () => this.handleSave());
        this.view.btnClear.addEventListener('click', () => this.view.clearForm());
        this.view.btnDownloadVCF.addEventListener('click', () => this.handleCurrentVcfDownload());

        // --- 3. GEÇMİŞ TABLOSU VE ANALİTİK SEKME OLAYLARI ---
        this.view.historyTab.addEventListener('click', () => this.handleLoadHistory());
        this.view.dashboardTab.addEventListener('click', () => this.handleRenderCharts());
        this.view.historySearch.addEventListener('input', (e) => this.handleSearch(e));
        this.view.btnExportCSV.addEventListener('click', () => this.handleBulkExport());
    }

    handleToggleAuth() {
        this.isRegisterMode = !this.isRegisterMode;
        this.view.toggleAuthMode(this.isRegisterMode);
    }

    async handleAuth() {
        const credentials = this.view.getAuthData();

        if (!credentials.email || !credentials.password) {
            alert("Lütfen e-posta ve şifre alanlarını doldurunuz.");
            return;
        }

        if (this.isRegisterMode) {
            if (!credentials.name) {
                alert("Lütfen adınızı ve soyadınızı giriniz.");
                return;
            }
            
            this.view.toggleSpinner(true);
            const result = await this.model.register(credentials.name, credentials.email, credentials.password);
            this.view.toggleSpinner(false);

            if (result.success) {
                alert(`🎉 ${result.message}`);
                this.handleToggleAuth(); 
            } else {
                alert(`Hata: ${result.message}`);
            }
        } else {
            this.view.toggleSpinner(true);
            const result = await this.model.login(credentials.email, credentials.password);
            this.view.toggleSpinner(false);

            if (result.success) {
                this.view.checkSession(); 
                await this.handleLoadHistory();
            } else {
                alert(`Giriş Başarısız: ${result.message}`);
            }
        }
    }

    handleLogout() {
        if (confirm("Sistemden güvenli çıkış yapmak istediğinize emin misiniz?")) {
            localStorage.clear(); 
            this.view.clearForm(); 
            this.view.checkSession(); 
        }
    }

    handleCapture() {
        this.view.capturePhoto(async (blob) => {
            await this.uploadAndAnalyze(blob);
        });
    }

    // 🔥 GÜNCELLENEN MADDE: Giriş Seçimine Göre Tekli/Toplu Dağıtıcı Metot
    async handleFileSelect(e) {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        if (files.length > 1) {
            // Birden fazla dosya seçilmişse toplu işleme yolluyoruz
            await this.handleBulkUpload(files);
        } else {
            // Tek bir dosya seçilmişse eski tekli analiz modunu çalıştırıyoruz
            this.view.showFilePreview(files[0]);
            await this.uploadAndAnalyze(files[0]);
        }
    }

    async uploadAndAnalyze(fileBlob) {
        this.view.toggleSpinner(true);
        try {
            const result = await this.model.analyzeCardImage(fileBlob);
            if (result.success) {
                this.view.populateForm(result.data);
                if (result.qr_detected) {
                    alert("✅ QR Kod başarıyla çözüldü ve bilgiler eşleştirildi!");
                }
            } else {
                alert("Analiz Hatası: " + result.message);
            }
        } catch (err) {
            alert("Sunucu bağlantı hatası veya yetkisiz erişim algılandı.");
        } finally {
            this.view.toggleSpinner(false);
        }
    }

    // 🔥 YENİ EKLENEN MADDE: Toplu Asenkron Yüklemeyi Yöneten Ön Yüz Motoru
    async handleBulkUpload(fileList) {
        this.view.toggleSpinner(true);
        this.view.showBulkStatus(`⏳ <b>${fileList.length}</b> adet kartvizit paralel kuyrukta işleniyor, lütfen bekleyin...`);
        
        try {
            const result = await this.model.uploadBulkCards(fileList);
            if (result.success) {
                const stats = result.stats;
                const statusHtml = `
                    <div class="text-success fw-bold">✓ Toplu İşlem Başarıyla Tamamlandı!</div>
                    <ul class="mb-0 mt-1">
                        <li>Toplam Seçilen: ${stats.total}</li>
                        <li>Yeni Eklenen: ${stats.inserted}</li>
                        <li>Güncellenen (Mükerrer): ${stats.updated}</li>
                        <li class="text-danger">Hatalı/Okunamayan: ${stats.failed}</li>
                    </ul>
                `;
                this.view.showBulkStatus(statusHtml);
                alert(`🎉 Toplu işlem raporu hazır! ${stats.inserted} yeni kart eklendi, ${stats.updated} kart güncellendi.`);
                
                await this.model.fetchHistory(); // Yerel bellekteki geçmiş havuzunu sunucudan tazele
            } else {
                this.view.showBulkStatus(`❌ Hata: ${result.message}`);
            }
        } catch (err) {
            this.view.showBulkStatus(`❌ Sunucu bağlantı hatası oluştu.`);
        } finally {
            this.view.toggleSpinner(false);
        }
    }

    async handleSave() {
        const payload = this.view.getFormData();

        if (!payload.ad_soyad) {
            alert("Lütfen en azından Ad Soyad alanını doldurunuz.");
            return;
        }

        try {
            const result = await this.model.saveCardToDatabase(payload);
            if (result.success) {
                alert(`🎉 Kartvizit Başarıyla PostgreSQL'e Kaydedildi! (Kayıt No: ${result.code})`);
                this.view.clearForm();
                await this.handleLoadHistory();
            } else {
                alert("Kayıt Hatası: " + result.message);
            }
        } catch (err) {
            alert("Veritabanına kaydedilirken sunucu hatası oluştu.");
        }
    }

    async handleLoadHistory() {
        try {
            if (!localStorage.getItem('token')) return;
            const result = await this.model.fetchHistory();
            if (result.success) {
                this.view.renderHistoryTable(result.data_set, (item) => this.downloadVCF(item));
            }
        } catch (err) {
            console.error("Geçmiş tablolanırken hata oluştu:", err);
        }
    }

    handleSearch(e) {
        const query = e.target.value;
        const filteredData = this.model.filterHistory(query);
        this.view.renderHistoryTable(filteredData, (item) => this.downloadVCF(item));
    }

    handleRenderCharts() {
        const currentData = this.model.allHistory;
        if (!currentData || currentData.length === 0) {
            alert("Grafiklerin çizilebilmesi için sistemde en az 1 adet kayıtlı kartvizit bulunmalıdır.");
            return;
        }
        this.view.renderCharts(currentData);
    }

    handleCurrentVcfDownload() {
        const data = this.view.getFormData();
        if (!data.ad_soyad) {
            alert("İndirilecek veri yok.");
            return;
        }
        this.downloadVCF(data);
    }

    downloadVCF(item) {
        let vcf = "BEGIN:VCARD\nVERSION:3.0\n";
        vcf += `FN;CHARSET=UTF-8:${item.ad_soyad || 'Bilinmeyen'}\n`;
        if (item.sirket) vcf += `ORG;CHARSET=UTF-8:${item.sirket}\n`;
        if (item.unvan) vcf += `TITLE;CHARSET=UTF-8:${item.unvan}\n`;
        if (item.telefon) vcf += `TEL;TYPE=WORK,VOICE:${item.telefon}\n`;
        if (item.email) vcf += `EMAIL;TYPE=PREF,INTERNET:${item.email}\n`;
        if (item.website) vcf += `URL:${item.website}\n`;
        if (item.adres) vcf += `ADR;TYPE=WORK;CHARSET=UTF-8:;;${item.adres.replace(/\n/g, ";")}\n`;
        vcf += "END:VCARD";

        const blob = new Blob([vcf], { type: "text/vcard;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = (item.ad_soyad || "kartvizit") + ".vcf";
        a.click();
        URL.revokeObjectURL(url);
    }

    handleBulkExport() {
        const data = this.model.allHistory;

        if (!data || data.length === 0) {
            alert("Sistemde dışa aktarılacak hiç kayıt bulunamadı.");
            return;
        }

        const headers = [
            "Sistem_ID", "Kurumsal_Kod", "Ad_Soyad", "Unvan", 
            "Sirket_Adi", "Telefon", "E_Posta", "Web_Sitesi", 
            "Adres", "Kisisel_Notlar", "QR_Ham_Veri", "Sisteme_Kayit_Tarihi"
        ];

        let csvContent = "\uFEFF"; 
        csvContent += headers.join(";") + "\n";

        data.forEach(item => {
            const row = [
                item.id || "",
                item.code ? `="${item.code}"` : "", 
                item.ad_soyad || "",
                item.unvan || "",
                item.sirket || "",
                item.telefon || "",
                item.email || "",
                item.website || "",
                (item.adres || "").replace(/\n/g, " "), 
                (item.notlar || "").replace(/\n/g, " "),
                item.qr_veri || "",
                item.createdAt || ""
            ];

            const cleanRow = row.map(val => {
                let text = String(val);
                text = text.replace(/"/g, '""');
                return `"${text}"`;
            });

            csvContent += cleanRow.join(";") + "\n";
        });

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `CRM_Kartvizit_Havuzu_Export_${new Date().toISOString().slice(0,10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    }
}

export default CardController;