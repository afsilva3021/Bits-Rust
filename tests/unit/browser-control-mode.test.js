const test = require('node:test');
const assert = require('node:assert/strict');

const {
  getHostname,
  isInteractiveControllerPage,
  resolveBrowserOpenMode
} = require('../../interface/src/js/browser-control-mode');

test('detecta hosts interativos que precisam manter o controle no renderer', () => {
  assert.equal(isInteractiveControllerPage('https://www.youtube.com/'), true);
  assert.equal(isInteractiveControllerPage('https://www.google.com/webhp?igu=1'), true);
  assert.equal(isInteractiveControllerPage('https://discord.com/app'), true);
});

test('forca modo launcher para paginas controladas por gamepad', () => {
  assert.equal(resolveBrowserOpenMode('https://www.youtube.com/', 'native-launcher'), 'launcher');
  assert.equal(resolveBrowserOpenMode('https://www.google.com/webhp?igu=1', 'native-launcher'), 'launcher');
  assert.equal(resolveBrowserOpenMode('https://discord.com/app', 'native-launcher'), 'launcher');
});

test('preserva o modo solicitado para paginas comuns', () => {
  assert.equal(resolveBrowserOpenMode('https://example.com', 'native-launcher'), 'native-launcher');
  assert.equal(resolveBrowserOpenMode('https://example.com', 'system'), 'system');
});

test('normaliza hostname de urls invalidas com fallback vazio', () => {
  assert.equal(getHostname('notaurl'), '');
});
