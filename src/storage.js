const fs = require('fs/promises');
const path = require('path');
const { app } = require('electron');
const sqlite3 = require('sqlite3');

const ROOT_DIR = path.join(__dirname, '..');
const DATA_DIR = app.isPackaged ? path.join(app.getPath('userData'), 'data') : path.join(ROOT_DIR, 'data');
const JSON_FILE = path.join(DATA_DIR, 'launcher.json');
const DB_FILE = path.join(DATA_DIR, 'launcher.db');

const DEFAULT_DATA = {
  games: [],
  emulators: [],
  users: [],
  settings: {
    theme: 'dark',
    steamApiKey: '',
    steamGridDbApiKey: '',
    steamLibraryCache: {
      updatedAt: 0,
      games: []
    },
    retroachievementsApiKey: '',
    resolution: ''
  },
  romDisplayNames: {}
};

let dbPromise;

function cloneDefaultData() {
  return JSON.parse(JSON.stringify(DEFAULT_DATA));
}

function normalizeData(data) {
  return {
    ...cloneDefaultData(),
    ...data,
    settings: {
      ...DEFAULT_DATA.settings,
      ...(data && data.settings ? data.settings : {})
    },
    games: Array.isArray(data && data.games) ? data.games : [],
    emulators: Array.isArray(data && data.emulators) ? data.emulators : [],
    users: Array.isArray(data && data.users) ? data.users : [],
    romDisplayNames: data && data.romDisplayNames && typeof data.romDisplayNames === 'object' ? data.romDisplayNames : {}
  };
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(DB_FILE, (error) => {
      if (error) {
        reject(error);
      } else {
        resolve(db);
      }
    });
  });
}

function run(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(error) {
      if (error) {
        reject(error);
      } else {
        resolve(this);
      }
    });
  });
}

function all(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (error, rows) => {
      if (error) {
        reject(error);
      } else {
        resolve(rows);
      }
    });
  });
}

function get(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (error, row) => {
      if (error) {
        reject(error);
      } else {
        resolve(row);
      }
    });
  });
}

async function initSchema(db) {
  await run(db, 'PRAGMA journal_mode = WAL');
  await run(db, 'PRAGMA foreign_keys = ON');
  await run(db, `
    CREATE TABLE IF NOT EXISTS games (
      id TEXT PRIMARY KEY,
      data TEXT NOT NULL
    )
  `);
  await run(db, `
    CREATE TABLE IF NOT EXISTS emulators (
      id TEXT PRIMARY KEY,
      data TEXT NOT NULL
    )
  `);
  await run(db, `
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      data TEXT NOT NULL
    )
  `);
  await run(db, `
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);
  await run(db, `
    CREATE TABLE IF NOT EXISTS rom_display_names (
      rom_path TEXT PRIMARY KEY,
      display_name TEXT NOT NULL
    )
  `);
  await run(db, `
    CREATE TABLE IF NOT EXISTS metadata (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);
}

async function readJsonData() {
  try {
    const raw = await fs.readFile(JSON_FILE, 'utf8');
    return normalizeData(JSON.parse(raw));
  } catch {
    return cloneDefaultData();
  }
}

async function hasAnyRows(db) {
  const tables = ['games', 'emulators', 'users', 'settings', 'rom_display_names'];
  for (const table of tables) {
    const row = await get(db, `SELECT COUNT(*) AS total FROM ${table}`);
    if (row && row.total > 0) {
      return true;
    }
  }
  return false;
}

async function writeDataToDb(db, data) {
  const normalized = normalizeData(data);

  await run(db, 'BEGIN IMMEDIATE');
  try {
    await run(db, 'DELETE FROM games');
    await run(db, 'DELETE FROM emulators');
    await run(db, 'DELETE FROM users');
    await run(db, 'DELETE FROM settings');
    await run(db, 'DELETE FROM rom_display_names');

    for (const game of normalized.games) {
      await run(db, 'INSERT INTO games (id, data) VALUES (?, ?)', [game.id, JSON.stringify(game)]);
    }

    for (const emulator of normalized.emulators) {
      await run(db, 'INSERT INTO emulators (id, data) VALUES (?, ?)', [emulator.id, JSON.stringify(emulator)]);
    }

    for (const user of normalized.users) {
      await run(db, 'INSERT INTO users (id, data) VALUES (?, ?)', [user.id, JSON.stringify(user)]);
    }

    for (const [key, value] of Object.entries(normalized.settings)) {
      await run(db, 'INSERT INTO settings (key, value) VALUES (?, ?)', [key, JSON.stringify(value)]);
    }

    for (const [romPath, displayName] of Object.entries(normalized.romDisplayNames)) {
      await run(db, 'INSERT INTO rom_display_names (rom_path, display_name) VALUES (?, ?)', [romPath, displayName]);
    }

    await run(db, 'INSERT OR REPLACE INTO metadata (key, value) VALUES (?, ?)', ['json_migrated', '1']);
    await run(db, 'COMMIT');
  } catch (error) {
    await run(db, 'ROLLBACK').catch(() => {});
    throw error;
  }

  return normalized;
}

async function migrateJsonIfNeeded(db) {
  const migrated = await get(db, 'SELECT value FROM metadata WHERE key = ?', ['json_migrated']);
  if (migrated || await hasAnyRows(db)) {
    return;
  }

  const data = await readJsonData();
  await writeDataToDb(db, data);
}

async function getDb() {
  if (!dbPromise) {
    dbPromise = (async () => {
      await fs.mkdir(DATA_DIR, { recursive: true });
      const db = await openDatabase();
      await initSchema(db);
      await migrateJsonIfNeeded(db);
      return db;
    })();
  }

  return dbPromise;
}

function parseRowData(row) {
  try {
    return JSON.parse(row.data);
  } catch {
    return null;
  }
}

async function readData() {
  const db = await getDb();
  const [games, emulators, users, settingsRows, romRows] = await Promise.all([
    all(db, 'SELECT data FROM games ORDER BY rowid'),
    all(db, 'SELECT data FROM emulators ORDER BY rowid'),
    all(db, 'SELECT data FROM users ORDER BY rowid'),
    all(db, 'SELECT key, value FROM settings'),
    all(db, 'SELECT rom_path, display_name FROM rom_display_names')
  ]);

  const settings = {};
  settingsRows.forEach((row) => {
    try {
      settings[row.key] = JSON.parse(row.value);
    } catch {
      settings[row.key] = row.value;
    }
  });

  const romDisplayNames = {};
  romRows.forEach((row) => {
    romDisplayNames[row.rom_path] = row.display_name;
  });

  return normalizeData({
    games: games.map(parseRowData).filter(Boolean),
    emulators: emulators.map(parseRowData).filter(Boolean),
    users: users.map(parseRowData).filter(Boolean),
    settings,
    romDisplayNames
  });
}

async function writeData(data) {
  const db = await getDb();
  return writeDataToDb(db, data);
}

module.exports = {
  DATA_FILE: DB_FILE,
  JSON_FILE,
  DEFAULT_DATA,
  cloneDefaultData,
  normalizeData,
  readData,
  writeData
};
