// TarımTakip - Çoklu Kullanıcı Giriş & İlaç Takip Sistemi

// State variables
let sprays = [];
let irrigations = [];
let otherExpenses = [];
let rawExpensesData = [];
let currentFilter = 'all';
let searchQuery = '';
let expensesChartInstance = null;

// DOM Layout Containers
const appContainer = document.getElementById('app-container');
const authContainer = document.getElementById('auth-container');
const viewDashboard = document.getElementById('view-dashboard');
const viewSprays = document.getElementById('view-sprays');
const viewIrrigations = document.getElementById('view-irrigations');
const viewOtherExpenses = document.getElementById('view-other-expenses');
const viewExpenses = document.getElementById('view-expenses');
const viewAdmin = document.getElementById('view-admin');

// DOM Dashboard/List Elements
const liveDateEl = document.getElementById('live-date');
const userDisplayName = document.getElementById('user-display-name');
const userDisplayFarm = document.getElementById('user-display-farm');

// Weather Recommendation Elements
const weatherCard = document.getElementById('weather-recommendation-card');
const weatherRecIcon = document.getElementById('weather-rec-icon');
const weatherRecSubtitle = document.getElementById('weather-rec-subtitle');
const weatherRecText = document.getElementById('weather-rec-text');

// Dashboard Summary Lists
const dashboardSpraysList = document.getElementById('dashboard-sprays-list');
const dashboardIrrigationsList = document.getElementById('dashboard-irrigations-list');
const dashboardOtherExpensesList = document.getElementById('dashboard-other-expenses-list');

// Decoupled Sprays View Elements
const spraysListGrid = document.getElementById('sprays-list-grid');
const spraysResultsCount = document.getElementById('sprays-results-count');
const spraysSearchInput = document.getElementById('sprays-search-input');
const spraysFilterTabs = document.getElementById('sprays-filter-tabs');
const openSprayModalBtnSprays = document.getElementById('open-spray-modal-btn-sprays');
const sendReportBtnSprays = document.getElementById('send-report-btn-sprays');

// Modal Elements (Spray Log)
const sprayModal = document.getElementById('spray-modal');
const sprayForm = document.getElementById('spray-form');
const modalTitle = document.getElementById('modal-title');
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
const inputPesticideCost = document.getElementById('input-pesticide-cost');
const inputPest = document.getElementById('input-pest');
const inputNotes = document.getElementById('input-notes');
const saveBtn = document.getElementById('save-btn');

// Irrigation DOM Lists
const irrigationsGrid = document.getElementById('irrigations-grid');
const irrigationsCount = document.getElementById('irrigations-count');

// Irrigation Modal
const irrigationModal = document.getElementById('irrigation-modal');
const irrigationForm = document.getElementById('irrigation-form');
const irrigationModalTitle = document.getElementById('irrigation-modal-title');
const openIrrigationModalBtn = document.getElementById('open-irrigation-modal-btn');
const closeIrrigationModalBtn = document.getElementById('close-irrigation-modal-btn');
const cancelIrrigationModalBtn = document.getElementById('cancel-irrigation-modal-btn');

// Irrigation Form Inputs
const inputIrrId = document.getElementById('irrigation-id');
const inputIrrDate = document.getElementById('input-irr-date');
const inputIrrAmount = document.getElementById('input-irr-amount');
const inputIrrCost = document.getElementById('input-irr-cost');
const inputIrrNotes = document.getElementById('input-irr-notes');

// Other Expenses DOM Lists
const otherExpensesGrid = document.getElementById('other-expenses-grid');
const otherExpensesCount = document.getElementById('other-expenses-count');

// Other Expense Modal
const otherExpenseModal = document.getElementById('other-expense-modal');
const otherExpenseForm = document.getElementById('other-expense-form');
const otherExpenseModalTitle = document.getElementById('other-expense-modal-title');
const openOtherExpenseModalBtn = document.getElementById('open-other-expense-modal-btn');
const closeOtherExpenseModalBtn = document.getElementById('close-other-expense-modal-btn');
const cancelOtherExpenseModalBtn = document.getElementById('cancel-other-expense-modal-btn');

// Other Expense Form Inputs
const inputExpId = document.getElementById('other-expense-id');
const inputExpTitle = document.getElementById('input-exp-title');
const inputExpCategory = document.getElementById('input-exp-category');
const inputExpAmount = document.getElementById('input-exp-amount');
const inputExpDate = document.getElementById('input-exp-date');
const inputExpNotes = document.getElementById('input-exp-notes');

// Expenses Summary Cards Elements
const expenseTotalEl = document.getElementById('expense-total');
const expensePesticideEl = document.getElementById('expense-pesticide');
const expenseWaterEl = document.getElementById('expense-water');
const expenseOtherEl = document.getElementById('expense-other');
const expenseRangeSelect = document.getElementById('expense-range-select');

// Settings Modal Elements
const settingsModal = document.getElementById('settings-modal');
const settingsForm = document.getElementById('settings-form');
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

// Sidebar Navigation Links
const navDashboard = document.getElementById('nav-dashboard');
const navSprays = document.getElementById('nav-sprays');
const navIrrigations = document.getElementById('nav-irrigations');
const navOtherExpenses = document.getElementById('nav-other-expenses');
const navExpenses = document.getElementById('nav-expenses');
const navSettings = document.getElementById('nav-settings');

// Admin Panel DOM Elements
const navAdmin = document.getElementById('nav-admin');
const adminUsersCount = document.getElementById('admin-users-count');
const adminUsersTbody = document.getElementById('admin-users-tbody');
const adminSpraysModal = document.getElementById('admin-sprays-modal');
const adminUserSpraysGrid = document.getElementById('admin-user-sprays-grid');
const closeAdminSpraysBtn = document.getElementById('close-admin-sprays-btn');
const adminSpraysModalTitle = document.getElementById('admin-sprays-modal-title');

// Stat Display Elements
const statActiveSprays = document.getElementById('stat-active-sprays');
const statHarvestWaiting = document.getElementById('stat-harvest-waiting');
const statHarvestSafe = document.getElementById('stat-harvest-safe');
const statTotalSprays = document.getElementById('stat-total-sprays');

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
        
        if (userDisplayFarm) {
            userDisplayFarm.textContent = `${user.farm_type || 'Belirtilmedi'} Çiftçisi`;
        }
        
        // Show weather recommendation card if location is specified
        if (user.location && user.location !== 'Belirtilmedi') {
            loadWeatherAdvice();
        } else {
            if (weatherCard) weatherCard.style.display = 'none';
        }
        
        // Show Admin Nav Link if user is admin
        if (user.is_admin) {
            navAdmin.style.display = 'flex';
        } else {
            navAdmin.style.display = 'none';
        }
        
        authContainer.style.display = 'none';
        appContainer.style.display = 'grid';
        switchView('dashboard');
    } else {
        appContainer.style.display = 'none';
        authContainer.style.display = 'flex';
    }
}

// Initialize Dashboard Data
async function initDashboard() {
    try {
        // Fetch stats & recent lists
        const resSprays = await apiCall('/api/sprays');
        sprays = await resSprays.json();
        
        const resIrr = await apiCall('/api/irrigations');
        irrigations = await resIrr.json();
        
        const resExp = await apiCall('/api/other-expenses');
        otherExpenses = await resExp.json();
        
        // Render stats counters
        updateStats();
        
        // Render recent activities lists (Dashboard Cards)
        renderDashboardSummaries();
    } catch (e) {
        console.error(e);
        showToast('Gösterge paneli verileri yüklenemedi.', 'error');
    }
}

// Render Son 3 Faaliyet lists inside Dashboard Summary columns
function renderDashboardSummaries() {
    // 1. Son 3 İlaçlama
    dashboardSpraysList.innerHTML = '';
    const recentSprays = sprays.slice(0, 3);
    if (recentSprays.length === 0) {
        dashboardSpraysList.innerHTML = `<div style="text-align: center; color: var(--color-text-muted); font-size: 0.8rem; padding: 1rem 0;">Kayıt bulunmuyor.</div>`;
    } else {
        recentSprays.forEach(item => {
            const metrics = calculateSprayMetrics(item);
            let statusBadgeColor = '#9e9e9e';
            if (metrics.status === 'active-protection') statusBadgeColor = '#00e676';
            if (metrics.status === 'harvest-warning') statusBadgeColor = '#ffab00';
            if (metrics.status === 'harvest-safe') statusBadgeColor = '#2979ff';
            
            const div = document.createElement('div');
            div.className = 'summary-item';
            div.innerHTML = `
                <div class="summary-item-left">
                    <span class="summary-item-title">${escapeHtml(item.pesticide)}</span>
                    <span class="summary-item-subtitle">${escapeHtml(item.crop)} • ${new Date(item.date).toLocaleDateString('tr-TR')}</span>
                </div>
                <span class="summary-item-right" style="color: ${statusBadgeColor};">${metrics.statusText}</span>
            `;
            dashboardSpraysList.appendChild(div);
        });
    }

    // 2. Son 3 Sulama
    dashboardIrrigationsList.innerHTML = '';
    const recentIrrigations = irrigations.slice(0, 3);
    if (recentIrrigations.length === 0) {
        dashboardIrrigationsList.innerHTML = `<div style="text-align: center; color: var(--color-text-muted); font-size: 0.8rem; padding: 1rem 0;">Kayıt bulunmuyor.</div>`;
    } else {
        recentIrrigations.forEach(item => {
            const div = document.createElement('div');
            div.className = 'summary-item';
            div.innerHTML = `
                <div class="summary-item-left">
                    <span class="summary-item-title">${item.water_amount ? `${item.water_amount} Ton Su` : 'Su Miktarı Yok'}</span>
                    <span class="summary-item-subtitle">${new Date(item.date).toLocaleDateString('tr-TR')}</span>
                </div>
                <span class="summary-item-right" style="color: #2979ff;">${item.water_cost ? `${item.water_cost.toFixed(2)} ₺` : '0.00 ₺'}</span>
            `;
            dashboardIrrigationsList.appendChild(div);
        });
    }

    // 3. Son 3 Harici Gider
    dashboardOtherExpensesList.innerHTML = '';
    const recentOther = otherExpenses.slice(0, 3);
    if (recentOther.length === 0) {
        dashboardOtherExpensesList.innerHTML = `<div style="text-align: center; color: var(--color-text-muted); font-size: 0.8rem; padding: 1rem 0;">Kayıt bulunmuyor.</div>`;
    } else {
        recentOther.forEach(item => {
            const div = document.createElement('div');
            div.className = 'summary-item';
            div.innerHTML = `
                <div class="summary-item-left">
                    <span class="summary-item-title">${escapeHtml(item.title)}</span>
                    <span class="summary-item-subtitle">${escapeHtml(item.category)} • ${new Date(item.date).toLocaleDateString('tr-TR')}</span>
                </div>
                <span class="summary-item-right" style="color: #9c27b0;">${item.amount ? `${item.amount.toFixed(2)} ₺` : '0.00 ₺'}</span>
            `;
            dashboardOtherExpensesList.appendChild(div);
        });
    }
}

// Get Weather recommendations based on User Location
async function loadWeatherAdvice() {
    try {
        const res = await apiCall('/api/weather/check');
        const data = await res.json();
        
        if (data.status === 'success') {
            weatherCard.style.display = 'block';
            weatherRecSubtitle.textContent = `${data.location} • Sıcaklık: ${data.temp}°C • Durum: ${data.desc}`;
            weatherRecText.textContent = data.recommendation;
            
            // Customize card style
            if (data.has_rained) {
                weatherRecIcon.textContent = '🌧️';
                weatherCard.classList.add('rainy');
            } else {
                const descLower = data.desc.toLowerCase();
                if (descLower.includes('yağmur') || descLower.includes('sağanak') || descLower.includes('çise')) {
                    weatherRecIcon.textContent = '🌦️';
                    weatherCard.classList.add('rainy');
                } else if (descLower.includes('güneş') || descLower.includes('açık')) {
                    weatherRecIcon.textContent = '☀️';
                    weatherCard.classList.remove('rainy');
                } else {
                    weatherRecIcon.textContent = '⛅';
                    weatherCard.classList.remove('rainy');
                }
            }
        } else {
            if (weatherCard) weatherCard.style.display = 'none';
        }
    } catch (e) {
        console.error('Weather advice fetch error:', e);
        if (weatherCard) weatherCard.style.display = 'none';
    }
}

// Switch between SPA views
function switchView(viewName) {
    navDashboard.classList.remove('active');
    navSprays.classList.remove('active');
    navIrrigations.classList.remove('active');
    navOtherExpenses.classList.remove('active');
    navExpenses.classList.remove('active');
    navSettings.classList.remove('active');
    navAdmin.classList.remove('active');
    
    viewDashboard.style.display = 'none';
    viewSprays.style.display = 'none';
    viewIrrigations.style.display = 'none';
    viewOtherExpenses.style.display = 'none';
    viewExpenses.style.display = 'none';
    viewAdmin.style.display = 'none';
    
    if (viewName === 'dashboard') {
        navDashboard.classList.add('active');
        viewDashboard.style.display = 'block';
        initDashboard();
        
        const userStr = localStorage.getItem('tarim_takip_user');
        if (userStr) {
            const user = JSON.parse(userStr);
            if (user.location && user.location !== 'Belirtilmedi') {
                loadWeatherAdvice();
            }
        }
    } else if (viewName === 'sprays') {
        navSprays.classList.add('active');
        viewSprays.style.display = 'block';
        initSprays();
    } else if (viewName === 'irrigations') {
        navIrrigations.classList.add('active');
        viewIrrigations.style.display = 'block';
        initIrrigations();
    } else if (viewName === 'other-expenses') {
        navOtherExpenses.classList.add('active');
        viewOtherExpenses.style.display = 'block';
        initOtherExpenses();
    } else if (viewName === 'expenses') {
        navExpenses.classList.add('active');
        viewExpenses.style.display = 'block';
        loadExpensesPanel();
    } else if (viewName === 'admin') {
        navAdmin.classList.add('active');
        viewAdmin.style.display = 'block';
        loadAdminPanel();
    }
}

// Decoupled Pesticide Sprays Module
async function initSprays() {
    try {
        const res = await apiCall('/api/sprays');
        sprays = await res.json();
        renderSprays();
    } catch (e) {
        showToast('İlaçlama kayıtları yüklenemedi.', 'error');
    }
}

function renderSprays() {
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

    spraysResultsCount.textContent = `${filtered.length} kayıt listeleniyor`;
    spraysListGrid.innerHTML = '';
    
    if (filtered.length === 0) {
        spraysListGrid.innerHTML = `
            <div class="empty-state" style="grid-column: 1/-1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 4rem; text-align: center; background: rgba(255, 255, 255, 0.01); border: 1px dashed var(--glass-border); border-radius: 16px;">
                <div class="empty-icon" style="font-size: 3rem; margin-bottom: 1rem;">🧪</div>
                <h4>Kayıtlı ilaçlama bulunmuyor veya aramayla eşleşmedi</h4>
                <p style="color: var(--color-text-secondary); margin-bottom: 1.5rem; max-width: 420px;">Tarlanızdaki ilaç takip kartlarını listelemek için yeni bir kayıt oluşturabilirsiniz.</p>
                <button class="btn btn-primary" onclick="openSprayAddModal()">Yeni İlaçlama Ekle</button>
            </div>
        `;
    } else {
        filtered.forEach(item => {
            const card = createSprayCardElement(item);
            spraysListGrid.appendChild(card);
        });
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
            adminUsersTbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--color-text-muted); padding: 2rem;">Sistemde henüz kayıtlı kullanıcı bulunmuyor.</td></tr>`;
            return;
        }
        
        users.forEach(u => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${escapeHtml(u.name)}</strong></td>
                <td>${escapeHtml(u.email)}</td>
                <td><span class="crop-badge" style="background: rgba(0, 230, 118, 0.08); color: var(--color-primary);">${escapeHtml(u.farm_type)}</span></td>
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
                    <div class="detail-item">
                        <span class="label">Maliyet</span>
                        <span class="val">${item.pesticide_cost ? `${item.pesticide_cost.toFixed(2)} ₺` : 'Belirtilmedi'}</span>
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
                    </div>
                    <div class="progress-group">
                        <div class="progress-header">
                            <span>Hasat Güvenlik Aralığı (PHI)</span>
                            <span>${metrics.harvestDaysLeft > 0 ? `${metrics.harvestDaysLeft} Gün Yasak` : 'Hasat Güvenli'}</span>
                        </div>
                        <div class="progress-bar-container">
                            <div class="progress-bar ${metrics.harvestDaysLeft > 0 ? 'pb-harvest' : 'pb-protection'}" style="width: ${metrics.harvestPercent}%"></div>
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

// Irrigation System CRUD
async function initIrrigations() {
    try {
        const res = await apiCall('/api/irrigations');
        irrigations = await res.json();
        renderIrrigations();
    } catch (e) {
        showToast('Sulama kayıtları yüklenemedi.', 'error');
    }
}

function renderIrrigations() {
    irrigationsCount.textContent = `${irrigations.length} kayıt listeleniyor`;
    irrigationsGrid.innerHTML = '';
    
    if (irrigations.length === 0) {
        irrigationsGrid.innerHTML = `
            <div class="empty-state" style="grid-column: 1/-1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 4rem; text-align: center; background: rgba(255, 255, 255, 0.01); border: 1px dashed var(--glass-border); border-radius: 16px;">
                <div class="empty-icon" style="font-size: 3rem; margin-bottom: 1rem;">💧</div>
                <h4>Henüz kayıtlı sulama faaliyeti bulunmuyor</h4>
                <p style="color: var(--color-text-secondary); margin-bottom: 1.5rem; max-width: 400px;">Tarlanızda harcadığınız su miktarını ve maliyetlerini takip etmek için ilk kaydınızı oluşturun.</p>
                <button class="btn btn-primary" onclick="openIrrigationAddModal()">İlk Sulamayı Kaydet</button>
            </div>
        `;
        return;
    }
    
    irrigations.forEach(item => {
        const card = createIrrigationCardElement(item);
        irrigationsGrid.appendChild(card);
    });
}

function createIrrigationCardElement(item) {
    const card = document.createElement('div');
    card.className = 'spray-card';
    card.innerHTML = `
        <div class="card-header-row">
            <span class="crop-badge" style="background: rgba(41, 121, 255, 0.08); color: #2979ff; border: 1px solid rgba(41, 121, 255, 0.15);">💧 Sulama Faaliyeti</span>
            <span class="status-badge status-harvest-safe">Tamamlandı</span>
        </div>
        <div>
            <h4 class="pesticide-title">${item.water_amount ? `${item.water_amount} Ton Su Uygulandı` : 'Su Miktarı Girilmemiş'}</h4>
            <div class="card-notes">Su Gideri: ${item.water_cost ? `${item.water_cost.toFixed(2)} ₺` : 'Maliyet Belirtilmedi'}</div>
        </div>
        
        <div class="spray-details">
            <div class="detail-item">
                <span class="label">Uygulama Zamanı</span>
                <span class="val">${new Date(item.date).toLocaleString('tr-TR')}</span>
            </div>
        </div>
        ${item.notes ? `<p class="card-notes" title="${escapeHtml(item.notes)}"><strong>Not:</strong> ${escapeHtml(item.notes)}</p>` : ''}
        
        <div class="card-actions">
            <button class="btn btn-secondary btn-icon edit-irr-btn" title="Düzenle">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                    <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
            </button>
            <button class="btn btn-danger btn-icon delete-irr-btn" title="Sil">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    <line x1="10" y1="11" x2="10" y2="17"></line>
                    <line x1="14" y1="11" x2="14" y2="17"></line>
                </svg>
            </button>
        </div>
    `;
    
    card.querySelector('.edit-irr-btn').addEventListener('click', () => {
        openIrrigationEditModal(item);
    });
    card.querySelector('.delete-irr-btn').addEventListener('click', () => {
        deleteIrrigation(item.id);
    });
    
    return card;
}

window.openIrrigationAddModal = function() {
    irrigationModalTitle.textContent = 'Yeni Sulama Kaydı';
    inputIrrId.value = '';
    
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    inputIrrDate.value = now.toISOString().slice(0, 16);
    
    inputIrrAmount.value = '';
    inputIrrCost.value = '';
    inputIrrNotes.value = '';
    irrigationModal.classList.add('open');
};

function openIrrigationEditModal(item) {
    irrigationModalTitle.textContent = 'Sulama Kaydını Düzenle';
    inputIrrId.value = item.id;
    inputIrrDate.value = item.date;
    inputIrrAmount.value = item.water_amount || '';
    inputIrrCost.value = item.water_cost || '';
    inputIrrNotes.value = item.notes || '';
    irrigationModal.classList.add('open');
}

async function saveIrrigation() {
    const id = inputIrrId.value;
    const irrData = {
        id: id || 'irr-' + Date.now(),
        date: inputIrrDate.value,
        water_amount: parseFloat(inputIrrAmount.value) || 0.0,
        water_cost: parseFloat(inputIrrCost.value) || 0.0,
        notes: inputIrrNotes.value.trim()
    };
    
    try {
        if (id) {
            await apiCall(`/api/irrigations/${id}`, 'PUT', irrData);
            const index = irrigations.findIndex(i => i.id === id);
            if (index !== -1) {
                irrigations[index] = irrData;
                showToast('Sulama kaydı güncellendi.', 'success');
            }
        } else {
            await apiCall('/api/irrigations', 'POST', irrData);
            irrigations.push(irrData);
            showToast('Yeni sulama kaydı başarıyla eklendi.', 'success');
        }
        irrigationModal.classList.remove('open');
        renderIrrigations();
    } catch (e) {
        showToast('Sulama kaydı kaydedilemedi.', 'error');
    }
}

async function deleteIrrigation(id) {
    if (confirm('Bu sulama kaydını silmek istediğinizden emin misiniz?')) {
        try {
            await apiCall(`/api/irrigations/${id}`, 'DELETE');
            irrigations = irrigations.filter(i => i.id !== id);
            renderIrrigations();
            showToast('Sulama kaydı silindi.', 'success');
        } catch (e) {
            showToast('Silme işlemi başarısız oldu.', 'error');
        }
    }
}

// Other Expenses (Harici Giderler) CRUD Module
async function initOtherExpenses() {
    try {
        const res = await apiCall('/api/other-expenses');
        otherExpenses = await res.json();
        renderOtherExpenses();
    } catch (e) {
        showToast('Gider kayıtları yüklenemedi.', 'error');
    }
}

function renderOtherExpenses() {
    otherExpensesCount.textContent = `${otherExpenses.length} kayıt listeleniyor`;
    otherExpensesGrid.innerHTML = '';
    
    if (otherExpenses.length === 0) {
        otherExpensesGrid.innerHTML = `
            <div class="empty-state" style="grid-column: 1/-1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 4rem; text-align: center; background: rgba(255, 255, 255, 0.01); border: 1px dashed var(--glass-border); border-radius: 16px;">
                <div class="empty-icon" style="font-size: 3rem; margin-bottom: 1rem;">📦</div>
                <h4>Kayıtlı harici maliyet bulunmuyor</h4>
                <p style="color: var(--color-text-secondary); margin-bottom: 1.5rem; max-width: 400px;">Mazot, gübre, tohum ve yedek parça gibi diğer giderlerinizi buradan kaydedip takip edebilirsiniz.</p>
                <button class="btn btn-primary" onclick="openOtherExpenseAddModal()">Gider Ekle</button>
            </div>
        `;
        return;
    }
    
    otherExpenses.forEach(item => {
        const card = createOtherExpenseCardElement(item);
        otherExpensesGrid.appendChild(card);
    });
}

function createOtherExpenseCardElement(item) {
    const card = document.createElement('div');
    card.className = 'spray-card';
    card.innerHTML = `
        <div class="card-header-row">
            <span class="crop-badge" style="background: rgba(156, 39, 176, 0.08); color: #9c27b0; border: 1px solid rgba(156, 39, 176, 0.15);">${escapeHtml(item.category)}</span>
            <span class="status-badge status-harvest-safe">Ödendi</span>
        </div>
        <div>
            <h4 class="pesticide-title">${escapeHtml(item.title)}</h4>
            <div class="card-notes">Miktar / Maliyet: ${item.amount ? `${item.amount.toFixed(2)} ₺` : '0.00 ₺'}</div>
        </div>
        
        <div class="spray-details">
            <div class="detail-item">
                <span class="label">Ödeme Tarihi</span>
                <span class="val">${new Date(item.date).toLocaleString('tr-TR')}</span>
            </div>
        </div>
        ${item.notes ? `<p class="card-notes" title="${escapeHtml(item.notes)}"><strong>Not:</strong> ${escapeHtml(item.notes)}</p>` : ''}
        
        <div class="card-actions">
            <button class="btn btn-secondary btn-icon edit-exp-btn" title="Düzenle">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                    <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
            </button>
            <button class="btn btn-danger btn-icon delete-exp-btn" title="Sil">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    <line x1="10" y1="11" x2="10" y2="17"></line>
                    <line x1="14" y1="11" x2="14" y2="17"></line>
                </svg>
            </button>
        </div>
    `;
    
    card.querySelector('.edit-exp-btn').addEventListener('click', () => {
        openOtherExpenseEditModal(item);
    });
    card.querySelector('.delete-exp-btn').addEventListener('click', () => {
        deleteOtherExpense(item.id);
    });
    
    return card;
}

window.openOtherExpenseAddModal = function() {
    otherExpenseModalTitle.textContent = 'Yeni Harici Gider Ekle';
    inputExpId.value = '';
    
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    inputExpDate.value = now.toISOString().slice(0, 16);
    
    inputExpTitle.value = '';
    inputExpCategory.value = 'Gübreleme';
    inputExpAmount.value = '';
    inputExpNotes.value = '';
    otherExpenseModal.classList.add('open');
};

function openOtherExpenseEditModal(item) {
    otherExpenseModalTitle.textContent = 'Gider Kaydını Düzenle';
    inputExpId.value = item.id;
    inputExpTitle.value = item.title;
    inputExpCategory.value = item.category;
    inputExpAmount.value = item.amount;
    inputExpDate.value = item.date;
    inputExpNotes.value = item.notes || '';
    otherExpenseModal.classList.add('open');
}

async function saveOtherExpense() {
    const id = inputExpId.value;
    const expData = {
        id: id || 'exp-' + Date.now(),
        title: inputExpTitle.value.trim(),
        category: inputExpCategory.value,
        amount: parseFloat(inputExpAmount.value) || 0.0,
        date: inputExpDate.value,
        notes: inputExpNotes.value.trim()
    };
    
    if (!expData.title || expData.amount <= 0) {
        showToast('Başlık ve geçerli bir tutar girmelisiniz.', 'error');
        return;
    }
    
    try {
        if (id) {
            await apiCall(`/api/other-expenses/${id}`, 'PUT', expData);
            const index = otherExpenses.findIndex(e => e.id === id);
            if (index !== -1) {
                otherExpenses[index] = expData;
                showToast('Gider kaydı güncellendi.', 'success');
            }
        } else {
            await apiCall('/api/other-expenses', 'POST', expData);
            otherExpenses.push(expData);
            showToast('Yeni harici gider eklendi.', 'success');
        }
        otherExpenseModal.classList.remove('open');
        renderOtherExpenses();
    } catch (e) {
        showToast('Gider kaydı eklenemedi.', 'error');
    }
}

async function deleteOtherExpense(id) {
    if (confirm('Bu gider kaydını silmek istediğinizden emin misiniz?')) {
        try {
            await apiCall(`/api/other-expenses/${id}`, 'DELETE');
            otherExpenses = otherExpenses.filter(e => e.id !== id);
            renderOtherExpenses();
            showToast('Gider kaydı silindi.', 'success');
        } catch (e) {
            showToast('Gider silinemedi.', 'error');
        }
    }
}

// Custom Date Filter & Stacked/Grouped Charting
async function loadExpensesPanel() {
    try {
        // Fetch raw costs payload
        const res = await apiCall('/api/expenses/raw');
        rawExpensesData = await res.json();
        
        // Sum up total absolute values
        let totalPesticide = 0.0;
        let totalWater = 0.0;
        let totalOther = 0.0;
        
        rawExpensesData.forEach(item => {
            if (item.type === 'pesticide') totalPesticide += item.amount;
            else if (item.type === 'water') totalWater += item.amount;
            else if (item.type === 'other') totalOther += item.amount;
        });
        
        expenseTotalEl.textContent = `${(totalPesticide + totalWater + totalOther).toFixed(2)} ₺`;
        expensePesticideEl.textContent = `${totalPesticide.toFixed(2)} ₺`;
        expenseWaterEl.textContent = `${totalWater.toFixed(2)} ₺`;
        expenseOtherEl.textContent = `${totalOther.toFixed(2)} ₺`;
        
        // Generate chart with default selected range
        refreshExpensesChart();
    } catch (e) {
        showToast('Gider analizi verileri alınamadı.', 'error');
    }
}

function refreshExpensesChart() {
    const selectedRange = expenseRangeSelect.value;
    const aggregated = aggregateExpenses(rawExpensesData, selectedRange);
    
    const ctx = document.getElementById('expenses-chart').getContext('2d');
    
    if (expensesChartInstance) {
        expensesChartInstance.destroy();
    }
    
    expensesChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: aggregated.labels,
            datasets: [
                {
                    label: 'İlaçlama Giderleri (₺)',
                    data: aggregated.pesticide,
                    backgroundColor: 'rgba(255, 171, 0, 0.65)',
                    borderColor: 'rgb(255, 171, 0)',
                    borderWidth: 1.5,
                    borderRadius: 4
                },
                {
                    label: 'Sulama Giderleri (₺)',
                    data: aggregated.water,
                    backgroundColor: 'rgba(41, 121, 255, 0.65)',
                    borderColor: 'rgb(41, 121, 255)',
                    borderWidth: 1.5,
                    borderRadius: 4
                },
                {
                    label: 'Harici Giderler (₺)',
                    data: aggregated.other,
                    backgroundColor: 'rgba(156, 39, 176, 0.65)',
                    borderColor: 'rgb(156, 39, 176)',
                    borderWidth: 1.5,
                    borderRadius: 4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: {
                        color: '#e0e0e0',
                        font: { family: 'Plus Jakarta Sans', size: 12, weight: '500' }
                    }
                }
            },
            scales: {
                x: {
                    stacked: true,
                    grid: { color: 'rgba(255, 255, 255, 0.04)' },
                    ticks: { color: '#b0b0b0', font: { family: 'Plus Jakarta Sans' } }
                },
                y: {
                    stacked: true,
                    grid: { color: 'rgba(255, 255, 255, 0.04)' },
                    ticks: { color: '#b0b0b0', font: { family: 'Plus Jakarta Sans' } }
                }
            }
        }
    });
}

// Client-side grouping logic for selected date ranges
function aggregateExpenses(raw, range) {
    const now = new Date();
    let cutoffDate = new Date();
    let groupKeyFormat = 'month'; // 'month' or 'day'
    
    if (range === '1_week') {
        cutoffDate.setDate(now.getDate() - 7);
        groupKeyFormat = 'day';
    } else if (range === '2_weeks') {
        cutoffDate.setDate(now.getDate() - 14);
        groupKeyFormat = 'day';
    } else if (range === '1_month') {
        cutoffDate.setDate(now.getDate() - 30);
        groupKeyFormat = 'day';
    } else if (range === '3_months') {
        cutoffDate.setDate(now.getDate() - 90);
        groupKeyFormat = 'month';
    } else if (range === '6_months') {
        cutoffDate.setDate(now.getDate() - 180);
        groupKeyFormat = 'month';
    } else if (range === '12_months') {
        cutoffDate.setDate(now.getDate() - 365);
        groupKeyFormat = 'month';
    } else if (range === '1_year') {
        cutoffDate.setFullYear(now.getFullYear() - 1);
        groupKeyFormat = 'month';
    }
    
    // Filter raw expenses by cutoff
    const filtered = raw.filter(item => {
        const d = new Date(item.date);
        return d >= cutoffDate && d <= now;
    });
    
    // Sort by date ascending
    filtered.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    // Build time intervals (days or months) in chronological order
    const groups = {};
    
    if (groupKeyFormat === 'day') {
        // Generate daily intervals
        let current = new Date(cutoffDate);
        while (current <= now) {
            const key = formatDateKeyDay(current);
            groups[key] = { label: key, pesticide: 0, water: 0, other: 0 };
            current.setDate(current.getDate() + 1);
        }
    } else {
        // Generate monthly intervals
        let current = new Date(cutoffDate);
        while (current <= now || (current.getMonth() === now.getMonth() && current.getFullYear() === now.getFullYear())) {
            const key = formatDateKeyMonth(current);
            groups[key] = { label: key, pesticide: 0, water: 0, other: 0 };
            current.setMonth(current.getMonth() + 1);
        }
    }
    
    // Fill groups totals
    filtered.forEach(item => {
        const itemDate = new Date(item.date);
        const key = groupKeyFormat === 'day' ? formatDateKeyDay(itemDate) : formatDateKeyMonth(itemDate);
        
        if (groups[key]) {
            if (item.type === 'pesticide') {
                groups[key].pesticide += item.amount;
            } else if (item.type === 'water') {
                groups[key].water += item.amount;
            } else if (item.type === 'other') {
                groups[key].other += item.amount;
            }
        }
    });
    
    const keys = Object.keys(groups);
    return {
        labels: keys.map(k => groups[k].label),
        pesticide: keys.map(k => groups[k].pesticide),
        water: keys.map(k => groups[k].water),
        other: keys.map(k => groups[k].other)
    };
}

function formatDateKeyDay(date) {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${day}.${month}`;
}

function formatDateKeyMonth(date) {
    const monthNames = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];
    return `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
}

// Live date clock
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

// Toast alerts
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
            <div class="detail-item">
                <span class="label">İlaç Fiyatı</span>
                <span class="val">${item.pesticide_cost ? `${item.pesticide_cost.toFixed(2)} ₺` : 'Belirtilmedi'}</span>
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
    return (unsafe || "")
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
            renderSprays();
            showToast('İlaçlama kaydı başarıyla silindi.', 'success');
        } catch (e) {
            showToast('Silme işlemi başarısız oldu.', 'error');
        }
    }
}

// Add and Edit Modal Management
window.openSprayAddModal = function() {
    modalTitle.textContent = 'Yeni İlaçlama Kaydı';
    saveBtn.textContent = 'Kaydet ve Takibe Başla';
    
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    inputDate.value = now.toISOString().slice(0, 16);
    
    inputId.value = '';
    inputCrop.value = '';
    inputPesticide.value = '';
    inputDate.value = now.toISOString().slice(0, 16);
    inputDuration.value = '';
    inputPhi.value = '';
    inputDosage.value = '';
    inputPesticideCost.value = '';
    inputPest.value = '';
    inputNotes.value = '';
    
    sprayModal.classList.add('open');
};

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
    inputPesticideCost.value = item.pesticide_cost || '';
    inputPest.value = item.pest || '';
    inputNotes.value = item.notes || '';
    
    sprayModal.classList.add('open');
}

function closeModal() {
    sprayModal.classList.remove('open');
}

// Settings Modal
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
        pesticide_cost: parseFloat(inputPesticideCost.value) || 0.0,
        pest: inputPest.value.trim(),
        notes: inputNotes.value.trim()
    };

    try {
        if (id) {
            await apiCall(`/api/sprays/${id}`, 'PUT', sprayData);
            const index = sprays.findIndex(item => item.id === id);
            if (index !== -1) {
                sprays[index] = sprayData;
                showToast('İlaçlama kaydı başarıyla güncellendi.', 'success');
            }
        } else {
            await apiCall('/api/sprays', 'POST', sprayData);
            sprays.push(sprayData);
            showToast('Yeni ilaçlama kaydı oluşturuldu.', 'success');
        }
        closeModal();
        renderSprays();
    } catch (e) {
        showToast('Kayıt işlemi başarısız oldu.', 'error');
    }
}

// Event Listeners Setup
function setupEventListeners() {
    // Navigation items view routing
    navDashboard.addEventListener('click', (e) => { e.preventDefault(); switchView('dashboard'); });
    navSprays.addEventListener('click', (e) => { e.preventDefault(); switchView('sprays'); });
    navIrrigations.addEventListener('click', (e) => { e.preventDefault(); switchView('irrigations'); });
    navOtherExpenses.addEventListener('click', (e) => { e.preventDefault(); switchView('other-expenses'); });
    navExpenses.addEventListener('click', (e) => { e.preventDefault(); switchView('expenses'); });
    navSettings.addEventListener('click', (e) => { e.preventDefault(); openSettingsModal(); });
    
    if (navAdmin) {
        navAdmin.addEventListener('click', (e) => { e.preventDefault(); switchView('admin'); });
    }

    // Dashboard navigation links
    document.getElementById('dashboard-to-sprays').addEventListener('click', (e) => { e.preventDefault(); switchView('sprays'); });
    document.getElementById('dashboard-to-irrigations').addEventListener('click', (e) => { e.preventDefault(); switchView('irrigations'); });
    document.getElementById('dashboard-to-other-expenses').addEventListener('click', (e) => { e.preventDefault(); switchView('other-expenses'); });

    // Decoupled sprays filter and search
    spraysSearchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        renderSprays();
    });

    const tabs = spraysFilterTabs.querySelectorAll('.filter-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentFilter = tab.getAttribute('data-filter');
            renderSprays();
        });
    });

    openSprayModalBtnSprays.addEventListener('click', openSprayAddModal);
    sendReportBtnSprays.addEventListener('click', sendEmailReport);

    // Spray Form Modal controls
    closeModalBtn.addEventListener('click', closeModal);
    cancelModalBtn.addEventListener('click', closeModal);
    sprayModal.addEventListener('click', (e) => { if (e.target === sprayModal) closeModal(); });
    sprayForm.addEventListener('submit', (e) => { e.preventDefault(); saveForm(); });

    // Irrigation Modal Controls
    if (openIrrigationModalBtn) openIrrigationModalBtn.addEventListener('click', openIrrigationAddModal);
    closeIrrigationModalBtn.addEventListener('click', () => irrigationModal.classList.remove('open'));
    cancelIrrigationModalBtn.addEventListener('click', () => irrigationModal.classList.remove('open'));
    irrigationModal.addEventListener('click', (e) => { if (e.target === irrigationModal) irrigationModal.classList.remove('open'); });
    irrigationForm.addEventListener('submit', (e) => { e.preventDefault(); saveIrrigation(); });

    // Other Expenses Modal Controls
    openOtherExpenseModalBtn.addEventListener('click', openOtherExpenseAddModal);
    closeOtherExpenseModalBtn.addEventListener('click', () => otherExpenseModal.classList.remove('open'));
    cancelOtherExpenseModalBtn.addEventListener('click', () => otherExpenseModal.classList.remove('open'));
    otherExpenseModal.addEventListener('click', (e) => { if (e.target === otherExpenseModal) otherExpenseModal.classList.remove('open'); });
    otherExpenseForm.addEventListener('submit', (e) => { e.preventDefault(); saveOtherExpense(); });

    // Expense range filter select change
    expenseRangeSelect.addEventListener('change', refreshExpensesChart);

    // Settings Modal
    closeSettingsBtn.addEventListener('click', closeSettingsModal);
    cancelSettingsBtn.addEventListener('click', closeSettingsModal);
    settingsModal.addEventListener('click', (e) => { if (e.target === settingsModal) closeSettingsModal(); });
    settingsForm.addEventListener('submit', saveSettings);
    testEmailBtn.addEventListener('click', testSmtpConnection);

    // Admin Panel Sprays View Modal close
    if (closeAdminSpraysBtn) {
        closeAdminSpraysBtn.addEventListener('click', () => adminSpraysModal.classList.remove('open'));
    }
    adminSpraysModal.addEventListener('click', (e) => { if (e.target === adminSpraysModal) adminSpraysModal.classList.remove('open'); });

    // Authentication Forms
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

    loginForm.addEventListener('submit', handleLogin);
    registerForm.addEventListener('submit', handleRegister);
    navLogout.addEventListener('click', (e) => { e.preventDefault(); handleLogout(); });
}

// User Authentication handlers
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
    const farm_type = document.getElementById('register-farm-type').value;
    const location = document.getElementById('register-location').value.trim();

    if (password.length < 6) {
        showToast('Şifre en az 6 karakter olmalıdır.', 'error');
        return;
    }

    try {
        const res = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password, farm_type, location })
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
    irrigations = [];
    otherExpenses = [];
    rawExpensesData = [];
    
    showToast('Oturum sonlandırıldı.', 'success');
    checkAuthState();
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
        const detailStr = `• Ürün: ${spray.crop}\n  Kullanılan İlaç: ${spray.pesticide}\n  İlaçlama Tarihi: ${new Date(spray.date).toLocaleString('tr-TR')}\n  Dozaj: ${spray.dosage || 'Belirtilmedi'}\n  Fiyat: ${spray.pesticide_cost ? `${spray.pesticide_cost.toFixed(2)} ₺` : 'Belirtilmedi'}\n  Hedef Zararlı: ${spray.pest || 'Belirtilmedi'}\n  Etki Süresi: ${spray.duration} Gün (${metrics.protectionDaysLeft > 0 ? `${metrics.protectionDaysLeft} gün koruma kaldı` : 'süre bitti'})\n  Hasat Güvenlik Aralığı (PHI): ${spray.phi} Gün (${metrics.harvestDaysLeft > 0 ? `${metrics.harvestDaysLeft} gün hasat yasağı var` : 'hasat güvenli'})\n  Durum: ${metrics.statusText}\n${spray.notes ? `  Notlar: ${spray.notes}\n` : ''}\n`;

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
