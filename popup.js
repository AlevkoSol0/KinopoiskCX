// === ЭЛЕМЕНТЫ ===
const homeBtn = document.getElementById('homeBtn');
const gotoCxBtn = document.getElementById('gotoCxBtn');
const switchBanner = document.getElementById('switchBanner');
const switchAutoHide = document.getElementById('switchAutoHide');
const autoHideRow = document.getElementById('autoHideRow');
const switchNumeric = document.getElementById('switchNumeric');
const themeToggle = document.getElementById('themeToggle');
const langToggle = document.getElementById('langToggle');
const saveCurrentCxBtn = document.getElementById('saveCurrentCxBtn');
const cxDomainDisplay = document.getElementById('cxDomainDisplay');
const saveToQuickBtn = document.getElementById('saveToQuickBtn');
const saveStatus = document.getElementById('saveStatus');
const listContainer = document.getElementById('listContainer');
const contextMenu = document.getElementById('contextMenu');
const sortSelect = document.getElementById('sortSelect');
const tabsContainer = document.getElementById('tabsContainer');

const DEFAULT_CX = 'https://ww2.fkwatch.org';
const RATING_EMOJI = ['🗑️', '😞', '😐', '🙂', '⭐', '⭐⭐', '⭐⭐⭐', '💎', '💎💎', '💎💎💎'];
const STATIC_TABS = [
    { id: 'quickAccess', labelKey: 'tab_main' },
    { id: 'watchLater', labelKey: 'tab_later' },
    { id: 'watched', labelKey: 'tab_rated' }
];
const CX_WHITELIST = ['kinopoisk.ru'];

let favoriteSiteUrl = '';
let activeTab = 'quickAccess';
let data = { quickAccess: [], watchLater: [], watched: [] };
let customCategories = [];
let currentContextItem = null;
let showNumeric = false;
let isDark = true;
let pendingAutoSave = false;
let currentLang = 'ru';

// === ПЕРЕВОДЫ ===
const translations = {
    ru: {
        appName: 'Кинопоиск PRO',
        btn_home: 'Кинопоиск',
        btn_cx: '▶ CX',
        switch_banner: 'Умная плашка',
        switch_autohide: 'Автоскрытие',
        switch_numeric: 'Цифровая оценка',
        cx_title: 'Сайт для избранного (CX)',
        btn_save_cx: '💾',
        btn_pick_site: 'Взять текущий',
        tab_main: 'Главная',
        tab_later: '🕒 Позже',
        tab_rated: '⭐Рейтинг',
        btn_save: '➕ Сохранить',
        btn_not_on_cx: '⚠️ Вы не на CX-сайте',
        sort_date: 'По дате',
        sort_alpha: 'По алфавиту',
        sort_rating: 'По оценке',
        empty_list: '✨ Пока пусто',
        already_exists: '⚠️ Уже в библиотеке',
        saved_ok: '✅ Сохранено!',
        move_pin: '📌 Закрепить',
        move_unpin: '📌 Открепить',
        move_main: 'Главная',
        move_later: '🕒 Смотреть позже',
        move_watched: 'Просмотрено',
        modal_title: 'Оцените «{title}»',
        modal_btn: 'Оценить',
        context_delete_cat: '❌ Удалить категорию',
        add_category_prompt: 'Имя категории:',
        confirm_delete_cat: 'Удалить "{name}"?',
        alert_not_cx: 'Не удалось получить адрес сайта',
        sync_warning: '⚠️ Данные синхронизируются'
    },
    en: {
        appName: 'Kinopoisk PRO',
        btn_home: 'Kinopoisk',
        btn_cx: '▶ CX',
        switch_banner: 'Smart banner',
        switch_autohide: 'Auto-hide',
        switch_numeric: 'Numeric rating',
        cx_title: 'Favorite site (CX)',
        btn_save_cx: '💾',
        btn_pick_site: 'Pick current',
        tab_main: 'Home',
        tab_later: '🕒 Later',
        tab_rated: '⭐Rated',
        btn_save: '➕ Save',
        btn_not_on_cx: '⚠️ Not on CX site',
        sort_date: 'By date',
        sort_alpha: 'By alphabet',
        sort_rating: 'By rating',
        empty_list: '✨ Empty',
        already_exists: '⚠️ Already in library',
        saved_ok: '✅ Saved!',
        move_pin: '📌 Pin',
        move_unpin: '📌 Unpin',
        move_main: 'Home',
        move_later: '🕒 Watch later',
        move_watched: 'Watched',
        modal_title: 'Rate "{title}"',
        modal_btn: 'Rate',
        context_delete_cat: '❌ Delete category',
        add_category_prompt: 'Category name:',
        confirm_delete_cat: 'Delete "{name}"?',
        alert_not_cx: 'Could not get site address',
        sync_warning: '⚠️ Data is synced'
    }
};

function t(key, params = {}) {
    let str = (translations[currentLang] && translations[currentLang][key]) || translations.ru[key] || key;
    for (const [k, v] of Object.entries(params)) {
        str = str.replace(`{${k}}`, v);
    }
    return str;
}

// === ВСПОМОГАТЕЛЬНЫЕ ===
function isOnFavoriteSite(tab) {
    if (!tab?.url || !favoriteSiteUrl) return false;
    try { return tab.url.startsWith(favoriteSiteUrl.replace(/\/+$/, '')); } catch { return false; }
}
function isFilmOrSeriesPage(url) {
    if (!url) return false;
    try {
        const u = new URL(url);
        const hostOk = CX_WHITELIST.some(h => u.hostname === h || u.hostname.endsWith('.' + h));
        const pathOk = /\/(film|series)\//.test(u.pathname);
        return hostOk && pathOk;
    } catch { return false; }
}
function isCxDomain(url) {
    try { return new URL(url).hostname === 'kinopoisk.cx'; } catch { return false; }
}
function convertToCxUrl(originalUrl) {
    const match = originalUrl.match(/\/(film|series)\/([^/?]+)/);
    if (match) return `https://kinopoisk.cx/${match[1]}/${match[2]}`;
    return originalUrl.replace(/kinopoisk\.ru/g, "kinopoisk.cx").replace(/ww2\.fkwatch\.org/g, "kinopoisk.cx");
}
function applyTheme() {
    document.body.dataset.theme = isDark ? 'dark' : 'light';
    themeToggle.classList.toggle('dark', isDark);
    const thumb = themeToggle.querySelector('.toggle-thumb');
    if (thumb) thumb.textContent = isDark ? '🌙' : '☀️';
}
function applyLanguage() {
    langToggle.textContent = currentLang.toUpperCase();
    document.querySelector('.logo-text').textContent = t('appName');
    homeBtn.innerHTML = `<img src="kinopoisk.png" style="width:18px;height:18px;"> ${t('btn_home')}`;
    const switchLabels = document.querySelectorAll('.switch-label');
    if (switchLabels.length >= 3) {
        switchLabels[0].textContent = t('switch_banner');
        switchLabels[1].textContent = t('switch_autohide');
        switchLabels[2].textContent = t('switch_numeric');
    }
    sortSelect.options[0].textContent = t('sort_date');
    sortSelect.options[1].textContent = t('sort_alpha');
    sortSelect.options[2].textContent = t('sort_rating');
    renderTabs();
    updateButtons(true);
}

// === ХРАНЕНИЕ ДАННЫХ ЧЕРЕЗ SYNC (ЗАЩИТА ОТ ОЧИСТКИ ИСТОРИИ) ===
function saveData() {
    customCategories.forEach(cat => { if (!data[cat.id]) data[cat.id] = []; });
    chrome.storage.sync.set({ libraries: data, customCategories }, () => {
        if (chrome.runtime.lastError) {
            console.error('Sync error (возможно превышен лимит 100 КБ):', chrome.runtime.lastError);
            saveStatus.textContent = t('sync_warning');
        }
        renderList();
    });
}

// === ИНИЦИАЛИЗАЦИЯ ===
homeBtn.addEventListener('click', () => chrome.tabs.create({ url: "https://kinopoisk.ru" }));

function loadStorage() {
    chrome.storage.sync.get(
        ['isEnabled', 'autoHideEnabled', 'favoriteSiteUrl', 'libraries', 'showNumericRating', 'customCategories', 'theme', 'pendingAutoSave', 'language'],
        (result) => {
            const bannerOn = result.isEnabled !== false;
            switchBanner.classList.toggle('active', bannerOn);
            autoHideRow.style.display = bannerOn ? 'flex' : 'none';
            switchAutoHide.classList.toggle('active', result.autoHideEnabled === true);
            showNumeric = result.showNumericRating === true;
            switchNumeric.classList.toggle('active', showNumeric);
            isDark = result.theme !== 'light';
            currentLang = result.language || 'ru';
            applyTheme();
            applyLanguage();
            favoriteSiteUrl = result.favoriteSiteUrl || DEFAULT_CX;
            pendingAutoSave = result.pendingAutoSave === true;
            data = result.libraries || { quickAccess: [], watchLater: [], watched: [] };
            customCategories = result.customCategories || [];
            customCategories.forEach(cat => { if (!data[cat.id]) data[cat.id] = []; });
            Object.keys(data).forEach(key => {
                if (Array.isArray(data[key])) {
                    data[key].forEach(item => {
                        if (item.pinned === undefined) item.pinned = false;
                        if (item.pinnedOrder === undefined) item.pinnedOrder = 0;
                    });
                }
            });
            cxDomainDisplay.textContent = favoriteSiteUrl;
            updateButtons();
            renderTabs();
            renderList();
        }
    );
}

// === ТЕМА ===
themeToggle.addEventListener('click', () => {
    isDark = !isDark;
    applyTheme();
    chrome.storage.sync.set({ theme: isDark ? 'dark' : 'light' });
});

// === ЯЗЫК ===
langToggle.addEventListener('click', () => {
    currentLang = currentLang === 'ru' ? 'en' : 'ru';
    applyLanguage();
    chrome.storage.sync.set({ language: currentLang });
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) chrome.tabs.sendMessage(tabs[0].id, { action: 'setLanguage', language: currentLang });
    });
});

// === ПЕРЕКЛЮЧАТЕЛИ ===
switchBanner.addEventListener('click', () => {
    const on = !switchBanner.classList.contains('active');
    switchBanner.classList.toggle('active');
    autoHideRow.style.display = on ? 'flex' : 'none';
    chrome.storage.sync.set({ isEnabled: on });
});
switchAutoHide.addEventListener('click', () => {
    const on = !switchAutoHide.classList.contains('active');
    switchAutoHide.classList.toggle('active');
    chrome.storage.sync.set({ autoHideEnabled: on });
});
switchNumeric.addEventListener('click', () => {
    showNumeric = !switchNumeric.classList.contains('active');
    switchNumeric.classList.toggle('active');
    chrome.storage.sync.set({ showNumericRating: showNumeric }, renderList);
});

// === КНОПКИ ===
async function updateButtons(forceLanguage = false) {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab) return;

        gotoCxBtn.style.display = isFilmOrSeriesPage(tab.url) ? 'flex' : 'none';
        if (forceLanguage) gotoCxBtn.textContent = t('btn_cx');

        if (pendingAutoSave && !isCxDomain(tab.url)) {
            try {
                const origin = new URL(tab.url).origin;
                favoriteSiteUrl = origin;
                cxDomainDisplay.textContent = origin;
                chrome.storage.sync.set({ favoriteSiteUrl: origin, pendingAutoSave: false });
                pendingAutoSave = false;
            } catch (e) {}
        } else if (isCxDomain(tab.url)) {
            if (!pendingAutoSave) {
                pendingAutoSave = true;
                chrome.storage.sync.set({ pendingAutoSave: true });
            }
        }

        const onSite = isOnFavoriteSite(tab);
        saveToQuickBtn.disabled = !onSite;
        saveToQuickBtn.textContent = onSite ? t('btn_save') : t('btn_not_on_cx');
        saveToQuickBtn.className = onSite ? 'btn btn-primary' : 'btn-save-disabled';
        if (onSite) saveToQuickBtn.style.width = '100%';
        saveStatus.textContent = '';
    } catch (e) {
        console.error('updateButtons error:', e);
    }
}

gotoCxBtn.addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const url = tabs[0]?.url;
        if (url && isFilmOrSeriesPage(url)) {
            chrome.tabs.create({ url: convertToCxUrl(url) });
        }
    });
});

saveCurrentCxBtn.addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        try {
            const origin = new URL(tabs[0].url).origin;
            favoriteSiteUrl = origin;
            cxDomainDisplay.textContent = origin;
            pendingAutoSave = false;
            chrome.storage.sync.set({ favoriteSiteUrl: origin, pendingAutoSave: false }, updateButtons);
        } catch {
            alert(t('alert_not_cx'));
        }
    });
});

// === СОХРАНЕНИЕ В БИБЛИОТЕКУ ===
saveToQuickBtn.addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0];
        if (!tab || !isOnFavoriteSite(tab)) return;
        const cxUrl = convertToCxUrl(tab.url);
        if (Object.values(data).flat().some(i => i.url === cxUrl)) {
            saveStatus.textContent = t('already_exists');
            return;
        }
        const clean = (tab.title || '').replace(/смотреть онлайн.*/gi, '').replace(/\s+/g, ' ').trim() || tab.title;
        data.quickAccess.push({
            id: Date.now().toString(),
            title: clean,
            url: cxUrl,
            type: /\/series\//.test(tab.url) ? 'series' : 'movie',
            added: new Date().toISOString(),
            pinned: false,
            pinnedOrder: 0
        });
        saveData();
        saveStatus.textContent = t('saved_ok');
        setTimeout(() => { saveStatus.textContent = ''; }, 1500);
    });
});

// === ВКЛАДКИ ===
function renderTabs() {
    tabsContainer.innerHTML = '';
    STATIC_TABS.forEach(tab => {
        const btn = document.createElement('button');
        btn.className = 'tab' + (activeTab === tab.id ? ' active' : '');
        btn.textContent = t(tab.labelKey);
        btn.addEventListener('click', () => switchTab(tab.id));
        tabsContainer.appendChild(btn);
    });
    const sorted = [...customCategories].sort((a, b) => a.order - b.order);
    sorted.forEach(cat => {
        const btn = document.createElement('button');
        btn.className = 'tab' + (activeTab === cat.id ? ' active' : '');
        btn.textContent = cat.name;
        btn.addEventListener('click', () => switchTab(cat.id));
        const menu = document.createElement('span');
        menu.style.cssText = 'margin-left:4px;cursor:pointer;font-size:12px;';
        menu.textContent = '×';
        menu.addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm(t('confirm_delete_cat', { name: cat.name }))) deleteCategory(cat.id);
        });
        btn.appendChild(menu);
        tabsContainer.appendChild(btn);
    });
    const add = document.createElement('button');
    add.className = 'tab-add';
    add.textContent = '+';
    add.addEventListener('click', () => {
        const name = prompt(t('add_category_prompt'));
        if (name?.trim()) {
            const id = 'custom_' + Date.now();
            customCategories.push({ id, name: name.trim(), order: customCategories.length });
            data[id] = [];
            activeTab = id;
            saveData(); // saveData теперь обновляет storage.sync и перерисовывает вкладки
            renderTabs();
        }
    });
    tabsContainer.appendChild(add);
}
function switchTab(id) { activeTab = id; renderTabs(); renderList(); }
function deleteCategory(id) {
    if (data[id]) data.quickAccess.push(...data[id]);
    delete data[id];
    customCategories = customCategories.filter(c => c.id !== id);
    if (activeTab === id) activeTab = 'quickAccess';
    saveData();
    renderTabs();
}

// === СОРТИРОВКА И ОТРИСОВКА ===
sortSelect.addEventListener('change', renderList);
function sortItems(items) {
    const pinned = items.filter(i => i.pinned).sort((a, b) => (a.pinnedOrder || 0) - (b.pinnedOrder || 0));
    const unpinned = items.filter(i => !i.pinned);
    const sort = sortSelect.value;
    let sorted;
    if (sort === 'alpha') sorted = [...unpinned].sort((a, b) => a.title.localeCompare(b.title, 'ru'));
    else if (sort === 'rating' && activeTab === 'watched') sorted = [...unpinned].sort((a, b) => (b.rating || 0) - (a.rating || 0));
    else sorted = [...unpinned].sort((a, b) => new Date(b.added) - new Date(a.added));
    return [...pinned, ...sorted];
}
function renderList() {
    const items = data[activeTab] || [];
    const sorted = sortItems(items);
    listContainer.innerHTML = '';
    if (!sorted.length) {
        listContainer.innerHTML = `<div class="empty-state">${t('empty_list')}</div>`;
        return;
    }
    sorted.forEach(item => {
        const card = document.createElement('div');
        card.className = 'card' + (item.pinned ? ' pinned' : '');
        const icon = document.createElement('span');
        icon.className = 'card-icon';
        icon.textContent = item.type === 'series' ? '📺' : '🎬';
        const title = document.createElement('span');
        title.className = 'card-title';
        title.textContent = item.title;
        title.title = item.url;
        title.addEventListener('click', () => chrome.tabs.create({ url: item.url }));
        const ratingSpan = document.createElement('span');
        if (item.rating) {
            ratingSpan.className = 'card-rating';
            const emoji = RATING_EMOJI[item.rating - 1] || '⭐';
            ratingSpan.textContent = showNumeric ? `${emoji} ${item.rating}` : emoji;
        }
        const menuBtn = document.createElement('button');
        menuBtn.className = 'card-menu';
        menuBtn.textContent = '⋯';
        menuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            currentContextItem = sorted.find(i => i.id === item.id);
            if (currentContextItem) showItemContextMenu(menuBtn, currentContextItem);
        });
        const delBtn = document.createElement('button');
        delBtn.className = 'card-delete';
        delBtn.textContent = '✕';
        delBtn.addEventListener('click', (e) => { e.stopPropagation(); deleteItem(item.id); });
        card.appendChild(icon);
        card.appendChild(title);
        if (item.rating) card.appendChild(ratingSpan);
        card.appendChild(menuBtn);
        if (item.pinned) {
            const pinIcon = document.createElement('span');
            pinIcon.style.cssText = 'font-size:16px;margin-left:2px;';
            pinIcon.textContent = '📌';
            card.appendChild(pinIcon);
        } else {
            card.appendChild(delBtn);
        }
        listContainer.appendChild(card);
    });
    const ratingOption = sortSelect.querySelector('option[value="rating"]');
    if (activeTab === 'watched') ratingOption.style.display = '';
    else { ratingOption.style.display = 'none'; if (sortSelect.value === 'rating') sortSelect.value = 'date'; }
}
function deleteItem(id) { data[activeTab] = data[activeTab].filter(i => i.id !== id); saveData(); }

// === ЗАКРЕПЛЕНИЕ ===
function togglePin(item) {
    item.pinned = !item.pinned;
    if (item.pinned) {
        const maxOrder = data[activeTab].filter(i => i.pinned).reduce((max, i) => Math.max(max, i.pinnedOrder || 0), 0);
        item.pinnedOrder = maxOrder + 1;
    } else item.pinnedOrder = 0;
    saveData();
}

// === КОНТЕКСТНОЕ МЕНЮ ===
function showItemContextMenu(anchor, item) {
    contextMenu.innerHTML = '';
    const pinBtn = document.createElement('button');
    pinBtn.textContent = item.pinned ? t('move_unpin') : t('move_pin');
    pinBtn.addEventListener('click', () => { togglePin(item); contextMenu.style.display = 'none'; });
    contextMenu.appendChild(pinBtn);
    const sep = document.createElement('div'); sep.style.cssText = 'border-top:1px solid rgba(255,107,74,0.3);margin:4px 0;';
    contextMenu.appendChild(sep);
    const allTargets = [
        { target: 'quickAccess', label: t('move_main') },
        { target: 'watchLater', label: t('move_later') },
        { target: 'watched', label: t('move_watched') },
        ...customCategories.map(cat => ({ target: cat.id, label: cat.name }))
    ].filter(opt => opt.target !== activeTab);
    allTargets.forEach(opt => {
        const btn = document.createElement('button');
        btn.textContent = opt.label;
        btn.addEventListener('click', () => { moveItem(item, opt.target); contextMenu.style.display = 'none'; });
        contextMenu.appendChild(btn);
    });
    contextMenu.style.display = 'block';
    const rect = anchor.getBoundingClientRect();
    let top = rect.bottom + 2, left = rect.left;
    if (top + contextMenu.offsetHeight > window.innerHeight) top = rect.top - contextMenu.offsetHeight - 2;
    if (left + contextMenu.offsetWidth > window.innerWidth) left = window.innerWidth - contextMenu.offsetWidth - 5;
    contextMenu.style.top = `${top}px`;
    contextMenu.style.left = `${left}px`;
    const closeMenu = (e) => {
        if (!contextMenu.contains(e.target)) { contextMenu.style.display = 'none'; document.removeEventListener('click', closeMenu); }
    };
    setTimeout(() => document.addEventListener('click', closeMenu), 0);
}

// === ПЕРЕМЕЩЕНИЕ ===
function moveItem(item, targetLib) {
    if (activeTab === 'watched' && targetLib !== 'watched') delete item.rating;
    item.pinned = false; item.pinnedOrder = 0;
    if (targetLib === 'watched' && activeTab !== 'watched') {
        showRatingModal(item, (rating) => {
            item.rating = rating;
            if ((data[targetLib] || []).some(i => i.url === item.url)) { alert(t('already_exists')); return; }
            performMove(item, targetLib);
        });
    } else {
        if ((data[targetLib] || []).some(i => i.url === item.url)) { alert(t('already_exists')); return; }
        performMove(item, targetLib);
    }
}
function performMove(item, targetLib) {
    data[activeTab] = data[activeTab].filter(i => i.id !== item.id);
    if (!data[targetLib]) data[targetLib] = [];
    data[targetLib].push(item);
    saveData();
}

// === МОДАЛКА ОЦЕНКИ ===
function showRatingModal(item, callback) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `<div class="modal"><div style="font-size:16px;margin-bottom:8px;">${t('modal_title', { title: item.title })}</div><div class="stars-row" id="starContainer"></div><div id="ratingValue" style="color:#ffc107;height:20px;"></div><button class="btn btn-primary" id="rateSubmit" style="width:100%;margin-top:8px;">${t('modal_btn')}</button></div>`;
    document.body.appendChild(overlay);
    let selected = 0;
    const starContainer = overlay.querySelector('#starContainer');
    const ratingValue = overlay.querySelector('#ratingValue');
    function renderStars() {
        starContainer.innerHTML = '';
        for (let i = 1; i <= 10; i++) {
            const star = document.createElement('span');
            star.className = 'star' + (i <= selected ? ' active' : '');
            star.textContent = '★';
            star.addEventListener('click', () => { selected = i; renderStars(); ratingValue.textContent = `${i}/10`; });
            starContainer.appendChild(star);
        }
    }
    renderStars();
    overlay.querySelector('#rateSubmit').addEventListener('click', () => { if (selected === 0) return; overlay.remove(); callback(selected); });
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
}

// === СЛУШАТЕЛЬ ХРАНИЛИЩА (также sync) ===
chrome.storage.sync.onChanged.addListener((changes, namespace) => {
    if (namespace !== 'sync') return;
    if (changes.libraries) { data = changes.libraries.newValue || { quickAccess: [], watchLater: [], watched: [] }; renderList(); }
    if (changes.customCategories) { customCategories = changes.customCategories.newValue || []; renderTabs(); }
    if (changes.favoriteSiteUrl) { favoriteSiteUrl = changes.favoriteSiteUrl.newValue || DEFAULT_CX; cxDomainDisplay.textContent = favoriteSiteUrl; updateButtons(); }
    if (changes.showNumericRating) { showNumeric = changes.showNumericRating.newValue === true; switchNumeric.classList.toggle('active', showNumeric); renderList(); }
    if (changes.pendingAutoSave) { pendingAutoSave = changes.pendingAutoSave.newValue === true; }
    if (changes.language) { currentLang = changes.language.newValue; applyLanguage(); }
});

loadStorage();