// public/js/views/CardView.js

class CardView {
    constructor() {
        // --- 1. KİMLİK DOĞRULAMA ELEMENTLERİ ---
        this.authContainer = document.getElementById('authContainer');
        this.mainAppContainer = document.getElementById('mainAppContainer');
        this.authForm = document.getElementById('authForm');
        this.authTitle = document.getElementById('authTitle');
        this.registerNameGroup = document.getElementById('registerNameGroup');
        
        this.authName = document.getElementById('authName');
        this.authEmail = document.getElementById('authEmail');
        this.authPassword = document.getElementById('authPassword');
        
        this.btnAuthAction = document.getElementById('btnAuthAction');
        this.linkToggleAuth = document.getElementById('linkToggleAuth');
        this.txtWelcomeUser = document.getElementById('txtWelcomeUser');
        this.btnLogout = document.getElementById('btnLogout');

        // --- 2. KAMERA VE GÖRSEL GİRİŞ ELEMENTLERİ ---
        this.videoPlayer = document.getElementById('player');
        this.previewImg = document.getElementById('previewImg');
        this.btnStartCam = document.getElementById('btnStartCam');
        this.btnCapture = document.getElementById('btnCapture');
        this.btnFileUploader = document.getElementById('fileUploader');
        this.btnClear = document.getElementById('btnClear');
        this.bulkStatusAlert = document.getElementById('bulkStatusAlert'); // Toplu bilgi ekranı

        // --- 3. FORM VE SPINNER ELEMENTLERİ ---
        this.cardForm = document.getElementById('cardForm');
        this.loadingSpinner = document.getElementById('loadingSpinner');
        this.btnSave = document.getElementById('btnSave');
        this.btnDownloadVCF = document.getElementById('btnDownloadVCF');

        // --- 4. GEÇMİŞ, DIŞA AKTARIM VE ANALİTİK SEKME ELEMENTLERİ ---
        this.historyTab = document.getElementById('history-tab');
        this.dashboardTab = document.getElementById('dashboard-tab');
        this.historySearch = document.getElementById('historySearch');
        this.historyTableBody = document.getElementById('historyTableBody');
        this.btnExportCSV = document.getElementById('btnExportCSV');

        this.stream = null; 
        this.activeCharts = { company: null, title: null, timeline: null };
    }

    // ==========================================
    // A. GÜVENLİK VE GÖRÜNÜM KONTROL METOTLARI
    // ==========================================
    checkSession() {
        const token = localStorage.getItem('token');
        const userName = localStorage.getItem('userName');

        if (token) {
            this.authContainer.style.display = 'none';
            this.mainAppContainer.style.display = 'block';
            this.txtWelcomeUser.textContent = `👤 Mühendis: ${userName}`;
        } else {
            this.authContainer.style.display = 'block';
            this.mainAppContainer.style.display = 'none';
            this.stopCamera();
        }
    }

    toggleAuthMode(isRegisterMode) {
        this.authForm.reset();
        if (isRegisterMode) {
            this.authTitle.textContent = "📝 Yeni Hesap Oluştur";
            this.btnAuthAction.textContent = "Kayıt Ol";
            this.registerNameGroup.style.display = 'block';
            this.linkToggleAuth.textContent = "Zaten hesabınız var mı? Giriş Yapın";
        } else {
            this.authTitle.textContent = "🔐 Kurumsal Giriş";
            this.btnAuthAction.textContent = "Giriş Yap";
            this.registerNameGroup.style.display = 'none';
            this.linkToggleAuth.textContent = "Hesabınız yok mu? Yeni Hesap Oluştur";
        }
    }

    getAuthData() {
        return {
            name: this.authName.value.trim(),
            email: this.authEmail.value.trim(),
            password: this.authPassword.value.trim()
        };
    }

    // ==========================================
    // B. KAMERA VE FOTOĞRAF METOTLARI
    // ==========================================
    async startCamera() {
        try {
            this.previewImg.style.display = 'none';
            this.videoPlayer.style.display = 'block';
            this.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
            this.videoPlayer.srcObject = this.stream;
            this.btnStartCam.style.display = 'none';
            this.btnCapture.style.display = 'inline-block';
        } catch (err) {
            alert("Kamera açma hatası.");
        }
    }

    stopCamera() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.videoPlayer.srcObject = null;
        }
        this.btnStartCam.style.display = 'inline-block';
        this.btnCapture.style.display = 'none';
    }

    capturePhoto(onCaptureCallback) {
        const canvas = document.createElement('canvas');
        canvas.width = this.videoPlayer.videoWidth || 640;
        canvas.height = this.videoPlayer.videoHeight || 480;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(this.videoPlayer, 0, 0, canvas.width, canvas.height);
        this.stopCamera();
        canvas.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            this.previewImg.src = url;
            this.videoPlayer.style.display = 'none';
            this.previewImg.style.display = 'block';
            if (onCaptureCallback) onCaptureCallback(blob);
        }, 'image/jpeg', 0.9);
    }

    showFilePreview(file) {
        this.stopCamera();
        const url = URL.createObjectURL(file);
        this.videoPlayer.style.display = 'none';
        this.previewImg.src = url;
        this.previewImg.style.display = 'block';
    }

    // 🔥 YENİ EKLENEN MADDE: Toplu İşlem Bilgi Kutusu Çıktısı
    showBulkStatus(message, show = true) {
        if (show) {
            this.bulkStatusAlert.style.display = 'block';
            this.bulkStatusAlert.innerHTML = message;
        } else {
            this.bulkStatusAlert.style.display = 'none';
        }
    }

    // ==========================================
    // C. FORM VE TABLO METOTLARI
    // ==========================================
    toggleSpinner(show) {
        this.loadingSpinner.style.display = show ? 'inline-block' : 'none';
    }

    populateForm(data) {
        document.getElementById('ad_soyad').value = data.ad_soyad || "";
        document.getElementById('unvan').value = data.unvan || "";
        document.getElementById('sirket').value = data.sirket || "";
        document.getElementById('telefon').value = data.telefon || "";
        document.getElementById('email').value = data.email || "";
        document.getElementById('website').value = data.website || "";
        document.getElementById('adres').value = data.adres || "";
        document.getElementById('qr_veri').value = data.qr_veri || "";
        document.getElementById('notlar').value = ""; 
    }

    getFormData() {
        return {
            ad_soyad: document.getElementById('ad_soyad').value.trim(),
            unvan: document.getElementById('unvan').value.trim(),
            sirket: document.getElementById('sirket').value.trim(),
            telefon: document.getElementById('telefon').value.trim(),
            email: document.getElementById('email').value.trim(),
            website: document.getElementById('website').value.trim(),
            adres: document.getElementById('adres').value.trim(),
            notlar: document.getElementById('notlar').value.trim(),
            qr_veri: document.getElementById('qr_veri').value
        };
    }

    clearForm() {
        this.cardForm.reset();
        document.getElementById('qr_veri').value = "";
        this.previewImg.style.display = 'none';
        this.videoPlayer.style.display = 'none';
        this.btnStartCam.style.display = 'inline-block';
        this.btnCapture.style.display = 'none';
        this.btnFileUploader.value = "";
        this.showBulkStatus("", false); // Toplu durum kutusunu temizle
    }

    renderHistoryTable(dataSet, onDownloadVcfClick) {
        this.historyTableBody.innerHTML = "";
        if (!dataSet || dataSet.length === 0) {
            this.historyTableBody.innerHTML = `<tr><td colspan="6" class="text-center text-muted">Henüz kayıtlı kartvizit bulunamadı.</td></tr>`;
            return;
        }
        dataSet.forEach(item => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="fw-bold">${item.ad_soyad || '-'}</td>
                <td><span class="badge bg-light text-dark">${item.unvan || '-'}</span></td>
                <td>${item.sirket || '-'}</td>
                <td>${item.telefon || '-'}</td>
                <td><a href="mailto:${item.email}">${item.email || '-'}</a></td>
                <td><button class="btn btn-primary btn-sm vcf-action-btn">📥 vCard</button></td>
            `;
            tr.querySelector('.vcf-action-btn').addEventListener('click', () => {
                if (onDownloadVcfClick) onDownloadVcfClick(item);
            });
            this.historyTableBody.appendChild(tr);
        });
    }

    // ==========================================
    // D. VERİ ANALİTİĞİ VE CHART.JS MOTORU
    // ==========================================
    renderCharts(dataSet) {
        if (!dataSet || dataSet.length === 0) return;

        if (this.activeCharts.company) this.activeCharts.company.destroy();
        if (this.activeCharts.title) this.activeCharts.title.destroy();
        if (this.activeCharts.timeline) this.activeCharts.timeline.destroy();

        const companyMap = {};
        const titleMap = {};
        const timelineMap = {};

        dataSet.forEach(item => {
            const comp = (item.sirket || "Bilinmeyen Şirket").trim();
            companyMap[comp] = (companyMap[comp] || 0) + 1;

            let rawTitle = (item.unvan || "Diğer").trim().toLowerCase();
            let finalTitle = "Diğer";
            if (rawTitle.includes("mühendis") || rawTitle.includes("eng")) finalTitle = "Mühendis";
            else if (rawTitle.includes("müdür") || rawTitle.includes("manager")) finalTitle = "Yönetici/Müdür";
            else if (rawTitle.includes("kurucu") || rawTitle.includes("ceo") || rawTitle.includes("found")) finalTitle = "C-Level / Kurucu";
            else if (rawTitle.includes("staj") || rawTitle.includes("intern")) finalTitle = "Stajyer";
            else if (item.unvan) finalTitle = item.unvan;
            
            titleMap[finalTitle] = (titleMap[finalTitle] || 0) + 1;

            if (item.createdAt) {
                const dateStr = item.createdAt.substring(0, 10);
                timelineMap[dateStr] = (timelineMap[dateStr] || 0) + 1;
            }
        });

        const compLabels = Object.keys(companyMap);
        const compValues = Object.values(companyMap);
        const ctxCompany = document.getElementById('chartCompany').getContext('2d');
        this.activeCharts.company = new Chart(ctxCompany, {
            type: 'pie',
            data: {
                labels: compLabels,
                datasets: [{ data: compValues, backgroundColor: ['#0d6efd', '#198754', '#ffc107', '#dc3545', '#6c757d', '#0dcaf0'] }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });

        const titleLabels = Object.keys(titleMap);
        const titleValues = Object.values(titleMap);
        const ctxTitle = document.getElementById('chartTitle').getContext('2d');
        this.activeCharts.title = new Chart(ctxTitle, {
            type: 'bar',
            data: { labels: titleLabels, datasets: [{ label: 'Kişi Sayısı', data: titleValues, backgroundColor: '#198754' }] },
            options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }
        });

        const timelineLabels = Object.keys(timelineMap).sort();
        const timelineValues = timelineLabels.map(date => timelineMap[date]);
        const ctxTimeline = document.getElementById('chartTimeline').getContext('2d');
        this.activeCharts.timeline = new Chart(ctxTimeline, {
            type: 'line',
            data: { labels: timelineLabels, datasets: [{ label: 'Taranan Kartvizit', data: timelineValues, borderColor: '#0d6efd', backgroundColor: 'rgba(13, 110, 253, 0.1)', fill: true, tension: 0.3 }] },
            options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }
        });
    }
}

export default CardView;