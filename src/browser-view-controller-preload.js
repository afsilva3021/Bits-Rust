"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck
const { ipcRenderer } = require('electron');
let previousButtons = [];
let previousDirection = null;
let lastMoveAt = 0;
let lastScrollAt = 0;
let keyboardMode = false;
let modalMode = false;
ipcRenderer.on('launcher:native-browser-keyboard-mode', (_event, open) => {
    keyboardMode = Boolean(open);
});
ipcRenderer.on('launcher:native-browser-modal-mode', (_event, open) => {
    modalMode = Boolean(open);
});
function pressedOnce(gamepad, index) {
    const pressed = Boolean(gamepad.buttons[index]?.pressed);
    const wasPressed = Boolean(previousButtons[index]);
    return pressed && !wasPressed;
}
function readDirection(gamepad) {
    const axisX = gamepad.axes[0] || 0;
    const axisY = gamepad.axes[1] || 0;
    if (gamepad.buttons[12]?.pressed || axisY < -0.65)
        return 'up';
    if (gamepad.buttons[13]?.pressed || axisY > 0.65)
        return 'down';
    if (gamepad.buttons[14]?.pressed || axisX < -0.65)
        return 'left';
    if (gamepad.buttons[15]?.pressed || axisX > 0.65)
        return 'right';
    return null;
}
function sendAction(action, payload = {}) {
    ipcRenderer.send('launcher:native-browser-controller-action', action, payload);
}
function invokeInput(channel, ...args) {
    ipcRenderer.invoke(channel, ...args).catch(() => { });
}
function loop() {
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    const gamepad = Array.from(gamepads).find(Boolean);
    if (gamepad) {
        const now = performance.now();
        const direction = readDirection(gamepad);
        const axisX = gamepad.axes[0] || 0;
        const axisY = gamepad.axes[1] || 0;
        const rightAxisY = gamepad.axes[3] || 0;
        const speed = gamepad.buttons[5]?.pressed ? 18 : 9;
        if (modalMode) {
            if (direction && (direction !== previousDirection || now - lastMoveAt > 180)) {
                sendAction('modal-navigate', { direction });
                lastMoveAt = now;
            }
            if (pressedOnce(gamepad, 0)) {
                modalMode = false;
                sendAction('modal-confirm');
            }
            if (pressedOnce(gamepad, 1)) {
                modalMode = false;
                sendAction('modal-back');
            }
            previousDirection = direction;
            previousButtons = gamepad.buttons.map((button) => button.pressed);
            requestAnimationFrame(loop);
            return;
        }
        if (keyboardMode) {
            if (direction && (direction !== previousDirection || now - lastMoveAt > 160)) {
                sendAction('keyboard-navigate', { direction });
                lastMoveAt = now;
            }
            if (pressedOnce(gamepad, 0))
                sendAction('keyboard-press');
            if (pressedOnce(gamepad, 1)) {
                keyboardMode = false;
                sendAction('keyboard-close');
            }
            if (pressedOnce(gamepad, 2)) {
                keyboardMode = false;
                sendAction('keyboard-close');
            }
            if (pressedOnce(gamepad, 3))
                sendAction('keyboard-backspace');
            if (pressedOnce(gamepad, 4) || pressedOnce(gamepad, 5))
                sendAction('keyboard-shift');
            if (pressedOnce(gamepad, 6))
                sendAction('keyboard-cursor-left');
            if (pressedOnce(gamepad, 7))
                sendAction('keyboard-cursor-right');
            if (pressedOnce(gamepad, 8)) {
                keyboardMode = false;
                sendAction('close-modal');
            }
            if (pressedOnce(gamepad, 9)) {
                keyboardMode = false;
                sendAction('access-modal');
            }
            previousDirection = direction;
            previousButtons = gamepad.buttons.map((button) => button.pressed);
            requestAnimationFrame(loop);
            return;
        }
        if (Math.abs(axisX) > 0.18 || Math.abs(axisY) > 0.18) {
            invokeInput('py:mover_mouse_relativo_sistema', axisX * speed, axisY * speed);
            lastMoveAt = now;
        }
        else if (direction && (direction !== previousDirection || now - lastMoveAt > 35)) {
            const dx = direction === 'left' ? -speed : direction === 'right' ? speed : 0;
            const dy = direction === 'up' ? -speed : direction === 'down' ? speed : 0;
            invokeInput('py:mover_mouse_relativo_sistema', dx, dy);
            lastMoveAt = now;
        }
        if (Math.abs(rightAxisY) > 0.35 && now - lastScrollAt > 80) {
            invokeInput('py:rolar_mouse_sistema', rightAxisY > 0 ? 'down' : 'up');
            lastScrollAt = now;
        }
        if (pressedOnce(gamepad, 0))
            invokeInput('py:clicar_mouse_sistema');
        if (pressedOnce(gamepad, 6))
            invokeInput('py:clicar_mouse_direito_sistema');
        if (pressedOnce(gamepad, 7))
            invokeInput('py:clicar_mouse_sistema');
        if (pressedOnce(gamepad, 1))
            sendAction('back');
        if (pressedOnce(gamepad, 2)) {
            keyboardMode = true;
            sendAction('keyboard-open');
        }
        if (pressedOnce(gamepad, 3))
            sendAction('reload');
        if (pressedOnce(gamepad, 8)) {
            sendAction('close-modal');
        }
        if (pressedOnce(gamepad, 9)) {
            sendAction('access-modal');
        }
        previousDirection = direction;
        previousButtons = gamepad.buttons.map((button) => button.pressed);
    }
    requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
//# sourceMappingURL=browser-view-controller-preload.js.map