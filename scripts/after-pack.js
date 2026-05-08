const fs = require('fs');
const path = require('path');

exports.default = async function afterPack(context) {
  if (context.electronPlatformName !== 'linux') {
    return;
  }

  const executableName = context.packager.executableName;
  const executablePath = path.join(context.appOutDir, executableName);
  const realExecutablePath = path.join(context.appOutDir, `${executableName}.bin`);

  if (!fs.existsSync(executablePath)) {
    return;
  }

  if (!fs.existsSync(realExecutablePath)) {
    fs.renameSync(executablePath, realExecutablePath);
  }

  fs.writeFileSync(executablePath, [
    '#!/usr/bin/env sh',
    'HERE="$(dirname "$(readlink -f "$0")")"',
    `exec "$HERE/${executableName}.bin" --no-sandbox --disable-setuid-sandbox "$@"`,
    ''
  ].join('\n'));

  fs.chmodSync(executablePath, 0o755);
};
