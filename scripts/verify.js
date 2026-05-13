const { spawnSync } = require('child_process');

const syntaxFiles = [
  'src/main.js',
  'src/preload.js',
  'src/storage.js',
  'src/browser-view-controller-preload.js',
  'interface/src/js/script.js',
  'interface/src/js/users.js',
  'interface/src/js/settings.js',
  'interface/src/js/store.js',
  'interface/src/js/modal-alert.js',
  'interface/src/js/page-tabs-modal.js',
  'interface/src/js/browser-control-mode.js',
  'scripts/build.js',
  'scripts/run-electron.js',
  'scripts/after-pack.js',
  'scripts/verify.js'
];

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    stdio: 'inherit',
    shell: process.platform === 'win32'
  });

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

function checkSyntax() {
  run(process.execPath, ['node_modules/typescript/bin/tsc', '-p', 'tsconfig.json']);

  for (const file of syntaxFiles) {
    run(process.execPath, ['--check', file]);
  }
}

function runTests() {
  run(process.execPath, ['--test', 'tests/unit/*.test.js']);
}

checkSyntax();

if (!process.argv.includes('--syntax')) {
  runTests();
}
