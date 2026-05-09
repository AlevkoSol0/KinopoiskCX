let lastUrl = location.href;
let autoHideEnabled = false;
let hideTimer = null;
let scrollListener = null;
let currentLanguage = 'ru';

const translations = {
    ru: {
        banner_title: 'Доступен плеер',
        banner_subtitle: 'Смотреть на .CX',
        banner_btn: 'Перейти'
    },
    en: {
        banner_title: 'Player available',
        banner_subtitle: 'Watch on .CX',
        banner_btn: 'Go'
    }
};

function updateBannerText() {
    const banner = document.getElementById('custom-player-banner');
    if (!banner) return;
    const t = translations[currentLanguage] || translations.ru;
    const titleEl = banner.querySelector('div:nth-child(1) div:nth-child(2) div:nth-child(1)');
    const subtitleEl = banner.querySelector('div:nth-child(1) div:nth-child(2) div:nth-child(2)');
    const btnEl = banner.querySelector('a');
    if (titleEl) titleEl.textContent = t.banner_title;
    if (subtitleEl) subtitleEl.textContent = t.banner_subtitle;
    if (btnEl) btnEl.textContent = t.banner_btn;
}

function checkPage() {
    chrome.storage.sync.get(['isEnabled', 'autoHideEnabled'], (result) => {
        if (result.isEnabled === false) {
            removeBanner();
            return;
        }
        autoHideEnabled = result.autoHideEnabled === true;
        const url = window.location.href;
        if (url.includes('kinopoisk.ru/film/') || url.includes('kinopoisk.ru/series/')) {
            const banner = document.getElementById('custom-player-banner');
            const playerUrl = url.replace("kinopoisk.ru", "kinopoisk.cx");
            if (!banner) {
                createBanner(url);
            } else {
                const linkBtn = banner.querySelector('a');
                if (linkBtn && linkBtn.href !== playerUrl) linkBtn.href = playerUrl;
                updateBannerText();
                if (autoHideEnabled) setupAutoHide();
                else {
                    removeScrollListener();
                    if (banner.style.opacity === '0') {
                        banner.style.transform = 'translateX(-50%) translateY(0)';
                        banner.style.opacity = '1';
                    }
                }
            }
        } else {
            removeBanner();
        }
    });
}

function createBanner(currentUrl) {
    const playerUrl = currentUrl.replace("kinopoisk.ru", "kinopoisk.cx");
    const extIcon = chrome.runtime.getURL("icon128.png");
    const t = translations[currentLanguage] || translations.ru;
    const banner = document.createElement('div');
    banner.id = 'custom-player-banner';
    banner.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px;">
            <img src="${extIcon}" style="width: 24px; height: 24px; border-radius: 4px;">
            <div style="line-height: 1.2;">
                <div style="font-weight: bold; font-size: 14px; color: white;">${t.banner_title}</div>
                <div style="font-size: 12px; opacity: 0.9; color: white;">${t.banner_subtitle}</div>
            </div>
        </div>
        <div style="display: flex; align-items: center; gap: 10px;">
            <a href="${playerUrl}" style="background: white; color: #ff5c35; padding: 7px 18px; border-radius: 20px; text-decoration: none; font-weight: bold; font-size: 13px;">${t.banner_btn}</a>
            <button id="close-banner-x" style="background: none; border: none; color: white; cursor: pointer; font-size: 22px; line-height: 1; padding: 0 5px;">&times;</button>
        </div>`;
    Object.assign(banner.style, {
        position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%) translateY(-100px)',
        backgroundColor: '#ff5c35', backgroundImage: 'linear-gradient(135deg, #ff5c35 0%, #ff1e00 100%)',
        padding: '10px 22px', borderRadius: '50px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', minWidth: '340px', zIndex: '999999999',
        boxShadow: '0 10px 30px rgba(0,0,0,0.4)', fontFamily: 'sans-serif', opacity: '0',
        transition: 'transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.5s'
    });
    document.body.appendChild(banner);
    setTimeout(() => {
        banner.style.transform = 'translateX(-50%) translateY(0)';
        banner.style.opacity = '1';
    }, 100);
    document.getElementById('close-banner-x').onclick = removeBanner;
    if (autoHideEnabled) setupAutoHide();
}

function removeBanner() {
    const banner = document.getElementById('custom-player-banner');
    if (banner) {
        banner.style.transform = 'translateX(-50%) translateY(-100px)';
        banner.style.opacity = '0';
        clearTimeout(hideTimer);
        removeScrollListener();
        setTimeout(() => banner.remove(), 500);
    }
}

function setupAutoHide() {
    removeScrollListener();
    if (!autoHideEnabled) return;
    const banner = document.getElementById('custom-player-banner');
    if (!banner) return;
    const hideBanner = () => {
        if (banner.style.opacity !== '0') {
            banner.style.transform = 'translateX(-50%) translateY(-100px)';
            banner.style.opacity = '1';
        }
    };
    scrollListener = () => hideBanner();
    window.addEventListener('scroll', scrollListener, { passive: true });
}

function removeScrollListener() {
    if (scrollListener) {
        window.removeEventListener('scroll', scrollListener);
        scrollListener = null;
    }
}

// Получаем язык при старте
chrome.storage.sync.get('language', (result) => {
    if (result.language) {
        currentLanguage = result.language;
        updateBannerText();
    }
});

// Слушаем сообщения от попапа
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.action === 'setLanguage') {
        currentLanguage = msg.language;
        updateBannerText();
    }
});

chrome.storage.sync.onChanged.addListener((changes, namespace) => {
    if (namespace !== 'sync') return;
    if (changes.autoHideEnabled) {
        autoHideEnabled = changes.autoHideEnabled.newValue === true;
        if (autoHideEnabled) setupAutoHide();
        else {
            removeScrollListener();
            const banner = document.getElementById('custom-player-banner');
            if (banner && banner.style.opacity === '0') {
                banner.style.transform = 'translateX(-50%) translateY(0)';
                banner.style.opacity = '1';
            }
        }
    }
    if (changes.isEnabled) checkPage();
    if (changes.language) {
        currentLanguage = changes.language.newValue || 'ru';
        updateBannerText();
    }
});

setInterval(() => {
    if (location.href !== lastUrl) {
        lastUrl = location.href;
        checkPage();
    }
}, 800);
checkPage();