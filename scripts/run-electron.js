#!/usr/bin/env node

const { spawn } = require('child_process');
const electron = require('electron');

const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;

if (process.argv.includes('--no-sandbox')) {
  env.ELECTRON_DISABLE_SANDBOX = '1';
}

const child = spawn(electron, process.argv.slice(2), {
  env,
  stdio: 'inherit',
  windowsHide: false
});

let childClosed = false;

child.on('close', (code, signal) => {
  childClosed = true;

  if (code === null) {
    console.error(electron, 'exited with signal', signal);
    process.exit(1);
  }

  process.exit(code);
});

for (const signal of ['SIGINT', 'SIGTERM', 'SIGUSR2']) {
  process.on(signal, () => {
    if (!childClosed) {
      child.kill(signal);
    }
  });
}
