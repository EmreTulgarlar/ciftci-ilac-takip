// TarımTakip - Çoklu Kullanıcı Giriş & İlaç Takip Sistemi

// State variables
let sprays = [];
let currentFilter = 'all';
let searchQuery = '';

// DOM Layout Containers
const appContainer = document.getElementById('app-container');
const authContainer = document.getElementById('auth-container');
const viewDashboard = document.getElementById('view-dashboard');
const viewAdmin = document.getElementById('view-admin');

// DOM Dashboard/List Elements
const spraysGrid = document.getElementById('sprays-grid');
const emptyState = document.getElementById('empty-state');
const resultsCount = document.getElementById('results-count');
const liveDateEl = document.getElementById('live-date');
const userDisplayName = document.getElementById('user-display-name');

// Modal Elements (Spray Log)
const sprayModal = document.getElementById('spray-modal');
const sprayForm = document.getElementById('spray-form');
const modalTitle = document.getElementById('modal-title');
const openModalBtn = document.getElementById('open-modal-btn');
const emptyStateBtn = document.getElementById('empty-state-btn');
const closeModalBtn = document.getElementById('close-modal-btn');
const cancelModalBtn = document.getElementById('cancel-modal-btn');

// Form Input Elements (Spray Log)
const inputId = document.getElementById('spray-id');
const inputCrop = document.getElementById('input-crop');
const inputPesticide = document.getElementById('input-pesticide');
const inputDate = document.getElementById('input-date');
const inputDuration = document.getElementById('input-duration');
const inputPhi = document.getElementById('input-phi');
const inputDosage = document.getElementById('input-dosage');
const inputPest = document.getElementById('input-pest');
const inputNotes = document.getElementById('input-notes');
const saveBtn = document.getElementById('save-btn');

// Settings Modal Elements
const settingsModal = document.getElementById('settings-modal');
const settingsForm = document.getElementById('settings-form');
const navSettings = document.getElementById('nav-settings');
const closeSettingsBtn = document.getElementById('close-settings-btn');
const cancelSettingsBtn = document.getElementById('cancel-settings-btn');
const testEmailBtn = document.getElementById('test-email-btn');

// Settings Form Input Elements
const inputSmtpServer = document.getElementById('input-smtp-server');
const inputSmtpPort = document.getElementById('input-smtp-port');
const inputSmtpUser = document.getElementById('input-smtp-user');
const inputSmtpPass = document.getElementById('input-smtp-pass');
const inputRecipientEmail = document.getElementById('input-recipient-email');

// Authentication DOM Elements
const loginView = document.getElementById('login-view');
const registerView = document.getElementById('register-view');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const switchToRegister = document.getElementById('switch-to-register');
const switchToLogin = document.getElementById('switch-to-login');
const navLogout = document.getElementById('nav-logout');

// Admin Panel DOM Elements
const navAdmin = document.getElementById('nav-admin');
const adminUsersCount = document.getElementById('admin-users-count');
const adminUsersTbody = document.getElementById('admin-users-tbody');
const adminSpraysModal = document.getElementById('admin-sprays-modal');
const adminUserSpraysGrid = document.getElementById('admin-user-sprays-grid');
const closeAdminSpraysBtn = document.getElementById('close-admin-sprays-btn');
const adminSpraysModalTitle = document.getElementById('admin-sprays-modal-title');

// Search and Filter Elements
const searchInput = document.getElementById('search-input');
const filterTabs = document.querySelectorAll('.filter-tab');

// Stat Display Elements
const statActiveSprays = document.getElementById('stat-active-sprays');
const statHarvestWaiting = document.getElementById('stat-harvest-waiting');
const statHarvestSafe = document.getElementById('stat-harvest-safe');
const statTotalSprays = document.getElementById('stat-total-sprays');

// Initial Mock Data (Fallback when offline/not registered)
const mockSprays = [
    {
        id: 'mock-1',
        crop: 'Elma (Amasya)',
        pesticide: 'Kırmızı Örümcek İlacı (Acaricide)',
        date: getPastDateString(2),
        duration: 14,
        phi: 7,
        dosage: '100 ml / 100 Lt Su',
        pest: 'Kırmızı Örümcek',
        notes: 'Giriş yaptıktan sonra kendi ilaçlarınızı kaydedip takip edebilirsiniz.'
    }
];

// Helper to get past dates ISO format
function getPastDateString(daysAgo) {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
}

// Fetch API Auth Wrapper
async function apiCall(url, method = 'GET', body = null) {
    const token = localStorage.getItem('tarim_takip_token');
    const headers = {
        'Content-Type': 'application/json'
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    
    const options = { method, headers };
    if (body) {
        options.body = JSON.stringify(body);
    }
    
    const res = await fetch(url, options);
    
    if (res.status === 401) {
        handleLogoutAction();
        throw new Error('Oturum süresi doldu. Lütfen tekrar giriş yapın.');
    }
    
    return res;
}

// App Initialization
document.addEventListener('DOMContentLoaded', () => {
    checkAuthState();
    setupEventListeners();
    updateLiveClock();
    setInterval(updateLiveClock, 60000);
});

// Check Auth token in localStorage
function checkAuthState() {
    const token = localStorage.getItem('tarim_takip_token');
    const userStr = localStorage.getItem('tarim_takip_user');
    
    if (token && userStr) {
        const user = JSON.parse(userStr);
        userDisplayName.textContent = user.name;
        
        // Show Admin Nav Link if user is admin
        if (user.is_admin) {
            navAdmin.style.display = 'flex';
        } else {
            navAdmin.style.display = 'none';
        }
        
        authContainer.style.display = 'none';
        appContainer.style.display = 'grid';
        switchView('dashboard'); // Always land on dashboard view on login/refresh
    } else {
        appContainer.style.display = 'none';
        authContainer.style.display = 'flex';
    }
}

async function initApp() {
    try {
        const res = await apiCall('/api/sprays');
        sprays = await res.json();
        renderUI();
    } catch (e) {
        console.error(e);
        showToast('Veriler sunucudan alınamadı.', 'error');
    }
}

// Switch between dashboard and admin panel views
function switchView(viewName) {
    // Remove active style from sidebar links
    document.getElementById('nav-dashboard').classList.remove('active');
    navAdmin.classList.remove('active');
    
    if (viewName === 'dashboard') {
        document.getElementById('nav-dashboard').classList.add('active');
        viewDashboard.style.display = 'block';
        viewAdmin.style.display = 'none';
        initApp();
    } else if (viewName === 'admin') {
        navAdmin.classList.add('active');
        viewDashboard.style.display = 'none';
        viewAdmin.style.display = 'block';
        loadAdminPanel();
    }
}

// Load registered users details for admin view
async function loadAdminPanel() {
    try {
        const res = await apiCall('/api/admin/users');
        const users = await res.json();
        
        adminUsersCount.textContent = `${users.length} kayıtlı çiftçi`;
        adminUsersTbody.innerHTML = '';
        
        if (users.length === 0) {
            adminUsersTbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--color-text-muted); padding: 2rem;">Sistemde henüz kayıtlı kullanıcı bulunmuyor.</td></tr>`;
            return;
        }
        
        users.forEach(u => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${escapeHtml(u.name)}</strong></td>
                <td>${escapeHtml(u.email)}</td>
                <td><span class="crop-badge">${u.spray_count} İlaçlama</span></td>
                <td>
                    <button class="btn btn-secondary btn-icon view-user-sprays-btn" data-id="${u.id}" data-name="${escapeHtml(u.name)}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 16px; height: 16px;">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                            <circle cx="12" cy="12" r="3"></circle>
                        </svg>
                        İlaçlamaları Gör
                    </button>
                </td>
            `;
            
            tr.querySelector('.view-user-sprays-btn').addEventListener('click', () => {
                openAdminUserSpraysModal(u.id, u.name);
            });
            
            adminUsersTbody.appendChild(tr);
        });
    } catch (e) {
        showToast('Kullanıcı listesi yüklenemedi.', 'error');
    }
}

// Open modal to view selected user sprays
async function openAdminUserSpraysModal(targetUserId, targetUserName) {
    try {
        adminSpraysModalTitle.textContent = `${targetUserName} - İlaçlama Kayıtları`;
        adminUserSpraysGrid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: var(--color-text-secondary); padding: 2rem;">Yükleniyor...</div>';
        adminSpraysModal.classList.add('open');
        
        const res = await apiCall(`/api/admin/users/${targetUserId}/sprays`);
        const userSprays = await res.json();
        
        adminUserSpraysGrid.innerHTML = '';
        
        if (userSprays.length === 0) {
            adminUserSpraysGrid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: var(--color-text-muted); padding: 3rem;">Çiftçiye ait kayıtlı ilaçlama bulunmuyor.</div>';
            return;
        }
        
        userSprays.forEach(item => {
            const metrics = calculateSprayMetrics(item);
            
            let badgeClass = 'status-expired';
            if (metrics.status === 'active-protection') badgeClass = 'status-active-protection';
            if (metrics.status === 'harvest-warning') badgeClass = 'status-harvest-warning';
            if (metrics.status === 'harvest-safe') badgeClass = 'status-harvest-safe';
            
            const card = document.createElement('div');
            card.className = 'spray-card';
            card.innerHTML = `
                <div class="card-header-row">
                    <span class="crop-badge">${escapeHtml(item.crop)}</span>
                    <span class="status-badge ${badgeClass}">${metrics.statusText}</span>
                </div>
                <div>
                    <h4 class="pesticide-title">${escapeHtml(item.pesticide)}</h4>
                    <div class="card-notes">${item.pest ? `Hedef: ${escapeHtml(item.pest)}` : 'Hedef: Genel Koruma'}</div>
                </div>
                
                <div class="spray-details">
                    <div class="detail-item">
                        <span class="label">Uygulama Zamanı</span>
                        <span class="val">${metrics.sprayDateFormatted}</span>
                    </div>
                    <div class="detail-item">
                        <span class="label">Dozaj</span>
                        <span class="val">${item.dosage ? escapeHtml(item.dosage) : 'Belirtilmedi'}</span>
                    </div>
                </div>
                
                <div class="progress-section">
                    <div class="progress-group">
                        <div class="progress-header">
                            <span>Pestisit Koruma Süresi</span>
                            <span>${metrics.protectionDaysLeft > 0 ? `${metrics.protectionDaysLeft} Gün Kaldı` : 'Süre Doldu'}</span>
                        </div>
                        <div class="progress-bar-container">
                            <div class="progress-bar ${metrics.protectionDaysLeft > 0 ? 'pb-protection' : 'pb-expired'}" style="width: ${metrics.protectionPercent}%"></div>
                        </div>
                        <div class="progress-header" style="font-size: 0.65rem; color: var(--color-text-muted);">
                            <span>Uygulama: ${new Date(item.date).toLocaleDateString('tr-TR')}</span>
                            <span>Bitiş: ${metrics.protectionEndDateStr}</span>
                        </div>
                    </div>
                    <div class="progress-group">
                        <div class="progress-header">
                            <span>Hasat Güvenlik Aralığı (PHI)</span>
                            <span>${metrics.harvestDaysLeft > 0 ? `${metrics.harvestDaysLeft} Gün Yasak` : 'Hasat Güvenli'}</span>
                        </div>
                        <div class="progress-bar-container">
                            <div class="progress-bar ${metrics.harvestDaysLeft > 0 ? 'pb-harvest' : 'pb-protection'}" style="width: ${metrics.harvestPercent}%"></div>
                        </div>
                        <div class="progress-header" style="font-size: 0.65rem; color: var(--color-text-muted);">
                            <span>Gerekli Süre: ${item.phi} Gün</span>
                            <span>Güvenli Tarih: ${metrics.harvestEndDateStr}</span>
                        </div>
                    </div>
                </div>
                ${item.notes ? `<p class="card-notes" title="${escapeHtml(item.notes)}"><strong>Not:</strong> ${escapeHtml(item.notes)}</p>` : ''}
            `;
            adminUserSpraysGrid.appendChild(card);
        });
    } catch (e) {
        showToast('Çiftçi ilaç kayıtları alınamadı.', 'error');
    }
}

// Date time utilities
function updateLiveClock() {
    const options = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    const now = new Date();
    liveDateEl.textContent = now.toLocaleDateString('tr-TR', options);
}

// Toast manager
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.style.borderColor = type === 'success' ? 'var(--color-primary)' : 'var(--color-danger)';
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Calculations and Status determination
function calculateSprayMetrics(spray) {
    const now = new Date();
    const sprayTime = new Date(spray.date);
    
    const durationMs = spray.duration * 24 * 60 * 60 * 1000;
    const phiMs = spray.phi * 24 * 60 * 60 * 1000;
    
    const protectionEndTime = new Date(sprayTime.getTime() + durationMs);
    const harvestSafetyEndTime = new Date(sprayTime.getTime() + phiMs);
    
    const protectionRemainingMs = protectionEndTime - now;
    const harvestRemainingMs = harvestSafetyEndTime - now;
    
    const protectionDaysLeft = Math.max(0, Math.ceil(protectionRemainingMs / (24 * 60 * 60 * 1000)));
    const harvestDaysLeft = Math.max(0, Math.ceil(harvestRemainingMs / (24 * 60 * 60 * 1000)));
    
    const elapsedProtection = now - sprayTime;
    const protectionPercent = Math.max(0, Math.min(100, (1 - elapsedProtection / durationMs) * 100));
    
    let harvestPercent = 100;
    if (phiMs > 0) {
        const elapsedHarvest = now - sprayTime;
        harvestPercent = Math.max(0, Math.min(100, (elapsedHarvest / phiMs) * 100));
    }

    let status = 'expired';
    let statusText = 'Etki Süresi Doldu';
    
    if (protectionDaysLeft > 0 && harvestDaysLeft > 0) {
        status = 'harvest-warning';
        statusText = 'Koruma Aktif & Hasat Yasağı';
    } else if (protectionDaysLeft > 0 && harvestDaysLeft <= 0) {
        status = 'active-protection';
        statusText = 'Aktif Koruma & Hasada Hazır';
    } else if (protectionDaysLeft <= 0 && harvestDaysLeft <= 0) {
        status = 'harvest-safe';
        statusText = 'Etki Bitti & Güvenli Hasat';
    } else if (protectionDaysLeft <= 0 && harvestDaysLeft > 0) {
        status = 'harvest-warning';
        statusText = 'Etki Bitti & Hasat Yasağı';
    }

    return {
        protectionDaysLeft,
        harvestDaysLeft,
        protectionPercent,
        harvestPercent,
        status,
        statusText,
        protectionEndDateStr: protectionEndTime.toLocaleDateString('tr-TR'),
        harvestEndDateStr: harvestSafetyEndTime.toLocaleDateString('tr-TR'),
        sprayDateFormatted: sprayTime.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    };
}

// Render UI Components
function renderUI() {
    let filtered = [...sprays];

    filtered = filtered.map(spray => {
        const metrics = calculateSprayMetrics(spray);
        return { ...spray, metrics };
    });

    // Apply Search
    if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(item => 
            item.pesticide.toLowerCase().includes(query) ||
            item.crop.toLowerCase().includes(query) ||
            (item.pest && item.pest.toLowerCase().includes(query))
        );
    }

    // Apply Filters
    if (currentFilter === 'active') {
        filtered = filtered.filter(item => item.metrics.protectionDaysLeft > 0);
    } else if (currentFilter === 'waiting') {
        filtered = filtered.filter(item => item.metrics.harvestDaysLeft > 0);
    } else if (currentFilter === 'safe') {
        filtered = filtered.filter(item => item.metrics.harvestDaysLeft === 0);
    } else if (currentFilter === 'expired') {
        filtered = filtered.filter(item => item.metrics.protectionDaysLeft === 0);
    }

    filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

    updateStats();

    resultsCount.textContent = `${filtered.length} kayıt listeleniyor`;
    spraysGrid.innerHTML = '';
    
    if (filtered.length === 0) {
        if (sprays.length === 0) {
            emptyState.style.display = 'flex';
            emptyState.querySelector('h4').textContent = 'Henüz kayıtlı ilaçlama bulunmuyor';
            emptyState.querySelector('p').textContent = 'Tarlanızdaki ilaçlama faaliyetlerini ve koruma sürelerini takip etmek için ilk kaydınızı oluşturun.';
        } else {
            emptyState.style.display = 'flex';
            emptyState.querySelector('h4').textContent = 'Eşleşen kayıt bulunamadı';
            emptyState.querySelector('p').textContent = 'Farklı arama kelimeleri deneyebilir veya filtreyi değiştirebilirsiniz.';
        }
        spraysGrid.appendChild(emptyState);
    } else {
        emptyState.style.display = 'none';
        filtered.forEach(item => {
            const card = createSprayCardElement(item);
            spraysGrid.appendChild(card);
        });
    }
}

function updateStats() {
    let activeProtection = 0;
    let harvestWaiting = 0;
    let harvestSafe = 0;

    sprays.forEach(spray => {
        const metrics = calculateSprayMetrics(spray);
        if (metrics.protectionDaysLeft > 0) activeProtection++;
        if (metrics.harvestDaysLeft > 0) harvestWaiting++;
        if (metrics.harvestDaysLeft === 0) harvestSafe++;
    });

    statActiveSprays.textContent = activeProtection;
    statHarvestWaiting.textContent = harvestWaiting;
    statHarvestSafe.textContent = harvestSafe;
    statTotalSprays.textContent = sprays.length;
}

function createSprayCardElement(item) {
    const metrics = item.metrics;
    const card = document.createElement('div');
    card.className = 'spray-card';
    card.setAttribute('data-id', item.id);

    let badgeClass = 'status-expired';
    if (metrics.status === 'active-protection') badgeClass = 'status-active-protection';
    if (metrics.status === 'harvest-warning') badgeClass = 'status-harvest-warning';
    if (metrics.status === 'harvest-safe') badgeClass = 'status-harvest-safe';

    card.innerHTML = `
        <div class="card-header-row">
            <span class="crop-badge">${escapeHtml(item.crop)}</span>
            <span class="status-badge ${badgeClass}">${metrics.statusText}</span>
        </div>
        <div>
            <h4 class="pesticide-title">${escapeHtml(item.pesticide)}</h4>
            <div class="card-notes">${item.pest ? `Hedef: ${escapeHtml(item.pest)}` : 'Hedef: Genel Koruma'}</div>
        </div>
        
        <div class="spray-details">
            <div class="detail-item">
                <span class="label">Uygulama Zamanı</span>
                <span class="val">${metrics.sprayDateFormatted}</span>
            </div>
            <div class="detail-item">
                <span class="label">Dozaj</span>
                <span class="val">${item.dosage ? escapeHtml(item.dosage) : 'Belirtilmedi'}</span>
            </div>
        </div>

        <div class="progress-section">
            <div class="progress-group">
                <div class="progress-header">
                    <span>Pestisit Koruma Süresi</span>
                    <span>${metrics.protectionDaysLeft > 0 ? `${metrics.protectionDaysLeft} Gün Kaldı` : 'Süre Doldu'}</span>
                </div>
                <div class="progress-bar-container">
                    <div class="progress-bar ${metrics.protectionDaysLeft > 0 ? 'pb-protection' : 'pb-expired'}" style="width: ${metrics.protectionPercent}%"></div>
                </div>
                <div class="progress-header" style="font-size: 0.65rem; color: var(--color-text-muted);">
                    <span>Uygulama: ${new Date(item.date).toLocaleDateString('tr-TR')}</span>
                    <span>Bitiş: ${metrics.protectionEndDateStr}</span>
                </div>
            </div>

            <div class="progress-group">
                <div class="progress-header">
                    <span>Hasat Güvenlik Aralığı (PHI)</span>
                    <span>${metrics.harvestDaysLeft > 0 ? `${metrics.harvestDaysLeft} Gün Yasak` : 'Hasat Güvenli'}</span>
                </div>
                <div class="progress-bar-container">
                    <div class="progress-bar ${metrics.harvestDaysLeft > 0 ? 'pb-harvest' : 'pb-protection'}" style="width: ${metrics.harvestPercent}%"></div>
                </div>
                <div class="progress-header" style="font-size: 0.65rem; color: var(--color-text-muted);">
                    <span>Gerekli Süre: ${item.phi} Gün</span>
                    <span>Güvenli Tarih: ${metrics.harvestEndDateStr}</span>
                </div>
            </div>
        </div>

        ${item.notes ? `<p class="card-notes" title="${escapeHtml(item.notes)}"><strong>Not:</strong> ${escapeHtml(item.notes)}</p>` : ''}

        <div class="card-actions">
            <button class="btn btn-secondary btn-icon edit-btn" title="Düzenle">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                    <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
            </button>
            <button class="btn btn-danger btn-icon delete-btn" title="Sil">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    <line x1="10" y1="11" x2="10" y2="17"></line>
                    <line x1="14" y1="11" x2="14" y2="17"></line>
                </svg>
            </button>
        </div>
    `;

    card.querySelector('.delete-btn').addEventListener('click', () => {
        deleteSpray(item.id);
    });

    card.querySelector('.edit-btn').addEventListener('click', () => {
        openEditModal(item);
    });

    return card;
}

function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Delete Operation
async function deleteSpray(id) {
    if (confirm('Bu ilaçlama kaydını silmek istediğinizden emin misiniz?')) {
        try {
            await apiCall(`/api/sprays/${id}`, 'DELETE');
            sprays = sprays.filter(item => item.id !== id);
            renderUI();
            showToast('İlaçlama kaydı başarıyla silindi.', 'success');
        } catch (e) {
            showToast('Silme işlemi başarısız oldu.', 'error');
        }
    }
}

// Add and Edit Modal Management
function openAddModal() {
    modalTitle.textContent = 'Yeni İlaçlama Kaydı';
    saveBtn.textContent = 'Kaydet ve Takibe Başla';
    
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    inputDate.value = now.toISOString().slice(0, 16);
    
    inputId.value = '';
    inputCrop.value = '';
    inputPesticide.value = '';
    inputDuration.value = '';
    inputPhi.value = '';
    inputDosage.value = '';
    inputPest.value = '';
    inputNotes.value = '';
    
    sprayModal.classList.add('open');
}

function openEditModal(item) {
    modalTitle.textContent = 'İlaçlama Kaydını Düzenle';
    saveBtn.textContent = 'Değişiklikleri Kaydet';
    
    inputId.value = item.id;
    inputCrop.value = item.crop;
    inputPesticide.value = item.pesticide;
    inputDate.value = item.date;
    inputDuration.value = item.duration;
    inputPhi.value = item.phi;
    inputDosage.value = item.dosage || '';
    inputPest.value = item.pest || '';
    inputNotes.value = item.notes || '';
    
    sprayModal.classList.add('open');
}

function closeModal() {
    sprayModal.classList.remove('open');
}

// Event Listeners setup
function setupEventListeners() {
    // Modal controls
    openModalBtn.addEventListener('click', openAddModal);
    emptyStateBtn.addEventListener('click', openAddModal);
    closeModalBtn.addEventListener('click', closeModal);
    cancelModalBtn.addEventListener('click', closeModal);
    
    sprayModal.addEventListener('click', (e) => {
        if (e.target === sprayModal) closeModal();
    });

    // Form submission
    sprayForm.addEventListener('submit', (e) => {
        e.preventDefault();
        saveForm();
    });

    // Filtering tabs selection
    filterTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            filterTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentFilter = tab.getAttribute('data-filter');
            renderUI();
        });
    });

    // Search bar listener
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        renderUI();
    });

    // Send report listener (mailto)
    const sendReportBtn = document.getElementById('send-report-btn');
    if (sendReportBtn) {
        sendReportBtn.addEventListener('click', sendEmailReport);
    }

    // Settings modal controls
    if (navSettings) navSettings.addEventListener('click', openSettingsModal);
    if (closeSettingsBtn) closeSettingsBtn.addEventListener('click', closeSettingsModal);
    if (cancelSettingsBtn) cancelSettingsBtn.addEventListener('click', closeSettingsModal);
    
    if (settingsModal) {
        settingsModal.addEventListener('click', (e) => {
            if (e.target === settingsModal) closeSettingsModal();
        });
    }
    
    if (settingsForm) settingsForm.addEventListener('submit', saveSettings);
    if (testEmailBtn) testEmailBtn.addEventListener('click', testSmtpConnection);

    // Switch sidebar links between Dashboard and Admin View
    document.getElementById('nav-dashboard').addEventListener('click', (e) => {
        e.preventDefault();
        switchView('dashboard');
    });

    if (navAdmin) {
        navAdmin.addEventListener('click', (e) => {
            e.preventDefault();
            switchView('admin');
        });
    }

    // Close admin sprays detail modal
    if (closeAdminSpraysBtn) {
        closeAdminSpraysBtn.addEventListener('click', () => {
            adminSpraysModal.classList.remove('open');
        });
    }
    if (adminSpraysModal) {
        adminSpraysModal.addEventListener('click', (e) => {
            if (e.target === adminSpraysModal) {
                adminSpraysModal.classList.remove('open');
            }
        });
    }

    // Authentication Views switching
    switchToRegister.addEventListener('click', (e) => {
        e.preventDefault();
        loginView.style.display = 'none';
        registerView.style.display = 'block';
    });

    switchToLogin.addEventListener('click', (e) => {
        e.preventDefault();
        registerView.style.display = 'none';
        loginView.style.display = 'block';
    });

    // Login Form Submit
    loginForm.addEventListener('submit', handleLogin);
    
    // Register Form Submit
    registerForm.addEventListener('submit', handleRegister);

    // Logout click listener
    navLogout.addEventListener('click', (e) => {
        e.preventDefault();
        handleLogout();
    });
}

// User Authentication handler functions
async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    try {
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const result = await res.json();
        
        if (result.status === 'success') {
            localStorage.setItem('tarim_takip_token', result.token);
            localStorage.setItem('tarim_takip_user', JSON.stringify(result.user));
            
            showToast('Başarıyla giriş yapıldı. Hoş geldiniz!', 'success');
            loginForm.reset();
            checkAuthState();
        } else {
            showToast(result.message, 'error');
        }
    } catch (err) {
        showToast('Bağlantı hatası. Giriş yapılamadı.', 'error');
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const name = document.getElementById('register-name').value.trim();
    const email = document.getElementById('register-email').value.trim();
    const password = document.getElementById('register-password').value;

    if (password.length < 6) {
        showToast('Şifre en az 6 karakter olmalıdır.', 'error');
        return;
    }

    try {
        const res = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password })
        });
        const result = await res.json();
        
        if (result.status === 'success') {
            showToast('Hesabınız oluşturuldu! Şimdi giriş yapabilirsiniz.', 'success');
            registerForm.reset();
            registerView.style.display = 'none';
            loginView.style.display = 'block';
        } else {
            showToast(result.message, 'error');
        }
    } catch (err) {
        showToast('Bağlantı hatası. Kayıt yapılamadı.', 'error');
    }
}

async function handleLogout() {
    if (confirm('Çıkış yapmak istediğinizden emin misiniz?')) {
        try {
            await apiCall('/api/auth/logout', 'POST');
        } catch (e) {
            // Ignore
        }
        handleLogoutAction();
    }
}

function handleLogoutAction() {
    localStorage.removeItem('tarim_takip_token');
    localStorage.removeItem('tarim_takip_user');
    
    sprays = [];
    spraysGrid.innerHTML = '';
    
    showToast('Oturum sonlandırıldı.', 'success');
    checkAuthState();
}

async function saveForm() {
    const id = inputId.value;
    const sprayData = {
        id: id || 'spray-' + Date.now(),
        crop: inputCrop.value.trim(),
        pesticide: inputPesticide.value.trim(),
        date: inputDate.value,
        duration: parseInt(inputDuration.value),
        phi: parseInt(inputPhi.value),
        dosage: inputDosage.value.trim(),
        pest: inputPest.value.trim(),
        notes: inputNotes.value.trim()
    };

    try {
        if (id) {
            // Edit Mode
            await apiCall(`/api/sprays/${id}`, 'PUT', sprayData);
            const index = sprays.findIndex(item => item.id === id);
            if (index !== -1) {
                sprays[index] = sprayData;
                showToast('İlaçlama kaydı başarıyla güncellendi.', 'success');
            }
        } else {
            // Create Mode
            await apiCall('/api/sprays', 'POST', sprayData);
            sprays.push(sprayData);
            showToast('Yeni ilaçlama kaydı oluşturuldu.', 'success');
        }
        closeModal();
        renderUI();
    } catch (e) {
        showToast('Kayıt işlemi başarısız oldu.', 'error');
    }
}

async function openSettingsModal() {
    try {
        const res = await apiCall('/api/settings');
        const config = await res.json();
        
        inputSmtpServer.value = config.smtp_server || '';
        inputSmtpPort.value = config.smtp_port || 587;
        inputSmtpUser.value = config.smtp_username || '';
        inputSmtpPass.value = config.smtp_password || '';
        inputRecipientEmail.value = config.recipient_email || '';
        
        settingsModal.classList.add('open');
    } catch (e) {
        showToast('Ayarlar yüklenemedi.', 'error');
    }
}

function closeSettingsModal() {
    settingsModal.classList.remove('open');
}

async function saveSettings(e) {
    e.preventDefault();
    const config = {
        smtp_server: inputSmtpServer.value.trim(),
        smtp_port: parseInt(inputSmtpPort.value),
        smtp_username: inputSmtpUser.value.trim(),
        smtp_password: inputSmtpPass.value,
        recipient_email: inputRecipientEmail.value.trim()
    };
    
    try {
        const res = await apiCall('/api/settings', 'POST', config);
        const result = await res.json();
        if (result.status === 'success') {
            showToast('Sistem ayarları kaydedildi.', 'success');
            closeSettingsModal();
        } else {
            showToast('Ayarlar kaydedilemedi.', 'error');
        }
    } catch (e) {
        showToast('Ayarlar kaydedilemedi.', 'error');
    }
}

async function testSmtpConnection() {
    const config = {
        smtp_server: inputSmtpServer.value.trim(),
        smtp_port: parseInt(inputSmtpPort.value),
        smtp_username: inputSmtpUser.value.trim(),
        smtp_password: inputSmtpPass.value,
        recipient_email: inputRecipientEmail.value.trim()
    };
    
    showToast('Bağlantı test ediliyor, lütfen bekleyin...', 'info');
    try {
        const res = await apiCall('/api/test-email', 'POST', config);
        const result = await res.json();
        if (result.status === 'success') {
            showToast('Test maili başarıyla gönderildi!', 'success');
        } else {
            showToast('Bağlantı başarısız: ' + result.message, 'error');
        }
    } catch (e) {
        showToast('Bağlantı test edilemedi.', 'error');
    }
}

function sendEmailReport() {
    if (sprays.length === 0) {
        showToast('Gönderilecek ilaçlama kaydı bulunmuyor.', 'error');
        return;
    }

    const todayStr = new Date().toLocaleDateString('tr-TR');
    let emailBody = `TarımTakip - Çiftçi İlaçlama ve Hasat Durum Raporu\n`;
    emailBody += `Tarih: ${todayStr}\n`;
    emailBody += `=========================================\n\n`;

    let harvestWarningText = '';
    let activeProtectionText = '';
    let expiredText = '';

    sprays.forEach(spray => {
        const metrics = calculateSprayMetrics(spray);
        const detailStr = `• Ürün: ${spray.crop}\n  Kullanılan İlaç: ${spray.pesticide}\n  İlaçlama Tarihi: ${new Date(spray.date).toLocaleString('tr-TR')}\n  Dozaj: ${spray.dosage || 'Belirtilmedi'}\n  Hedef Zararlı: ${spray.pest || 'Belirtilmedi'}\n  Etki Süresi: ${spray.duration} Gün (${metrics.protectionDaysLeft > 0 ? `${metrics.protectionDaysLeft} gün koruma kaldı` : 'süre bitti'})\n  Hasat Güvenlik Aralığı (PHI): ${spray.phi} Gün (${metrics.harvestDaysLeft > 0 ? `${metrics.harvestDaysLeft} gün hasat yasağı var` : 'hasat güvenli'})\n  Durum: ${metrics.statusText}\n${spray.notes ? `  Notlar: ${spray.notes}\n` : ''}\n`;

        if (metrics.harvestDaysLeft > 0) {
            harvestWarningText += detailStr;
        } else if (metrics.protectionDaysLeft > 0) {
            activeProtectionText += detailStr;
        } else {
            expiredText += detailStr;
        }
    });

    if (harvestWarningText) {
        emailBody += `⚠️ HASAT YAPILAMAZ ÜRÜNLER (Kalıntı Bekleme Süresi Devam Ediyor)\n`;
        emailBody += `-----------------------------------------\n`;
        emailBody += harvestWarningText;
    }

    if (activeProtectionText) {
        emailBody += `✅ KORUMA ALTINDA & HASADA HAZIR ÜRÜNLER (Güvenli Hasat Edilebilir)\n`;
        emailBody += `-----------------------------------------\n`;
        emailBody += activeProtectionText;
    }

    if (expiredText) {
        emailBody += `ℹ️ KORUMA SÜRESİ DOLMUŞ & HASADI GÜVENLİ ÜRÜNLER\n`;
        emailBody += `-----------------------------------------\n`;
        emailBody += expiredText;
    }

    emailBody += `\nBu rapor TarımTakip uygulaması tarafından otomatik olarak oluşturulmuştur.`;

    const subject = `TarımTakip Durum Raporu - ${todayStr}`;
    const mailtoUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(emailBody)}`;
    
    window.location.href = mailtoUrl;
    showToast('E-posta uygulaması açılıyor...', 'success');
}
