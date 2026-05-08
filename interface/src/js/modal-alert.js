(function () {
    const ALERT_MODAL_ID = 'appAlertModal';
    let alertModal = null;
    let alertModalElement = null;
    let alertMessageElement = null;
    let alertOkButton = null;
    let alertCancelButton = null;
    let previousButtons = [];
    let controllerLoopStarted = false;
    let alertInputLockedUntil = 0;
    let confirmResolver = null;
    let confirmButtons = [];
    let selectedConfirmButton = 1;

    function ensureAlertModal() {
        if (alertModalElement) {
            return alertModalElement;
        }

        alertModalElement = document.createElement('div');
        alertModalElement.className = 'modal fade app-alert-modal';
        alertModalElement.id = ALERT_MODAL_ID;
        alertModalElement.tabIndex = -1;
        alertModalElement.setAttribute('aria-hidden', 'true');
        alertModalElement.setAttribute('aria-labelledby', `${ALERT_MODAL_ID}Title`);
        alertModalElement.setAttribute('data-bs-backdrop', 'static');
        alertModalElement.setAttribute('data-bs-keyboard', 'false');
        alertModalElement.innerHTML = `
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content border-0 shadow-lg rounded-4">
                    <div class="modal-header">
                        <h5 class="modal-title fw-bold" id="${ALERT_MODAL_ID}Title">
                            <i class="bi bi-info-circle me-2 text-primary"></i>Aviso
                        </h5>
                    </div>
                    <div class="modal-body">
                        <p class="mb-0 app-alert-message"></p>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn controller-action controller-action-b px-4 app-alert-cancel d-none">
                            <span class="controller-badge">B</span>
                            <span>Cancelar</span>
                        </button>
                        <button type="button" class="btn controller-action controller-action-a px-4 app-alert-ok">
                            <span class="controller-badge">A</span>
                            <span>OK</span>
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(alertModalElement);
        alertMessageElement = alertModalElement.querySelector('.app-alert-message');
        alertOkButton = alertModalElement.querySelector('.app-alert-ok');
        alertCancelButton = alertModalElement.querySelector('.app-alert-cancel');
        confirmButtons = [alertCancelButton, alertOkButton];

        alertOkButton.addEventListener('click', () => hideControllerAlert(true));
        alertCancelButton.addEventListener('click', () => hideControllerAlert(false));
        alertModalElement.addEventListener('shown.bs.modal', () => {
            updateConfirmSelection();
            confirmButtons[selectedConfirmButton]?.focus({ preventScroll: true });
        });
        alertModalElement.addEventListener('hidden.bs.modal', () => {
            resolvePendingConfirm(false);
            clearConfirmState();
            document.dispatchEvent(new CustomEvent('app:controller-alert-hidden'));
        });

        if (typeof bootstrap !== 'undefined') {
            alertModal = bootstrap.Modal.getOrCreateInstance(alertModalElement, {
                backdrop: 'static',
                keyboard: false
            });
        }

        startControllerAlertLoop();
        return alertModalElement;
    }

    function showControllerAlert(message) {
        ensureAlertModal();
        clearConfirmState();
        alertMessageElement.textContent = String(message ?? '');

        if (alertModal) {
            alertModal.show();
            return;
        }

        alertModalElement.classList.add('show');
        alertModalElement.style.display = 'block';
        alertModalElement.removeAttribute('aria-hidden');
        updateConfirmSelection();
        alertOkButton.focus({ preventScroll: true });
    }

    function showControllerConfirm(message, options = {}) {
        ensureAlertModal();
        clearConfirmState();
        alertMessageElement.textContent = String(message ?? '');
        alertCancelButton.classList.remove('d-none');
        alertCancelButton.querySelector('span:last-child').textContent = options.cancelLabel || 'Cancelar';
        alertOkButton.querySelector('span:last-child').textContent = options.confirmLabel || 'Confirmar';
        selectedConfirmButton = Number.isInteger(options.selectedIndex) ? options.selectedIndex : 1;
        selectedConfirmButton = Math.max(0, Math.min(confirmButtons.length - 1, selectedConfirmButton));
        updateConfirmSelection();

        const promise = new Promise((resolve) => {
            confirmResolver = resolve;
        });

        if (alertModal) {
            alertModal.show();
            return promise;
        }

        alertModalElement.classList.add('show');
        alertModalElement.style.display = 'block';
        alertModalElement.removeAttribute('aria-hidden');
        confirmButtons[selectedConfirmButton]?.focus({ preventScroll: true });
        return promise;
    }

    function hideControllerAlert(result = true) {
        if (!alertModalElement || !isControllerAlertOpen()) {
            return;
        }

        lockControllerAlertInput();
        resolvePendingConfirm(Boolean(result));

        if (alertModal) {
            alertModal.hide();
            return;
        }

        alertModalElement.classList.remove('show');
        alertModalElement.style.display = 'none';
        alertModalElement.setAttribute('aria-hidden', 'true');
        clearConfirmState();
        document.dispatchEvent(new CustomEvent('app:controller-alert-hidden'));
    }

    function isControllerAlertOpen() {
        return Boolean(alertModalElement?.classList.contains('show'));
    }

    function handleControllerAlertAction(action = 'confirm') {
        if (!isControllerAlertOpen()) {
            return false;
        }

        if (action === 'confirm') {
            const isConfirmMode = !alertCancelButton?.classList.contains('d-none');
            hideControllerAlert(isConfirmMode ? selectedConfirmButton === 1 : true);
            return true;
        }

        if (action === 'back') {
            hideControllerAlert(false);
            return true;
        }

        return true;
    }

    function moveConfirmSelection(direction) {
        if (alertCancelButton?.classList.contains('d-none')) {
            return;
        }

        selectedConfirmButton = direction > 0 ? 1 : 0;
        updateConfirmSelection();
        confirmButtons[selectedConfirmButton]?.focus({ preventScroll: true });
    }

    function updateConfirmSelection() {
        confirmButtons.forEach((button, index) => {
            button?.classList.toggle('is-controller-selected', index === selectedConfirmButton);
        });
    }

    function resolvePendingConfirm(result) {
        if (!confirmResolver) {
            return;
        }

        const resolver = confirmResolver;
        confirmResolver = null;
        resolver(Boolean(result));
    }

    function clearConfirmState() {
        alertCancelButton?.classList.add('d-none');
        alertOkButton.querySelector('span:last-child').textContent = 'OK';
        confirmResolver = null;
        selectedConfirmButton = 1;
        confirmButtons.forEach((button) => button?.classList.remove('is-controller-selected'));
    }

    function lockControllerAlertInput() {
        alertInputLockedUntil = performance.now() + 450;
    }

    function isControllerAlertInputLocked() {
        return performance.now() < alertInputLockedUntil;
    }

    function startControllerAlertLoop() {
        if (controllerLoopStarted) {
            return;
        }

        controllerLoopStarted = true;

        function pressedOnce(gamepad, index) {
            const pressed = Boolean(gamepad.buttons[index]?.pressed);
            const wasPressed = Boolean(previousButtons[index]);
            return pressed && !wasPressed;
        }

        function loop() {
            if (isControllerAlertOpen()) {
                const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
                const gamepad = Array.from(gamepads).find(Boolean);

                if (gamepad) {
                    if (pressedOnce(gamepad, 14)) {
                        moveConfirmSelection(-1);
                    } else if (pressedOnce(gamepad, 15)) {
                        moveConfirmSelection(1);
                    }

                    const pressedConfirm = pressedOnce(gamepad, 0);
                    const pressedCancel = pressedOnce(gamepad, 1);
                    const pressedStart = pressedOnce(gamepad, 9);

                    if (pressedConfirm || pressedCancel || pressedStart) {
                        const isConfirmMode = !alertCancelButton?.classList.contains('d-none');
                        const result = isConfirmMode
                            ? !pressedCancel && selectedConfirmButton === 1
                            : true;
                        hideControllerAlert(result);
                    }

                    previousButtons = gamepad.buttons.map((button) => button.pressed);
                }
            }

            requestAnimationFrame(loop);
        }

        requestAnimationFrame(loop);
    }

    document.addEventListener('keydown', (event) => {
        if (!isControllerAlertOpen()) {
            return;
        }

        if (['ArrowLeft', 'ArrowRight'].includes(event.key)) {
            event.preventDefault();
            moveConfirmSelection(event.key === 'ArrowRight' ? 1 : -1);
        } else if (['Enter', ' '].includes(event.key)) {
            event.preventDefault();
            const isConfirmMode = !alertCancelButton?.classList.contains('d-none');
            hideControllerAlert(isConfirmMode ? selectedConfirmButton === 1 : true);
        } else if (event.key === 'Escape') {
            event.preventDefault();
            hideControllerAlert(false);
        }
    }, true);

    window.showControllerAlert = showControllerAlert;
    window.showControllerConfirm = showControllerConfirm;
    window.hideControllerAlert = hideControllerAlert;
    window.isControllerAlertOpen = isControllerAlertOpen;
    window.handleControllerAlertAction = handleControllerAlertAction;
    window.isControllerAlertInputLocked = isControllerAlertInputLocked;
    window.alert = showControllerAlert;
})();
