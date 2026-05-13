const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { build, Platform } = require('electron-builder');
const { NpmNodeModulesCollector } = require('app-builder-lib/out/node-module-collector/npmNodeModulesCollector');

const target = process.argv[2];
const projectDir = path.join(__dirname, '..');
const localNpm = path.join(__dirname, '..', 'node_modules', 'npm', 'bin', 'npm-cli.js');
const realNpm = fs.existsSync(localNpm) ? localNpm : (process.env.npm_execpath || 'npm');
const shimDir = path.join(os.tmpdir(), 'bitrust-launcher-build-bin');
const npmShim = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const buildCacheDir = path.join(projectDir, '.cache', 'electron-builder');
const electronCacheDir = path.join(projectDir, '.cache', 'electron');
const checkFiles = [
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

function runSyntaxCheck() {
  const compileResult = spawnSync(process.execPath, ['node_modules/typescript/bin/tsc', '-p', 'tsconfig.json'], {
    cwd: projectDir,
    stdio: 'inherit'
  });

  if (compileResult.status !== 0) {
    throw new Error('TypeScript compilation failed.');
  }

  for (const file of checkFiles) {
    const result = spawnSync(process.execPath, ['--check', file], {
      cwd: projectDir,
      stdio: 'inherit'
    });

    if (result.status !== 0) {
      throw new Error(`Syntax check failed: ${file}`);
    }
  }
}

function writeNpmShim() {
  fs.mkdirSync(shimDir, { recursive: true });

  if (process.platform === 'win32') {
    fs.writeFileSync(path.join(shimDir, npmShim), [
      '@echo off',
      'if "%1"=="prefix" if "%2"=="-w" (',
      '  cd',
      '  exit /b 0',
      ')',
      `node "${realNpm}" %*`
    ].join('\r\n'));
    return;
  }

  fs.writeFileSync(path.join(shimDir, npmShim), [
    '#!/usr/bin/env sh',
    'if [ "$1" = "prefix" ] && [ "$2" = "-w" ]; then',
    '  pwd',
    '  exit 0',
    'fi',
    `exec node "${realNpm}" "$@"`
  ].join('\n'));
  fs.chmodSync(path.join(shimDir, npmShim), 0o755);
}

function patchNpmDependencyCollector() {
  NpmNodeModulesCollector.prototype.getDependenciesTree = async function getDependenciesTree() {
    const outFile = path.join(os.tmpdir(), `bitrust-npm-list-${process.pid}-${Date.now()}.json`);
    const command = [
      shellQuote(process.execPath),
      shellQuote(realNpm),
      ...this.getArgs().map(shellQuote),
      '>',
      shellQuote(outFile)
    ].join(' ');

    const result = spawnSync(command, {
      cwd: this.rootDir,
      encoding: 'utf8',
      shell: true,
      env: {
        ...process.env,
        NODE_NO_WARNINGS: '1',
        NPM_CONFIG_LOGLEVEL: 'error'
      }
    });
    const stdout = fs.existsSync(outFile) ? fs.readFileSync(outFile, 'utf8') : '';
    fs.rmSync(outFile, { force: true });

    if (!stdout) {
      console.error('npm dependency collector returned empty stdout.');
      console.error(`command: ${command}`);
      console.error(`status: ${result.status}`);
      console.error(result.stderr || '');
    }

    if (result.status !== 0 && !String(result.stderr || '').includes('missing')) {
      throw new Error(result.stderr || `npm list exited with code ${result.status}`);
    }

    return this.parseDependenciesTree(stdout);
  };
}

function shellQuote(value) {
  const text = String(value);

  if (process.platform === 'win32') {
    return `"${text.replace(/"/g, '\\"')}"`;
  }

  return `'${text.replace(/'/g, "'\\''")}'`;
}

function createTargets() {
  if (target === 'appimage') {
    return Platform.LINUX.createTarget(['AppImage']);
  }

  if (target === 'deb') {
    return Platform.LINUX.createTarget(['deb']);
  }

  if (target === 'linux') {
    return Platform.LINUX.createTarget(['AppImage', 'deb']);
  }

  if (target === 'win') {
    return Platform.WINDOWS.createTarget(['nsis', 'portable']);
  }

  return undefined;
}

async function run() {
  runSyntaxCheck();
  fs.mkdirSync(buildCacheDir, { recursive: true });
  fs.mkdirSync(electronCacheDir, { recursive: true });
  writeNpmShim();
  patchNpmDependencyCollector();
  ensureNativeSqliteBinding();

  await build({
    targets: createTargets(),
    projectDir
  });
}

function ensureNativeSqliteBinding() {
  if (target && target !== process.platform) {
    return;
  }

  const sqliteBinding = path.join(__dirname, '..', 'node_modules', 'sqlite3', 'build', 'Release', 'node_sqlite3.node');
  if (fs.existsSync(sqliteBinding)) {
    return;
  }

  console.log('sqlite3 native binding not found; rebuilding sqlite3...');
  const result = spawnSync('npm', ['rebuild', 'sqlite3', '--build-from-source'], {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: {
      ...process.env,
      PATH: `${shimDir}${path.delimiter}${process.env.PATH || ''}`
    }
  });

  if (result.status !== 0) {
    throw new Error('Failed to rebuild sqlite3 native binding.');
  }
}

process.env.NODE_NO_WARNINGS = '1';
process.env.NPM_CONFIG_LOGLEVEL = 'error';
process.env.ELECTRON_BUILDER_CACHE = buildCacheDir;
process.env.ELECTRON_CACHE = electronCacheDir;
process.env.PATH = `${shimDir}${path.delimiter}${process.env.PATH || ''}`;

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
