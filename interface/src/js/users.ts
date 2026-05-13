// @ts-nocheck
const themeToggle = document.getElementById('themeToggle');
const themeIcon = document.getElementById('themeIcon');
const userForm = document.getElementById('userForm');
const userName = document.getElementById('userName');
const retroUsername = document.getElementById('retroUsername');
const steamId = document.getElementById('steamId');
const activeUser = document.getElementById('activeUser');
const userList = document.getElementById('userList');
const userError = document.getElementById('userError');
const userSuccess = document.getElementById('userSuccess');
const virtualKeyboard = document.getElementById('virtualKeyboard');
const userFormTitle = document.getElementById('userFormTitle');
const saveUserButton = document.getElementById('saveUserButton');
const cancelUserEditButton = document.getElementById('cancelUserEditButton');
const sidebarElement = document.getElementById('sidebar');
const hasBootstrap = typeof bootstrap !== 'undefined';
const sidebar = sidebarElement && hasBootstrap ? bootstrap.Offcanvas.getOrCreateInstance(sidebarElement) : null;

let activeKeyboardInput = userName;
let selectedKeyboardIndex = 0;
let keyboardShift = false;
let selectedUserActionIndex = 0;
let lastNativeGamepadInputAt = 0;
let savingUser = false;
let htmlGamepadStarted = false;
let editingUserId = null;
let cachedUsers = [];

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

themeToggle?.addEventListener('click', () => {
    const currentTheme = document.documentElement.dataset.theme || 'dark';
    applyTheme(currentTheme === 'dark' ? 'light' : 'dark');
});

function showMessage(element, message) {
    if (!element) {
        return;
    }

    element.textContent = message;
    element.classList.toggle('d-none', !message);
}

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function getKeyboardFields() {
    return [userName, retroUsername, steamId].filter(Boolean);
}

function setActiveKeyboardInput(input) {
    activeKeyboardInput = input || userName;
    getKeyboardFields().forEach((item) => {
        item.classList.toggle('is-keyboard-active', item === activeKeyboardInput);
    });
    activeKeyboardInput?.focus({ preventScroll: true });
}

function getKeyboardButtons() {
    return Array.from(virtualKeyboard?.querySelectorAll('.virtual-key') || []);
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
        const isSelected = index === selectedKeyboardIndex;
        button.classList.toggle('is-controller-selected', isSelected);
        button.setAttribute('tabindex', isSelected ? '0' : '-1');
    });

    const selectedButton = buttons[selectedKeyboardIndex];
    selectedButton.focus({ preventScroll: true });

    if (scrollIntoView) {
        selectedButton.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    }
}

function buildVirtualKeyboard() {
    if (!virtualKeyboard || virtualKeyboard.dataset.ready === '1') {
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
                pressVirtualKeyboardKey(button);
                updateKeyboardSelection(false);
            });

            rowElement.appendChild(button);
        });

        virtualKeyboard.appendChild(rowElement);
    });

    virtualKeyboard.dataset.ready = '1';
    updateKeyboardLabels();
    updateKeyboardSelection(false);
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
        return true;
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
        next = getKeyboardButtonAt((row - 1 + rows) % rows, column);
    } else if (direction === 'down') {
        next = getKeyboardButtonAt((row + 1) % rows, column);
    }

    if (next) {
        selectedKeyboardIndex = buttons.indexOf(next);
        updateKeyboardSelection();
    }

    return true;
}

function insertIntoActiveInput(text) {
    const input = activeKeyboardInput || userName;
    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? input.value.length;

    input.value = `${input.value.slice(0, start)}${text}${input.value.slice(end)}`;
    input.focus({ preventScroll: true });
    input.setSelectionRange(start + text.length, start + text.length);
    input.dispatchEvent(new Event('input', { bubbles: true }));
}

function backspaceActiveInput() {
    const input = activeKeyboardInput || userName;
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
    const input = activeKeyboardInput || userName;
    const current = input.selectionStart ?? input.value.length;
    const next = Math.max(0, Math.min(input.value.length, current + offset));

    input.focus({ preventScroll: true });
    input.setSelectionRange(next, next);
}

function toggleKeyboardField() {
    const fields = getKeyboardFields();
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
    } else if (action === 'save') {
        userForm?.requestSubmit();
    } else {
        insertIntoActiveInput(getKeyboardCharacter(button.dataset.value || ''));
    }

    return true;
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
    } else if (action === 'save') {
        userForm?.requestSubmit();
    } else if (action === 'mouseLeftClick') {
        activeUser.checked = !activeUser.checked;
    } else {
        return false;
    }

    return true;
}

async function selectUser(userId) {
    showMessage(userError, '');
    showMessage(userSuccess, '');

    if (!window.pywebview?.api?.selecionar_usuario) {
        showMessage(userError, 'Função disponível apenas no launcher desktop.');
        return;
    }

    const response = await window.pywebview.api.selecionar_usuario(userId);
    if (!response.ok) {
        showMessage(userError, response.message);
        return;
    }

    showMessage(userSuccess, response.message);
    await loadUsers();
}

async function deleteUser(userId) {
    showMessage(userError, '');
    showMessage(userSuccess, '');

    if (!window.pywebview?.api?.excluir_usuario) {
        showMessage(userError, 'Função disponível apenas no launcher desktop.');
        return;
    }

    const response = await window.pywebview.api.excluir_usuario(userId);
    if (!response.ok) {
        showMessage(userError, response.message);
        return;
    }

    showMessage(userSuccess, response.message);
    await loadUsers();
}

function resetUserForm() {
    editingUserId = null;
    userForm?.reset();
    if (activeUser) {
        activeUser.checked = true;
    }
    if (userFormTitle) {
        userFormTitle.textContent = 'Adicionar usuário';
    }
    if (saveUserButton) {
        saveUserButton.innerHTML = '<i class="bi bi-person-plus me-2"></i>Adicionar';
    }
    cancelUserEditButton?.classList.add('d-none');
    keyboardShift = false;
    setActiveKeyboardInput(userName);
    updateKeyboardLabels();
    updateKeyboardSelection(false);
}

function editUser(userId) {
    const user = cachedUsers.find((candidate) => candidate.id === userId);
    if (!user) {
        return;
    }

    editingUserId = user.id;
    userName.value = user.nome || '';
    retroUsername.value = user.retroachievements_username || '';
    steamId.value = user.steam_id || '';
    activeUser.checked = Boolean(user.active);

    if (userFormTitle) {
        userFormTitle.textContent = 'Editar usuário';
    }
    if (saveUserButton) {
        saveUserButton.innerHTML = '<i class="bi bi-save me-2"></i>Salvar edição';
    }
    cancelUserEditButton?.classList.remove('d-none');
    setActiveKeyboardInput(userName);
    showMessage(userError, '');
    showMessage(userSuccess, 'Editando usuário.');
}

function getUserActionButtons() {
    return Array.from(userList?.querySelectorAll('[data-user-id], [data-edit-user-id], [data-delete-user-id]') || []);
}

function updateUserActionSelection(scrollIntoView = true) {
    const buttons = getUserActionButtons();
    if (!buttons.length) {
        return;
    }

    selectedUserActionIndex = Math.max(0, Math.min(buttons.length - 1, selectedUserActionIndex));
    buttons.forEach((button, index) => {
        const isSelected = index === selectedUserActionIndex;
        button.classList.toggle('is-controller-selected', isSelected);
        button.setAttribute('tabindex', isSelected ? '0' : '-1');
    });

    const selectedButton = buttons[selectedUserActionIndex];
    selectedButton.focus({ preventScroll: true });
    if (scrollIntoView) {
        selectedButton.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

function renderUsers(users) {
    if (!userList) {
        return;
    }

    cachedUsers = users;

    if (!users.length) {
        userList.innerHTML = '<p class="text-muted mb-0">Nenhum usuário cadastrado.</p>';
        return;
    }

    userList.innerHTML = users.map((user) => `
        <div class="user-list-item">
            <div>
                <strong>${escapeHtml(user.nome)}</strong>
                <span class="user-list-meta"><i class="bi bi-controller"></i> ${escapeHtml(user.retroachievements_username || 'RetroAchievements não informado')}</span>
                <span class="user-list-meta"><i class="bi bi-steam"></i> ${escapeHtml(user.steam_id || 'Steam não informado')}</span>
            </div>
            <div class="d-flex flex-wrap gap-2 justify-content-end">
                <button class="btn ${user.active ? 'btn-primary' : 'btn-outline-primary'} fw-bold" data-user-id="${user.id}" type="button">
                    ${user.active ? 'Ativo' : 'Usar'}
                </button>
                <button class="btn btn-outline-primary fw-bold" data-edit-user-id="${user.id}" type="button">
                    <i class="bi bi-pencil-square"></i>
                    <span>Editar</span>
                </button>
                <button class="btn btn-outline-danger fw-bold" data-delete-user-id="${user.id}" type="button">
                    <i class="bi bi-trash3"></i>
                    <span>Excluir</span>
                </button>
            </div>
        </div>
    `).join('');

    userList.querySelectorAll('[data-user-id]').forEach((button) => {
        button.addEventListener('click', () => selectUser(button.dataset.userId));
    });
    userList.querySelectorAll('[data-edit-user-id]').forEach((button) => {
        button.addEventListener('click', () => editUser(button.dataset.editUserId));
    });
    userList.querySelectorAll('[data-delete-user-id]').forEach((button) => {
        button.addEventListener('click', () => deleteUser(button.dataset.deleteUserId));
    });
}

async function loadUsers() {
    if (!window.pywebview?.api?.listar_usuarios) {
        renderUsers([]);
        showMessage(userError, 'Lista disponível apenas no launcher desktop.');
        return;
    }

    try {
        const response = await window.pywebview.api.listar_usuarios();
        renderUsers(response.usuarios || []);
    } catch (error) {
        renderUsers([]);
        showMessage(userError, `Erro ao carregar usuários: ${error.message || error}`);
    }
}

userForm?.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (savingUser) {
        return;
    }

    savingUser = true;
    showMessage(userError, '');
    showMessage(userSuccess, 'Salvando usuário...');

    const apiMethod = editingUserId ? 'editar_usuario' : 'adicionar_usuario';

    if (!window.pywebview?.api?.[apiMethod]) {
        showMessage(userError, 'Função disponível apenas no launcher desktop.');
        savingUser = false;
        return;
    }

    try {
        const args = [userName.value, retroUsername.value, steamId.value, activeUser.checked];
        const response = editingUserId
            ? await window.pywebview.api.editar_usuario(editingUserId, ...args)
            : await window.pywebview.api.adicionar_usuario(...args);

        if (!response.ok) {
            showMessage(userSuccess, '');
            showMessage(userError, response.message);
            return;
        }

        showMessage(userSuccess, response.message);
        resetUserForm();
        await loadUsers();
    } catch (error) {
        showMessage(userSuccess, '');
        showMessage(userError, `Erro ao salvar usuário: ${error.message || error}`);
    } finally {
        savingUser = false;
    }
});

cancelUserEditButton?.addEventListener('click', () => {
    showMessage(userError, '');
    showMessage(userSuccess, '');
    resetUserForm();
});

getKeyboardFields().forEach((input) => {
    input.addEventListener('focus', () => setActiveKeyboardInput(input));
    input.addEventListener('click', () => setActiveKeyboardInput(input));
});

function launcherNavigate(direction) {
    if (window.PageTabsModal?.isOpen?.()) {
        window.PageTabsModal.navigate(direction);
        return;
    }

    moveVirtualKeyboardSelection(direction);
}

function launcherActivate() {
    if (window.PageTabsModal?.handleAction?.('confirm')) {
        return;
    }

    pressVirtualKeyboardKey();
}

function launcherModalAction(action) {
    if (action === 'confirm') {
        pressVirtualKeyboardKey();
        return true;
    }

    if (action === 'back') {
        window.location.href = './index.html';
        return true;
    }

    return false;
}

function launcherBack() {
    if (window.PageTabsModal?.handleAction?.('back')) {
        return;
    }

    window.location.href = './index.html';
}

function launcherToggleTheme() {
    const currentTheme = document.documentElement.dataset.theme || 'dark';
    applyTheme(currentTheme === 'dark' ? 'light' : 'dark');
}

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
    if (htmlGamepadStarted || !('getGamepads' in navigator)) {
        return;
    }

    htmlGamepadStarted = true;

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

            if (now - lastNativeGamepadInputAt >= 700) {
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

                if (direction && (direction !== previousDirection || now - lastMove > 180)) {
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
                    launcherActivate();
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
                if (pressedOnce(gamepad, 4) || pressedOnce(gamepad, 5)) {
                    launcherKeyboardShortcut('shift');
                }
            }

            previousDirection = direction;
            previousButtons = gamepad.buttons.map((button) => button.pressed);
        }

        requestAnimationFrame(loop);
    }

    requestAnimationFrame(loop);
}

document.addEventListener('keydown', (event) => {
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
        event.preventDefault();
        launcherNavigate(event.key.replace('Arrow', '').toLowerCase());
    } else if (event.key === 'Enter') {
        event.preventDefault();
        launcherActivate();
    } else if (event.key === 'Tab') {
        event.preventDefault();
        toggleKeyboardField();
    }
});

buildVirtualKeyboard();
setActiveKeyboardInput(userName);
window.addEventListener('pywebviewready', () => {
    loadUsers();
    startHtmlGamepadControl();
});
window.setTimeout(loadUsers, 800);
window.setTimeout(startHtmlGamepadControl, 1200);
