// @ts-nocheck
const themeToggle = document.getElementById('themeToggle');
const themeIcon = document.getElementById('themeIcon');
const exitLauncher = document.getElementById('exitLauncher');
const sidebarElement = document.getElementById('sidebar');
const hasBootstrap = typeof bootstrap !== 'undefined';
const sidebar = hasBootstrap ? bootstrap.Offcanvas.getOrCreateInstance(sidebarElement) : null;

const resolutionButtons = Array.from(document.querySelectorAll('.resolution-option'));
const currentResolution = document.getElementById('currentResolution');
const resolutionMessage = document.getElementById('resolutionMessage');
const supportedControllers = document.getElementById('supportedControllers');
const detectedController = document.getElementById('detectedController');
const profileSettingsForm = document.getElementById('profileSettingsForm');
const retroApiKey = document.getElementById('retroApiKey');
const steamApiKey = document.getElementById('steamApiKey');
const retroApiStatus = document.getElementById('retroApiStatus');
const steamApiStatus = document.getElementById('steamApiStatus');
const profileSettingsMessage = document.getElementById('profileSettingsMessage');
const settingsVirtualKeyboard = document.getElementById('settingsVirtualKeyboard');
const apiKeyActionToggles = Array.from(document.querySelectorAll('.api-key-action-toggle'));
const apiKeyClipboardActions = Array.from(document.querySelectorAll('[data-clipboard-action]'));
const clearSteamCacheButton = document.getElementById('clearSteamCacheButton');

let selectedNavbarIndex = 0;
let selectedSidebarIndex = 0;
let selectedResolutionIndex = 0;
let selectedKeyboardIndex = 0;
let navigationArea = 'resolutions';
let activeKeyboardInput = retroApiKey;
let keyboardShift = false;

const virtualKeyboardLayout = [
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
    ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
    ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
    ['z', 'x', 'c', 'v', 'b', 'n', 'm'],
    ['/', '\\', ':', '.', '-', '_'],
    [
        { label: 'Campo', action: 'field', wide: true },
        { label: 'Maiúsc.', action: 'shift', wide: true },
        { label: '←', action: 'cursorLeft' },
        { label: '→', action: 'cursorRight' },
        { label: 'Espaço', action: 'space', wide: true },
        { label: 'Ações', action: 'actions', wide: true },
        { label: 'Copiar', action: 'copy', wide: true },
        { label: 'Colar', action: 'paste', wide: true },
        { label: 'Apagar', action: 'backspace', wide: true },
        { label: 'Salvar', action: 'save', wide: true },
    ],
];

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

function renderControllerList(items) {
    supportedControllers.innerHTML = '';
    items.forEach((item) => {
        const li = document.createElement('li');
        li.textContent = item;
        supportedControllers.appendChild(li);
    });
}

async function loadResolution() {
    if (!window.pywebview || !window.pywebview.api?.obter_resolucao_atual) {
        currentResolution.textContent = 'Disponível apenas no launcher desktop';
        return;
    }

    const response = await window.pywebview.api.obter_resolucao_atual();
    if (!response.ok) {
        currentResolution.textContent = response.message;
        return;
    }

    currentResolution.textContent = `${response.width}x${response.height} (${response.label})`;
}

async function changeResolution(label) {
    resolutionMessage.textContent = 'Aplicando resolução...';

    if (!window.pywebview || !window.pywebview.api?.alterar_resolucao) {
        resolutionMessage.textContent = 'Função disponível apenas no launcher desktop.';
        return;
    }

    const response = await window.pywebview.api.alterar_resolucao(label);
    resolutionMessage.textContent = response.message;

    if (response.ok) {
        await loadResolution();
    }
}

resolutionButtons.forEach((button, index) => {
    button.addEventListener('click', () => {
        selectedResolutionIndex = index;
        setNavigationArea('resolutions', selectedResolutionIndex, false);
        changeResolution(button.dataset.resolution);
    });

    button.addEventListener('mouseenter', () => {
        selectedResolutionIndex = index;
        setNavigationArea('resolutions', selectedResolutionIndex, false);
    });
});

async function loadControllers() {
    if (!window.pywebview || !window.pywebview.api) {
        supportedControllers.innerHTML = '<li>Disponível somente no launcher desktop.</li>';
        detectedController.textContent = 'Indisponível';
        return;
    }

    if (window.pywebview.api.controles_suportados) {
        const response = await window.pywebview.api.controles_suportados();
        if (response.ok) {
            renderControllerList(response.controles);
        }
    }

    if (window.pywebview.api.info_controle_atual) {
        const info = await window.pywebview.api.info_controle_atual();
        detectedController.textContent = info.nome;
    }
}

async function loadProfileSettings() {
    if (!window.pywebview || !window.pywebview.api?.obter_configuracoes_perfil) {
        if (profileSettingsMessage) {
            profileSettingsMessage.textContent = 'Disponível somente no launcher desktop.';
        }
        return;
    }

    const response = await window.pywebview.api.obter_configuracoes_perfil();
    if (!response.ok) {
        return;
    }

    if (retroApiStatus) {
        retroApiStatus.textContent = response.retroachievements_api_configured
            ? 'RetroAchievements API configurada.'
            : 'RetroAchievements API ainda não configurada.';
    }
    if (steamApiStatus) {
        steamApiStatus.textContent = response.steam_api_configured
            ? 'Steam API configurada.'
            : 'Steam API ainda não configurada.';
    }
}

if (profileSettingsForm) {
    profileSettingsForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        if (profileSettingsMessage) {
            profileSettingsMessage.textContent = 'Salvando...';
        }

        if (!window.pywebview || !window.pywebview.api?.salvar_configuracoes_perfil) {
            if (profileSettingsMessage) {
                profileSettingsMessage.textContent = 'Função disponível apenas no launcher desktop.';
            }
            return;
        }

        const response = await window.pywebview.api.salvar_configuracoes_perfil(
            retroApiKey?.value || '',
            steamApiKey?.value || '',
            '',
            ''
        );

        if (profileSettingsMessage) {
            profileSettingsMessage.textContent = response.message;
        }

        if (response.ok) {
            if (retroApiKey) {
                retroApiKey.value = '';
            }
            if (steamApiKey) {
                steamApiKey.value = '';
            }
            await loadProfileSettings();
        }
    });
}

if (clearSteamCacheButton) {
    clearSteamCacheButton.addEventListener('click', async () => {
        if (profileSettingsMessage) {
            profileSettingsMessage.textContent = 'Limpando cache Steam...';
        }

        if (!window.pywebview || !window.pywebview.api?.limpar_cache_steam) {
            if (profileSettingsMessage) {
                profileSettingsMessage.textContent = 'Função disponível apenas no launcher desktop.';
            }
            return;
        }

        try {
            const response = await window.pywebview.api.limpar_cache_steam();
            if (profileSettingsMessage) {
                profileSettingsMessage.textContent = response.message;
            }
        } catch (error) {
            if (profileSettingsMessage) {
                profileSettingsMessage.textContent = `Erro ao limpar cache Steam: ${error}`;
            }
        }
    });
}

function getKeyboardFields() {
    return [retroApiKey, steamApiKey].filter(Boolean);
}

function setActiveKeyboardInput(input) {
    activeKeyboardInput = input || retroApiKey || steamApiKey;
    getKeyboardFields().forEach((item) => {
        item.classList.toggle('is-keyboard-active', item === activeKeyboardInput);
    });
    activeKeyboardInput?.focus({ preventScroll: true });
}

function getKeyboardButtons() {
    return Array.from(settingsVirtualKeyboard?.querySelectorAll('.virtual-key') || []);
}

function getKeyboardCharacter(value) {
    if (!/^[a-z]$/.test(value)) {
        return value;
    }

    return keyboardShift ? value.toUpperCase() : value;
}

function updateKeyboardLabels() {
    getKeyboardButtons().forEach((button) => {
        if (button.dataset.value) {
            button.textContent = getKeyboardCharacter(button.dataset.value);
        }
        if (button.dataset.action === 'shift') {
            button.classList.toggle('is-active', keyboardShift);
        }
    });
}

function updateKeyboardSelection(scrollIntoView = true) {
    const buttons = getKeyboardButtons();
    if (!buttons.length) {
        return;
    }

    selectedKeyboardIndex = Math.max(0, Math.min(buttons.length - 1, selectedKeyboardIndex));
    buttons.forEach((button, index) => {
        const selected = index === selectedKeyboardIndex && navigationArea === 'keyboard';
        button.classList.toggle('is-controller-selected', selected);
        button.setAttribute('tabindex', selected ? '0' : '-1');
    });

    if (navigationArea === 'keyboard') {
        const selectedButton = buttons[selectedKeyboardIndex];
        selectedButton?.focus({ preventScroll: true });
        if (scrollIntoView) {
            selectedButton?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
        }
    }
}

function buildVirtualKeyboard() {
    if (!settingsVirtualKeyboard || settingsVirtualKeyboard.dataset.ready === '1') {
        return;
    }

    virtualKeyboardLayout.forEach((row, rowIndex) => {
        const rowElement = document.createElement('div');
        rowElement.className = 'virtual-keyboard-row';

        row.forEach((entry, columnIndex) => {
            const key = typeof entry === 'string' ? { label: entry, value: entry } : entry;
            const button = document.createElement('button');
            button.type = 'button';
            button.className = `virtual-key${key.wide ? ' virtual-key-wide' : ''}`;
            button.textContent = key.label;
            button.dataset.row = String(rowIndex);
            button.dataset.column = String(columnIndex);

            if (key.value) {
                button.dataset.value = key.value;
            }
            if (key.action) {
                button.dataset.action = key.action;
            }

            button.addEventListener('click', () => {
                selectedKeyboardIndex = getKeyboardButtons().indexOf(button);
                setNavigationArea('keyboard', selectedKeyboardIndex, false);
                pressVirtualKeyboardKey(button);
                updateKeyboardSelection(false);
            });

            rowElement.appendChild(button);
        });

        settingsVirtualKeyboard.appendChild(rowElement);
    });

    settingsVirtualKeyboard.dataset.ready = '1';
    updateKeyboardLabels();
}

function getKeyboardButtonAt(row, column, wrap = false) {
    const rowButtons = getKeyboardButtons().filter((button) => Number(button.dataset.row) === row);
    if (!rowButtons.length) {
        return null;
    }

    if (wrap) {
        const wrappedColumn = ((column % rowButtons.length) + rowButtons.length) % rowButtons.length;
        return rowButtons[wrappedColumn];
    }

    return rowButtons[Math.max(0, Math.min(rowButtons.length - 1, column))];
}

function moveVirtualKeyboardSelection(direction) {
    const buttons = getKeyboardButtons();
    const selected = buttons[selectedKeyboardIndex];
    if (!selected) {
        return;
    }

    const row = Number(selected.dataset.row);
    const column = Number(selected.dataset.column);
    const rows = virtualKeyboardLayout.length;
    let next = null;

    if (direction === 'left') {
        next = getKeyboardButtonAt(row, column - 1, true);
    } else if (direction === 'right') {
        next = getKeyboardButtonAt(row, column + 1, true);
    } else if (direction === 'up') {
        if (row === 0) {
            setNavigationArea('resolutions', selectedResolutionIndex);
            return;
        }
        next = getKeyboardButtonAt((row - 1 + rows) % rows, column);
    } else if (direction === 'down') {
        next = getKeyboardButtonAt((row + 1) % rows, column);
    }

    if (next) {
        selectedKeyboardIndex = buttons.indexOf(next);
        updateKeyboardSelection();
    }
}

function insertIntoActiveInput(text) {
    const input = activeKeyboardInput || retroApiKey || steamApiKey;
    if (!input) {
        return;
    }

    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? input.value.length;
    input.value = `${input.value.slice(0, start)}${text}${input.value.slice(end)}`;
    input.focus({ preventScroll: true });
    input.setSelectionRange(start + text.length, start + text.length);
    input.dispatchEvent(new Event('input', { bubbles: true }));
}

function backspaceActiveInput() {
    const input = activeKeyboardInput || retroApiKey || steamApiKey;
    if (!input) {
        return;
    }

    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? input.value.length;
    if (start !== end) {
        input.value = `${input.value.slice(0, start)}${input.value.slice(end)}`;
        input.setSelectionRange(start, start);
    } else if (start > 0) {
        input.value = `${input.value.slice(0, start - 1)}${input.value.slice(end)}`;
        input.setSelectionRange(start - 1, start - 1);
    }
    input.focus({ preventScroll: true });
    input.dispatchEvent(new Event('input', { bubbles: true }));
}

function moveActiveInputCursor(offset) {
    const input = activeKeyboardInput || retroApiKey || steamApiKey;
    if (!input) {
        return;
    }

    const current = input.selectionStart ?? input.value.length;
    const next = Math.max(0, Math.min(input.value.length, current + offset));
    input.focus({ preventScroll: true });
    input.setSelectionRange(next, next);
}

async function readClipboardText() {
    if (window.launcherAPI?.readClipboardText) {
        return window.launcherAPI.readClipboardText();
    }

    if (navigator.clipboard?.readText) {
        return navigator.clipboard.readText();
    }

    return '';
}

async function writeClipboardText(text) {
    if (window.launcherAPI?.writeClipboardText) {
        window.launcherAPI.writeClipboardText(text);
        return;
    }

    if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
    }
}

function getClipboardInput(inputId = '') {
    const target = document.getElementById(inputId);
    if (target === retroApiKey || target === steamApiKey) {
        return target;
    }

    return activeKeyboardInput || retroApiKey || steamApiKey;
}

function getInputSelectedText(input) {
    if (!input) {
        return '';
    }

    const start = input.selectionStart ?? 0;
    const end = input.selectionEnd ?? 0;
    return start !== end ? input.value.slice(start, end) : input.value;
}

async function copyApiKey(input = activeKeyboardInput) {
    const target = input || retroApiKey || steamApiKey;
    const value = getInputSelectedText(target);

    if (!value) {
        if (profileSettingsMessage) {
            profileSettingsMessage.textContent = 'Nada para copiar.';
        }
        target?.focus({ preventScroll: true });
        return;
    }

    try {
        await writeClipboardText(value);
        if (profileSettingsMessage) {
            profileSettingsMessage.textContent = 'Copiado.';
        }
    } catch (error) {
        if (profileSettingsMessage) {
            profileSettingsMessage.textContent = `Nao foi possivel copiar: ${error.message || error}`;
        }
    }

    target?.focus({ preventScroll: true });
}

async function pasteApiKey(input = activeKeyboardInput) {
    const target = input || retroApiKey || steamApiKey;

    if (!target) {
        return;
    }

    try {
        const text = await readClipboardText();

        if (!text) {
            if (profileSettingsMessage) {
                profileSettingsMessage.textContent = 'Area de transferencia vazia.';
            }
            target.focus({ preventScroll: true });
            return;
        }

        setActiveKeyboardInput(target);
        insertIntoActiveInput(text);
        if (profileSettingsMessage) {
            profileSettingsMessage.textContent = 'Colado.';
        }
    } catch (error) {
        if (profileSettingsMessage) {
            profileSettingsMessage.textContent = `Nao foi possivel colar: ${error.message || error}`;
        }
    }
}

function openActiveApiActionMenu() {
    const input = activeKeyboardInput || retroApiKey || steamApiKey;
    const toggle = apiKeyActionToggles.find((button) => button.dataset.apiInput === input?.id);

    if (!toggle) {
        return;
    }

    setActiveKeyboardInput(input);
    toggle.focus({ preventScroll: true });
    toggle.click();
}

function toggleKeyboardField() {
    const fields = getKeyboardFields();
    if (!fields.length) {
        return;
    }

    const currentIndex = Math.max(0, fields.indexOf(activeKeyboardInput));
    setActiveKeyboardInput(fields[(currentIndex + 1) % fields.length]);
}

function pressVirtualKeyboardKey(button = getKeyboardButtons()[selectedKeyboardIndex]) {
    if (!button) {
        return true;
    }

    const action = button.dataset.action;
    if (action === 'field') {
        toggleKeyboardField();
    } else if (action === 'shift') {
        keyboardShift = !keyboardShift;
        updateKeyboardLabels();
    } else if (action === 'space') {
        insertIntoActiveInput(' ');
    } else if (action === 'backspace') {
        backspaceActiveInput();
    } else if (action === 'cursorLeft') {
        moveActiveInputCursor(-1);
    } else if (action === 'cursorRight') {
        moveActiveInputCursor(1);
    } else if (action === 'actions') {
        openActiveApiActionMenu();
    } else if (action === 'copy') {
        copyApiKey();
    } else if (action === 'paste') {
        pasteApiKey();
    } else if (action === 'save') {
        profileSettingsForm?.requestSubmit();
    } else {
        insertIntoActiveInput(getKeyboardCharacter(button.dataset.value || ''));
    }

    return true;
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
    } else if (area === 'resolutions' && index !== null) {
        selectedResolutionIndex = index;
    } else if (area === 'keyboard' && index !== null) {
        selectedKeyboardIndex = index;
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
    } else if (navigationArea === 'keyboard') {
        updateKeyboardSelection(scrollIntoView);
        return;
    } else {
        navigationArea = 'resolutions';
        items = resolutionButtons;
        selectedResolutionIndex = Math.max(0, Math.min(items.length - 1, selectedResolutionIndex));
        selectedIndex = selectedResolutionIndex;
    }

    const selectedItem = items[selectedIndex];

    items.forEach((item, index) => {
        const isSelected = index === selectedIndex;
        item.classList.toggle('is-controller-selected', isSelected);
        item.setAttribute('tabindex', isSelected ? '0' : '-1');
    });

    if (selectedItem) {
        selectedItem.focus({ preventScroll: true });
        if (scrollIntoView) {
            selectedItem.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
        }
    }
}

function launcherNavigate(direction) {
    if (window.isControllerAlertOpen?.()) {
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
            setNavigationArea('resolutions', selectedResolutionIndex);
            return;
        }

        selectedSidebarIndex = Math.max(0, Math.min(sidebarItems.length - 1, selectedSidebarIndex));
        updateNavigationSelection();
        return;
    }

    if (navigationArea === 'keyboard') {
        moveVirtualKeyboardSelection(direction);
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
            setNavigationArea('resolutions', selectedResolutionIndex);
            return;
        }

        selectedNavbarIndex = Math.max(0, Math.min(navbarItems.length - 1, selectedNavbarIndex));
        updateNavigationSelection();
        return;
    }

    if (direction === 'left') {
        selectedResolutionIndex -= 1;
    } else if (direction === 'right') {
        selectedResolutionIndex += 1;
    } else if (direction === 'up') {
        setNavigationArea('navbar', selectedNavbarIndex);
        return;
    } else if (direction === 'down') {
        setNavigationArea('keyboard', selectedKeyboardIndex);
        return;
    }

    selectedResolutionIndex = Math.max(0, Math.min(resolutionButtons.length - 1, selectedResolutionIndex));
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

    if (navigationArea === 'keyboard') {
        pressVirtualKeyboardKey();
        return;
    }

    resolutionButtons[selectedResolutionIndex]?.click();
}

function launcherBack() {
    if (window.handleControllerAlertAction?.('back')) {
        return;
    }

    if (window.PageTabsModal?.handleAction?.('back')) {
        return;
    }

    if (isSidebarOpen()) {
        sidebar?.hide();
        setNavigationArea('resolutions', selectedResolutionIndex);
        return;
    }

    window.location.href = './index.html';
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

    return false;
}

function launcherKeyboardShortcut(action) {
    if (action === 'backspace') {
        backspaceActiveInput();
    } else if (action === 'cursorLeft') {
        moveActiveInputCursor(-1);
    } else if (action === 'cursorRight') {
        moveActiveInputCursor(1);
    } else if (action === 'field') {
        toggleKeyboardField();
    } else if (action === 'shift') {
        keyboardShift = !keyboardShift;
        updateKeyboardLabels();
    } else if (action === 'actions') {
        openActiveApiActionMenu();
    } else if (action === 'copy') {
        copyApiKey();
    } else if (action === 'paste') {
        pasteApiKey();
    } else if (action === 'save') {
        profileSettingsForm?.requestSubmit();
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
        setNavigationArea('resolutions', selectedResolutionIndex, false);
    }
});

async function initSettings() {
    buildVirtualKeyboard();
    setActiveKeyboardInput(retroApiKey || steamApiKey);
    updateNavigationSelection(false);
    await loadResolution();
    await loadControllers();
    await loadProfileSettings();
    window.setInterval(loadControllers, 2000);
}

initSettings();

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

            if (window.PageTabsModal?.isOpen?.()) {
                if (direction && (direction !== previousDirection || now - lastMove > 180)) {
                    window.PageTabsModal.navigate(direction);
                    lastMove = now;
                }

                if (pressedOnce(gamepad, 0)) {
                    window.PageTabsModal.handleAction('confirm');
                }

                if (pressedOnce(gamepad, 1)) {
                    window.PageTabsModal.handleAction('back');
                }

                previousDirection = direction;
                previousButtons = gamepad.buttons.map((button) => button.pressed);
                requestAnimationFrame(loop);
                return;
            }

            if (direction && (direction !== previousDirection || now - lastMove > 240)) {
                launcherNavigate(direction);
                lastMove = now;
            }

            if (pressedOnce(gamepad, 9)) {
                window.PageTabsModal?.openAccess?.();
            }

            if (pressedOnce(gamepad, 8)) {
                window.PageTabsModal?.openClose?.();
            }

            if (pressedOnce(gamepad, 0)) {
                if (!launcherModalAction('confirm')) {
                    launcherActivate();
                }
            }

            if (pressedOnce(gamepad, 1)) {
                launcherBack();
            }

            if (pressedOnce(gamepad, 2)) {
                launcherKeyboardShortcut('backspace');
            }

            if (pressedOnce(gamepad, 3)) {
                launcherKeyboardShortcut('field');
            }

            if (pressedOnce(gamepad, 4)) {
                launcherKeyboardShortcut('cursorLeft');
            }

            if (pressedOnce(gamepad, 5)) {
                launcherKeyboardShortcut('cursorRight');
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

getKeyboardFields().forEach((input) => {
    input.addEventListener('focus', () => {
        setActiveKeyboardInput(input);
    });
    input.addEventListener('click', () => {
        setActiveKeyboardInput(input);
    });
});

apiKeyActionToggles.forEach((button) => {
    button.addEventListener('focus', () => {
        setActiveKeyboardInput(getClipboardInput(button.dataset.apiInput));
    });
    button.addEventListener('click', () => {
        setActiveKeyboardInput(getClipboardInput(button.dataset.apiInput));
    });
});

apiKeyClipboardActions.forEach((button) => {
    button.addEventListener('click', () => {
        const input = getClipboardInput(button.dataset.apiInput);
        setActiveKeyboardInput(input);

        if (button.dataset.clipboardAction === 'copy') {
            copyApiKey(input);
        } else {
            pasteApiKey(input);
        }
    });
});
