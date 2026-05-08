const introScreen = document.getElementById('introScreen');
const introVideo = document.getElementById('introVideo');
const introSkip = document.getElementById('introSkip');
const profileSelectionScreen = document.getElementById('profileSelectionScreen');
const profileSelectionGrid = document.getElementById('profileSelectionGrid');

let jogoSelecionado = null;
let introActive = Boolean(introScreen);
let profileSelectionActive = false;
let launcherEntered = false;
let introFallbackTimer = null;
let introStartupTimer = null;
let introShouldPlay = true;
let selectedGameIndex = 0;
let selectedNavbarIndex = 0;
let selectedCategoryIndex = 0;
let selectedSidebarIndex = 0;
let selectedProfileIndex = 0;
let activeSteamId = '';
let activeCategoryFilter = 'Todos';
let navigationArea = 'games';
const protonDbTierCache = new Map();
const steamGridDbCoverCache = new Map();
let steamGridDbConfigured = null;

function createModalFallback(element) {
    return {
        show() {
            element.classList.add('show');
            element.style.display = 'block';
            element.removeAttribute('aria-hidden');
        },
        hide() {
            element.classList.remove('show');
            element.style.display = 'none';
            element.setAttribute('aria-hidden', 'true');
            element.dispatchEvent(new Event('hidden.bs.modal'));
        }
    };
}

function createOffcanvasFallback(element) {
    return {
        hide() {
            element.classList.remove('show');
            element.dispatchEvent(new Event('hidden.bs.offcanvas'));
        }
    };
}

const hasBootstrap = typeof bootstrap !== 'undefined';
const trailerModalElement = document.getElementById('trailerModal');
const trailerModal = hasBootstrap ? new bootstrap.Modal(trailerModalElement) : createModalFallback(trailerModalElement);
const playerArea = document.getElementById('videoPlayer');
const themeToggle = document.getElementById('themeToggle');
const themeIcon = document.getElementById('themeIcon');
const sidebarElement = document.getElementById('sidebar');
const sidebar = hasBootstrap ? bootstrap.Offcanvas.getOrCreateInstance(sidebarElement) : createOffcanvasFallback(sidebarElement);
const exitLauncher = document.getElementById('exitLauncher');
const restartSystem = document.getElementById('restartSystem');
const shutdownSystem = document.getElementById('shutdownSystem');
const openProfileAchievements = document.getElementById('openProfileAchievements');
const menuUser = document.getElementById('user');
const gameGrid = document.getElementById('gameGrid');
const libraryGameCount = document.getElementById('libraryGameCount');
const addSteamModalElement = document.getElementById('addSteamModal');
const addSteamModal = addSteamModalElement
    ? (hasBootstrap ? new bootstrap.Modal(addSteamModalElement) : createModalFallback(addSteamModalElement))
    : null;
const openAddSteamModal = document.getElementById('openAddSteamModal');
const importSteamLibraryButton = document.getElementById('importSteamLibraryButton');
const openAddEmulatorModal = document.getElementById('openAddEmulatorModal');
const openAddLutrisModal = document.getElementById('openAddLutrisModal');
const addSteamForm = document.getElementById('addSteamForm');
const steamGameName = document.getElementById('steamGameName');
const steamAppId = document.getElementById('steamAppId');
const steamGameCategory = document.getElementById('steamGameCategory');
const steamApiKey = document.getElementById('steamApiKey');
const steamApiStatus = document.getElementById('steamApiStatus');
const saveSteamApiKeyButton = document.getElementById('saveSteamApiKeyButton');
const addSteamError = document.getElementById('addSteamError');
const addEmulatorModalElement = document.getElementById('addEmulatorModal');
const addEmulatorModal = addEmulatorModalElement
    ? (hasBootstrap ? new bootstrap.Modal(addEmulatorModalElement) : createModalFallback(addEmulatorModalElement))
    : null;
const addLutrisModalElement = document.getElementById('addLutrisModal');
const addLutrisModal = addLutrisModalElement
    ? (hasBootstrap ? new bootstrap.Modal(addLutrisModalElement) : createModalFallback(addLutrisModalElement))
    : null;
const addLutrisForm = document.getElementById('addLutrisForm');
const lutrisGameName = document.getElementById('lutrisGameName');
const lutrisGameId = document.getElementById('lutrisGameId');
const lutrisGameCategory = document.getElementById('lutrisGameCategory');
const addLutrisError = document.getElementById('addLutrisError');
const saveLutrisGameButton = document.getElementById('saveLutrisGameButton');
const addEmulatorForm = document.getElementById('addEmulatorForm');
const emulatorName = document.getElementById('emulatorName');
const retroarchPath = document.getElementById('retroarchPath');
const retroarchPathDisplay = document.getElementById('retroarchPathDisplay');
const retroarchCorePath = document.getElementById('retroarchCorePath');
const retroarchCorePathDisplay = document.getElementById('retroarchCorePathDisplay');
const romsPath = document.getElementById('romsPath');
const romsPathDisplay = document.getElementById('romsPathDisplay');
const romExtensions = document.getElementById('romExtensions');
const addEmulatorError = document.getElementById('addEmulatorError');
const addEmulatorTitle = document.getElementById('addEmulatorTitle');
const saveEmulatorButton = document.getElementById('saveEmulatorButton');
const addSteamVirtualKeyboard = document.getElementById('virtualKeyboard');
const romRenamePanel = document.getElementById('romRenamePanel');
const romDisplayNameInput = document.getElementById('romDisplayNameInput');
const romRenameKeyboard = document.getElementById('romRenameKeyboard');
const addSteamTitle = document.getElementById('addSteamTitle');
const saveSteamGameButton = document.getElementById('saveSteamGameButton');
const startGameButton = document.getElementById('startGameButton');
const editGameButton = document.getElementById('editGameButton');
const renameRomButton = document.getElementById('renameRomButton');
const editEmulatorButton = document.getElementById('editEmulatorButton');
const deleteGameButton = document.getElementById('deleteGameButton');
const profileAchievementsModalElement = document.getElementById('profileAchievementsModal');
const profileAchievementsModal = profileAchievementsModalElement
    ? (hasBootstrap ? new bootstrap.Modal(profileAchievementsModalElement) : createModalFallback(profileAchievementsModalElement))
    : null;
const profileSourceModalElement = document.getElementById('profileSourceModal');
const profileSourceModal = profileSourceModalElement
    ? (hasBootstrap ? new bootstrap.Modal(profileSourceModalElement) : createModalFallback(profileSourceModalElement))
    : null;
const openRetroAchievementsProfile = document.getElementById('openRetroAchievementsProfile');
const openSteamProfile = document.getElementById('openSteamProfile');
const raConfigForm = document.getElementById('raConfigForm');
const raUsername = document.getElementById('raUsername');
const raApiKey = document.getElementById('raApiKey');
const loadRaWeekButton = document.getElementById('loadRaWeekButton');
const loadSteamProfileButton = document.getElementById('loadSteamProfileButton');
const raError = document.getElementById('raError');
const raConfigCard = document.getElementById('raConfigCard');
const raProfilePanel = document.getElementById('raProfilePanel');
const refreshRaProfile = document.getElementById('refreshRaProfile');
const raAchievements = document.getElementById('raAchievements');
const raRecentGames = document.getElementById('raRecentGames');
const profileSourceLabel = document.getElementById('profileSourceLabel');
const profileStatOneLabel = document.getElementById('profileStatOneLabel');
const profileStatTwoLabel = document.getElementById('profileStatTwoLabel');
const profileStatThreeLabel = document.getElementById('profileStatThreeLabel');
const profileDetailsTitle = document.getElementById('profileDetailsTitle');
const profileAsideTitle = document.getElementById('profileAsideTitle');
const originalGameDescription = document.getElementById('gameDescription')?.innerHTML || '';
const addedGames = new Map();
let editingGameId = null;
let editingEmulatorId = null;
let selectedModalActionIndex = 0;
let selectedModalGame = null;
let activeProfileSource = 'retro';
let activeKeyboardInput = null;
let selectedKeyboardIndex = 0;
let keyboardShift = false;
let activeKeyboardContext = 'steam';
let currentVirtualKeyboard = addSteamVirtualKeyboard;

function finishIntro() {
    if (!introActive) {
        return;
    }

    introActive = false;
    sessionStorage.setItem('gp-intro-seen', '1');

    if (introFallbackTimer) {
        window.clearTimeout(introFallbackTimer);
        introFallbackTimer = null;
    }

    if (introStartupTimer) {
        window.clearTimeout(introStartupTimer);
        introStartupTimer = null;
    }

    if (introVideo) {
        introVideo.pause();
    }

    introScreen.classList.add('is-hidden');
    showProfileSelection();

    window.setTimeout(() => {
        if (introScreen && introScreen.parentElement) {
            introScreen.remove();
        }
    }, 700);

}

function startIntroPlayback() {
    if (!introVideo || !introShouldPlay) {
        finishIntro();
        return;
    }

    introVideo.currentTime = 0;
    introVideo.muted = false;
    introVideo.volume = 1;

    introVideo.addEventListener('ended', finishIntro);
    introVideo.addEventListener('error', finishIntro);
    introVideo.addEventListener('loadeddata', () => {
        if (introStartupTimer) {
            window.clearTimeout(introStartupTimer);
            introStartupTimer = null;
        }
    });
    introVideo.addEventListener('loadedmetadata', () => {
        if (introFallbackTimer) {
            window.clearTimeout(introFallbackTimer);
        }

        const duration = Number.isFinite(introVideo.duration) ? introVideo.duration * 1000 : 12000;
        introFallbackTimer = window.setTimeout(finishIntro, duration + 1500);
    });

    introStartupTimer = window.setTimeout(() => {
        if (introVideo.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
            finishIntro();
        }
    }, 8000);

    introVideo.load();
    introVideo.play().catch((error) => {
        console.warn('Nao foi possivel iniciar a abertura com som automaticamente:', error);

        introVideo.muted = true;
        introVideo.play().catch(() => {
            finishIntro();
        });
    });
}

if (introSkip) {
    introSkip.addEventListener('click', finishIntro);
}

document.addEventListener('keydown', (event) => {
    if (!introActive) {
        if (profileSelectionActive) {
            if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
                event.preventDefault();
                navigateProfileSelection(event.key.replace('Arrow', '').toLowerCase());
            } else if (event.key === 'Enter') {
                event.preventDefault();
                getProfileSelectionItems()[selectedProfileIndex]?.click();
            }
        }
        return;
    }

    if (['Enter', ' ', 'Escape'].includes(event.key)) {
        event.preventDefault();
        finishIntro();
    }
});

async function initializeIntro() {
    if (!introScreen) {
        introActive = false;
        return;
    }

    if (sessionStorage.getItem('gp-intro-seen') === '1') {
        introShouldPlay = false;
    }

    if (!introShouldPlay) {
        finishIntro();
        return;
    }

    introFallbackTimer = window.setTimeout(finishIntro, 12000);
    startIntroPlayback();
}

initializeIntro();

function getProfileSelectionItems() {
    return Array.from(profileSelectionGrid?.querySelectorAll('.profile-select-card') || []);
}

function updateProfileSelection(scrollIntoView = true) {
    const items = getProfileSelectionItems();
    if (!items.length) {
        return;
    }

    selectedProfileIndex = Math.max(0, Math.min(items.length - 1, selectedProfileIndex));

    items.forEach((item, index) => {
        const isSelected = index === selectedProfileIndex;
        item.classList.toggle('is-controller-selected', isSelected);
        item.setAttribute('tabindex', isSelected ? '0' : '-1');
    });

    const selectedItem = items[selectedProfileIndex];
    selectedItem.focus({ preventScroll: true });

    if (scrollIntoView) {
        selectedItem.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    }
}

function renderProfileSelection(users = []) {
    if (!profileSelectionGrid) {
        return;
    }

    const userCards = users.map((user) => `
        <button class="profile-select-card" type="button" data-profile-id="${user.id}">
            <span class="profile-select-avatar"><i class="bi bi-person-fill"></i></span>
            <strong>${escapeHtml(user.nome || 'Usuário')}</strong>
            <small><i class="bi bi-controller"></i> ${escapeHtml(user.retroachievements_username || 'RetroAchievements')}</small>
            <small><i class="bi bi-steam"></i> ${escapeHtml(user.steam_id || 'Steam')}</small>
        </button>
    `).join('');

    profileSelectionGrid.innerHTML = `
        ${userCards}
        <a class="profile-select-card" href="./users.html" data-profile-add="true">
            <span class="profile-add-icon"><i class="bi bi-plus-lg"></i></span>
            <strong>Adicionar usuário</strong>
            <small>Cadastrar um novo perfil</small>
        </a>
    `;

    profileSelectionGrid.querySelectorAll('[data-profile-id]').forEach((card) => {
        card.addEventListener('click', () => selectStartupProfile(card.dataset.profileId));
    });

    selectedProfileIndex = Math.max(0, users.findIndex((user) => user.active));
    updateProfileSelection(false);
}

async function showProfileSelection() {
    if (!profileSelectionScreen) {
        updateNavigationSelection(false);
        return;
    }

    profileSelectionActive = true;
    profileSelectionScreen.classList.remove('d-none');

    try {
        if (window.pywebview?.api?.listar_usuarios) {
            const response = await window.pywebview.api.listar_usuarios();
            renderProfileSelection(response.usuarios || []);
        } else {
            renderProfileSelection([]);
        }
    } catch (error) {
        console.warn('Nao foi possivel carregar perfis:', error);
        renderProfileSelection([]);
    }
}

async function selectStartupProfile(userId) {
    if (!userId) {
        return;
    }

    if (window.pywebview?.api?.selecionar_usuario && userId) {
        try {
            await window.pywebview.api.selecionar_usuario(userId);
        } catch (error) {
            console.warn('Nao foi possivel selecionar usuario:', error);
        }
    }

    await loadActiveUser();
    profileSelectionActive = false;
    launcherEntered = true;
    profileSelectionScreen?.classList.add('d-none');
    updateNavigationSelection(false);
    await loadSteamGames();
}

function navigateProfileSelection(direction) {
    const items = getProfileSelectionItems();
    if (!items.length) {
        return;
    }

    const currentItem = items[selectedProfileIndex] || items[0];
    const currentTop = currentItem.getBoundingClientRect().top;
    const columns = items.filter((item) => Math.abs(item.getBoundingClientRect().top - currentTop) < 8).length || 1;

    if (direction === 'left') {
        selectedProfileIndex -= 1;
    } else if (direction === 'right') {
        selectedProfileIndex += 1;
    } else if (direction === 'up') {
        selectedProfileIndex -= columns;
    } else if (direction === 'down') {
        selectedProfileIndex += columns;
    }

    updateProfileSelection();
}

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

async function requestPowerAction(action) {
    const isRestart = action === 'restart';
    const label = isRestart ? 'reiniciar' : 'desligar';
    const confirmed = window.showControllerConfirm
        ? await window.showControllerConfirm(`Deseja ${label} o computador agora?`, {
            confirmLabel: isRestart ? 'Reiniciar' : 'Desligar',
            cancelLabel: 'Cancelar'
        })
        : confirm(`Deseja ${label} o computador agora?`);

    if (!confirmed) {
        return;
    }

    const apiMethod = isRestart ? 'reiniciar_sistema' : 'desligar_sistema';
    try {
        const response = await window.pywebview?.api?.[apiMethod]?.();

        if (!response) {
            showControllerAlert('Comando indisponivel neste ambiente.');
            return;
        }

        if (response.ok === false) {
            showControllerAlert(response.message);
        }
    } catch (error) {
        showControllerAlert(`Erro ao ${label} o sistema: ${error}`);
    }
}

restartSystem?.addEventListener('click', (event) => {
    event.preventDefault();
    requestPowerAction('restart');
});

shutdownSystem?.addEventListener('click', (event) => {
    event.preventDefault();
    requestPowerAction('shutdown');
});

if (openProfileAchievements && profileSourceModal) {
    openProfileAchievements.addEventListener('click', (event) => {
        event.preventDefault();
        sidebar.hide();
        openProfileSourceSelector();
    });
}

if (refreshRaProfile) {
    refreshRaProfile.addEventListener('click', refreshActiveProfileSource);
}

if (openRetroAchievementsProfile) {
    openRetroAchievementsProfile.addEventListener('click', () => {
        openSelectedProfileSource('retro');
    });
}

if (openSteamProfile) {
    openSteamProfile.addEventListener('click', () => {
        openSelectedProfileSource('steam');
    });
}

if (raConfigForm) {
    raConfigForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        showRaError('');

        if (!window.pywebview || !window.pywebview.api?.obter_retroachievements_usuario) {
            showRaError('O launcher desktop ainda não está pronto.');
            return;
        }

        try {
            if (raApiKey?.value.trim() && window.pywebview.api?.salvar_retroachievements_config) {
                const saved = await window.pywebview.api.salvar_retroachievements_config(raApiKey.value);

                if (!saved.ok) {
                    showRaError(saved.message);
                    return;
                }

                raApiKey.value = '';
            }

            const response = await window.pywebview.api.obter_retroachievements_usuario(getRetroAchievementsUsername());

            if (!response.ok) {
                showRaError(response.message);
                return;
            }

            renderRetroAchievementsProfile(response);
        } catch (error) {
            showRaError(`Erro ao consultar usuário: ${error}`);
        }
    });
}

if (loadRaWeekButton) {
    loadRaWeekButton.addEventListener('click', loadRetroAchievementsProfile);
}

if (loadSteamProfileButton) {
    loadSteamProfileButton.addEventListener('click', loadSteamProfile);
}

if (openAddSteamModal && addSteamModal) {
    openAddSteamModal.addEventListener('click', () => {
        resetLauncherControllerInput(500);
        openGameForm();
    });
}

if (openAddEmulatorModal && addEmulatorModal) {
    openAddEmulatorModal.addEventListener('click', () => {
        resetLauncherControllerInput(500);
        openEmulatorForm();
    });
}

if (openAddLutrisModal && addLutrisModal) {
    openAddLutrisModal.addEventListener('click', () => {
        resetLauncherControllerInput(500);
        showAddLutrisError('');
        addLutrisForm?.reset();
        if (lutrisGameCategory) {
            lutrisGameCategory.value = 'Lutris';
        }
        addLutrisModal.show();
        window.setTimeout(() => lutrisGameName?.focus(), 150);
    });
}

if (addLutrisForm) {
    addLutrisForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        showAddLutrisError('');

        if (!window.pywebview || !window.pywebview.api?.adicionar_jogo_lutris) {
            showAddLutrisError('O launcher desktop ainda não está pronto.');
            return;
        }

        const originalHtml = saveLutrisGameButton?.innerHTML;
        if (saveLutrisGameButton) {
            saveLutrisGameButton.disabled = true;
            saveLutrisGameButton.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Salvando...';
        }

        try {
            const response = await window.pywebview.api.adicionar_jogo_lutris(
                lutrisGameName.value,
                lutrisGameId.value,
                lutrisGameCategory?.value || 'Lutris'
            );

            if (!response.ok) {
                showAddLutrisError(response.message);
                return;
            }

            createSteamGameCard(response.jogo);
            applyCategoryFilter(activeCategoryFilter, false);
            updateLibraryCount();
            updateNavigationSelection(false);
            addLutrisModal.hide();
        } catch (error) {
            showAddLutrisError(`Erro ao salvar jogo Lutris: ${error}`);
        } finally {
            if (saveLutrisGameButton) {
                saveLutrisGameButton.disabled = false;
                saveLutrisGameButton.innerHTML = originalHtml;
            }
        }
    });
}

if (addEmulatorForm) {
    addEmulatorForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        showAddEmulatorError('');

        const apiMethod = editingEmulatorId ? 'editar_emulador' : 'adicionar_emulador';

        if (!window.pywebview || !window.pywebview.api?.[apiMethod]) {
            showAddEmulatorError('O launcher desktop ainda não está pronto.');
            return;
        }

        try {
            const selectedRetroarchPath = getFileInputPath(retroarchPath);
            const selectedCorePath = getFileInputPath(retroarchCorePath);
            const selectedRomsPath = getDirectoryInputPath(romsPath);
            if (!selectedRetroarchPath) {
                showAddEmulatorError('Selecione o arquivo do RetroArch.');
                return;
            }
            if (!selectedCorePath) {
                showAddEmulatorError('Selecione o arquivo do core do RetroArch.');
                return;
            }
            if (!selectedRomsPath) {
                showAddEmulatorError('Selecione a pasta das ROMs.');
                return;
            }

            const args = [
                emulatorName.value,
                selectedRetroarchPath,
                selectedCorePath,
                selectedRomsPath,
                romExtensions.value
            ];
            const response = editingEmulatorId
                ? await window.pywebview.api.editar_emulador(editingEmulatorId, ...args)
                : await window.pywebview.api.adicionar_emulador(...args);

            if (!response.ok) {
                showAddEmulatorError(response.message);
                return;
            }

            if (editingEmulatorId) {
                removeRomCardsByEmulator(editingEmulatorId);
            }

            response.roms.forEach(createSteamGameCard);
            applyCategoryFilter(activeCategoryFilter, false);
            updateLibraryCount();
            updateNavigationSelection(false);
            addEmulatorModal.hide();
        } catch (error) {
            showAddEmulatorError(`Erro ao salvar emulador: ${error}`);
        }
    });
}

if (addSteamForm) {
    addSteamForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        showAddSteamError('');

        if (!window.pywebview || !window.pywebview.api?.adicionar_jogo_steam) {
            showAddSteamError('O launcher desktop ainda não está pronto.');
            return;
        }

        try {
            if (steamApiKey?.value.trim()) {
                const steamConfig = await window.pywebview.api.salvar_steam_config(steamApiKey.value);
                if (!steamConfig.ok) {
                    showAddSteamError(steamConfig.message);
                    return;
                }
                steamApiKey.value = '';
                updateSteamApiStatus(true);
            }

            const response = editingGameId
                ? await window.pywebview.api.editar_jogo_adicionado(editingGameId, steamGameName.value, steamAppId.value, steamGameCategory?.value || 'Outros')
                : await window.pywebview.api.adicionar_jogo_steam(steamGameName.value, steamAppId.value, steamGameCategory?.value || 'Outros');

            if (!response.ok) {
                showAddSteamError(response.message);
                return;
            }

            if (response.old_id) {
                removeAddedGameCard(response.old_id);
            }

            createSteamGameCard(response.jogo);
            applyCategoryFilter(activeCategoryFilter, false);
            updateLibraryCount();
            selectedGameIndex = getGameCards().findIndex((card) => card.dataset.gameId === response.jogo.id);
            selectedGameIndex = Math.max(0, selectedGameIndex);
            setNavigationArea('games', selectedGameIndex);
            addSteamModal?.hide();
            editingGameId = null;
        } catch (error) {
            showAddSteamError(`Erro ao adicionar jogo: ${error}`);
        }
    });
}

if (saveSteamApiKeyButton) {
    saveSteamApiKeyButton.addEventListener('click', async () => {
        showAddSteamError('');

        if (!window.pywebview || !window.pywebview.api?.salvar_steam_config) {
            showAddSteamError('O launcher desktop ainda não está pronto.');
            return;
        }

        try {
            const response = await window.pywebview.api.salvar_steam_config(steamApiKey?.value || '');

            if (!response.ok) {
                showAddSteamError(response.message);
                return;
            }

            if (steamApiKey) {
                steamApiKey.value = '';
            }
            updateSteamApiStatus(true);
        } catch (error) {
            showAddSteamError(`Erro ao salvar API da Steam: ${error}`);
        }
    });
}

if (importSteamLibraryButton) {
    importSteamLibraryButton.addEventListener('click', async () => {
        resetLauncherControllerInput(500);

        if (!window.pywebview || !window.pywebview.api?.importar_biblioteca_steam) {
            showControllerAlert('O launcher desktop ainda não está pronto.');
            return;
        }

        const originalHtml = importSteamLibraryButton.innerHTML;
        importSteamLibraryButton.disabled = true;
        importSteamLibraryButton.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Importando...';

        try {
            const response = await withUiTimeout(
                window.pywebview.api.importar_biblioteca_steam(),
                90000,
                'A importação da Steam demorou demais. Verifique conexão, Steam API Key e tente novamente.'
            );

            if (!response.ok) {
                showControllerAlert(response.message);
                return;
            }

            (response.jogos || []).forEach(createSteamGameCard);
            applyCategoryFilter(activeCategoryFilter, false);
            updateLibraryCount();
            updateNavigationSelection(false);
            showControllerAlert(response.message);
        } catch (error) {
            showControllerAlert(`Erro ao importar biblioteca Steam: ${error}`);
        } finally {
            importSteamLibraryButton.disabled = false;
            importSteamLibraryButton.innerHTML = originalHtml;
            resetLauncherControllerInput(500);
        }
    });
}

getCategoryButtons().forEach((button) => {
    button.addEventListener('click', () => {
        const categoryButtons = getCategoryButtons();
        const buttonIndex = categoryButtons.indexOf(button);

        if (buttonIndex >= 0) {
            selectedCategoryIndex = buttonIndex;
        }

        const activatedByController = navigationArea === 'categories';
        applyCategoryFilter(button.dataset.categoryFilter || 'Todos', true);

        if (activatedByController) {
            const hasVisibleGames = getGameCards().length > 0;
            setNavigationArea(hasVisibleGames ? 'games' : 'categories', hasVisibleGames ? 0 : selectedCategoryIndex, true);
        }
    });
});

addSteamModalElement?.addEventListener('hidden.bs.modal', () => {
    editingGameId = null;
    showAddSteamError('');
    resetLauncherControllerInput(500);
    window.setTimeout(() => updateNavigationSelection(false), 50);
});

addSteamModalElement?.addEventListener('shown.bs.modal', () => {
    resetLauncherControllerInput(500);
});

addEmulatorModalElement?.addEventListener('hidden.bs.modal', () => {
    editingEmulatorId = null;
    showAddEmulatorError('');
    resetLauncherControllerInput(500);
    window.setTimeout(() => updateNavigationSelection(false), 50);
});

addEmulatorModalElement?.addEventListener('shown.bs.modal', () => {
    resetLauncherControllerInput(500);
});

addLutrisModalElement?.addEventListener('hidden.bs.modal', () => {
    showAddLutrisError('');
    resetLauncherControllerInput(500);
    window.setTimeout(() => updateNavigationSelection(false), 50);
});

addLutrisModalElement?.addEventListener('shown.bs.modal', () => {
    resetLauncherControllerInput(500);
});

[steamGameName, steamAppId, steamApiKey].forEach((input) => {
    input?.addEventListener('focus', () => {
        setActiveKeyboardInput(input);
    });
});

function getGameCards() {
    return Array.from(document.querySelectorAll('.game-card'))
        .filter((card) => !card.closest('[data-game-column-id]')?.classList.contains('d-none'));
}

function getNavbarItems() {
    return Array.from(new Set(document.querySelectorAll(
        '.navbar-toggler, .navbar-brand, #themeToggle, .app-action-btn, .steam-add-button'
    )));
}

function getAddGameNavbarIndex() {
    const navbarItems = getNavbarItems();
    const addButton = document.getElementById('openAddEmulatorModal') || document.getElementById('openAddSteamModal');
    const index = navbarItems.indexOf(addButton);

    return index >= 0 ? index : 0;
}

function normalizeCategory(category) {
    return String(category || 'Outros').trim() || 'Outros';
}

function isSteamGameNotInstalled(game) {
    return game.tipo === 'steam' && game.install_required === true;
}

function getCategoryButtons() {
    return Array.from(document.querySelectorAll('.category-filter-button'));
}

function applyCategoryFilter(category = activeCategoryFilter, scrollIntoView = false) {
    activeCategoryFilter = normalizeCategory(category);

    getCategoryButtons().forEach((button, index) => {
        if (button.dataset.categoryFilter === activeCategoryFilter) {
            selectedCategoryIndex = index;
        }

        button.classList.toggle(
            'is-active',
            button.dataset.categoryFilter === activeCategoryFilter
        );
    });

    document.querySelectorAll('[data-game-column-id]').forEach((column) => {
        const card = column.querySelector('.game-card');
        const gameCategory = normalizeCategory(column.dataset.gameCategory);
        const gameType = card?.dataset.gameType || '';

        let visible = false;

        if (activeCategoryFilter === 'Retro') {
            visible = gameType === 'rom';
        }

        else if (activeCategoryFilter === 'Lutris') {
            visible = gameType === 'lutris';
        }

        else if (activeCategoryFilter === 'Todos') {
            visible = gameType === 'steam' || gameType === 'executavel' || gameType === 'lutris';
        }

        else if (activeCategoryFilter === 'Linux') {
            visible = gameType === 'steam' && isLinuxCompatibleTier(card?.dataset.protonTier);
        }

        else {
            visible =
                gameType !== 'rom' &&
                gameCategory === activeCategoryFilter;
        }

        column.classList.toggle('d-none', !visible);
    });

    selectedGameIndex = 0;
    updateLibraryCount();

    if (getGameCards().length) {
        setNavigationArea('games', 0, scrollIntoView);
    } else {
        updateNavigationSelection(false);
    }
}

function getCurrentGameColumns(cards = getGameCards()) {
    const currentCard = cards[selectedGameIndex] || cards[0];

    if (!currentCard) {
        return 1;
    }

    const currentTop = currentCard.getBoundingClientRect().top;
    return cards.filter((card) => {
        return Math.abs(card.getBoundingClientRect().top - currentTop) < 8;
    }).length || 1;
}

function isFirstGameRowSelected(cards = getGameCards()) {
    return selectedGameIndex < getCurrentGameColumns(cards);
}

function scrollLibraryHeaderIntoView() {
    const header = document.querySelector('.library-header');
    const navbarHeight = document.querySelector('.app-navbar')?.offsetHeight || 0;

    if (!header) {
        return;
    }

    window.scrollTo({
        top: Math.max(0, header.getBoundingClientRect().top + window.scrollY - navbarHeight - 24),
        behavior: 'smooth'
    });
}

function getSidebarItems() {
    const dropdownItems = Array.from(document.querySelectorAll('#sidebar .dropdown-menu.show .dropdown-item'));
    const userLinks = Array.from(document.querySelectorAll('#sidebar .user-link'));

    return [
        ...document.querySelectorAll('#sidebar .nav-link'),
        ...dropdownItems,
        ...userLinks
    ];
}

function isSidebarOpen() {
    return sidebarElement.classList.contains('show');
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
    } else if (area === 'categories' && index !== null) {
        selectedCategoryIndex = index;
    } else if (area === 'sidebar' && index !== null) {
        selectedSidebarIndex = index;
    } else if (area === 'games' && index !== null) {
        selectedGameIndex = index;
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
    } else if (navigationArea === 'categories') {
        items = getCategoryButtons();
        selectedCategoryIndex = Math.max(0, Math.min(items.length - 1, selectedCategoryIndex));
        selectedIndex = selectedCategoryIndex;
    } else if (navigationArea === 'sidebar' && isSidebarOpen()) {
        items = getSidebarItems();
        selectedSidebarIndex = Math.max(0, Math.min(items.length - 1, selectedSidebarIndex));
        selectedIndex = selectedSidebarIndex;
    } else {
        navigationArea = 'games';
        items = getGameCards();
        selectedGameIndex = Math.max(0, Math.min(items.length - 1, selectedGameIndex));
        selectedIndex = selectedGameIndex;
    }

    const selectedItem = items[selectedIndex];

    items.forEach((item, index) => {
        const isSelected = index === selectedIndex;
        item.classList.toggle(item.classList.contains('game-card') ? 'is-selected' : 'is-controller-selected', isSelected);
        item.setAttribute('tabindex', isSelected ? '0' : '-1');
    });

    if (selectedItem) {
        selectedItem.focus({ preventScroll: true });
    }

    if (scrollIntoView && selectedItem) {
        if (selectedItem.closest('.category-filter-bar')) {
            scrollLibraryHeaderIntoView();
            selectedItem.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest',
                inline: 'nearest'
            });
        } else if (selectedItem.closest('.library-header') || (navigationArea === 'games' && isFirstGameRowSelected())) {
            scrollLibraryHeaderIntoView();
        } else {
            selectedItem.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest',
                inline: 'nearest'
            });
        }
    }
}

function updateSelectedGame(scrollIntoView = true) {
    const cards = getGameCards();

    cards.forEach((card, index) => {
        card.classList.toggle('is-selected', index === selectedGameIndex);
        card.setAttribute('tabindex', index === selectedGameIndex ? '0' : '-1');
    });

    if (scrollIntoView && cards[selectedGameIndex]) {
        cards[selectedGameIndex].scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
            inline: 'nearest'
        });
    }
}

document.addEventListener('app:controller-alert-hidden', () => {
    resetLauncherControllerInput(500);
    window.setTimeout(() => updateNavigationSelection(false), 50);
});

function updateLibraryCount() {
    const total = getGameCards().length;
    const label = total === 1 ? '1 jogo' : `${total} jogos`;

    if (libraryGameCount) {
        libraryGameCount.textContent = activeCategoryFilter === 'Todos'
            ? label
            : `${label} em ${activeCategoryFilter}`;
    }
}

function showAddSteamError(message) {
    if (!addSteamError) {
        return;
    }

    addSteamError.textContent = message;
    addSteamError.classList.toggle('d-none', !message);
}

function updateSteamApiStatus(configured = false) {
    if (!steamApiStatus) {
        return;
    }

    steamApiStatus.textContent = configured
        ? 'Steam Web API Key configurada. O launcher monta a URL da API automaticamente.'
        : 'A URL da API Steam fica pronta no launcher; informe a key apenas uma vez.';
}

async function loadSteamApiStatus() {
    if (!window.pywebview || !window.pywebview.api?.obter_steam_config) {
        updateSteamApiStatus(false);
        return;
    }

    try {
        const response = await window.pywebview.api.obter_steam_config();
        updateSteamApiStatus(Boolean(response.configured));
    } catch (error) {
        updateSteamApiStatus(false);
    }
}

function showAddEmulatorError(message) {
    if (!addEmulatorError) {
        return;
    }

    addEmulatorError.textContent = message;
    addEmulatorError.classList.toggle('d-none', !message);
}

function showAddLutrisError(message) {
    if (!addLutrisError) {
        return;
    }

    addLutrisError.textContent = message;
    addLutrisError.classList.toggle('d-none', !message);
}

function showRaError(message) {
    if (!raError) {
        return;
    }

    raError.textContent = message;
    raError.classList.toggle('d-none', !message);
}

function formatNumber(value) {
    return new Intl.NumberFormat('pt-BR').format(Number(value) || 0);
}

function formatPlaytime(minutes) {
    const totalMinutes = Number(minutes) || 0;

    if (totalMinutes <= 0) {
        return 'Sem tempo registrado';
    }

    const hours = Math.floor(totalMinutes / 60);
    const remainingMinutes = totalMinutes % 60;

    if (!hours) {
        return `${remainingMinutes} min`;
    }

    if (!remainingMinutes) {
        return `${formatNumber(hours)} h`;
    }

    return `${formatNumber(hours)} h ${remainingMinutes} min`;
}

function getGamePlaytimeHtml(game) {
    if (game.tipo !== 'steam') {
        return '';
    }

    const total = formatPlaytime(game.playtime_forever);
    const recentMinutes = Number(game.playtime_2weeks) || 0;
    const recent = recentMinutes > 0
        ? `<span><i class="bi bi-clock-history"></i> Últimas 2 semanas: ${escapeHtml(formatPlaytime(recentMinutes))}</span>`
        : '';

    return `
        <div class="game-playtime-summary">
            <span><i class="bi bi-hourglass-split"></i> Tempo total: ${escapeHtml(total)}</span>
            ${recent}
        </div>
    `;
}

function setText(id, value) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = value;
    }
}

function getRetroAchievementsUsername() {
    const username = raUsername?.value?.trim() || menuUser?.dataset.username || '';

    if (raUsername) {
        raUsername.value = username;
    }

    return username;
}

function getSteamUsername() {
    return activeSteamId;
}

async function loadActiveUser() {
    if (!window.pywebview || !window.pywebview.api?.obter_usuario_ativo) {
        return;
    }

    try {
        const response = await window.pywebview.api.obter_usuario_ativo();
        const user = response.usuario;

        if (!response.ok || !user) {
            return;
        }

        if (menuUser) {
            const userName = user.nome || 'Selecione perfil';
            const retroUsername = user.retroachievements_username || '';
            menuUser.dataset.userName = userName;
            menuUser.dataset.username = retroUsername;
            menuUser.innerHTML = `<i class="bi bi-controller"></i> ${escapeHtml(userName)}`;
        }

        activeSteamId = user.steam_id || '';

        if (raUsername && user.retroachievements_username) {
            raUsername.value = user.retroachievements_username;
        }
    } catch (error) {
        console.warn('Nao foi possivel carregar usuario ativo:', error);
    }
}

function openProfileSourceSelector() {
    selectedModalActionIndex = 0;
    profileSourceModal?.show();
    window.setTimeout(() => updateModalActionSelection(false), 220);
}

function openSelectedProfileSource(source) {
    activeProfileSource = source;
    clearModalActionSelection();
    profileSourceModal?.hide();
    profileAchievementsModal?.show();

    if (source === 'steam') {
        loadSteamProfile();
    } else {
        loadRetroAchievementsUser();
    }
}

function refreshActiveProfileSource() {
    if (activeProfileSource === 'steam') {
        loadSteamProfile();
    } else if (activeProfileSource === 'week') {
        loadRetroAchievementsProfile();
    } else {
        loadRetroAchievementsUser();
    }
}

function setProfileModeLabels(mode) {
    const labels = {
        retro: {
            source: 'RetroAchievements',
            statOne: 'Pontos',
            statTwo: 'True points',
            statThree: 'Rank',
            details: 'Conquistas recentes',
            aside: 'Últimos jogos',
        },
        week: {
            source: 'RetroAchievements · Semana',
            statOne: 'Pontos',
            statTwo: 'True ratio',
            statThree: 'Jogadores',
            details: 'Detalhes',
            aside: 'Desbloqueios recentes',
        },
        steam: {
            source: 'Steam',
            statOne: 'Jogos',
            statTwo: 'Amigos',
            statThree: 'Visibilidade',
            details: 'Perfil Steam',
            aside: 'Jogos recentes',
        },
    }[mode] || {};

    if (profileSourceLabel) profileSourceLabel.textContent = labels.source || 'Perfil';
    if (profileStatOneLabel) profileStatOneLabel.textContent = labels.statOne || '';
    if (profileStatTwoLabel) profileStatTwoLabel.textContent = labels.statTwo || '';
    if (profileStatThreeLabel) profileStatThreeLabel.textContent = labels.statThree || '';
    if (profileDetailsTitle) profileDetailsTitle.textContent = labels.details || 'Detalhes';
    if (profileAsideTitle) profileAsideTitle.textContent = labels.aside || 'Recentes';
}

function renderRetroAchievementsProfile(data) {
    const profile = data.profile || {};
    setProfileModeLabels(data.mode === 'week' ? 'week' : 'retro');

    raConfigCard?.classList.add('is-compact');
    raProfilePanel?.classList.remove('d-none');
    showRaError('');

    setText('raProfileName', profile.username || 'RetroAchievements');
    setText('raMotto', profile.motto || 'Descrição indisponível.');
    setText('raRichPresence', profile.rich_presence || '');
    setText('raPoints', formatNumber(profile.total_points));
    setText('raTruePoints', formatNumber(profile.true_points));
    setText('raRank', formatNumber(profile.rank));

    const avatar = document.getElementById('raAvatar');
    if (avatar && profile.user_pic) {
        avatar.src = profile.user_pic;
    } else if (avatar) {
        avatar.src = './src/img/perfil/avatargamer0.jpg';
    }

    if (raAchievements) {
        raAchievements.innerHTML = '';

        if (!data.achievements?.length) {
            raAchievements.innerHTML = '<p class="text-muted mb-0">Nenhuma conquista da semana encontrada.</p>';
        } else {
            data.achievements.forEach((achievement) => {
                const item = document.createElement('article');
                item.className = 'ra-achievement-card';
                const image = achievement.badge
                    ? `<img src="${escapeAttribute(achievement.badge)}" alt="">`
                    : '<i class="bi bi-trophy-fill ra-achievement-icon" aria-hidden="true"></i>';
                item.innerHTML = `
                    ${image}
                    <div>
                        <div class="ra-achievement-title">${escapeHtml(achievement.title)}</div>
                        <p>${escapeHtml(achievement.description)}</p>
                        <div class="ra-achievement-meta">
                            <span>${escapeHtml(achievement.game)}</span>
                            <span>${escapeHtml(achievement.console)}</span>
                            <span>${formatNumber(achievement.points)} pts</span>
                            <span>True ratio ${formatNumber(achievement.true_ratio)}</span>
                            ${achievement.type ? `<span>${escapeHtml(achievement.type)}</span>` : ''}
                            ${achievement.author ? `<span>${escapeHtml(achievement.author)}</span>` : ''}
                            <span>${formatNumber(achievement.unlocks_count)} desbloqueios</span>
                            <span>${formatNumber(achievement.hardcore_unlocks_count)} hardcore</span>
                        </div>
                    </div>
                `;
                raAchievements.appendChild(item);
            });
        }
    }

    if (raRecentGames) {
        raRecentGames.innerHTML = '';

        if (!data.recent_games?.length) {
            raRecentGames.innerHTML = '<p class="text-muted mb-0">Nenhum desbloqueio encontrado.</p>';
        } else {
            data.recent_games.forEach((game) => {
                const item = document.createElement('article');
                item.className = 'ra-game-card';
                const image = game.image
                    ? `<img src="${escapeAttribute(game.image)}" alt="">`
                    : '<i class="bi bi-person-check-fill ra-achievement-icon" aria-hidden="true"></i>';
                item.innerHTML = `
                        ${image}
                        <div>
                            <strong>${escapeHtml(game.title)}</strong>
                            <small>${escapeHtml(game.console)} · ${formatNumber(game.achievements_total)} RA points</small>
                        </div>
                    `;
                raRecentGames.appendChild(item);
            });
        }
    }
}

function personaStateLabel(value) {
    const states = {
        0: 'Offline',
        1: 'Online',
        2: 'Ocupado',
        3: 'Ausente',
        4: 'Soneca',
        5: 'Quer trocar',
        6: 'Quer jogar',
    };

    return states[Number(value)] || 'Indisponível';
}

function renderSteamProfile(data) {
    const profile = data.profile || {};
    setProfileModeLabels('steam');

    raConfigCard?.classList.add('is-compact');
    raProfilePanel?.classList.remove('d-none');
    showRaError('');

    setText('raProfileName', profile.persona_name || profile.steam_id || 'Steam');
    setText('raMotto', profile.real_name || profile.profile_url || 'Perfil Steam');
    setText('raRichPresence', `${personaStateLabel(profile.persona_state)} · ${profile.country || 'Local não informado'}`);
    setText('raPoints', formatNumber(profile.game_count));
    setText('raTruePoints', formatNumber(profile.friend_count));
    setText('raRank', profile.visibility_state || '-');

    const avatar = document.getElementById('raAvatar');
    if (avatar && profile.avatar_full) {
        avatar.src = profile.avatar_full;
    } else if (avatar) {
        avatar.src = './src/img/perfil/avatargamer0.jpg';
    }

    if (raAchievements) {
        raAchievements.innerHTML = '';
        const item = document.createElement('article');
        item.className = 'ra-achievement-card';
        item.innerHTML = `
            <img src="${escapeAttribute(profile.avatar_medium || profile.avatar_full || './src/img/perfil/avatargamer0.jpg')}" alt="">
            <div>
                <div class="ra-achievement-title">${escapeHtml(profile.persona_name || 'Steam')}</div>
                <p>${escapeHtml(profile.profile_url || '')}</p>
                <div class="ra-achievement-meta">
                    <span>SteamID ${escapeHtml(profile.steam_id || '')}</span>
                    <span>${escapeHtml(personaStateLabel(profile.persona_state))}</span>
                    <span>${formatNumber(profile.game_count)} jogos</span>
                    <span>${formatNumber(profile.friend_count)} amigos</span>
                </div>
            </div>
        `;
        raAchievements.appendChild(item);
    }

    if (raRecentGames) {
        raRecentGames.innerHTML = '';

        if (!data.recent_games?.length) {
            raRecentGames.innerHTML = '<p class="text-muted mb-0">Nenhum jogo recente encontrado.</p>';
        } else {
            data.recent_games.forEach((game) => {
                const item = document.createElement('article');
                item.className = 'ra-game-card';
                const image = game.image
                    ? `<img src="${escapeAttribute(game.image)}" alt="">`
                    : '<i class="bi bi-steam ra-achievement-icon" aria-hidden="true"></i>';
                item.innerHTML = `
                    ${image}
                    <div>
                        <strong>${escapeHtml(game.title)}</strong>
                        <small>${formatNumber(game.playtime_2weeks)} min recentes · ${formatNumber(game.playtime_forever)} min totais</small>
                    </div>
                `;
                raRecentGames.appendChild(item);
            });
        }
    }
}

async function loadRetroAchievementsProfile() {
    activeProfileSource = 'week';

    if (!window.pywebview || !window.pywebview.api?.obter_retroachievements_perfil) {
        showRaError('O launcher desktop ainda não está pronto.');
        return;
    }

    showRaError('');

    try {
        const response = await window.pywebview.api.obter_retroachievements_perfil();

        if (!response.ok) {
            raProfilePanel?.classList.add('d-none');
            raConfigCard?.classList.remove('is-compact');
            showRaError(response.message);
            return;
        }

        renderRetroAchievementsProfile(response);
    } catch (error) {
        showRaError(`Erro ao carregar conquistas: ${error}`);
    }
}

async function loadRetroAchievementsUser() {
    activeProfileSource = 'retro';

    if (!window.pywebview || !window.pywebview.api?.obter_retroachievements_usuario) {
        showRaError('O launcher desktop ainda não está pronto.');
        return;
    }

    showRaError('');

    try {
        const response = await window.pywebview.api.obter_retroachievements_usuario(getRetroAchievementsUsername());

        if (!response.ok) {
            raProfilePanel?.classList.add('d-none');
            raConfigCard?.classList.remove('is-compact');
            showRaError(response.message);
            return;
        }

        renderRetroAchievementsProfile(response);
    } catch (error) {
        showRaError(`Erro ao carregar perfil RetroAchievements: ${error}`);
    }
}

async function loadSteamProfile() {
    activeProfileSource = 'steam';

    if (!window.pywebview || !window.pywebview.api?.obter_steam_usuario) {
        showRaError('O launcher desktop ainda não está pronto.');
        return;
    }

    showRaError('');

    try {
        const response = await window.pywebview.api.obter_steam_usuario(getSteamUsername());

        if (!response.ok) {
            raProfilePanel?.classList.add('d-none');
            raConfigCard?.classList.remove('is-compact');
            showRaError(response.message);
            return;
        }

        renderSteamProfile(response);
    } catch (error) {
        showRaError(`Erro ao carregar perfil Steam: ${error}`);
    }
}

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

function getKeyboardButtons() {
    return Array.from(currentVirtualKeyboard?.querySelectorAll('.virtual-key') || []);
}

function setActiveKeyboardInput(input) {
    activeKeyboardInput = input || steamGameName;
    [steamGameName, steamAppId, steamApiKey, romDisplayNameInput].forEach((item) => {
        item?.classList.toggle('is-keyboard-active', item === activeKeyboardInput);
    });
    activeKeyboardInput?.focus({ preventScroll: true });
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

function useVirtualKeyboard(context = 'steam') {
    activeKeyboardContext = context;
    currentVirtualKeyboard = context === 'rom' ? romRenameKeyboard : addSteamVirtualKeyboard;
}

function buildVirtualKeyboard(context = activeKeyboardContext) {
    useVirtualKeyboard(context);

    if (!currentVirtualKeyboard || currentVirtualKeyboard.dataset.ready === '1') {
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

        currentVirtualKeyboard.appendChild(rowElement);
    });

    currentVirtualKeyboard.dataset.ready = '1';
    updateKeyboardLabels();
}

function isRomRenameKeyboardOpen() {
    return Boolean(
        trailerModalElement?.classList.contains('show')
        && selectedModalGame?.tipo === 'rom'
        && !romRenamePanel?.classList.contains('d-none')
    );
}

function isVirtualKeyboardOpen() {
    return Boolean(addSteamModalElement?.classList.contains('show') || isRomRenameKeyboardOpen());
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
    const input = activeKeyboardInput || steamGameName;
    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? input.value.length;

    input.value = `${input.value.slice(0, start)}${text}${input.value.slice(end)}`;
    input.focus({ preventScroll: true });
    input.setSelectionRange(start + text.length, start + text.length);
    input.dispatchEvent(new Event('input', { bubbles: true }));
}

function backspaceActiveInput() {
    const input = activeKeyboardInput || steamGameName;
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
    const input = activeKeyboardInput || steamGameName;
    const current = input.selectionStart ?? input.value.length;
    const next = Math.max(0, Math.min(input.value.length, current + offset));

    input.focus({ preventScroll: true });
    input.setSelectionRange(next, next);
}

function toggleKeyboardField() {
    const fields = activeKeyboardContext === 'rom'
        ? [romDisplayNameInput].filter(Boolean)
        : [steamGameName, steamAppId, steamApiKey].filter(Boolean);
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
        if (activeKeyboardContext === 'rom') {
            salvarNomeRomSelecionada();
        } else {
            addSteamForm?.requestSubmit();
        }
    } else {
        insertIntoActiveInput(getKeyboardCharacter(button.dataset.value || ''));
    }

    return true;
}

function launcherKeyboardShortcut(action) {
    if (!isVirtualKeyboardOpen()) {
        return false;
    }

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
        if (activeKeyboardContext === 'rom') {
            salvarNomeRomSelecionada();
        } else {
            addSteamForm?.requestSubmit();
        }
    } else {
        return false;
    }

    return true;
}

function getGameDestination(game) {
    if (game.tipo === 'steam') {
        return game.app_id || '';
    }

    return game.caminho || '';
}

function getFileInputPath(input) {
    const file = input?.files?.[0];
    if (file) {
        const selectedPath = window.launcherAPI?.getPathForFile?.(file) || file.path || input.value || '';
        input.dataset.selectedPath = selectedPath;
        return selectedPath;
    }

    return input?.dataset?.selectedPath || '';
}

function formatSelectedPath(path, fallback) {
    if (!path) {
        return fallback;
    }

    return String(path).split(/[\\/]/).filter(Boolean).pop() || path;
}

function updateFileDisplay(input, display, fallback, isDirectory = false) {
    if (!input || !display) {
        return;
    }

    const selectedPath = isDirectory ? getDirectoryInputPath(input) : getFileInputPath(input);
    display.value = formatSelectedPath(selectedPath, fallback);
    display.title = selectedPath || '';
}

function resetPathInputDisplay(input, display, fallback, selectedPath = '') {
    if (input) {
        input.dataset.selectedPath = selectedPath;
    }

    if (display) {
        display.value = formatSelectedPath(selectedPath, fallback);
        display.title = selectedPath || '';
    }
}

function getDirectoryInputPath(input) {
    const file = input?.files?.[0];
    if (!file) {
        return input?.dataset?.selectedPath || '';
    }

    const selectedFilePath = window.launcherAPI?.getPathForFile?.(file) || file.path || '';
    const relativePath = file.webkitRelativePath || '';
    const relativeParts = relativePath.split(/[\\/]/).filter(Boolean);
    const selectedRootName = relativeParts[0] || '';
    const selectedRootParent = relativePath && selectedFilePath.endsWith(relativePath)
        ? selectedFilePath.slice(0, -relativePath.length).replace(/[\\/]+$/, '')
        : '';
    const directoryPath = selectedRootParent && selectedRootName
        ? `${selectedRootParent}/${selectedRootName}`
        : selectedFilePath.replace(/[\\/][^\\/]*$/, '');

    input.dataset.selectedPath = directoryPath;
    return directoryPath;
}

retroarchPath?.addEventListener('change', () => {
    updateFileDisplay(retroarchPath, retroarchPathDisplay, 'Nenhum arquivo selecionado');
});

retroarchCorePath?.addEventListener('change', () => {
    updateFileDisplay(retroarchCorePath, retroarchCorePathDisplay, 'Nenhum arquivo selecionado');
});

romsPath?.addEventListener('change', () => {
    updateFileDisplay(romsPath, romsPathDisplay, 'Nenhuma pasta selecionada', true);
});

function openEmulatorForm(emulator = null) {
    editingEmulatorId = emulator?.emulador_id || emulator?.emulatorId || emulator?.id || null;
    showAddEmulatorError('');
    addEmulatorForm?.reset();
    resetPathInputDisplay(retroarchPath, retroarchPathDisplay, 'Nenhum arquivo selecionado');
    resetPathInputDisplay(retroarchCorePath, retroarchCorePathDisplay, 'Nenhum arquivo selecionado');
    resetPathInputDisplay(romsPath, romsPathDisplay, 'Nenhuma pasta selecionada');

    if (addEmulatorTitle) {
        addEmulatorTitle.innerHTML = editingEmulatorId
            ? '<i class="bi bi-cpu me-2 text-primary"></i>Editar emulador RetroArch'
            : '<i class="bi bi-cpu me-2 text-primary"></i>Adicionar emulador RetroArch';
    }

    if (saveEmulatorButton) {
        const label = saveEmulatorButton.querySelector('span:last-child');
        if (label) {
            label.textContent = editingEmulatorId ? 'Salvar' : 'Adicionar';
        }
    }

    if (emulator) {
        emulatorName.value = emulator.emulador || emulator.nome || emulator.name || '';
        resetPathInputDisplay(retroarchPath, retroarchPathDisplay, 'Nenhum arquivo selecionado', emulator.retroarch_path || emulator.retroArchPath || '');
        resetPathInputDisplay(retroarchCorePath, retroarchCorePathDisplay, 'Nenhum arquivo selecionado', emulator.core_path || emulator.corePath || emulator.core || '');
        resetPathInputDisplay(romsPath, romsPathDisplay, 'Nenhuma pasta selecionada', emulator.roms_path || emulator.romsPath || '');
        if (romExtensions) {
            romExtensions.value = Array.isArray(emulator.extensions) ? emulator.extensions.join(', ') : (emulator.extensions || '.sfc, .smc, .zip');
        }
    } else if (romExtensions) {
        romExtensions.value = '.sfc, .smc, .zip';
    }

    addEmulatorModal?.show();
    window.setTimeout(() => emulatorName?.focus(), 150);
}

function openGameForm(game = null) {
    editingGameId = game?.id || null;
    showAddSteamError('');
    addSteamForm?.reset();
    buildVirtualKeyboard('steam');
    loadSteamApiStatus();
    keyboardShift = false;
    selectedKeyboardIndex = 0;
    useVirtualKeyboard('steam');
    setActiveKeyboardInput(steamGameName);
    updateKeyboardLabels();

    if (addSteamTitle) {
        addSteamTitle.innerHTML = game
            ? '<i class="bi bi-pencil-square me-2 text-primary"></i>Editar jogo'
            : '<i class="bi bi-plus-circle me-2 text-primary"></i>Adicionar jogo';
    }

    if (saveSteamGameButton) {
        const label = saveSteamGameButton.querySelector('span:last-child');
        if (label) {
            label.textContent = game ? 'Salvar' : 'Adicionar';
        }
    }

    if (game) {
        steamGameName.value = game.nome;
        steamAppId.value = getGameDestination(game);
        if (steamGameCategory) {
            steamGameCategory.value = normalizeCategory(game.categoria);
        }
    } else if (steamGameCategory) {
        steamGameCategory.value = 'Outros';
    }

    addSteamModal?.show();
    window.setTimeout(() => {
        setActiveKeyboardInput(steamGameName);
        updateKeyboardSelection(false);
    }, 150);
}

function getSteamImage(appId) {
    return `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${appId}/header.jpg`;
}

function getExecutableImage() {
    const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 460 215">
            <defs>
                <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
                    <stop offset="0" stop-color="#101827"/>
                    <stop offset="1" stop-color="#0d8ce8"/>
                </linearGradient>
            </defs>
            <rect width="460" height="215" fill="url(#bg)"/>
            <circle cx="230" cy="92" r="40" fill="rgba(255,255,255,.16)"/>
            <path d="M210 76h40v31h-40zM198 107h64v22h-64z" fill="white" opacity=".9"/>
            <text x="230" y="168" fill="white" font-family="Segoe UI, Arial" font-size="24" font-weight="700" text-anchor="middle">Jogo local</text>
        </svg>
    `;

    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function getRomImage(game) {
    const emulator = escapeHtml(game.emulador || 'RetroArch');
    const extension = escapeHtml((game.extensao || 'ROM').replace('.', '').toUpperCase());
    const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 460 215">
            <defs>
                <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
                    <stop offset="0" stop-color="#1a2f24"/>
                    <stop offset="0.55" stop-color="#0f766e"/>
                    <stop offset="1" stop-color="#f59e0b"/>
                </linearGradient>
            </defs>
            <rect width="460" height="215" rx="0" fill="url(#bg)"/>
            <rect x="145" y="46" width="170" height="92" rx="16" fill="rgba(0,0,0,.28)" stroke="rgba(255,255,255,.35)" stroke-width="4"/>
            <circle cx="190" cy="92" r="18" fill="rgba(255,255,255,.9)"/>
            <path d="M260 76v32M244 92h32" stroke="white" stroke-width="10" stroke-linecap="round"/>
            <text x="230" y="166" fill="white" font-family="Segoe UI, Arial" font-size="25" font-weight="800" text-anchor="middle">${emulator}</text>
            <text x="230" y="190" fill="rgba(255,255,255,.78)" font-family="Segoe UI, Arial" font-size="17" font-weight="700" text-anchor="middle">${extension}</text>
        </svg>
    `;

    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function getLutrisImage() {
    const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="460" height="215" viewBox="0 0 460 215">
            <defs>
                <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="#111827"/>
                    <stop offset="50%" stop-color="#0f766e"/>
                    <stop offset="100%" stop-color="#f59e0b"/>
                </linearGradient>
            </defs>
            <rect width="460" height="215" rx="0" fill="url(#bg)"/>
            <circle cx="230" cy="88" r="44" fill="rgba(255,255,255,.18)" stroke="rgba(255,255,255,.45)" stroke-width="4"/>
            <path d="M205 88h50M230 63v50M204 88c0 0-16-22-36-8M256 88c0 0 16-22 36-8" stroke="white" stroke-width="9" stroke-linecap="round"/>
            <text x="230" y="170" fill="white" font-family="Segoe UI, Arial" font-size="28" font-weight="900" text-anchor="middle">Lutris</text>
        </svg>
    `;

    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function getGameImage(game) {
    if (game.imagem) {
        return game.imagem;
    }

    if (game.tipo === 'steam' && game.app_id) {
        return getSteamImage(game.app_id);
    }

    if (game.tipo === 'lutris') {
        return getLutrisImage();
    }

    if (game.tipo === 'rom') {
        return getRomImage(game);
    }

    return getExecutableImage();
}

function escapeHtml(value) {
    const element = document.createElement('div');
    element.textContent = value;
    return element.innerHTML;
}

function escapeAttribute(value) {
    return escapeHtml(value).replaceAll('"', '&quot;');
}

function withUiTimeout(promise, ms, message) {
    let timeoutId = null;
    const timeoutPromise = new Promise((_, reject) => {
        timeoutId = window.setTimeout(() => reject(new Error(message)), ms);
    });

    return Promise.race([promise, timeoutPromise]).finally(() => {
        window.clearTimeout(timeoutId);
    });
}

function formatProtonTier(tier) {
    const normalizedTier = String(tier || '').trim();
    if (!normalizedTier) {
        return 'Unknown';
    }

    return normalizedTier.charAt(0).toUpperCase() + normalizedTier.slice(1);
}

function isLinuxCompatibleTier(tier) {
    return ['platinum', 'gold', 'silver'].includes(String(tier || '').toLowerCase());
}

function setProtonTierBadgeStyle(tierBadge, tier) {
    const normalizedTier = String(tier || 'unknown').trim().toLowerCase();

    tierBadge.classList.remove(
        'proton-badge',
        'platinum',
        'gold',
        'silver',
        'bronze',
        'borked',
        'unknown',
        'proton-tier-platinum',
        'proton-tier-gold',
        'proton-tier-silver',
        'proton-tier-bronze',
        'proton-tier-borked',
        'proton-tier-pending'
    );

    tierBadge.classList.add('proton-badge', normalizedTier || 'unknown', `proton-tier-${normalizedTier || 'pending'}`);
}

function setCardProtonTier(game, card, tier) {
    const normalizedTier = String(tier || 'unknown').trim().toLowerCase() || 'unknown';
    card.dataset.protonTier = normalizedTier;
}

async function loadProtonDbTierForCard(game, card) {
    const tierBadge = card?.querySelector('.game-proton-tier');
    const appId = String(game?.app_id || '').trim();

    if (!tierBadge || game?.tipo !== 'steam' || !/^\d+$/.test(appId) || !window.pywebview?.api?.obter_protondb_resumo) {
        if (card) {
            card.dataset.protonTier = 'unknown';
        }
        tierBadge?.classList.add('d-none');
        return;
    }

    card.dataset.protonTier = card.dataset.protonTier || 'unknown';
    setProtonTierBadgeStyle(tierBadge, card.dataset.protonTier);
    tierBadge.textContent = `ProtonDB: ${formatProtonTier(card.dataset.protonTier)}`;
    tierBadge.classList.remove('d-none');

    try {
        let response = protonDbTierCache.get(appId);
        if (!response) {
            response = await window.pywebview.api.obter_protondb_resumo(appId);
            protonDbTierCache.set(appId, response);
        }

        const tier = response?.tier || response?.bestReportedTier || 'unknown';

        setCardProtonTier(game, card, response?.ok ? tier : 'unknown');
        setProtonTierBadgeStyle(tierBadge, tier);
        tierBadge.textContent = `ProtonDB: ${formatProtonTier(tier)}`;
        tierBadge.title = `Confiança: ${response.confidence || '-'} | Total: ${response.total || 0}`;
        if (activeCategoryFilter === 'Linux') {
            applyCategoryFilter(activeCategoryFilter, false);
        }
    } catch (error) {
        console.warn('Nao foi possivel carregar ProtonDB:', error);
        setCardProtonTier(game, card, 'unknown');
        setProtonTierBadgeStyle(tierBadge, 'unknown');
        tierBadge.textContent = 'ProtonDB: Unknown';
    }
}

async function loadSteamGridDbCoverForCard(game, image) {
    const appId = String(game?.app_id || '').trim();
    if (!image || game?.imagem || game?.tipo !== 'steam' || !/^\d+$/.test(appId) || !window.pywebview?.api?.obter_steamgriddb_capa) {
        return;
    }

    try {
        if (steamGridDbConfigured === null) {
            const config = await window.pywebview.api.obter_steamgriddb_config?.();
            steamGridDbConfigured = Boolean(config?.configured || config?.steamgriddb_api_configured);
        }

        if (!steamGridDbConfigured) {
            return;
        }

        let response = steamGridDbCoverCache.get(appId);
        if (!response) {
            response = await window.pywebview.api.obter_steamgriddb_capa(appId);
            steamGridDbCoverCache.set(appId, response);
        }

        if (response?.ok && response.image) {
            image.src = response.image;
        }
    } catch (error) {
        console.warn('Nao foi possivel carregar capa SteamGridDB:', error);
    }
}

function createSteamGameCard(game) {
    if (!gameGrid) {
        return;
    }

    game.categoria = normalizeCategory(game.categoria);
    const existingCard = document.querySelector(`[data-game-id="${game.id}"]`);
    addedGames.set(game.id, game);

    if (existingCard) {
        const existingColumn = existingCard.closest('[data-game-column-id]');
        if (existingColumn) {
            existingColumn.dataset.gameCategory = game.categoria;
            existingColumn.classList.add('d-none');
        }

        existingCard.dataset.gameType = game.tipo;
        existingCard.dataset.gameCategory = game.categoria;
        existingCard.dataset.installed = game.installed === false ? 'false' : 'true';
        existingCard.dataset.installRequired = game.install_required ? 'true' : 'false';

        if (game.app_id) {
            existingCard.dataset.steamAppId = game.app_id;
        }

        const image = existingCard.querySelector('img');
        if (image) {
            image.alt = game.nome;
            image.src = getGameImage(game);
            loadSteamGridDbCoverForCard(game, image);
        }

        const title = existingCard.querySelector('h6');
        if (title) {
            title.textContent = game.nome;
        }

        const categoryBadge = existingCard.querySelector('.game-category-badge');
        if (categoryBadge) {
            categoryBadge.textContent = game.categoria;
        }

        loadProtonDbTierForCard(game, existingCard);

        const playtimeBadge = existingCard.querySelector('.game-card-playtime');
        if (playtimeBadge) {
            playtimeBadge.textContent = game.tipo === 'steam' ? formatPlaytime(game.playtime_forever) : '';
            playtimeBadge.classList.toggle('d-none', game.tipo !== 'steam');
        }

        let installBadge = existingCard.querySelector('.game-install-badge');
        if (!installBadge) {
            installBadge = document.createElement('span');
            existingCard.querySelector('.p-3')?.appendChild(installBadge);
        }
        if (installBadge) {
            installBadge.textContent = isSteamGameNotInstalled(game) ? 'Não instalado' : 'Instalado';
            installBadge.className = `game-install-badge ${isSteamGameNotInstalled(game) ? 'not-installed' : 'installed'}`;
            installBadge.classList.toggle('d-none', game.tipo !== 'steam');
        }

        applyCategoryFilter(activeCategoryFilter, false);

        return;
    }

    const column = document.createElement('div');
    column.className = 'col';
    column.dataset.gameColumnId = game.id;
    column.dataset.gameCategory = game.categoria;
    column.classList.add('d-none');

    const card = document.createElement('div');
    card.className = `game-card h-100 shadow-sm${game.tipo === 'rom' ? ' rom-card' : ''}`;
    card.dataset.gameId = game.id;
    card.dataset.gameType = game.tipo;
    card.dataset.gameCategory = game.categoria;
    card.dataset.protonTier = 'unknown';
    card.dataset.installed = game.installed === false ? 'false' : 'true';
    card.dataset.installRequired = game.install_required ? 'true' : 'false';

    if (game.app_id) {
        card.dataset.steamAppId = game.app_id;
    }

    const thumb = document.createElement('div');
    thumb.className = 'game-thumb-container';

    const image = document.createElement('img');
    image.className = 'card-img-top';
    image.alt = game.nome;
    image.src = getGameImage(game);
    loadSteamGridDbCoverForCard(game, image);

    const overlay = document.createElement('div');
    overlay.className = 'image-overlay';
    overlay.innerHTML = '<div class="play-circle"><i class="bi bi-play-fill"></i></div>';

    const body = document.createElement('div');
    body.className = 'p-3 text-center';

    const title = document.createElement('h6');
    title.className = 'fw-bold text-dark mb-0';
    title.textContent = game.nome;

    const protonTierBadge = document.createElement('span');
    protonTierBadge.className = 'game-proton-tier d-none';

    const categoryBadge = document.createElement('span');
    categoryBadge.className = 'game-category-badge';
    categoryBadge.textContent = game.categoria;

    const installBadge = document.createElement('span');
    installBadge.className = `game-install-badge ${isSteamGameNotInstalled(game) ? 'not-installed' : 'installed'}`;
    installBadge.textContent = isSteamGameNotInstalled(game) ? 'Não instalado' : 'Instalado';
    installBadge.classList.toggle('d-none', game.tipo !== 'steam');

    const playtimeBadge = document.createElement('span');
    playtimeBadge.className = 'game-card-playtime';
    playtimeBadge.textContent = game.tipo === 'steam' ? formatPlaytime(game.playtime_forever) : '';
    playtimeBadge.classList.toggle('d-none', game.tipo !== 'steam');

    body.append(title, protonTierBadge, categoryBadge, installBadge, playtimeBadge);
    thumb.append(image, overlay);
    card.append(thumb, body);
    loadProtonDbTierForCard(game, card);
    card.addEventListener('click', () => {
        openAddedGame(addedGames.get(game.id) || game, image.src);
    });

    column.appendChild(card);
    gameGrid.appendChild(column);
}

function removeAddedGameCard(gameId) {
    addedGames.delete(gameId);
    document.querySelector(`[data-game-column-id="${gameId}"]`)?.remove();
}

function removeRomCardsByEmulator(emulatorId) {
    Array.from(addedGames.values())
        .filter((game) => game.tipo === 'rom' && (game.emulador_id === emulatorId || game.emulatorId === emulatorId))
        .forEach((game) => removeAddedGameCard(game.id));
}

async function loadSteamGames() {
    if (!launcherEntered) {
        return;
    }

    updateLibraryCount();

    if (!window.pywebview || !window.pywebview.api?.listar_jogos) {
        return;
    }

    try {
        const games = await withUiTimeout(
            window.pywebview.api.listar_jogos(),
            12000,
            'O carregamento da biblioteca demorou demais.'
        );
        games
            .filter((game) =>
                game.tipo === 'steam' ||
                game.tipo === 'executavel' ||
                game.tipo === 'lutris' ||
                game.tipo === 'rom'
            )
            .forEach(createSteamGameCard);
        applyCategoryFilter(activeCategoryFilter, false);
        updateLibraryCount();
        updateNavigationSelection(false);
    } catch (error) {
        console.warn('Nao foi possivel carregar jogos da Steam:', error);
    }
}

function getTrailerModalActions() {
    if (profileSourceModalElement?.classList.contains('show')) {
        return [openRetroAchievementsProfile, openSteamProfile, document.querySelector('#profileSourceModal [data-bs-dismiss="modal"]')]
            .filter((button) => button && !button.classList.contains('d-none'));
    }

    if (!document.getElementById('trailerModal')?.classList.contains('show')) {
        return [];
    }

    return [startGameButton, editGameButton, renameRomButton, editEmulatorButton, deleteGameButton, document.querySelector('#trailerModal [data-bs-dismiss="modal"]')]
        .filter((button) => button && !button.classList.contains('d-none'));
}

function updateModalActionSelection(scrollIntoView = true) {
    const actions = getTrailerModalActions();

    if (!actions.length) {
        return;
    }

    selectedModalActionIndex = Math.max(0, Math.min(actions.length - 1, selectedModalActionIndex));

    actions.forEach((button, index) => {
        const isSelected = index === selectedModalActionIndex;
        button.classList.toggle('is-controller-selected', isSelected);
        button.setAttribute('tabindex', isSelected ? '0' : '-1');
    });

    const selectedAction = actions[selectedModalActionIndex];
    selectedAction.focus({ preventScroll: true });

    if (scrollIntoView) {
        selectedAction.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    }
}

function clearModalActionSelection() {
    getTrailerModalActions().forEach((button) => {
        button.classList.remove('is-controller-selected');
        button.setAttribute('tabindex', '-1');
    });
}

function launcherNavigateModal(direction) {
    const actions = getTrailerModalActions();

    if (!actions.length) {
        return false;
    }

    if (direction === 'left' || direction === 'up') {
        selectedModalActionIndex -= 1;
    } else if (direction === 'right' || direction === 'down') {
        selectedModalActionIndex += 1;
    }

    selectedModalActionIndex = Math.max(0, Math.min(actions.length - 1, selectedModalActionIndex));
    updateModalActionSelection();
    return true;
}

function launcherActivateModal() {
    const actions = getTrailerModalActions();

    if (!actions.length) {
        return false;
    }

    actions[selectedModalActionIndex]?.click();
    return true;
}

function activateControllerConfirm() {
    return false;
}

function launcherNavigate(direction) {
    if (window.isControllerAlertOpen?.()) {
        return;
    }

    if (introActive) {
        return;
    }

    if (profileSelectionActive) {
        navigateProfileSelection(direction);
        return;
    }

    if (addSteamModalElement?.classList.contains('show')) {
        useVirtualKeyboard('steam');
        moveVirtualKeyboardSelection(direction);
        return;
    }

    if (isRomRenameKeyboardOpen()) {
        useVirtualKeyboard('rom');
        moveVirtualKeyboardSelection(direction);
        return;
    }

    if (addEmulatorModalElement?.classList.contains('show')) {
        return;
    }

    if (profileSourceModalElement?.classList.contains('show')) {
        launcherNavigateModal(direction);
        return;
    }

    if (profileAchievementsModalElement?.classList.contains('show')) {
        return;
    }

    if (launcherNavigateModal(direction)) {
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
            sidebar.hide();
            setNavigationArea('games', selectedGameIndex);
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
            setNavigationArea('categories', selectedCategoryIndex);
            return;
        }

        selectedNavbarIndex = Math.max(0, Math.min(navbarItems.length - 1, selectedNavbarIndex));
        updateNavigationSelection();
        return;
    }

    if (navigationArea === 'categories') {
        const categoryButtons = getCategoryButtons();

        if (!categoryButtons.length) {
            setNavigationArea('games', selectedGameIndex);
            return;
        }

        if (direction === 'left') {
            selectedCategoryIndex -= 1;
        } else if (direction === 'right') {
            selectedCategoryIndex += 1;
        } else if (direction === 'up') {
            setNavigationArea('navbar', getAddGameNavbarIndex());
            return;
        } else if (direction === 'down' && getGameCards().length) {
            setNavigationArea('games', selectedGameIndex);
            return;
        }

        selectedCategoryIndex = Math.max(0, Math.min(categoryButtons.length - 1, selectedCategoryIndex));
        updateNavigationSelection();
        return;
    }

    const cards = getGameCards();

    if (!cards.length) {
        setNavigationArea('categories', selectedCategoryIndex);
        return;
    }

    const columns = getCurrentGameColumns(cards);

    if (direction === 'up' && selectedGameIndex - columns < 0) {
        setNavigationArea('categories', selectedCategoryIndex);
        return;
    }

    if (direction === 'left') {
        selectedGameIndex -= 1;
    } else if (direction === 'right') {
        selectedGameIndex += 1;
    } else if (direction === 'up') {
        selectedGameIndex -= columns;
    } else if (direction === 'down') {
        selectedGameIndex += columns;
    }

    selectedGameIndex = Math.max(0, Math.min(cards.length - 1, selectedGameIndex));
    updateNavigationSelection();
}

function launcherActivate() {
    if (window.handleControllerAlertAction?.('confirm')) {
        return;
    }

    if (activateControllerConfirm()) {
        return;
    }

    if (introActive) {
        finishIntro();
        return;
    }

    if (profileSelectionActive) {
        getProfileSelectionItems()[selectedProfileIndex]?.click();
        return;
    }

    const modalIsOpen = document.getElementById('trailerModal').classList.contains('show');

    if (modalIsOpen) {
        launcherActivateModal();
        return;
    }

    if (navigationArea === 'navbar') {
        const navbarItems = getNavbarItems();
        navbarItems[selectedNavbarIndex]?.click();
        return;
    }

    if (navigationArea === 'categories') {
        const categoryButtons = getCategoryButtons();
        categoryButtons[selectedCategoryIndex]?.click();
        return;
    }

    if (navigationArea === 'sidebar' && isSidebarOpen()) {
        const sidebarItems = getSidebarItems();
        const selectedItem = sidebarItems[selectedSidebarIndex];

        if (selectedItem?.dataset.sidebarAction === 'games') {
            sidebar.hide();
            setNavigationArea('games', selectedGameIndex);
            return;
        }

        selectedItem?.click();
        return;
    }

    const cards = getGameCards();
    if (cards[selectedGameIndex]) {
        cards[selectedGameIndex].click();
    }
}

function launcherModalAction(action) {
    if (window.handleControllerAlertAction?.(action)) {
        return true;
    }

    if (introActive) {
        if (action === 'confirm') {
            finishIntro();
            return true;
        }

        return false;
    }

    if (profileSelectionActive) {
        if (action === 'confirm') {
            getProfileSelectionItems()[selectedProfileIndex]?.click();
            return true;
        }

        return true;
    }

    if (addSteamModalElement?.classList.contains('show')) {
        if (action === 'confirm') {
            useVirtualKeyboard('steam');
            pressVirtualKeyboardKey();
            return true;
        }

        if (action === 'back') {
            addSteamModal?.hide();
            return true;
        }

        return false;
    }

    if (addEmulatorModalElement?.classList.contains('show')) {
        if (action === 'confirm') {
            addEmulatorForm?.requestSubmit();
            return true;
        }

        if (action === 'back') {
            addEmulatorModal?.hide();
            return true;
        }

        return false;
    }

    if (addLutrisModalElement?.classList.contains('show')) {
        if (action === 'confirm') {
            addLutrisForm?.requestSubmit();
            return true;
        }

        if (action === 'back') {
            addLutrisModal?.hide();
            return true;
        }

        return false;
    }

    if (profileSourceModalElement?.classList.contains('show')) {
        if (action === 'confirm') {
            return launcherActivateModal();
        }

        if (action === 'back') {
            clearModalActionSelection();
            profileSourceModal?.hide();
            return true;
        }

        return false;
    }

    if (profileAchievementsModalElement?.classList.contains('show')) {
        if (action === 'back') {
            profileAchievementsModal?.hide();
            return true;
        }

        return false;
    }

    if (isRomRenameKeyboardOpen()) {
        if (action === 'confirm') {
            useVirtualKeyboard('rom');
            pressVirtualKeyboardKey();
            return true;
        }

        if (action === 'back') {
            romRenamePanel?.classList.add('d-none');
            updateModalActionSelection(false);
            return true;
        }

        return false;
    }

    const modalElement = document.getElementById('trailerModal');

    if (!modalElement.classList.contains('show')) {
        return false;
    }

    if (action === 'confirm') {
        launcherActivateModal();
        return true;
    }

    if (action === 'back') {
        trailerModal.hide();
        return true;
    }

    return false;
}

function launcherBack() {
    if (window.handleControllerAlertAction?.('back')) {
        return;
    }

    if (introActive) {
        finishIntro();
        return;
    }

    if (profileSelectionActive) {
        return;
    }

    if (launcherModalAction('back')) {
        return;
    }

    if (isSidebarOpen()) {
        sidebar.hide();
        setNavigationArea('games', selectedGameIndex);
    }
}

function launcherToggleTheme() {
    if (introActive) {
        return;
    }

    const currentTheme = document.documentElement.dataset.theme || 'dark';
    applyTheme(currentTheme === 'dark' ? 'light' : 'dark');
}

updateNavigationSelection(false);

sidebarElement.addEventListener('shown.bs.offcanvas', () => {
    setNavigationArea('sidebar', selectedSidebarIndex, false);
});

sidebarElement.addEventListener('hidden.bs.offcanvas', () => {
    if (navigationArea === 'sidebar') {
        setNavigationArea('games', selectedGameIndex, false);
    }
});

profileSourceModalElement?.addEventListener('shown.bs.modal', () => {
    selectedModalActionIndex = 0;
    updateModalActionSelection(false);
});

profileSourceModalElement?.addEventListener('hidden.bs.modal', () => {
    clearModalActionSelection();
    selectedModalActionIndex = 0;
});

sidebarElement.addEventListener('shown.bs.dropdown', () => {
    if (navigationArea === 'sidebar') {
        updateNavigationSelection(false);
    }
});

sidebarElement.addEventListener('hidden.bs.dropdown', () => {
    if (navigationArea === 'sidebar') {
        updateNavigationSelection(false);
    }
});

function readGamepadDirection(gamepad) {
    const axisX = gamepad.axes[0] || 0;
    const axisY = gamepad.axes[1] || 0;
    const dpadUp = gamepad.buttons[12]?.pressed;
    const dpadDown = gamepad.buttons[13]?.pressed;
    const dpadLeft = gamepad.buttons[14]?.pressed;
    const dpadRight = gamepad.buttons[15]?.pressed;

    if (dpadUp || axisY < -0.65) {
        return 'up';
    }
    if (dpadDown || axisY > 0.65) {
        return 'down';
    }
    if (dpadLeft || axisX < -0.65) {
        return 'left';
    }
    if (dpadRight || axisX > 0.65) {
        return 'right';
    }

    return null;
}

function getControllerScrollTarget() {
    if (profileAchievementsModalElement?.classList.contains('show')) {
        return profileAchievementsModalElement.querySelector('.modal-body');
    }

    if (isRomRenameKeyboardOpen()) {
        return trailerModalElement?.querySelector('.modal-body');
    }

    return null;
}

function scrollModalWithAnalog(gamepad) {
    const target = getControllerScrollTarget();

    if (!target) {
        return;
    }

    const leftAxisY = gamepad.axes[1] || 0;
    const rightAxisY = gamepad.axes[3] || 0;
    const axisY = isRomRenameKeyboardOpen()
        ? rightAxisY
        : (Math.abs(rightAxisY) > Math.abs(leftAxisY) ? rightAxisY : leftAxisY);

    if (Math.abs(axisY) < 0.18) {
        return;
    }

    target.scrollTop += axisY * 18;
}

function isGamepadNeutral(gamepad, direction) {
    const anyButtonPressed = gamepad.buttons.some((button) => button.pressed);
    const axisX = Math.abs(gamepad.axes[0] || 0);
    const axisY = Math.abs(gamepad.axes[1] || 0);

    return !anyButtonPressed && !direction && axisX < 0.25 && axisY < 0.25;
}

function runControllerAction(action) {
    try {
        action();
    } catch (error) {
        console.warn('Erro ao processar acao do controle:', error);
    }
}

function startHtmlGamepadControl() {
    let previousButtons = [];
    let previousDirection = null;
    let lastMove = 0;
    let observedResetToken = launcherControllerResetToken;

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
            const launcherFocusShortcutPressed = isLauncherFocusShortcutPressed(gamepad);
            const launcherFocusShortcutJustPressed = launcherFocusShortcutPressed && !wasLauncherFocusShortcutPressed(previousButtons);

            if (observedResetToken !== launcherControllerResetToken || now < launcherControllerInputResetUntil) {
                observedResetToken = launcherControllerResetToken;
                previousDirection = direction;
                previousButtons = gamepad.buttons.map((button) => button.pressed);
                requestAnimationFrame(loop);
                return;
            }

            if (launcherControllerPaused) {
                if (launcherFocusShortcutJustPressed) {
                    requestLauncherFocusFromShortcut(now);
                }

                previousDirection = direction;
                previousButtons = gamepad.buttons.map((button) => button.pressed);
                requestAnimationFrame(loop);
                return;
            }

            if (window.isControllerAlertInputLocked?.()) {
                previousDirection = direction;
                previousButtons = gamepad.buttons.map((button) => button.pressed);
                requestAnimationFrame(loop);
                return;
            }

            if (launcherControllerResumeLocked || now < launcherControllerResumeLockedUntil) {
                previousDirection = direction;
                previousButtons = gamepad.buttons.map((button) => button.pressed);

                if (now >= launcherControllerResumeLockedUntil && isGamepadNeutral(gamepad, direction)) {
                    launcherControllerResumeLocked = false;
                }

                requestAnimationFrame(loop);
                return;
            }

            if (now - lastNativeGamepadInputAt < 700) {
                previousDirection = direction;
                previousButtons = gamepad.buttons.map((button) => button.pressed);
                requestAnimationFrame(loop);
                return;
            }

            const keyboardOpen = isVirtualKeyboardOpen();
            const repeatDelay = keyboardOpen ? 95 : 240;
            scrollModalWithAnalog(gamepad);

            if (direction && (direction !== previousDirection || now - lastMove > repeatDelay)) {
                runControllerAction(() => launcherNavigate(direction));
                lastMove = now;
            }

            if (keyboardOpen) {
                if (pressedOnce(gamepad, 2)) {
                    runControllerAction(() => launcherKeyboardShortcut('backspace'));
                }

                if (pressedOnce(gamepad, 3)) {
                    runControllerAction(() => launcherKeyboardShortcut('field'));
                }

                if (pressedOnce(gamepad, 4) || pressedOnce(gamepad, 5)) {
                    runControllerAction(() => launcherKeyboardShortcut('shift'));
                }

                if (pressedOnce(gamepad, 6)) {
                    runControllerAction(() => launcherKeyboardShortcut('cursorLeft'));
                }

                if (pressedOnce(gamepad, 7)) {
                    runControllerAction(() => launcherKeyboardShortcut('cursorRight'));
                }

                if (pressedOnce(gamepad, 9)) {
                    runControllerAction(() => launcherKeyboardShortcut('save'));
                }
            }

            if (pressedOnce(gamepad, 0) || (!keyboardOpen && pressedOnce(gamepad, 9))) {
                runControllerAction(() => {
                    if (!launcherModalAction('confirm')) {
                        launcherActivate();
                    }
                });
            }

            if (pressedOnce(gamepad, 1)) {
                runControllerAction(launcherBack);
            }

            if (pressedOnce(gamepad, 8)) {
                runControllerAction(launcherToggleTheme);
            }

            previousDirection = direction;
            previousButtons = gamepad.buttons.map((button) => button.pressed);
        }

        requestAnimationFrame(loop);
    }

    requestAnimationFrame(loop);
}

let htmlGamepadStarted = false;
let lastNativeGamepadInputAt = 0;
let launcherControllerPaused = false;
let launcherControllerResumeLocked = false;
let launcherControllerResumeLockedUntil = 0;
let launcherFocusShortcutPending = false;
let lastLauncherFocusShortcutAt = 0;
let launcherControllerResetToken = 0;
let launcherControllerInputResetUntil = 0;

function resetLauncherControllerInput(duration = 350) {
    launcherControllerResetToken += 1;
    launcherControllerInputResetUntil = performance.now() + duration;
}

function isLauncherFocusShortcutPressed(gamepad) {
    return Boolean(gamepad.buttons[10]?.pressed && gamepad.buttons[11]?.pressed);
}

function wasLauncherFocusShortcutPressed(previousButtons) {
    return Boolean(previousButtons[10] && previousButtons[11]);
}

function requestLauncherFocusFromShortcut(now) {
    if (launcherFocusShortcutPending || now - lastLauncherFocusShortcutAt < 1200) {
        return;
    }

    launcherFocusShortcutPending = true;
    lastLauncherFocusShortcutAt = now;

    window.launcherAPI?.focusLauncher?.()
        .catch((error) => {
            console.warn('Nao foi possivel retornar o foco ao launcher:', error);
        })
        .finally(() => {
            launcherFocusShortcutPending = false;
        });
}

window.markNativeGamepadInput = function markNativeGamepadInput() {
    lastNativeGamepadInputAt = performance.now();
};

window.setLauncherControllerPaused = function setLauncherControllerPaused(paused) {
    const wasPaused = launcherControllerPaused;
    launcherControllerPaused = Boolean(paused);

    if (wasPaused && !launcherControllerPaused) {
        launcherControllerResumeLocked = true;
        launcherControllerResumeLockedUntil = performance.now() + 900;
    }
};

window.launcherAPI?.onControllerPaused?.((paused) => {
    window.setLauncherControllerPaused(paused);
});

function maybeStartHtmlGamepadControl() {
    if (htmlGamepadStarted) {
        return;
    }

    if (!('getGamepads' in navigator)) {
        return;
    }

    htmlGamepadStarted = true;
    console.log('Controle do launcher via Gamepad API ativado.');
    startHtmlGamepadControl();
}

window.addEventListener('pywebviewready', () => {
    maybeStartHtmlGamepadControl();
    loadActiveUser();
    if (profileSelectionActive) {
        showProfileSelection();
    }
});

// Delay a bit to let pywebview inject its bridge before deciding.
window.setTimeout(maybeStartHtmlGamepadControl, 1200);
window.setTimeout(() => {
    loadActiveUser();
    if (profileSelectionActive) {
        showProfileSelection();
    }
}, 1200);

function getLocalVideoFallback(url) {
    const isRemoteUrl = /^https?:\/\//i.test(url);

    if (isRemoteUrl || !url.toLowerCase().endsWith('.mp4')) {
        return null;
    }

    return url.replace(/\.mp4$/i, '.webm');
}

function createVideoPlayer(url) {
    const webmFallback = getLocalVideoFallback(url);
    const safeUrl = escapeAttribute(url);
    const safeWebmFallback = webmFallback ? escapeAttribute(webmFallback) : null;
    const sources = webmFallback
        ? `<source src="${safeWebmFallback}" type="video/webm">
                <source src="${safeUrl}" type="video/mp4">`
        : `<source src="${safeUrl}" type="video/mp4">`;

    playerArea.innerHTML = `
            <video autoplay loop muted playsinline preload="auto" class="w-100 h-100">
                ${sources}
            </video>`;
}

function playCurrentVideo() {
    const video = playerArea.querySelector('video');

    if (video) {
        video.muted = true;
        video.play().catch((error) => {
            console.warn('Nao foi possivel iniciar o video automaticamente:', error);
        });
    }
}

function openTrailer(url, name, gameId = null) {
    jogoSelecionado = gameId;
    selectedModalGame = null;
    selectedModalActionIndex = 0;
    romRenamePanel?.classList.add('d-none');

    document.getElementById('infoTitle').innerText = name;
    document.getElementById('gameLabel').innerText = name;
    document.getElementById('gameDescription').innerHTML = originalGameDescription;
    editGameButton?.classList.add('d-none');
    renameRomButton?.classList.add('d-none');
    editEmulatorButton?.classList.add('d-none');
    deleteGameButton?.classList.add('d-none');

    if (url.includes('youtube.com') || url.includes('embed')) {
        const safeUrl = escapeAttribute(url);
        playerArea.innerHTML = `
            <iframe src="${safeUrl}?autoplay=1&rel=0"
                allow="autoplay; encrypted-media"
                allowfullscreen
                class="w-100 h-100">
            </iframe>`;
    } else {
        createVideoPlayer(url);
    }

    trailerModal.show();
    window.setTimeout(() => updateModalActionSelection(false), 150);
}

function openAddedGame(game, imageUrl = null) {
    jogoSelecionado = game.id;
    selectedModalGame = game;
    selectedModalActionIndex = 0;
    romRenamePanel?.classList.add('d-none');
    const safeName = escapeHtml(game.nome);
    const safeNameAttribute = escapeAttribute(game.nome);
    const safeImageUrl = escapeAttribute(imageUrl || getGameImage(game));
    const isSteamGame = game.tipo === 'steam';
    const isRom = game.tipo === 'rom';
    const isLutris = game.tipo === 'lutris';
    const steamNotInstalled = isSteamGameNotInstalled(game);
    const badgeIcon = isSteamGame ? 'bi-steam' : (isRom ? 'bi-cpu' : (isLutris ? 'bi-controller' : 'bi-hdd-stack'));
    const badgeLabel = isSteamGame ? 'Steam' : (isRom ? game.emulador || 'RetroArch' : (isLutris ? 'Lutris' : 'Local'));
    const safeBadgeLabel = escapeHtml(badgeLabel);
    const gameCategory = normalizeCategory(game.categoria);
    const detail = steamNotInstalled
        ? 'Este jogo ainda não está instalado. Ao confirmar, a Steam será aberta diretamente na tela de instalação.'
        : isSteamGame
            ? `Ao iniciar, o launcher abre o protocolo <em>steam://rungameid/${escapeHtml(game.app_id)}</em>.`
            : isLutris
                ? `Ao iniciar, o launcher executa <em>lutris lutris:rungameid/${escapeHtml(game.app_id || game.lutris_id || '')}</em>.`
                : isRom
                    ? `Ao iniciar, o launcher abre <em>${escapeHtml(game.rom || '')}</em> usando o core <em>${escapeHtml(game.core || '')}</em>.`
                    : `Ao iniciar, o launcher executa <em>${escapeHtml(game.caminho || '')}</em>.`;

    document.getElementById('infoTitle').innerText = game.nome;
    document.getElementById('gameLabel').innerText = game.nome;
    editGameButton?.classList.toggle('d-none', isRom);
    renameRomButton?.classList.toggle('d-none', !isRom);
    editEmulatorButton?.classList.toggle('d-none', !isRom);
    deleteGameButton?.classList.toggle('d-none', isRom);
    if (startGameButton) {
        if (steamNotInstalled) {
            startGameButton.innerHTML = '<span class="controller-badge">A</span><i class="bi bi-download"></i><span>Instalar</span>';
        } else if (isLutris) {
            startGameButton.innerHTML = '<span class="controller-badge">A</span><i class="bi bi-controller"></i><span>Jogar via Lutris</span>';
        } else {
            startGameButton.innerHTML = '<span class="controller-badge">A</span><i class="bi bi-play-fill"></i><span>Jogar</span>';
        }
    }
    document.getElementById('gameDescription').innerHTML = `
        <p><strong>${safeName}</strong> foi adicionado à biblioteca.</p>
        <p><span class="game-category-pill"><i class="bi bi-tags"></i> ${escapeHtml(gameCategory)}</span></p>
        ${getGamePlaytimeHtml(game)}
        <p>${detail}</p>
    `;

    playerArea.innerHTML = `
        <div class="steam-preview">
            <img src="${safeImageUrl}" alt="${safeNameAttribute}">
            <div class="steam-preview-badge">
                <i class="bi ${badgeIcon}"></i>
                <span>${safeBadgeLabel}</span>
            </div>
        </div>
    `;

    trailerModal.show();
    window.setTimeout(() => updateModalActionSelection(false), 150);
}

function stopVideo() {
    playerArea.innerHTML = '';
    romRenamePanel?.classList.add('d-none');
    clearModalActionSelection();
    selectedModalActionIndex = 0;
    selectedModalGame = null;
    window.setTimeout(() => updateNavigationSelection(false), 50);
}

function editarJogoSelecionado() {
    if (!selectedModalGame) {
        return;
    }

    const game = selectedModalGame;
    trailerModal.hide();
    window.setTimeout(() => openGameForm(game), 180);
}

function editarEmuladorSelecionado() {
    if (!selectedModalGame || selectedModalGame.tipo !== 'rom') {
        return;
    }

    const emulator = selectedModalGame;
    trailerModal.hide();
    window.setTimeout(() => openEmulatorForm(emulator), 180);
}

async function alterarNomeRomSelecionada() {
    if (!selectedModalGame || selectedModalGame.tipo !== 'rom') {
        return;
    }

    romRenamePanel?.classList.remove('d-none');
    buildVirtualKeyboard('rom');
    keyboardShift = false;
    selectedKeyboardIndex = 0;
    romDisplayNameInput.value = selectedModalGame.nome || '';
    setActiveKeyboardInput(romDisplayNameInput);
    updateKeyboardLabels();
    updateKeyboardSelection(false);
    romDisplayNameInput?.setSelectionRange(0, romDisplayNameInput.value.length);
}

async function salvarNomeRomSelecionada() {
    if (!selectedModalGame || selectedModalGame.tipo !== 'rom') {
        return;
    }

    const cleanName = (romDisplayNameInput?.value || '').trim();
    if (!cleanName) {
        showControllerAlert('Informe o nome de exibição da ROM.');
        setActiveKeyboardInput(romDisplayNameInput);
        return;
    }

    if (!window.pywebview || !window.pywebview.api?.alterar_nome_exibicao_rom) {
        showControllerAlert('O launcher desktop ainda não está pronto.');
        return;
    }

    try {
        const response = await window.pywebview.api.alterar_nome_exibicao_rom(selectedModalGame.id, cleanName);

        if (!response.ok) {
            showControllerAlert(response.message);
            return;
        }

        selectedModalGame = response.jogo;
        romRenamePanel?.classList.add('d-none');
        createSteamGameCard(response.jogo);
        openAddedGame(response.jogo, getGameImage(response.jogo));
    } catch (error) {
        showControllerAlert(`Erro ao alterar nome da ROM: ${error}`);
    }
}

async function excluirJogoSelecionado() {
    if (!selectedModalGame) {
        return;
    }

    if (!window.pywebview || !window.pywebview.api?.excluir_jogo_adicionado) {
        showControllerAlert('O launcher desktop ainda não está pronto.');
        return;
    }

    const gameId = selectedModalGame.id;

    try {
        const response = await window.pywebview.api.excluir_jogo_adicionado(gameId);

        if (!response.ok) {
            showControllerAlert(response.message);
            return;
        }

        trailerModal.hide();
        removeAddedGameCard(gameId);
        updateLibraryCount();
        selectedGameIndex = Math.max(0, Math.min(getGameCards().length - 1, selectedGameIndex));
        setNavigationArea('games', selectedGameIndex, false);
    } catch (error) {
        showControllerAlert(`Erro ao excluir jogo: ${error}`);
    }
}

document.getElementById('trailerModal').addEventListener('hidden.bs.modal', stopVideo);
document.getElementById('trailerModal').addEventListener('shown.bs.modal', playCurrentVideo);

async function iniciarJogo() {
    if (!jogoSelecionado) {
        showControllerAlert('Esse jogo ainda não tem ID configurado no launcher.');
        return;
    }

    if (!window.pywebview || !window.pywebview.api) {
        showControllerAlert('O launcher ainda não está pronto.');
        return;
    }

    try {
        window.setLauncherControllerPaused?.(true);
        const response = await window.pywebview.api.iniciar_jogo(jogoSelecionado);

        if (!response.ok) {
            window.setLauncherControllerPaused?.(false);
            showControllerAlert(response.message);
            return;
        }

        if (response.install_required === true) {
            window.setLauncherControllerPaused?.(false);
            showControllerAlert('Abrindo instalação pela Steam.');
        }

        console.log(response.message);
        trailerModal.hide();
    } catch (error) {
        window.setLauncherControllerPaused?.(false);
        showControllerAlert(`Erro ao iniciar jogo: ${error}`);
    }
}
