// @ts-nocheck
const themeToggle = document.getElementById('themeToggle');
const themeIcon = document.getElementById('themeIcon');
const exitLauncher = document.getElementById('exitLauncher');
const sidebarElement = document.getElementById('sidebar');
const hasBootstrap = typeof bootstrap !== 'undefined';
const sidebar = hasBootstrap ? bootstrap.Offcanvas.getOrCreateInstance(sidebarElement) : null;

let selectedStoreIndex = 0;
let selectedNavbarIndex = 0;
let selectedSidebarIndex = 0;
let selectedFilterIndex = 0;
let navigationArea = 'store';

function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('gamepoint-theme', theme);

    if (themeIcon) {
        themeIcon.className = theme === 'dark' ? 'bi bi-moon-stars-fill' : 'bi bi-sun-fill';
    }
}

const savedTheme = localStorage.getItem('gamepoint-theme');
const preferredTheme = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
applyTheme(savedTheme || preferredTheme);

if (themeToggle) {
    themeToggle.addEventListener('click', () => {
        const currentTheme = document.documentElement.dataset.theme || 'dark';
        applyTheme(currentTheme === 'dark' ? 'light' : 'dark');
    });
}

if (exitLauncher) {
    exitLauncher.addEventListener('click', async (event) => {
        event.preventDefault();

        if (!window.pywebview || !window.pywebview.api) {
            window.close();
            return;
        }

        try {
            await window.pywebview.api.sair_launcher();
        } catch (error) {
            showControllerAlert(`Erro ao sair do launcher: ${error}`);
        }
    });
}

const filterButtons = document.querySelectorAll('.store-filter');
const storeItems = document.querySelectorAll('.store-item');
const storeGrid = document.getElementById('storeGrid');
const launcherBrowser = document.getElementById('launcherBrowser');
const browserFrame = document.getElementById('browserFrame');
const browserTitle = document.getElementById('browserTitle');
const browserBack = document.getElementById('browserBack');
const browserReload = document.getElementById('browserReload');
const browserStage = document.getElementById('browserStage');
const browserCursor = document.getElementById('browserCursor');
const browserVirtualKeyboard = document.getElementById('browserVirtualKeyboard');
let currentBrowserUrl = '';
let selectedBrowserControlIndex = 0;
let browserCursorX = 0;
let browserCursorY = 0;
let browserKeyboardOpen = false;
let selectedBrowserKeyIndex = 0;
let browserKeyboardShift = false;
let browserKeyboardPreviewText = '';
let browserSystemInputLogShown = false;
let browserSystemInputWarningShown = false;
let lastBrowserMouseMoveAt = 0;
let browserNativeLauncherMode = false;
let browserNativeFocusGuardTimer = null;
let hiddenTabForControllerModal = '';
const browserWebviews = new Map();
let activeBrowserPageId = '';
let browserPageTabs = [];
let browserChoiceModal = null;
let browserChoiceModalElement = null;
let browserChoiceList = null;
let browserChoiceTitle = null;
let browserChoiceConfirm = null;
let browserChoiceCancel = null;
let browserChoiceMode = '';
let selectedBrowserChoiceIndex = 0;
const BROWSER_PAGE_TABS_KEY = 'bit-rust-browser-page-tabs';
loadBrowserPageTabs();

const browserKeyboardLayout = [
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
    ['!', '@', '#', '$', '%', '¨', '&', '*', '(', ')'],
    ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
    ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
    ['z', 'x', 'c', 'v', 'b', 'n', 'm'],
    ['_', '+', ':', '>', '<', '?', '/'],
    [
        { label: 'Espaço', key: 'space', wide: true },
        { label: 'Apagar', key: 'BackSpace', wide: true },
        { label: 'Enter', key: 'Return', wide: true },
        { label: 'Maiúsc.', action: 'shift', wide: true },
        { label: 'Fechar', action: 'close', wide: true },
    ],
];

function getBrowserControls() {
    return [];
}

function updateBrowserSelection() {
    const controls = getBrowserControls();

    if (!launcherBrowser || launcherBrowser.classList.contains('d-none') || !controls.length) {
        return;
    }

    selectedBrowserControlIndex = Math.max(0, Math.min(controls.length - 1, selectedBrowserControlIndex));
    controls.forEach((item, index) => {
        const selected = index === selectedBrowserControlIndex;
        item.classList.toggle('is-controller-selected', selected);
        item.setAttribute('tabindex', selected ? '0' : '-1');
    });
    controls[selectedBrowserControlIndex].focus({ preventScroll: true });
}

function clampBrowserCursor() {
    const rect = browserStage.getBoundingClientRect();
    browserCursorX = Math.max(0, Math.min(rect.width, browserCursorX));
    browserCursorY = Math.max(0, Math.min(rect.height, browserCursorY));
}

function updateBrowserCursor() {
    if (!browserStage || !browserCursor) {
        return;
    }

    const rect = browserStage.getBoundingClientRect();
    if (!browserCursorX && !browserCursorY) {
        browserCursorX = rect.width / 2;
        browserCursorY = rect.height / 2;
    }

    clampBrowserCursor();
    browserCursor.style.left = `${browserCursorX}px`;
    browserCursor.style.top = `${browserCursorY}px`;
}

function getBrowserScreenPoint() {
    const rect = browserStage.getBoundingClientRect();

    return {
        x: window.screenX + rect.left + browserCursorX,
        y: window.screenY + rect.top + browserCursorY,
    };
}

function getBrowserBounds() {
    if (!browserStage) {
        return { x: 0, y: 0, width: 1280, height: 720 };
    }

    const rect = browserStage.getBoundingClientRect();
    return {
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: rect.height,
    };
}

function getActiveBrowserFrame() {
    return browserWebviews.get(activeBrowserPageId)?.frame || browserFrame;
}

function setupBrowserFrameEvents(frame) {
    if (!frame || frame.dataset.eventsReady === '1') {
        return;
    }

    frame.dataset.eventsReady = '1';
    frame.addEventListener('dom-ready', () => {
        polishBrowserPage();
        focusBrowserFrame();
    });
    frame.addEventListener('new-window', (event) => {
        event.preventDefault();
        if (event.url) {
            frame.src = event.url;
            currentBrowserUrl = event.url;
        }
    });
}

function ensureBrowserWebview(url, title) {
    const pageId = browserPageIdFromUrl(url) || `page-${Date.now()}`;
    const existing = browserWebviews.get(pageId);
    if (existing) {
        activeBrowserPageId = pageId;
        browserWebviews.forEach((entry, id) => {
            entry.frame.classList.toggle('d-none', id !== pageId);
        });
        currentBrowserUrl = existing.url;
        if (browserTitle) browserTitle.textContent = existing.title;
        return existing.frame;
    }

    const frame = browserWebviews.size === 0 && browserFrame
        ? browserFrame
        : document.createElement('webview');

    if (frame !== browserFrame) {
        frame.id = `browserFrame-${pageId}`;
        frame.setAttribute('title', 'Navegador do launcher');
        frame.setAttribute('allowpopups', '');
        frame.setAttribute('allowfullscreen', '');
        browserStage.insertBefore(frame, browserCursor);
    }

    frame.dataset.pageId = pageId;
    setupBrowserFrameEvents(frame);
    browserWebviews.set(pageId, { frame, url, title });
    activeBrowserPageId = pageId;
    browserWebviews.forEach((entry, id) => {
        entry.frame.classList.toggle('d-none', id !== pageId);
    });
    return frame;
}

function browserPageIdFromUrl(url) {
    try {
        const host = new URL(String(url || '')).hostname.toLowerCase();
        if (host.includes('youtube.com')) return 'youtube';
        if (host.includes('google.com')) return 'google';
        if (host.includes('discord.com')) return 'discord';
    } catch {
        return '';
    }

    return '';
}

function browserPageIcon(pageId) {
    if (pageId === 'youtube') return 'bi bi-youtube';
    if (pageId === 'google') return 'bi bi-google';
    if (pageId === 'discord') return 'bi bi-discord';
    return 'bi bi-window';
}

function loadBrowserPageTabs() {
    try {
        const parsed = JSON.parse(localStorage.getItem(BROWSER_PAGE_TABS_KEY) || '[]');
        browserPageTabs = Array.isArray(parsed) ? parsed.filter((tab) => tab?.id && tab?.url) : [];
    } catch {
        browserPageTabs = [];
    }
}

function saveBrowserPageTabs() {
    localStorage.setItem(BROWSER_PAGE_TABS_KEY, JSON.stringify(browserPageTabs));
}

function addBrowserPageTab(url, title) {
    const id = browserPageIdFromUrl(url);
    if (!id) {
        return;
    }

    const existing = browserPageTabs.find((tab) => tab.id === id);
    const tab = {
        id,
        title: title || id,
        url,
        active: true
    };

    browserPageTabs.forEach((item) => {
        item.active = false;
    });

    if (existing) {
        Object.assign(existing, tab);
    } else {
        browserPageTabs.push(tab);
    }

    saveBrowserPageTabs();
}

function closeBrowserPageTab(tabId) {
    const closingActive = browserPageIdFromUrl(currentBrowserUrl) === tabId;
    const webview = browserWebviews.get(tabId)?.frame;
    if (webview && webview !== browserFrame) {
        webview.remove();
    } else if (webview) {
        webview.src = 'about:blank';
    }
    browserWebviews.delete(tabId);
    browserPageTabs = browserPageTabs.filter((tab) => tab.id !== tabId);
    saveBrowserPageTabs();

    if (closingActive) {
        getActiveBrowserFrame().src = 'about:blank';
        currentBrowserUrl = '';
        closeStoreBrowser();
    }
}

window.onGlobalPageTabClosed = function onGlobalPageTabClosed(tab) {
    const closedId = tab?.pageKey || tab?.id || browserPageIdFromUrl(tab?.url);
    if (!closedId) {
        return;
    }

    closeBrowserPageTab(closedId);
};

function getBrowserChoiceOptions() {
    return Array.from(browserChoiceList?.querySelectorAll('.controller-page-option:not([disabled])') || []);
}

function ensureBrowserChoiceModal() {
    if (browserChoiceModal) {
        return;
    }

    browserChoiceModalElement = document.createElement('div');
    browserChoiceModalElement.className = 'modal fade browser-choice-modal';
    browserChoiceModalElement.tabIndex = -1;
    browserChoiceModalElement.setAttribute('aria-hidden', 'true');
    browserChoiceModalElement.setAttribute('data-bs-backdrop', 'static');
    browserChoiceModalElement.setAttribute('data-bs-keyboard', 'false');
    browserChoiceModalElement.innerHTML = `
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content border-0 shadow-lg rounded-4">
                <div class="modal-header">
                    <h5 class="modal-title fw-bold"><i class="bi bi-window-sidebar me-2 text-primary"></i><span></span></h5>
                </div>
                <div class="modal-body">
                    <div class="controller-page-list"></div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn controller-action controller-action-b px-4 browser-choice-cancel">
                        <span class="controller-badge">B</span>
                        <span>Cancelar</span>
                    </button>
                    <button type="button" class="btn controller-action controller-action-a px-4 browser-choice-confirm">
                        <span class="controller-badge">A</span>
                        <span>Confirmar</span>
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(browserChoiceModalElement);
    browserChoiceTitle = browserChoiceModalElement.querySelector('.modal-title span');
    browserChoiceList = browserChoiceModalElement.querySelector('.controller-page-list');
    browserChoiceConfirm = browserChoiceModalElement.querySelector('.browser-choice-confirm');
    browserChoiceCancel = browserChoiceModalElement.querySelector('.browser-choice-cancel');
    browserChoiceConfirm.addEventListener('click', confirmBrowserChoice);
    browserChoiceCancel.addEventListener('click', hideBrowserChoiceModal);
    browserChoiceModalElement.addEventListener('shown.bs.modal', () => updateBrowserChoiceSelection(false));
    browserChoiceModal = hasBootstrap
        ? bootstrap.Modal.getOrCreateInstance(browserChoiceModalElement)
        : {
            show() {
                browserChoiceModalElement.classList.add('show');
                browserChoiceModalElement.style.display = 'block';
                browserChoiceModalElement.removeAttribute('aria-hidden');
                updateBrowserChoiceSelection(false);
            },
            hide() {
                browserChoiceModalElement.classList.remove('show');
                browserChoiceModalElement.style.display = 'none';
                browserChoiceModalElement.setAttribute('aria-hidden', 'true');
            }
        };
}

function isBrowserChoiceModalOpen() {
    return Boolean(browserChoiceModalElement?.classList.contains('show'));
}

function hideBrowserChoiceModal() {
    browserChoiceModal?.hide();
    browserChoiceMode = '';
    selectedBrowserChoiceIndex = 0;
}

document.addEventListener('keydown', (event) => {
    if (!isBrowserChoiceModalOpen()) {
        return;
    }

    if (event.key === 'Enter') {
        event.preventDefault();
        confirmBrowserChoice();
    } else if (event.key === 'Escape') {
        event.preventDefault();
        hideBrowserChoiceModal();
    }
}, true);

function createBrowserChoiceOption({ id, title, subtitle, icon, type }, selected = false) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'controller-page-option';
    button.dataset.id = id;
    button.dataset.type = type;
    button.innerHTML = `
        <i class="${icon}"></i>
        <div>
            <span></span>
            <small></small>
        </div>
    `;
    button.querySelector('span').textContent = title;
    button.querySelector('small').textContent = subtitle;
    button.classList.toggle('is-controller-selected', selected);
    button.addEventListener('click', () => {
        const options = getBrowserChoiceOptions();
        selectedBrowserChoiceIndex = Math.max(0, options.indexOf(button));
        updateBrowserChoiceSelection(false);
    });
    return button;
}

function updateBrowserChoiceSelection(scrollIntoView = true) {
    const options = getBrowserChoiceOptions();
    if (!options.length) {
        return;
    }

    selectedBrowserChoiceIndex = Math.max(0, Math.min(options.length - 1, selectedBrowserChoiceIndex));
    options.forEach((option, index) => {
        const selected = index === selectedBrowserChoiceIndex;
        option.classList.toggle('is-controller-selected', selected);
        option.setAttribute('tabindex', selected ? '0' : '-1');
    });
    options[selectedBrowserChoiceIndex].focus({ preventScroll: true });
    if (scrollIntoView) {
        options[selectedBrowserChoiceIndex].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

function navigateBrowserChoice(direction) {
    if (direction === 'up' || direction === 'left') {
        selectedBrowserChoiceIndex -= 1;
    } else if (direction === 'down' || direction === 'right') {
        selectedBrowserChoiceIndex += 1;
    }

    updateBrowserChoiceSelection();
    return true;
}

function openBrowserStartModal() {
    ensureBrowserChoiceModal();
    browserChoiceMode = 'start';
    selectedBrowserChoiceIndex = 1;
    browserChoiceTitle.textContent = 'O que deseja fazer?';
    browserChoiceConfirm.querySelector('span:last-child').textContent = 'Selecionar';
    browserChoiceList.innerHTML = '';
    browserChoiceList.append(
        createBrowserChoiceOption({
            id: 'games',
            type: 'games',
            title: 'Meus Jogos',
            subtitle: 'Voltar para a biblioteca',
            icon: 'bi bi-controller'
        }),
        createBrowserChoiceOption({
            id: 'continue',
            type: 'continue',
            title: 'Continuar na pagina atual',
            subtitle: currentBrowserUrl || 'Navegador aberto',
            icon: 'bi bi-window-check'
        }, true)
    );
    browserChoiceModal.show();
}

function openBrowserCloseModal() {
    ensureBrowserChoiceModal();
    loadBrowserPageTabs();
    browserChoiceMode = 'close';
    selectedBrowserChoiceIndex = 0;
    browserChoiceTitle.textContent = 'Qual pagina deseja fechar?';
    browserChoiceConfirm.querySelector('span:last-child').textContent = 'Fechar';
    browserChoiceList.innerHTML = '';

    if (!browserPageTabs.length) {
        const empty = createBrowserChoiceOption({
            id: '',
            type: 'empty',
            title: 'Nenhuma pagina aberta',
            subtitle: 'Meus Jogos nao pode ser fechado',
            icon: 'bi bi-window-x'
        }, true);
        empty.disabled = true;
        browserChoiceList.appendChild(empty);
    } else {
        browserPageTabs.forEach((tab, index) => {
            browserChoiceList.appendChild(createBrowserChoiceOption({
                id: tab.id,
                type: 'tab',
                title: tab.title,
                subtitle: tab.url,
                icon: browserPageIcon(tab.id)
            }, index === 0));
        });
    }

    browserChoiceModal.show();
}

function confirmBrowserChoice() {
    const selected = getBrowserChoiceOptions()[selectedBrowserChoiceIndex];
    if (!selected) {
        return;
    }

    if (browserChoiceMode === 'start') {
        const type = selected.dataset.type;
        hideBrowserChoiceModal();
        if (type === 'games') {
            returnToGames();
        }
        return;
    }

    if (browserChoiceMode === 'close' && selected.dataset.type === 'tab') {
        const tabId = selected.dataset.id;
        hideBrowserChoiceModal();
        closeBrowserPageTab(tabId);
    }
}

function sendBrowserInputEvent(inputEvent) {
    if (browserNativeLauncherMode) {
        return false;
    }

    const activeFrame = getActiveBrowserFrame();
    if (activeFrame?.sendInputEvent) {
        activeFrame.sendInputEvent(inputEvent);
        return true;
    }

    return false;
}

async function insertBrowserText(text) {
    focusBrowserFrame();

    const activeFrame = getActiveBrowserFrame();
    if (!browserNativeLauncherMode && activeFrame?.insertText) {
        await activeFrame.insertText(String(text || ''));
        return true;
    }

    if (!browserNativeLauncherMode && activeFrame?.executeJavaScript) {
        await activeFrame.executeJavaScript(`document.execCommand('insertText', false, ${JSON.stringify(text)})`);
        return true;
    }

    const response = await window.pywebview?.api?.digitar_texto_sistema?.(text);
    reportBrowserSystemInputIssue(response);
    return Boolean(response?.ok);
}

function sendBrowserKeyShortcut(keyCode, systemKey = keyCode) {
    if (sendBrowserInputEvent({ type: 'keyDown', keyCode })) {
        sendBrowserInputEvent({ type: 'keyUp', keyCode });
        return;
    }

    const responsePromise = window.pywebview?.api?.tecla_sistema?.(systemKey);
    responsePromise?.then((response) => {
        reportBrowserSystemInputIssue(response, false);
    });
}

function moveBrowserTextCursor(direction) {
    const keyCode = direction === 'left' ? 'Left' : 'Right';
    sendBrowserKeyShortcut(keyCode);
}

function focusBrowserFrame() {
    try {
        if (browserNativeLauncherMode) {
            if (document.activeElement?.tagName === 'WEBVIEW') {
                document.activeElement.blur();
            }
            launcherBrowser?.setAttribute('tabindex', '-1');
            launcherBrowser?.focus?.({ preventScroll: true });
            return;
        }

        getActiveBrowserFrame()?.focus?.();
    } catch {
        // Focus can fail while the guest page is still starting up.
    }
}

function startNativeBrowserFocusGuard() {
    stopNativeBrowserFocusGuard();
    browserNativeFocusGuardTimer = window.setInterval(() => {
        if (!browserNativeLauncherMode || !launcherBrowser || launcherBrowser.classList.contains('d-none')) {
            stopNativeBrowserFocusGuard();
            return;
        }

        if (document.activeElement?.tagName === 'WEBVIEW' || !document.hasFocus()) {
            focusBrowserFrame();
        }
    }, 250);
}

function stopNativeBrowserFocusGuard() {
    if (browserNativeFocusGuardTimer) {
        window.clearInterval(browserNativeFocusGuardTimer);
        browserNativeFocusGuardTimer = null;
    }
}

function prepareBrowserFrame(url) {
    browserFrame.style.cssText = [
        'position: absolute',
        'inset: 0',
        'display: flex',
        'width: 100%',
        'height: 100%',
        'min-width: 100%',
        'min-height: 100%',
        'background: #0f0f0f',
    ].join('; ');
    if (browserNativeLauncherMode) {
        browserFrame.src = 'about:blank';
        browserFrame.tabIndex = -1;
        browserFrame.style.cssText = browserFrame.style.cssText;
        browserFrame.style.display = 'none';
        browserFrame.style.pointerEvents = 'none';
        focusBrowserFrame();
        startNativeBrowserFocusGuard();
        return;
    }

    stopNativeBrowserFocusGuard();
    const activeFrame = ensureBrowserWebview(url, browserTitle?.textContent || 'Navegador');
    activeFrame.classList.remove('d-none');
    activeFrame.style.cssText = browserFrame.style.cssText;
    activeFrame.style.pointerEvents = '';
    activeFrame.src = url;
}

async function positionNativeLauncherBrowser() {
    if (!browserNativeLauncherMode || !window.pywebview?.api?.posicionar_url_launcher) {
        return;
    }

    const response = await window.pywebview.api.posicionar_url_launcher(getBrowserBounds());
    reportBrowserSystemInputIssue(response, false);
    syncNativeBrowserKeyboard();
}

async function polishBrowserPage() {
    const activeFrame = getActiveBrowserFrame();
    if (!activeFrame?.insertCSS) {
        return;
    }

    try {
        await activeFrame.insertCSS(`
            html,
            body,
            ytd-app {
                min-height: 100vh !important;
                background: #0f0f0f !important;
            }
        `);
    } catch {
        // Some guest pages reject CSS injection; the host layout still handles sizing.
    }
}

async function syncSystemMouse() {
    if (!window.pywebview?.api?.mover_mouse_sistema) {
        return;
    }

    const response = await window.pywebview.api.mover_mouse_sistema(browserCursorX, browserCursorY);
    reportBrowserSystemInputIssue(response, false);
}

async function moveBrowserMouse(dx, dy) {
    if (!launcherBrowser || launcherBrowser.classList.contains('d-none') || browserKeyboardOpen) {
        return false;
    }

    lastBrowserMouseMoveAt = performance.now();
    browserCursorX += Number(dx) || 0;
    browserCursorY += Number(dy) || 0;
    updateBrowserCursor();
    focusBrowserFrame();

    if (!sendBrowserInputEvent({
        type: 'mouseMove',
        x: Math.round(browserCursorX),
        y: Math.round(browserCursorY),
        movementX: Math.round(Number(dx) || 0),
        movementY: Math.round(Number(dy) || 0),
    }) && window.pywebview?.api?.mover_mouse_relativo_sistema) {
        const response = await window.pywebview.api.mover_mouse_relativo_sistema(dx, dy);
        reportBrowserSystemInputIssue(response, false);
    }

    return true;
}

function launcherMouseMove(dx, dy) {
    return moveBrowserMouse(dx, dy);
}

function reportBrowserSystemInputIssue(response, showAlert = true) {
    if (!response || response.ok !== false) {
        return;
    }

    if (showAlert) {
        if (browserSystemInputWarningShown) {
            return;
        }

        browserSystemInputWarningShown = true;
        showControllerAlert(response.message);
    } else {
        if (browserSystemInputLogShown) {
            return;
        }

        browserSystemInputLogShown = true;
        console.warn(response.message);
    }
}

async function clickBrowserCursor(button = 'left') {
    focusBrowserFrame();

    if (sendBrowserInputEvent({
        type: 'mouseDown',
        button,
        clickCount: 1,
        x: Math.round(browserCursorX),
        y: Math.round(browserCursorY),
    })) {
        sendBrowserInputEvent({
            type: 'mouseUp',
            button,
            clickCount: 1,
            x: Math.round(browserCursorX),
            y: Math.round(browserCursorY),
        });
        return;
    }

    const apiMethod = button === 'right' ? 'clicar_mouse_direito_sistema' : 'clicar_mouse_sistema';
    if (!window.pywebview?.api?.[apiMethod]) {
        return;
    }

    const response = await window.pywebview.api[apiMethod]();
    reportBrowserSystemInputIssue(response);
}

async function scrollBrowserPage(direction) {
    focusBrowserFrame();

    if (sendBrowserInputEvent({
        type: 'mouseWheel',
        x: Math.round(browserCursorX),
        y: Math.round(browserCursorY),
        deltaY: direction === 'up' ? 520 : -520,
        wheelTicksY: direction === 'up' ? 3 : -3,
    })) {
        return;
    }

    if (!window.pywebview?.api?.rolar_mouse_sistema) {
        return;
    }

    const response = await window.pywebview.api.rolar_mouse_sistema(direction);
    reportBrowserSystemInputIssue(response);
}

function getBrowserKeys() {
    return Array.from(browserVirtualKeyboard?.querySelectorAll('.browser-key') || []);
}

function browserKeyLabel(value) {
    return /^[a-z]$/.test(value) && browserKeyboardShift ? value.toUpperCase() : value;
}

function buildBrowserKeyboard() {
    if (!browserVirtualKeyboard || browserVirtualKeyboard.dataset.ready === '1') {
        return;
    }

    browserKeyboardLayout.forEach((row, rowIndex) => {
        const rowElement = document.createElement('div');
        rowElement.className = 'browser-keyboard-row';

        row.forEach((entry, columnIndex) => {
            const key = typeof entry === 'string' ? { label: entry, text: entry } : entry;
            const button = document.createElement('button');
            button.type = 'button';
            button.className = `browser-key${key.wide ? ' browser-key-wide' : ''}`;
            button.textContent = key.label;
            button.dataset.row = String(rowIndex);
            button.dataset.column = String(columnIndex);
            if (key.text) button.dataset.text = key.text;
            if (key.key) button.dataset.key = key.key;
            if (key.action) button.dataset.action = key.action;
            button.addEventListener('click', () => pressBrowserKey(button));
            rowElement.appendChild(button);
        });

        browserVirtualKeyboard.appendChild(rowElement);
    });

    browserVirtualKeyboard.dataset.ready = '1';
}

function updateBrowserKeyboardSelection() {
    const keys = getBrowserKeys();
    if (!keys.length) return;
    selectedBrowserKeyIndex = Math.max(0, Math.min(keys.length - 1, selectedBrowserKeyIndex));
    keys.forEach((key, index) => key.classList.toggle('is-controller-selected', index === selectedBrowserKeyIndex));
    keys[selectedBrowserKeyIndex].focus({ preventScroll: true });
    syncNativeBrowserKeyboard();
}

function getBrowserKeyboardState() {
    buildBrowserKeyboard();
    const rows = browserKeyboardLayout.map((row, rowIndex) => row.map((entry, columnIndex) => {
        const key = typeof entry === 'string' ? { label: browserKeyLabel(entry), text: entry } : entry;
        const domKey = getBrowserKeys().find((item) =>
            Number(item.dataset.row) === rowIndex && Number(item.dataset.column) === columnIndex
        );

        return {
            label: domKey?.textContent || key.label || key.text || '',
            wide: Boolean(key.wide),
            selected: domKey ? getBrowserKeys().indexOf(domKey) === selectedBrowserKeyIndex : false
        };
    }));

    return {
        text: browserKeyboardPreviewText,
        rows
    };
}

function syncNativeBrowserKeyboard() {
    if (!browserKeyboardOpen || !browserNativeLauncherMode) {
        return;
    }

    window.pywebview?.api?.atualizar_teclado_virtual?.(getBrowserKeyboardState(), getBrowserBounds())
        ?.then((response) => reportBrowserSystemInputIssue(response, false));
}

async function getActiveLauncherTabId() {
    const response = await window.pywebview?.api?.listar_url_launcher?.();
    if (response?.ok === false) {
        reportBrowserSystemInputIssue(response, false);
        return '';
    }

    return (response?.tabs || []).find((tab) => tab.active)?.id || '';
}

async function hideNativeBrowserForControllerModal() {
    if (!browserNativeLauncherMode || !window.pywebview?.api?.ocultar_url_launcher) {
        hiddenTabForControllerModal = '';
        return;
    }

    hiddenTabForControllerModal = await getActiveLauncherTabId();
    const response = await window.pywebview.api.ocultar_url_launcher();
    reportBrowserSystemInputIssue(response, false);
}

async function restoreNativeBrowserAfterControllerModal() {
    const tabId = hiddenTabForControllerModal;
    hiddenTabForControllerModal = '';

    if (!tabId || !browserNativeLauncherMode || !window.pywebview?.api?.ativar_url_launcher) {
        return;
    }

    const response = await window.pywebview.api.ativar_url_launcher(tabId, getBrowserBounds());
    reportBrowserSystemInputIssue(response, false);
}

async function openNativeControllerModal(type) {
    toggleBrowserKeyboard(false);
    window.pywebview?.api?.definir_modo_modal_navegador?.(false);
    await hideNativeBrowserForControllerModal();

    if (type === 'close') {
        await window.PageTabsModal?.openClose?.();
    } else {
        await window.PageTabsModal?.openAccess?.();
    }

    window.pywebview?.api?.definir_modo_modal_navegador?.(true);
}

function getBrowserKeyAt(row, column) {
    const rowKeys = getBrowserKeys().filter((key) => Number(key.dataset.row) === row);
    if (!rowKeys.length) return null;
    const wrapped = ((column % rowKeys.length) + rowKeys.length) % rowKeys.length;
    return rowKeys[wrapped];
}

function moveBrowserKeyboard(direction) {
    const keys = getBrowserKeys();
    const selected = keys[selectedBrowserKeyIndex];
    if (!selected) return;
    const row = Number(selected.dataset.row);
    const column = Number(selected.dataset.column);
    const rows = browserKeyboardLayout.length;
    let next = null;
    if (direction === 'left') next = getBrowserKeyAt(row, column - 1);
    if (direction === 'right') next = getBrowserKeyAt(row, column + 1);
    if (direction === 'up') next = getBrowserKeyAt((row - 1 + rows) % rows, column);
    if (direction === 'down') next = getBrowserKeyAt((row + 1) % rows, column);
    if (next) {
        selectedBrowserKeyIndex = keys.indexOf(next);
        updateBrowserKeyboardSelection();
    }
}

async function pressBrowserKey(button = getBrowserKeys()[selectedBrowserKeyIndex]) {
    if (!button) return;
    const action = button.dataset.action;
    if (action === 'close') {
        toggleBrowserKeyboard(false);
        return;
    }
    if (action === 'shift') {
        browserKeyboardShift = !browserKeyboardShift;
        getBrowserKeys().forEach((key) => {
            if (key.dataset.text) key.textContent = browserKeyLabel(key.dataset.text);
        });
        syncNativeBrowserKeyboard();
        return;
    }
    if (button.dataset.key) {
        if (button.dataset.key === 'space') {
            browserKeyboardPreviewText += ' ';
            await insertBrowserText(' ');
            syncNativeBrowserKeyboard();
            return;
        }

        const keyCode = button.dataset.key === 'Return'
            ? 'Enter'
            : button.dataset.key === 'BackSpace'
                ? 'Backspace'
                : button.dataset.key === 'space'
                    ? 'Space'
                    : button.dataset.key;
        if (keyCode === 'Backspace') {
            browserKeyboardPreviewText = browserKeyboardPreviewText.slice(0, -1);
        } else if (keyCode === 'Enter') {
            browserKeyboardPreviewText = '';
        }
        if (sendBrowserInputEvent({ type: 'keyDown', keyCode })) {
            sendBrowserInputEvent({ type: 'keyUp', keyCode });
            syncNativeBrowserKeyboard();
            return;
        }

        const response = await window.pywebview?.api?.tecla_sistema?.(button.dataset.key);
        reportBrowserSystemInputIssue(response);
        syncNativeBrowserKeyboard();
        return;
    }
    if (button.dataset.text) {
        const text = browserKeyLabel(button.dataset.text);
        browserKeyboardPreviewText += text;
        await insertBrowserText(text);
        syncNativeBrowserKeyboard();
    }
}

function toggleBrowserKeyboard(force = null) {
    buildBrowserKeyboard();
    browserKeyboardOpen = force === null ? !browserKeyboardOpen : Boolean(force);
    window.pywebview?.api?.definir_modo_teclado_navegador?.(browserKeyboardOpen);
    browserVirtualKeyboard.classList.toggle('d-none', !browserKeyboardOpen || browserNativeLauncherMode);
    selectedBrowserKeyIndex = 0;
    if (browserKeyboardOpen) {
        updateBrowserKeyboardSelection();
        if (browserNativeLauncherMode) {
            window.pywebview?.api?.mostrar_teclado_virtual?.(getBrowserKeyboardState(), getBrowserBounds())
                ?.then((response) => reportBrowserSystemInputIssue(response, false));
        }
    } else {
        window.pywebview?.api?.fechar_teclado_virtual?.()
            ?.then((response) => reportBrowserSystemInputIssue(response, false));
    }
}

async function openStoreUrl(url, title = 'Navegador', openMode = 'internal') {
    if (!url) {
        return;
    }

    openMode = window.BrowserControlMode?.resolveBrowserOpenMode?.(url, openMode) || openMode;

    if (openMode === 'system') {
        const response = await window.pywebview?.api?.abrir_url_sistema?.(url);
        if (response && response.ok === false) {
            showControllerAlert(response.message);
        } else if (!response) {
            window.open(url, '_blank');
        }
        return;
    }

    currentBrowserUrl = url;
    addBrowserPageTab(url, title);
    browserSystemInputLogShown = false;
    browserSystemInputWarningShown = false;
    if (browserTitle) {
        browserTitle.textContent = title;
    }
    document.body.classList.add('browser-open');
    storeGrid.classList.add('d-none');
    launcherBrowser.classList.remove('d-none');
    browserNativeLauncherMode = ['launcher', 'native-launcher'].includes(openMode) && Boolean(window.pywebview?.api?.abrir_url_launcher);
    launcherBrowser.classList.toggle('is-launcher-webview', browserNativeLauncherMode);
    browserKeyboardOpen = false;
    browserKeyboardPreviewText = '';
    browserVirtualKeyboard?.classList.add('d-none');
    window.pywebview?.api?.fechar_teclado_virtual?.();
    window.pywebview?.api?.definir_modo_teclado_navegador?.(false);
    selectedBrowserControlIndex = 0;
    browserCursorX = 0;
    browserCursorY = 0;
    updateBrowserCursor();
    prepareBrowserFrame(url);

    if (browserNativeLauncherMode) {
        const response = await window.pywebview.api.abrir_url_launcher(url, title, getBrowserBounds());
        reportBrowserSystemInputIssue(response);
    } else {
        browserFrame.addEventListener('dom-ready', () => {
            polishBrowserPage();
            focusBrowserFrame();
        }, { once: true });
    }

    updateBrowserSelection();
}

async function activateStoreTab(tabId) {
    if (!tabId || !window.pywebview?.api?.listar_url_launcher) {
        return false;
    }

    const response = await window.pywebview.api.listar_url_launcher();
    if (response?.ok === false) {
        reportBrowserSystemInputIssue(response);
        return false;
    }

    const tab = (response.tabs || []).find((item) => item.id === tabId);
    if (!tab?.url) {
        showControllerAlert('Pagina aberta nao encontrada.');
        return false;
    }

    currentBrowserUrl = tab.url;
    addBrowserPageTab(tab.url, tab.title || 'Navegador');
    browserSystemInputLogShown = false;
    browserSystemInputWarningShown = false;
    if (browserTitle) {
        browserTitle.textContent = tab.title || 'Navegador';
    }
    document.body.classList.add('browser-open');
    storeGrid.classList.add('d-none');
    launcherBrowser.classList.remove('d-none');
    browserNativeLauncherMode = true;
    launcherBrowser.classList.add('is-launcher-webview');
    browserKeyboardOpen = false;
    browserKeyboardPreviewText = '';
    browserVirtualKeyboard?.classList.add('d-none');
    window.pywebview?.api?.fechar_teclado_virtual?.();
    window.pywebview?.api?.definir_modo_teclado_navegador?.(false);
    selectedBrowserControlIndex = 0;
    browserCursorX = 0;
    browserCursorY = 0;
    updateBrowserCursor();
    prepareBrowserFrame(tab.url);

    const activateResponse = await window.pywebview?.api?.ativar_url_launcher?.(tab.id, getBrowserBounds());
    reportBrowserSystemInputIssue(activateResponse);
    if (activateResponse?.ok === false) {
        return false;
    }

    if (activateResponse?.tab?.url) {
        currentBrowserUrl = activateResponse.tab.url;
    }
    updateBrowserSelection();
    return true;
}

async function registerOpenPageBeforeLeaving() {
    if (browserNativeLauncherMode) {
        return;
    }

    const activeUrl = getActiveBrowserFrame()?.getURL?.() || currentBrowserUrl;
    if (!activeUrl || activeUrl === 'about:blank' || !window.pywebview?.api?.registrar_url_launcher) {
        return;
    }

    const response = await window.pywebview.api.registrar_url_launcher(
        activeUrl,
        browserTitle?.textContent || 'Navegador'
    );
    reportBrowserSystemInputIssue(response, false);
}

async function closeStoreBrowser() {
    if (!launcherBrowser || launcherBrowser.classList.contains('d-none')) {
        return false;
    }

    await registerOpenPageBeforeLeaving();
    getActiveBrowserFrame()?.classList.add('d-none');
    window.pywebview?.api?.ocultar_url_launcher?.();
    window.pywebview?.api?.fechar_teclado_virtual?.();
    window.pywebview?.api?.definir_modo_teclado_navegador?.(false);
    window.pywebview?.api?.definir_modo_modal_navegador?.(false);
    browserNativeLauncherMode = false;
    stopNativeBrowserFocusGuard();
    launcherBrowser.classList.remove('is-launcher-webview');
    currentBrowserUrl = '';
    document.body.classList.remove('browser-open');
    sessionStorage.setItem('gp-profile-selected', '1');
    window.location.href = './index.html';
    return true;
}

function returnToGames() {
    closeStoreBrowser().then((closed) => {
        if (!closed) {
            window.location.href = './index.html';
        }
    });
}

function reloadStoreBrowser() {
    const activeFrame = getActiveBrowserFrame();
    if (browserNativeLauncherMode && window.pywebview?.api?.recarregar_url_launcher) {
        window.pywebview.api.recarregar_url_launcher().then((response) => reportBrowserSystemInputIssue(response, false));
    } else if (activeFrame?.reload) {
        activeFrame.reload();
    } else if (currentBrowserUrl) {
        activeFrame.src = currentBrowserUrl;
    }
}

async function browserBackAction() {
    if (browserNativeLauncherMode && window.pywebview?.api?.voltar_url_launcher) {
        const response = await window.pywebview.api.voltar_url_launcher();
        reportBrowserSystemInputIssue(response, false);
        if (response?.shouldClose) {
            return closeStoreBrowser();
        }
        return true;
    }

    const activeFrame = getActiveBrowserFrame();
    if (activeFrame?.canGoBack?.()) {
        activeFrame.goBack();
        return true;
    }

    return closeStoreBrowser();
}

filterButtons.forEach((button) => {
    button.addEventListener('click', () => {
        filterButtons.forEach((item) => item.classList.remove('active'));
        button.classList.add('active');

        const filter = button.dataset.filter;
        storeItems.forEach((card) => {
            const show = filter === 'all' || card.dataset.tag === filter;
            card.classList.toggle('d-none', !show);
        });

        selectedStoreIndex = 0;
        selectedFilterIndex = Math.max(0, Array.from(filterButtons).indexOf(button));
        setNavigationArea('store', selectedStoreIndex);
    });
});

function getStoreCards() {
    return Array.from(document.querySelectorAll('.store-item:not(.d-none) .store-card'));
}

function getNavbarItems() {
    return Array.from(document.querySelectorAll('.navbar-toggler, .navbar-brand, #themeToggle, .app-action-btn'));
}

function getSidebarItems() {
    return [
        ...document.querySelectorAll('#sidebar .nav-link'),
        ...document.querySelectorAll('#sidebar .user-link'),
        ...document.querySelectorAll('#sidebar .dropdown-menu.show .dropdown-item')
    ];
}

function isSidebarOpen() {
    return sidebarElement?.classList.contains('show');
}

function clearNavigationSelection() {
    document.querySelectorAll('.is-selected, .is-controller-selected').forEach((item) => {
        item.classList.remove('is-selected', 'is-controller-selected');
        item.setAttribute('tabindex', '-1');
    });
}

function setNavigationArea(area, index = null, scrollIntoView = true) {
    navigationArea = area;

    if (area === 'navbar' && index !== null) {
        selectedNavbarIndex = index;
    } else if (area === 'sidebar' && index !== null) {
        selectedSidebarIndex = index;
    } else if (area === 'filters' && index !== null) {
        selectedFilterIndex = index;
    } else if (area === 'store' && index !== null) {
        selectedStoreIndex = index;
    }

    updateNavigationSelection(scrollIntoView);
}

function updateNavigationSelection(scrollIntoView = true) {
    clearNavigationSelection();

    let items = [];
    let selectedIndex = 0;

    if (navigationArea === 'navbar') {
        items = getNavbarItems();
        selectedNavbarIndex = Math.max(0, Math.min(items.length - 1, selectedNavbarIndex));
        selectedIndex = selectedNavbarIndex;
    } else if (navigationArea === 'sidebar' && isSidebarOpen()) {
        items = getSidebarItems();
        selectedSidebarIndex = Math.max(0, Math.min(items.length - 1, selectedSidebarIndex));
        selectedIndex = selectedSidebarIndex;
    } else if (navigationArea === 'filters') {
        items = Array.from(filterButtons);

        if (!items.length) {
            navigationArea = 'store';
            items = getStoreCards();
            selectedStoreIndex = Math.max(0, Math.min(items.length - 1, selectedStoreIndex));
            selectedIndex = selectedStoreIndex;
        } else {
            selectedFilterIndex = Math.max(0, Math.min(items.length - 1, selectedFilterIndex));
            selectedIndex = selectedFilterIndex;
        }
    } else {
        navigationArea = 'store';
        items = getStoreCards();
        selectedStoreIndex = Math.max(0, Math.min(items.length - 1, selectedStoreIndex));
        selectedIndex = selectedStoreIndex;
    }

    const selectedItem = items[selectedIndex];

    items.forEach((item, index) => {
        const isSelected = index === selectedIndex;
        const selectionClass = item.classList.contains('store-card') ? 'is-selected' : 'is-controller-selected';
        item.classList.toggle(selectionClass, isSelected);
        item.setAttribute('tabindex', isSelected ? '0' : '-1');
    });

    if (selectedItem) {
        selectedItem.focus({ preventScroll: true });
    }

    if (scrollIntoView && selectedItem) {
        selectedItem.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
            inline: 'nearest'
        });
    }
}

function launcherNavigate(direction) {
    if (window.isControllerAlertOpen?.()) {
        return;
    }

    if (window.PageTabsModal?.isOpen?.()) {
        window.PageTabsModal.navigate(direction);
        return;
    }

    if (isBrowserChoiceModalOpen()) {
        navigateBrowserChoice(direction);
        return;
    }

    if (launcherBrowser && !launcherBrowser.classList.contains('d-none')) {
        if (browserKeyboardOpen) {
            moveBrowserKeyboard(direction);
            return;
        }

        if (performance.now() - lastBrowserMouseMoveAt < 80) {
            return;
        }

        const speed = 14;
        const dx = direction === 'left' ? -speed : direction === 'right' ? speed : 0;
        const dy = direction === 'up' ? -speed : direction === 'down' ? speed : 0;
        moveBrowserMouse(dx, dy);
        return;
    }

    if (isSidebarOpen()) {
        const sidebarItems = getSidebarItems();
        if (!sidebarItems.length) {
            return;
        }

        if (navigationArea !== 'sidebar') {
            setNavigationArea('sidebar', 0);
            return;
        }

        if (direction === 'up') {
            selectedSidebarIndex -= 1;
        } else if (direction === 'down') {
            selectedSidebarIndex += 1;
        } else if (direction === 'right') {
            sidebar?.hide();
            setNavigationArea('store', selectedStoreIndex);
            return;
        }

        selectedSidebarIndex = Math.max(0, Math.min(sidebarItems.length - 1, selectedSidebarIndex));
        updateNavigationSelection();
        return;
    }

    if (navigationArea === 'navbar') {
        const navbarItems = getNavbarItems();
        if (!navbarItems.length) {
            return;
        }

        if (direction === 'left') {
            selectedNavbarIndex -= 1;
        } else if (direction === 'right') {
            selectedNavbarIndex += 1;
        } else if (direction === 'down') {
            if (filterButtons.length) {
                setNavigationArea('filters', selectedFilterIndex);
            } else {
                setNavigationArea('store', selectedStoreIndex);
            }
            return;
        }

        selectedNavbarIndex = Math.max(0, Math.min(navbarItems.length - 1, selectedNavbarIndex));
        updateNavigationSelection();
        return;
    }

    if (navigationArea === 'filters') {
        const filters = Array.from(filterButtons);
        if (!filters.length) {
            return;
        }

        if (direction === 'left') {
            selectedFilterIndex -= 1;
        } else if (direction === 'right') {
            selectedFilterIndex += 1;
        } else if (direction === 'up') {
            setNavigationArea('navbar', selectedNavbarIndex);
            return;
        } else if (direction === 'down') {
            setNavigationArea('store', selectedStoreIndex);
            return;
        }

        selectedFilterIndex = Math.max(0, Math.min(filters.length - 1, selectedFilterIndex));
        updateNavigationSelection();
        return;
    }

    const cards = getStoreCards();
    if (!cards.length) {
        return;
    }

    const currentCard = cards[selectedStoreIndex] || cards[0];
    const currentTop = currentCard.getBoundingClientRect().top;
    const columns = cards.filter((card) => Math.abs(card.getBoundingClientRect().top - currentTop) < 8).length || 1;

    if (direction === 'up' && selectedStoreIndex - columns < 0) {
        if (filterButtons.length) {
            setNavigationArea('filters', selectedFilterIndex);
        } else {
            setNavigationArea('navbar', selectedNavbarIndex);
        }
        return;
    }

    if (direction === 'left') {
        selectedStoreIndex -= 1;
    } else if (direction === 'right') {
        selectedStoreIndex += 1;
    } else if (direction === 'up') {
        selectedStoreIndex -= columns;
    } else if (direction === 'down') {
        selectedStoreIndex += columns;
    }

    selectedStoreIndex = Math.max(0, Math.min(cards.length - 1, selectedStoreIndex));
    updateNavigationSelection();
}

function launcherActivate() {
    if (window.handleControllerAlertAction?.('confirm')) {
        return;
    }

    if (navigationArea === 'navbar') {
        const navbarItems = getNavbarItems();
        navbarItems[selectedNavbarIndex]?.click();
        return;
    }

    if (navigationArea === 'sidebar' && isSidebarOpen()) {
        const sidebarItems = getSidebarItems();
        sidebarItems[selectedSidebarIndex]?.click();
        return;
    }

    if (navigationArea === 'filters') {
        const filters = Array.from(filterButtons);
        filters[selectedFilterIndex]?.click();
        return;
    }

    const cards = getStoreCards();
    const selectedCard = cards[selectedStoreIndex];
    if (!selectedCard) {
        return;
    }

    const button = selectedCard.querySelector('button');
    openStoreUrl(
        selectedCard.dataset.url || button?.dataset.url,
        selectedCard.dataset.title || button?.dataset.title || selectedCard.querySelector('h3')?.textContent || 'Navegador',
        selectedCard.dataset.openMode || button?.dataset.openMode || 'internal'
    );
}

function launcherBack() {
    if (window.handleControllerAlertAction?.('back')) {
        return;
    }

    if (window.PageTabsModal?.handleAction?.('back')) {
        return;
    }

    if (hiddenTabForControllerModal) {
        window.pywebview?.api?.definir_modo_modal_navegador?.(false);
        restoreNativeBrowserAfterControllerModal().catch((error) => {
            showControllerAlert(`Erro ao restaurar pagina: ${error}`);
        });
        return;
    }

    if (isBrowserChoiceModalOpen()) {
        hideBrowserChoiceModal();
        return;
    }

    if (browserKeyboardOpen) {
        toggleBrowserKeyboard(false);
        return;
    }

    if (launcherBrowser && !launcherBrowser.classList.contains('d-none')) {
        browserBackAction();
        return;
    }

    if (isSidebarOpen()) {
        sidebar?.hide();
        setNavigationArea('store', selectedStoreIndex);
    }
}

function launcherToggleTheme() {
    const currentTheme = document.documentElement.dataset.theme || 'dark';
    applyTheme(currentTheme === 'dark' ? 'light' : 'dark');
}

function launcherModalAction() {
    if (window.handleControllerAlertAction?.('confirm')) {
        return true;
    }

    if (window.PageTabsModal?.handleAction?.('confirm')) {
        return true;
    }

    if (isBrowserChoiceModalOpen()) {
        confirmBrowserChoice();
        return true;
    }

    if (launcherBrowser && !launcherBrowser.classList.contains('d-none')) {
        if (browserKeyboardOpen) {
            pressBrowserKey();
            return true;
        }

        clickBrowserCursor();
        return true;
    }

    return false;
}

function launcherKeyboardShortcut(action) {
    if (!launcherBrowser || launcherBrowser.classList.contains('d-none')) {
        return false;
    }

    if (action === 'backspace') {
        if (!browserKeyboardOpen) {
            toggleBrowserKeyboard(true);
        } else {
            sendBrowserKeyShortcut('Backspace', 'BackSpace');
        }
    } else if (action === 'field') {
        toggleBrowserKeyboard();
    } else if (action === 'shift') {
        reloadStoreBrowser();
    } else if (action === 'save') {
        sendBrowserKeyShortcut('Enter', 'Return');
    } else if (action === 'cursorLeft') {
        moveBrowserTextCursor('left');
    } else if (action === 'cursorRight') {
        moveBrowserTextCursor('right');
    } else if (action === 'mouseLeftClick') {
        clickBrowserCursor('left');
    } else if (action === 'mouseRightClick') {
        clickBrowserCursor('right');
    } else if (action === 'scrollUp') {
        scrollBrowserPage('up');
    } else if (action === 'scrollDown') {
        scrollBrowserPage('down');
    } else {
        return false;
    }

    return true;
}

sidebarElement?.addEventListener('shown.bs.offcanvas', () => {
    setNavigationArea('sidebar', selectedSidebarIndex, false);
});

sidebarElement?.addEventListener('hidden.bs.offcanvas', () => {
    if (navigationArea === 'sidebar') {
        setNavigationArea('store', selectedStoreIndex, false);
    }
});

updateNavigationSelection(false);

// Sync mouse interaction with controller navigation state.
Array.from(filterButtons).forEach((button, index) => {
    button.addEventListener('mouseenter', () => {
        selectedFilterIndex = index;
        setNavigationArea('filters', selectedFilterIndex, false);
    });
});

getStoreCards().forEach((card, index) => {
    card.addEventListener('mouseenter', () => {
        selectedStoreIndex = index;
        setNavigationArea('store', selectedStoreIndex, false);
    });
});

document.getElementById('storeGrid')?.addEventListener('click', (event) => {
    const card = event.target.closest('.store-card');
    if (!card) {
        return;
    }

    const cards = getStoreCards();
    const index = cards.indexOf(card);
    if (index >= 0) {
        selectedStoreIndex = index;
        setNavigationArea('store', selectedStoreIndex, false);
    }

    const button = event.target.closest('button');
    const url = button?.dataset.url || card.dataset.url;
    const title = button?.dataset.title || card.dataset.title || card.querySelector('h3')?.textContent || 'Navegador';
    const openMode = button?.dataset.openMode || card.dataset.openMode || 'internal';
    openStoreUrl(url, title, openMode);
});

browserBack?.addEventListener('click', browserBackAction);
browserReload?.addEventListener('click', reloadStoreBrowser);

window.launcherAPI?.onReturnToGames?.(returnToGames);
window.launcherAPI?.onNativeBrowserControllerAction?.(async (action, payload = {}) => {
    window.markNativeGamepadInput?.();

    if (action === 'keyboard-open') {
        toggleBrowserKeyboard(true);
    } else if (action === 'keyboard-navigate') {
        if (!browserKeyboardOpen) toggleBrowserKeyboard(true);
        moveBrowserKeyboard(payload.direction);
    } else if (action === 'keyboard-press') {
        if (!browserKeyboardOpen) toggleBrowserKeyboard(true);
        pressBrowserKey();
    } else if (action === 'keyboard-backspace') {
        if (!browserKeyboardOpen) toggleBrowserKeyboard(true);
        pressBrowserKey(getBrowserKeys().find((key) => key.dataset.key === 'BackSpace'));
    } else if (action === 'keyboard-shift') {
        if (!browserKeyboardOpen) toggleBrowserKeyboard(true);
        pressBrowserKey(getBrowserKeys().find((key) => key.dataset.action === 'shift'));
    } else if (action === 'keyboard-cursor-left') {
        if (!browserKeyboardOpen) toggleBrowserKeyboard(true);
        moveBrowserTextCursor('left');
    } else if (action === 'keyboard-cursor-right') {
        if (!browserKeyboardOpen) toggleBrowserKeyboard(true);
        moveBrowserTextCursor('right');
    } else if (action === 'keyboard-close') {
        toggleBrowserKeyboard(false);
    } else if (action === 'modal-navigate') {
        window.PageTabsModal?.navigate?.(payload.direction);
    } else if (action === 'modal-confirm') {
        window.PageTabsModal?.handleAction?.('confirm');
        hiddenTabForControllerModal = '';
        window.pywebview?.api?.definir_modo_modal_navegador?.(false);
    } else if (action === 'modal-back') {
        window.PageTabsModal?.handleAction?.('back');
        window.pywebview?.api?.definir_modo_modal_navegador?.(false);
        await restoreNativeBrowserAfterControllerModal();
    } else if (action === 'reload') {
        reloadStoreBrowser();
    } else if (action === 'back') {
        launcherBack();
    } else if (action === 'access-modal') {
        try {
            await openNativeControllerModal('access');
        } catch (error) {
            window.pywebview?.api?.definir_modo_modal_navegador?.(false);
            await restoreNativeBrowserAfterControllerModal();
            showControllerAlert(`Erro ao abrir modal: ${error}`);
        }
    } else if (action === 'close-modal') {
        try {
            await openNativeControllerModal('close');
        } catch (error) {
            window.pywebview?.api?.definir_modo_modal_navegador?.(false);
            await restoreNativeBrowserAfterControllerModal();
            showControllerAlert(`Erro ao abrir modal: ${error}`);
        }
    }
});

const initialBrowserTabId = new URLSearchParams(window.location.search).get('tab')
    || sessionStorage.getItem('launcher-open-tab-id');
if (initialBrowserTabId) {
    sessionStorage.removeItem('launcher-open-tab-id');
    window.setTimeout(() => {
        activateStoreTab(initialBrowserTabId).catch((error) => {
            showControllerAlert(`Erro ao acessar pagina aberta: ${error}`);
        });
    }, 120);
}

document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') {
        return;
    }

    event.preventDefault();
    returnToGames();
}, true);

setupBrowserFrameEvents(browserFrame);

window.addEventListener('resize', positionNativeLauncherBrowser);

let htmlGamepadStarted = false;
let lastNativeGamepadInputAt = 0;

window.markNativeGamepadInput = function markNativeGamepadInput() {
    lastNativeGamepadInputAt = performance.now();
};

function readGamepadDirection(gamepad) {
    const axisX = gamepad.axes[0] || 0;
    const axisY = gamepad.axes[1] || 0;

    if (gamepad.buttons[12]?.pressed || axisY < -0.65) {
        return 'up';
    }
    if (gamepad.buttons[13]?.pressed || axisY > 0.65) {
        return 'down';
    }
    if (gamepad.buttons[14]?.pressed || axisX < -0.65) {
        return 'left';
    }
    if (gamepad.buttons[15]?.pressed || axisX > 0.65) {
        return 'right';
    }

    return null;
}

function startHtmlGamepadControl() {
    let previousButtons = [];
    let previousDirection = null;
    let lastMove = 0;

    function pressedOnce(gamepad, index) {
        const pressed = Boolean(gamepad.buttons[index]?.pressed);
        const wasPressed = Boolean(previousButtons[index]);
        return pressed && !wasPressed;
    }

    function loop() {
        const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
        const gamepad = Array.from(gamepads).find(Boolean);

        if (gamepad) {
            const direction = readGamepadDirection(gamepad);
            const now = performance.now();

            if (now - lastNativeGamepadInputAt < 700) {
                previousDirection = direction;
                previousButtons = gamepad.buttons.map((button) => button.pressed);
                requestAnimationFrame(loop);
                return;
            }

            const browserOpen = launcherBrowser && !launcherBrowser.classList.contains('d-none');

            if (isBrowserChoiceModalOpen()) {
                if (direction && (direction !== previousDirection || now - lastMove > 180)) {
                    navigateBrowserChoice(direction);
                    lastMove = now;
                }

                if (pressedOnce(gamepad, 0)) {
                    confirmBrowserChoice();
                }

                if (pressedOnce(gamepad, 1)) {
                    hideBrowserChoiceModal();
                }

                previousDirection = direction;
                previousButtons = gamepad.buttons.map((button) => button.pressed);
                requestAnimationFrame(loop);
                return;
            }

            if (window.PageTabsModal?.isOpen?.()) {
                if (direction && (direction !== previousDirection || now - lastMove > 180)) {
                    window.PageTabsModal.navigate(direction);
                    lastMove = now;
                }

                if (pressedOnce(gamepad, 0)) {
                    window.PageTabsModal.handleAction('confirm');
                    hiddenTabForControllerModal = '';
                    window.pywebview?.api?.definir_modo_modal_navegador?.(false);
                }

                if (pressedOnce(gamepad, 1)) {
                    window.PageTabsModal.handleAction('back');
                    window.pywebview?.api?.definir_modo_modal_navegador?.(false);
                    restoreNativeBrowserAfterControllerModal().catch((error) => {
                        showControllerAlert(`Erro ao restaurar pagina: ${error}`);
                    });
                }

                previousDirection = direction;
                previousButtons = gamepad.buttons.map((button) => button.pressed);
                requestAnimationFrame(loop);
                return;
            }

            if (browserOpen && !browserKeyboardOpen) {
                const axisX = gamepad.axes[0] || 0;
                const axisY = gamepad.axes[1] || 0;
                const rightAxisY = gamepad.axes[3] || 0;
                const speed = gamepad.buttons[5]?.pressed ? 18 : 9;

                if (Math.abs(axisX) > 0.18 || Math.abs(axisY) > 0.18) {
                    moveBrowserMouse(axisX * speed, axisY * speed);
                } else if (direction && (direction !== previousDirection || now - lastMove > 35)) {
                    const dx = direction === 'left' ? -speed : direction === 'right' ? speed : 0;
                    const dy = direction === 'up' ? -speed : direction === 'down' ? speed : 0;
                    moveBrowserMouse(dx, dy);
                    lastMove = now;
                }

                if (pressedOnce(gamepad, 0)) {
                    clickBrowserCursor();
                }

                if (pressedOnce(gamepad, 6)) {
                    clickBrowserCursor('right');
                }

                if (pressedOnce(gamepad, 7)) {
                    clickBrowserCursor('left');
                }

                if (Math.abs(rightAxisY) > 0.35 && now - lastMove > 80) {
                    scrollBrowserPage(rightAxisY > 0 ? 'down' : 'up');
                    lastMove = now;
                }

                if (pressedOnce(gamepad, 2)) {
                    toggleBrowserKeyboard();
                }

                if (pressedOnce(gamepad, 3)) {
                    reloadStoreBrowser();
                }

                if (pressedOnce(gamepad, 9)) {
                    openNativeControllerModal('access').catch((error) => {
                        showControllerAlert(`Erro ao abrir modal: ${error}`);
                    });
                    previousDirection = direction;
                    previousButtons = gamepad.buttons.map((button) => button.pressed);
                    requestAnimationFrame(loop);
                    return;
                }

                if (pressedOnce(gamepad, 8)) {
                    openNativeControllerModal('close').catch((error) => {
                        showControllerAlert(`Erro ao abrir modal: ${error}`);
                    });
                    previousDirection = direction;
                    previousButtons = gamepad.buttons.map((button) => button.pressed);
                    requestAnimationFrame(loop);
                    return;
                }

                if (pressedOnce(gamepad, 1)) {
                    launcherBack();
                }

                previousDirection = direction;
                previousButtons = gamepad.buttons.map((button) => button.pressed);
                requestAnimationFrame(loop);
                return;
            }

            if (browserOpen && browserKeyboardOpen && pressedOnce(gamepad, 2)) {
                toggleBrowserKeyboard(false);
            }

            if (browserOpen && browserKeyboardOpen && pressedOnce(gamepad, 4)) {
                moveBrowserTextCursor('left');
            }

            if (browserOpen && browserKeyboardOpen && pressedOnce(gamepad, 5)) {
                moveBrowserTextCursor('right');
            }

            if (browserOpen && browserKeyboardOpen && pressedOnce(gamepad, 3)) {
                pressBrowserKey(getBrowserKeys().find((key) => key.dataset.key === 'BackSpace'));
            }

            if (browserOpen && browserKeyboardOpen && pressedOnce(gamepad, 8)) {
                openNativeControllerModal('close').catch((error) => {
                    showControllerAlert(`Erro ao abrir modal: ${error}`);
                });
                previousDirection = direction;
                previousButtons = gamepad.buttons.map((button) => button.pressed);
                requestAnimationFrame(loop);
                return;
            }

            if (browserOpen && browserKeyboardOpen && pressedOnce(gamepad, 9)) {
                openNativeControllerModal('access').catch((error) => {
                    showControllerAlert(`Erro ao abrir modal: ${error}`);
                });
                previousDirection = direction;
                previousButtons = gamepad.buttons.map((button) => button.pressed);
                requestAnimationFrame(loop);
                return;
            }

            if (direction && (direction !== previousDirection || now - lastMove > 240)) {
                launcherNavigate(direction);
                lastMove = now;
            }

            if (!browserKeyboardOpen && pressedOnce(gamepad, 9)) {
                openNativeControllerModal('access').catch((error) => {
                    showControllerAlert(`Erro ao abrir modal: ${error}`);
                });
                previousDirection = direction;
                previousButtons = gamepad.buttons.map((button) => button.pressed);
                requestAnimationFrame(loop);
                return;
            }

            if (!browserKeyboardOpen && pressedOnce(gamepad, 8)) {
                openNativeControllerModal('close').catch((error) => {
                    showControllerAlert(`Erro ao abrir modal: ${error}`);
                });
                previousDirection = direction;
                previousButtons = gamepad.buttons.map((button) => button.pressed);
                requestAnimationFrame(loop);
                return;
            }

            if (pressedOnce(gamepad, 0)) {
                if (!launcherModalAction('confirm')) {
                    launcherActivate();
                }
            }

            if (pressedOnce(gamepad, 1)) {
                launcherBack();
            }

            previousDirection = direction;
            previousButtons = gamepad.buttons.map((button) => button.pressed);
        }

        requestAnimationFrame(loop);
    }

    requestAnimationFrame(loop);
}

function maybeStartHtmlGamepadControl() {
    if (htmlGamepadStarted || !('getGamepads' in navigator)) {
        return;
    }

    htmlGamepadStarted = true;
    startHtmlGamepadControl();
}

window.addEventListener('pywebviewready', maybeStartHtmlGamepadControl);
window.setTimeout(maybeStartHtmlGamepadControl, 1200);
