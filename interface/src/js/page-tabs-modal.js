"use strict";
// @ts-nocheck
(function exposePageTabsModal(root) {
    let modalElement = null;
    let modal = null;
    let titleElement = null;
    let listElement = null;
    let confirmButton = null;
    let mode = '';
    let tabs = [];
    let selectedIndex = 0;
    function pageIcon(tab) {
        const key = tab.pageKey || tab.id || '';
        if (key === 'youtube')
            return 'bi bi-youtube';
        if (key === 'google')
            return 'bi bi-google';
        if (key === 'discord')
            return 'bi bi-discord';
        return 'bi bi-window';
    }
    function ensureModal() {
        if (modalElement) {
            return;
        }
        modalElement = document.createElement('div');
        modalElement.className = 'modal fade global-page-tabs-modal';
        modalElement.tabIndex = -1;
        modalElement.setAttribute('aria-hidden', 'true');
        modalElement.setAttribute('data-bs-backdrop', 'static');
        modalElement.setAttribute('data-bs-keyboard', 'false');
        modalElement.innerHTML = `
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content border-0 shadow-lg rounded-4">
                    <div class="modal-header">
                        <h5 class="modal-title fw-bold">
                            <i class="bi bi-window-sidebar me-2 text-primary"></i><span></span>
                        </h5>
                    </div>
                    <div class="modal-body">
                        <div class="controller-page-list"></div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn controller-action controller-action-b px-4 global-page-tabs-cancel">
                            <span class="controller-badge">B</span>
                            <span>Cancelar</span>
                        </button>
                        <button type="button" class="btn controller-action controller-action-a px-4 global-page-tabs-confirm">
                            <span class="controller-badge">A</span>
                            <span>Confirmar</span>
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modalElement);
        titleElement = modalElement.querySelector('.modal-title span');
        listElement = modalElement.querySelector('.controller-page-list');
        confirmButton = modalElement.querySelector('.global-page-tabs-confirm');
        confirmButton.addEventListener('click', confirm);
        modalElement.querySelector('.global-page-tabs-cancel').addEventListener('click', close);
        modalElement.addEventListener('shown.bs.modal', () => updateSelection(false));
        modal = typeof bootstrap !== 'undefined'
            ? bootstrap.Modal.getOrCreateInstance(modalElement)
            : {
                show() {
                    modalElement.classList.add('show');
                    modalElement.style.display = 'block';
                    modalElement.removeAttribute('aria-hidden');
                    updateSelection(false);
                },
                hide() {
                    modalElement.classList.remove('show');
                    modalElement.style.display = 'none';
                    modalElement.setAttribute('aria-hidden', 'true');
                }
            };
    }
    function isOpen() {
        return Boolean(modalElement?.classList.contains('show'));
    }
    function optionTemplate({ id, type, title, subtitle, icon }, selected = false, disabled = false) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'controller-page-option';
        button.dataset.id = id || '';
        button.dataset.type = type || '';
        button.disabled = Boolean(disabled);
        button.innerHTML = `
            <i class="${icon}"></i>
            <div>
                <span></span>
                <small></small>
            </div>
        `;
        button.querySelector('span').textContent = title || '';
        button.querySelector('small').textContent = subtitle || '';
        button.classList.toggle('is-controller-selected', selected);
        button.addEventListener('click', () => {
            const options = getOptions();
            selectedIndex = Math.max(0, options.indexOf(button));
            updateSelection(false);
        });
        return button;
    }
    function getOptions() {
        return Array.from(listElement?.querySelectorAll('.controller-page-option:not([disabled])') || []);
    }
    function updateSelection(scrollIntoView = true) {
        const options = getOptions();
        if (!options.length) {
            return;
        }
        selectedIndex = Math.max(0, Math.min(options.length - 1, selectedIndex));
        options.forEach((option, index) => {
            const selected = index === selectedIndex;
            option.classList.toggle('is-controller-selected', selected);
            option.setAttribute('tabindex', selected ? '0' : '-1');
        });
        options[selectedIndex].focus({ preventScroll: true });
        if (scrollIntoView) {
            options[selectedIndex].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }
    async function readTabs() {
        const response = await root.pywebview?.api?.listar_url_launcher?.();
        if (response?.ok === false) {
            root.showControllerAlert?.(response.message);
            return [];
        }
        return Array.isArray(response?.tabs) ? response.tabs : [];
    }
    async function openAccess() {
        ensureModal();
        mode = 'access';
        tabs = await readTabs();
        selectedIndex = 0;
        titleElement.textContent = 'Acessar';
        confirmButton.querySelector('span:last-child').textContent = 'Acessar';
        listElement.innerHTML = '';
        listElement.appendChild(optionTemplate({
            id: 'games',
            type: 'games',
            title: 'Meus Jogos',
            subtitle: 'Biblioteca principal',
            icon: 'bi bi-controller'
        }, true));
        tabs.forEach((tab) => {
            listElement.appendChild(optionTemplate({
                id: tab.id,
                type: 'tab',
                title: tab.title || 'Pagina aberta',
                subtitle: tab.url || 'Rodando em segundo plano',
                icon: pageIcon(tab)
            }));
        });
        modal.show();
    }
    async function openClose() {
        ensureModal();
        mode = 'close';
        tabs = await readTabs();
        selectedIndex = 0;
        titleElement.textContent = 'Fechar pagina';
        confirmButton.querySelector('span:last-child').textContent = 'Fechar';
        listElement.innerHTML = '';
        if (!tabs.length) {
            listElement.appendChild(optionTemplate({
                id: '',
                type: 'empty',
                title: 'Nenhuma pagina aberta',
                subtitle: 'Meus Jogos nao pode ser fechado',
                icon: 'bi bi-window-x'
            }, true, true));
        }
        else {
            tabs.forEach((tab, index) => {
                listElement.appendChild(optionTemplate({
                    id: tab.id,
                    type: 'tab',
                    title: tab.title || 'Pagina aberta',
                    subtitle: tab.url || 'Rodando em segundo plano',
                    icon: pageIcon(tab)
                }, index === 0));
            });
        }
        modal.show();
    }
    function close() {
        modal?.hide();
        mode = '';
        selectedIndex = 0;
    }
    function navigate(direction) {
        if (direction === 'up' || direction === 'left') {
            selectedIndex -= 1;
        }
        else if (direction === 'down' || direction === 'right') {
            selectedIndex += 1;
        }
        updateSelection();
    }
    async function confirm() {
        const selected = getOptions()[selectedIndex];
        if (!selected) {
            return;
        }
        const type = selected.dataset.type;
        const id = selected.dataset.id;
        const currentMode = mode;
        close();
        root.pywebview?.api?.definir_modo_modal_navegador?.(false);
        if (currentMode === 'access') {
            if (type === 'games') {
                root.sessionStorage?.setItem('gp-profile-selected', '1');
                await root.pywebview?.api?.ocultar_url_launcher?.();
                await root.pywebview?.api?.fechar_teclado_virtual?.();
                root.location.href = './index.html';
                return;
            }
            if (type === 'tab' && id) {
                root.sessionStorage?.setItem('launcher-open-tab-id', id);
                root.location.href = `./webapp.html?tab=${encodeURIComponent(id)}`;
            }
            return;
        }
        if (currentMode === 'close' && type === 'tab' && id) {
            const tab = tabs.find((item) => item.id === id);
            const response = await root.pywebview?.api?.fechar_url_launcher?.(id);
            if (response?.ok === false) {
                root.showControllerAlert?.(response.message);
                return;
            }
            root.onGlobalPageTabClosed?.(tab);
        }
    }
    function handleAction(action) {
        if (!isOpen()) {
            return false;
        }
        if (action === 'confirm') {
            confirm();
        }
        else if (action === 'back') {
            close();
        }
        return true;
    }
    document.addEventListener('keydown', (event) => {
        if (!isOpen()) {
            return;
        }
        if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
            event.preventDefault();
            navigate(event.key.replace('Arrow', '').toLowerCase());
        }
        else if (event.key === 'Enter') {
            event.preventDefault();
            confirm();
        }
        else if (event.key === 'Escape') {
            event.preventDefault();
            close();
        }
    }, true);
    root.PageTabsModal = {
        openAccess,
        openClose,
        isOpen,
        navigate,
        handleAction
    };
})(window);
//# sourceMappingURL=page-tabs-modal.js.map