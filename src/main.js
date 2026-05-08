const { app, BrowserView, BrowserWindow, dialog, ipcMain, shell, screen, session } = require('electron');
const { existsSync } = require('fs');
const fs = require('fs/promises');
const path = require('path');
const { spawn } = require('child_process');
const { DATA_FILE, readData, writeData } = require('./storage');
const ROOT_DIR = path.join(__dirname, '..');

const ROM_DEFAULT_EXTENSIONS = ['.nes', '.sfc', '.smc', '.gba', '.gb', '.gbc', '.n64', '.z64', '.v64', '.iso', '.cue', '.bin', '.chd', '.zip', '.7z'];
const HTTP_TIMEOUT_MS = 12000;
const STEAM_LIBRARY_CACHE_TTL_MS = 1000 * 60 * 30;

let mainWindow;
let launcherBrowserView;
let launcherBrowserPoint = { x: 0, y: 0 };
let launcherBrowserCurrentUrl = '';
let discordNotificationWindow = null;
let lastDiscordUnreadCount = 0;
let lastDiscordPopupAt = 0;
let controllerPausedByGame = false;
let activeGameMonitorToken = 0;
let activeGameMonitorType = null;
let activeGameMonitorStartedAt = 0;
const protonDbSummaryCache = new Map();
const LAUNCHER_ALWAYS_ON_TOP_LEVEL = process.platform === 'darwin' ? 'floating' : 'screen-saver';
const DISCORD_NOTIFICATION_POPUP_MS = 6500;

// Linux can refuse Electron's Chromium sandbox in restricted launch contexts
// such as browser-spawned shells, CI containers, and some hardened sessions.


app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
app.commandLine.appendSwitch('disable-dev-shm-usage');

function createId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function ok(message = 'Operacao concluida.', extra = {}) {
  return { ok: true, message, ...extra };
}

function fail(message, extra = {}) {
  return { ok: false, message, ...extra };
}

function withTimeout(promise, ms, message) {
  let timeout;
  const timeoutPromise = new Promise((_, reject) => {
    timeout = setTimeout(() => reject(new Error(message)), ms);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeout));
}

// helpers / utils

function normalizeCategory(category) {
  return String(category || 'Outros').trim() || 'Outros';
}

function getGameSortName(game) {
  return String(game.nome || game.title || '').trim();
}

function getGameGroupPriority(game) {
  const type = game.tipo || game.type;

  if (type === 'steam') return 1;
  if (type === 'rom') return 2;

  return 3;
}

function sortGamesSteamFirst(games = []) {
  return [...games].sort((a, b) => {
    const groupCompare = getGameGroupPriority(a) - getGameGroupPriority(b);

    if (groupCompare !== 0) {
      return groupCompare;
    }

    return getGameSortName(a).localeCompare(getGameSortName(b), 'pt-BR', {
      sensitivity: 'base',
      numeric: true
    });
  });
}

function sortGamesByName(games = []) {
  return [...games].sort((a, b) =>
    String(a.nome || a.title || '')
      .localeCompare(String(b.nome || b.title || ''), 'pt-BR', {
        sensitivity: 'base',
        numeric: true
      })
  );
}

function getAppIconPath() {
  const preferred = process.platform === 'win32'
    ? path.join(__dirname, 'ico', 'ico.ico')
    : path.join(__dirname, 'ico', 'ico.png');
  const fallback = process.platform === 'win32'
    ? path.join(__dirname, 'ico', 'ico.png')
    : path.join(__dirname, 'ico', 'ico.ico');

  if (existsSync(preferred)) return preferred;
  if (existsSync(fallback)) return fallback;
  return undefined;
}

function isExecutableInput(value) {
  return /[\\/]/.test(value || '') || /\.(exe|bat|cmd|sh|app|AppImage)$/i.test(value || '');
}

function parseExtensions(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => (item.startsWith('.') ? item : `.${item}`));
}

function toUiUser(user) {
  return {
    id: user.id,
    nome: user.nome || user.name || '',
    retroachievements_username: user.retroachievements_username || user.retroachievementsUser || '',
    steam_id: user.steam_id || user.steamUser || '',
    active: Boolean(user.active)
  };
}

function fromUiUser(user) {
  const normalized = toUiUser(user);
  return {
    id: normalized.id,
    name: normalized.nome,
    nome: normalized.nome,
    retroachievementsUser: normalized.retroachievements_username,
    retroachievements_username: normalized.retroachievements_username,
    steamUser: normalized.steam_id,
    steam_id: normalized.steam_id,
    active: normalized.active
  };
}

function toUiGame(game) {
  const type = game.tipo || game.type || (game.path ? 'executavel' : 'steam');
  const appId = game.app_id || game.appId || '';
  const filePath = game.caminho || game.path || '';

  return {
    ...game,
    id: game.id,
    nome: game.nome || game.title || '',
    tipo: type === 'executable' ? 'executavel' : type,
    app_id: appId,
    caminho: filePath,
    categoria: normalizeCategory(game.categoria || game.category),
    imagem: game.imagem || game.image || '',
    trailer: game.trailer || '',
    descricao: game.descricao || game.description || '',
    playtime_forever: Number(game.playtime_forever ?? game.playtimeForever ?? 0) || 0,
    playtime_2weeks: Number(game.playtime_2weeks ?? game.playtime2Weeks ?? 0) || 0
  };
}

function fromUiGame(game) {
  const normalized = toUiGame(game);
  return {
    ...normalized,
    title: normalized.nome,
    type: normalized.tipo === 'executavel' ? 'executable' : normalized.tipo,
    appId: normalized.app_id,
    path: normalized.caminho,
    category: normalized.categoria,
    playtimeForever: normalized.playtime_forever,
    playtime2Weeks: normalized.playtime_2weeks
  };
}

function toUiEmulator(emulator) {
  return {
    ...emulator,
    id: emulator.id,
    nome: emulator.nome || emulator.name || '',
    name: emulator.name || emulator.nome || '',
    retroarch_path: emulator.retroarch_path || emulator.retroArchPath || '',
    retroArchPath: emulator.retroArchPath || emulator.retroarch_path || '',
    core_path: emulator.core_path || emulator.corePath || '',
    corePath: emulator.corePath || emulator.core_path || '',
    roms_path: emulator.roms_path || emulator.romsPath || '',
    romsPath: emulator.romsPath || emulator.roms_path || '',
    extensions: parseExtensions(emulator.extensions || emulator.extensoes || emulator.extensoes_aceitas || [])
  };
}

function fromUiEmulator(emulator) {
  const normalized = toUiEmulator(emulator);
  return {
    ...normalized,
    name: normalized.nome,
    retroArchPath: normalized.retroarch_path,
    corePath: normalized.core_path,
    romsPath: normalized.roms_path
  };
}

function buildLaunchItem(jogo) {
  const game = toUiGame(jogo);

  if (game.tipo === 'steam') {
    if (!game.app_id) {
      return null;
    }

    return { type: 'steam', appId: game.app_id, title: game.nome };
  }

  if (game.tipo === 'lutris') {
    return {
      type: 'lutris',
      lutrisId: game.lutris_id || game.app_id,
      title: game.nome
    };
  }

  if (game.tipo === 'executavel') {
    return { type: 'executable', path: game.caminho, title: game.nome };
  }

  if (game.tipo === 'rom') {
    return {
      type: 'rom',
      path: game.caminho,
      title: game.nome,
      emulatorId: game.emulador_id || game.emulatorId
    };
  }

  return null;
}

async function resolveGameForLaunch(jogo) {
  if (jogo && typeof jogo === 'object') {
    return jogo;
  }

  const gameId = String(jogo || '').trim();
  if (!gameId) {
    return null;
  }

  if (/^\d+$/.test(gameId)) {
    return { id: `steam:${gameId}`, nome: `Steam ${gameId}`, tipo: 'steam', app_id: gameId };
  }

  const data = await readData();
  const savedGame = data.games.find((game) => game.id === gameId);
  if (savedGame) {
    return savedGame;
  }

  const rom = (await listRoms(data)).find((game) => game.id === gameId);
  return rom || null;
}

async function listRoms(data) {
  const emulators = data.emulators.map(toUiEmulator);
  const romGroups = await Promise.all(emulators.map(async (emulator) => {
    const roms = await withTimeout(
      scanDirectoryForRoms(emulator),
      5000,
      `Tempo esgotado ao escanear ROMs de ${emulator.nome || emulator.id}`
    ).catch((error) => {
      console.warn(`Falha ao escanear ROMs de ${emulator.nome || emulator.id}:`, error.message);
      return [];
    });
    return roms.map((rom) => {
      const extension = path.extname(rom.path);
      return fromUiGame({
        id: rom.id,
        nome: data.romDisplayNames[rom.path] || rom.title,
        tipo: 'rom',
        caminho: rom.path,
        categoria: 'Retro',
        emulador: emulator.nome,
        emulador_id: emulator.id,
        emulatorId: emulator.id,
        retroarch_path: emulator.retroArchPath,
        retroArchPath: emulator.retroArchPath,
        core: emulator.corePath,
        core_path: emulator.corePath,
        corePath: emulator.corePath,
        roms_path: emulator.romsPath,
        romsPath: emulator.romsPath,
        extensions: emulator.extensions,
        extensao: extension
      });
    });
  }));

  return romGroups.flat();
}

async function listAllUiGames() {
  const data = await readData();

  const savedGames = data.games.map(toUiGame);
  const installedSteamAppIds = await getInstalledSteamAppIds().catch((error) => {
    console.warn('Falha ao verificar jogos Steam instalados:', error.message);
    return new Set();
  });

  const roms = await listRoms(data).catch((error) => {
    console.warn('Falha ao listar ROMs. Jogos salvos serao carregados mesmo assim:', error.message);
    return [];
  });

  const enrichedSavedGames = await Promise.all(
    savedGames.map((game) => enrichSteamInstallStatus(game, installedSteamAppIds))
  );

  return [
    ...enrichedSavedGames,
    ...roms.map(toUiGame)
  ];
}

async function addOrEditGame({ id, nome, appIdOuCaminho, categoria }) {
  const data = await readData();
  const type = isExecutableInput(appIdOuCaminho) ? 'executavel' : 'steam';
  const jogo = fromUiGame({
    id: id || createId(type),
    nome: String(nome || '').trim(),
    tipo: type,
    app_id: type === 'steam' ? String(appIdOuCaminho || '').trim() : '',
    caminho: type === 'executavel' ? String(appIdOuCaminho || '').trim() : '',
    categoria: normalizeCategory(categoria)
  });

  if (!jogo.nome || (!jogo.app_id && !jogo.caminho)) {
    return fail('Informe nome e App ID/caminho do jogo.');
  }

  const oldIndex = data.games.findIndex((game) => game.id === jogo.id);
  if (oldIndex >= 0) {
    data.games[oldIndex] = jogo;
  } else {
    data.games.push(jogo);
  }

  await writeData(data);
  return ok('Jogo salvo.', { jogo: await enrichSteamInstallStatus(jogo) });
}

async function enrichSteamInstallStatus(game, installedSteamAppIds = null) {
  const normalized = toUiGame(game);

  if (normalized.tipo !== 'steam' || !normalized.app_id) {
    return normalized;
  }

  const installed = installedSteamAppIds
    ? installedSteamAppIds.has(String(normalized.app_id))
    : await isSteamGameInstalled(normalized.app_id);

  return {
    ...normalized,
    installed,
    install_required: !installed
  };
}

async function addOrEditLutrisGame({ id, nome, lutrisId, categoria }) {
  const data = await readData();
  const jogo = fromUiGame({
    id: id || createId('lutris'),
    nome: String(nome || '').trim(),
    tipo: 'lutris',
    app_id: String(lutrisId || '').trim(),
    categoria: normalizeCategory(categoria || 'Lutris')
  });

  if (!jogo.nome || !jogo.app_id) {
    return fail('Informe nome e ID do jogo Lutris.');
  }

  const oldIndex = data.games.findIndex((game) => game.id === jogo.id);
  if (oldIndex >= 0) {
    data.games[oldIndex] = jogo;
  } else {
    data.games.push(jogo);
  }

  await writeData(data);
  return ok('Jogo Lutris salvo.', { jogo: toUiGame(jogo) });
}

async function unsupportedSystemAutomation() {
  return fail('Automacao de mouse/teclado do sistema ainda nao foi reimplementada no Electron.');
}

async function fetchJson(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), HTTP_TIMEOUT_MS);

  let response;
  try {
    response = await fetch(url, {
      signal: controller.signal,
      headers: {
        accept: 'application/json',
        'user-agent': 'BitRustLauncher/1.0'
      }
    });
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error(`Tempo esgotado ao acessar ${new URL(String(url)).hostname}`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return response.json();
}

async function fetchJsonWithHeaders(url, headers = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), HTTP_TIMEOUT_MS);

  let response;
  try {
    response = await fetch(url, {
      signal: controller.signal,
      headers: {
        accept: 'application/json',
        'user-agent': 'BitRustLauncher/1.0',
        ...headers
      }
    });
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error(`Tempo esgotado ao acessar ${new URL(String(url)).hostname}`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return response.json();
}

function absoluteRetroUrl(value) {
  if (!value) {
    return '';
  }

  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  return `https://retroachievements.org${value.startsWith('/') ? '' : '/'}${value}`;
}

function retroBadgeUrl(value) {
  if (!value) {
    return '';
  }

  if (/^https?:\/\//i.test(value) || value.startsWith('/Badge/')) {
    return absoluteRetroUrl(value);
  }

  return `https://retroachievements.org/Badge/${value}.png`;
}

function normalizeRetroProfile(profile) {
  return {
    username: profile.User || profile.user || '',
    motto: profile.Motto || profile.motto || '',
    rich_presence: profile.RichPresenceMsg || profile.richPresenceMsg || '',
    total_points: profile.TotalPoints || profile.totalPoints || 0,
    true_points: profile.TotalTruePoints || profile.totalTruePoints || 0,
    rank: profile.Rank || profile.rank || '-',
    user_pic: absoluteRetroUrl(profile.UserPic || profile.userPic || '')
  };
}

function normalizeRetroAchievement(achievement) {
  return {
    title: achievement.Title || achievement.title || '',
    description: achievement.Description || achievement.description || '',
    game: achievement.GameTitle || achievement.gameTitle || achievement.game || '',
    console: achievement.ConsoleName || achievement.consoleName || achievement.console || '',
    points: achievement.Points || achievement.points || 0,
    true_ratio: achievement.TrueRatio || achievement.trueRatio || 0,
    type: achievement.Type || achievement.type || '',
    author: achievement.Author || achievement.author || '',
    unlocks_count: achievement.UnlocksCount || achievement.unlocksCount || 0,
    hardcore_unlocks_count: achievement.UnlocksHardcoreCount || achievement.unlocksHardcoreCount || 0,
    badge: retroBadgeUrl(achievement.BadgeURL || achievement.badgeUrl || achievement.BadgeName || achievement.badgeName || '')
  };
}

async function getRetroApiKey() {
  const data = await readData();
  const key = String(data.settings.retroachievementsApiKey || '').trim();

  if (!key) {
    return { data, error: 'Configure a chave da API do RetroAchievements nas configuracoes.' };
  }

  return { data, key };
}

function getActiveRetroUsername(data, fallback = '') {
  const activeUser = data.users.map(toUiUser).find((user) => user.active);
  return String(fallback || activeUser?.retroachievements_username || '').trim();
}

async function getRetroUserProfile(username) {
  const { data, key, error } = await getRetroApiKey();
  const targetUser = getActiveRetroUsername(data, username);

  if (error) {
    return fail(error);
  }

  if (!targetUser) {
    return fail('Informe o usuario RetroAchievements no perfil ativo.');
  }

  const profileUrl = new URL('https://retroachievements.org/API/API_GetUserProfile.php');
  profileUrl.searchParams.set('y', key);
  profileUrl.searchParams.set('u', targetUser);

  const recentUrl = new URL('https://retroachievements.org/API/API_GetUserRecentAchievements.php');
  recentUrl.searchParams.set('y', key);
  recentUrl.searchParams.set('u', targetUser);
  recentUrl.searchParams.set('m', '10080');

  const [profile, recentAchievements] = await Promise.all([
    fetchJson(profileUrl),
    fetchJson(recentUrl).catch(() => [])
  ]);

  const achievements = (Array.isArray(recentAchievements) ? recentAchievements : [])
    .slice(0, 12)
    .map(normalizeRetroAchievement);

  const recentGames = [];
  const seenGames = new Set();
  (Array.isArray(recentAchievements) ? recentAchievements : []).forEach((achievement) => {
    const gameId = achievement.GameID || achievement.gameId || achievement.GameTitle || achievement.gameTitle;
    if (seenGames.has(gameId)) {
      return;
    }

    seenGames.add(gameId);
    recentGames.push({
      title: achievement.GameTitle || achievement.gameTitle || '',
      console: achievement.ConsoleName || achievement.consoleName || '',
      achievements_total: achievement.Points || achievement.points || 0,
      image: absoluteRetroUrl(achievement.GameIcon || achievement.gameIcon || '')
    });
  });

  return ok('Perfil RetroAchievements carregado.', {
    mode: 'retro',
    profile: normalizeRetroProfile(profile),
    achievements,
    recent_games: recentGames.slice(0, 8)
  });
}

async function getRetroAchievementOfTheWeek() {
  const { key, error } = await getRetroApiKey();

  if (error) {
    return fail(error);
  }

  const url = new URL('https://retroachievements.org/API/API_GetAchievementOfTheWeek.php');
  url.searchParams.set('y', key);

  const payload = await fetchJson(url);
  const achievement = payload.Achievement || payload.achievement || {};
  const game = payload.Game || payload.game || {};
  const consoleInfo = payload.Console || payload.console || {};
  const unlocks = payload.Unlocks || payload.unlocks || [];

  return ok('Conquista da semana carregada.', {
    mode: 'week',
    profile: {
      username: 'Achievement of the Week',
      motto: game.Title || game.title || '',
      rich_presence: payload.StartAt || payload.startAt || '',
      total_points: achievement.Points || achievement.points || 0,
      true_points: achievement.TrueRatio || achievement.trueRatio || 0,
      rank: payload.TotalPlayers || payload.totalPlayers || '-',
      user_pic: retroBadgeUrl(achievement.BadgeURL || achievement.BadgeName || achievement.badgeUrl || achievement.badgeName || '')
    },
    achievements: [{
      title: achievement.Title || achievement.title || '',
      description: achievement.Description || achievement.description || '',
      game: game.Title || game.title || '',
      console: consoleInfo.Title || consoleInfo.title || '',
      points: achievement.Points || achievement.points || 0,
      true_ratio: achievement.TrueRatio || achievement.trueRatio || 0,
      type: achievement.Type || achievement.type || '',
      author: achievement.Author || achievement.author || '',
      unlocks_count: payload.UnlocksCount || payload.unlocksCount || 0,
      hardcore_unlocks_count: payload.UnlocksHardcoreCount || payload.unlocksHardcoreCount || 0,
      badge: retroBadgeUrl(achievement.BadgeURL || achievement.BadgeName || achievement.badgeUrl || achievement.badgeName || '')
    }],
    recent_games: (Array.isArray(unlocks) ? unlocks : []).slice(0, 10).map((unlock) => ({
      title: unlock.User || unlock.user || '',
      console: unlock.DateAwarded || unlock.dateAwarded || '',
      achievements_total: unlock.RAPoints || unlock.rAPoints || 0,
      image: ''
    }))
  });
}

function extractSteamVanity(value) {
  const cleaned = String(value || '').trim();
  if (/^\d{17}$/.test(cleaned)) {
    return { steamId: cleaned };
  }

  const match = cleaned.match(/steamcommunity\.com\/(?:id|profiles)\/([^/?#]+)/i);
  if (match) {
    const token = decodeURIComponent(match[1]);
    return /^\d{17}$/.test(token) ? { steamId: token } : { vanity: token };
  }

  return { vanity: cleaned.replace(/^@/, '') };
}

async function resolveSteamId(input, key) {
  const parsed = extractSteamVanity(input);
  if (parsed.steamId) {
    return parsed.steamId;
  }

  if (!parsed.vanity) {
    throw new Error('Informe SteamID64, usuario ou link da Steam.');
  }

  const url = new URL('https://api.steampowered.com/ISteamUser/ResolveVanityURL/v1/');
  url.searchParams.set('key', key);
  url.searchParams.set('vanityurl', parsed.vanity);

  const payload = await fetchJson(url);
  if (payload.response?.success !== 1 || !payload.response?.steamid) {
    throw new Error('Nao foi possivel resolver o usuario Steam para SteamID64.');
  }

  return payload.response.steamid;
}

async function getSteamProfile(steamInput) {
  const data = await readData();
  const key = String(data.settings.steamApiKey || '').trim();
  const activeUser = data.users.map(toUiUser).find((user) => user.active);
  const input = String(steamInput || activeUser?.steam_id || '').trim();

  if (!key) {
    return fail('Configure a chave da API da Steam nas configuracoes.');
  }

  if (!input) {
    return fail('Informe SteamID64, usuario ou link da Steam no perfil ativo.');
  }

  const steamId = await resolveSteamId(input, key);
  const summariesUrl = new URL('https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/');
  summariesUrl.searchParams.set('key', key);
  summariesUrl.searchParams.set('steamids', steamId);

  const ownedUrl = new URL('https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/');
  ownedUrl.searchParams.set('key', key);
  ownedUrl.searchParams.set('steamid', steamId);
  ownedUrl.searchParams.set('format', 'json');
  ownedUrl.searchParams.set('include_appinfo', '1');
  ownedUrl.searchParams.set('include_played_free_games', '1');

  const friendsUrl = new URL('https://api.steampowered.com/ISteamUser/GetFriendList/v1/');
  friendsUrl.searchParams.set('key', key);
  friendsUrl.searchParams.set('steamid', steamId);
  friendsUrl.searchParams.set('relationship', 'friend');

  const recentUrl = new URL('https://api.steampowered.com/IPlayerService/GetRecentlyPlayedGames/v1/');
  recentUrl.searchParams.set('key', key);
  recentUrl.searchParams.set('steamid', steamId);
  recentUrl.searchParams.set('format', 'json');
  recentUrl.searchParams.set('count', '8');

  const [summaryPayload, ownedPayload, friendsPayload, recentPayload] = await Promise.all([
    fetchJson(summariesUrl),
    fetchJson(ownedUrl).catch(() => ({ response: {} })),
    fetchJson(friendsUrl).catch(() => ({ friendslist: { friends: [] } })),
    fetchJson(recentUrl).catch(() => ({ response: {} }))
  ]);

  const player = summaryPayload.response?.players?.[0];
  if (!player) {
    return fail('Perfil Steam nao encontrado.');
  }

  const gameCount = ownedPayload.response?.game_count || ownedPayload.response?.games?.length || 0;
  const friendCount = friendsPayload.friendslist?.friends?.length || 0;
  const recentGames = recentPayload.response?.games || [];

  return ok('Perfil Steam carregado.', {
    mode: 'steam',
    profile: {
      steam_id: steamId,
      persona_name: player.personaname || '',
      real_name: player.realname || '',
      profile_url: player.profileurl || '',
      avatar_medium: player.avatarmedium || '',
      avatar_full: player.avatarfull || player.avatarmedium || '',
      persona_state: player.personastate ?? 0,
      country: player.loccountrycode || '',
      game_count: gameCount,
      friend_count: friendCount,
      visibility_state: player.communityvisibilitystate === 3 ? 'Publico' : 'Privado'
    },
    recent_games: recentGames.map((game) => ({
      title: game.name || `App ${game.appid}`,
      image: `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${game.appid}/header.jpg`,
      playtime_2weeks: game.playtime_2weeks || 0,
      playtime_forever: game.playtime_forever || 0
    }))
  });
}

async function getProtonDbSummary(appId) {
  const cleanAppId = String(appId || '').trim();

  if (!/^\d+$/.test(cleanAppId)) {
    return fail('App ID invalido para consulta no ProtonDB.');
  }

  if (protonDbSummaryCache.has(cleanAppId)) {
    return ok('Resumo ProtonDB carregado.', protonDbSummaryCache.get(cleanAppId));
  }

  const url = `https://www.protondb.com/api/v1/reports/summaries/${cleanAppId}.json`;
  const payload = await fetchJson(url);
  const summary = {
    appId: cleanAppId,
    bestReportedTier: payload.bestReportedTier || '',
    confidence: payload.confidence || '',
    score: Number(payload.score || 0) || 0,
    tier: payload.tier || '',
    total: Number(payload.total || 0) || 0
  };

  protonDbSummaryCache.set(cleanAppId, summary);
  return ok('Resumo ProtonDB carregado.', summary);
}

function isSteamLibraryCacheValid(cache) {
  return cache
    && Array.isArray(cache.games)
    && Number(cache.updatedAt || 0) > 0
    && Date.now() - Number(cache.updatedAt) < STEAM_LIBRARY_CACHE_TTL_MS;
}

async function getCachedSteamLibrary() {
  const data = await readData();
  const cache = data.settings.steamLibraryCache;

  if (isSteamLibraryCacheValid(cache)) {
    return cache.games;
  }

  return null;
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function commandExists(command) {
  return new Promise((resolve) => {
    const checker = process.platform === 'win32' ? 'where' : 'which';
    const child = spawn(checker, [command], {
      stdio: 'ignore',
      shell: process.platform === 'win32'
    });
    child.on('exit', (code) => resolve(code === 0));
    child.on('error', () => resolve(false));
  });
}

function parseVdfString(content, key) {
  const match = content.match(new RegExp(`"${key}"\\s+"([^"]*)"`, 'i'));
  return match ? match[1] : '';
}

async function readSteamLibraryFolders() {
  const home = process.env.HOME || process.env.USERPROFILE || '';
  const programFilesX86 = process.env['ProgramFiles(x86)'] || '';
  const programFiles = process.env.ProgramFiles || '';
  const candidates = unique([
    path.join(home, '.steam', 'steam', 'config', 'libraryfolders.vdf'),
    path.join(home, '.steam', 'root', 'config', 'libraryfolders.vdf'),
    path.join(home, '.local', 'share', 'Steam', 'config', 'libraryfolders.vdf'),
    path.join(home, '.local', 'share', 'Steam', 'steamapps', 'libraryfolders.vdf'),
    path.join(home, '.var', 'app', 'com.valvesoftware.Steam', '.local', 'share', 'Steam', 'config', 'libraryfolders.vdf'),
    path.join(home, '.var', 'app', 'com.valvesoftware.Steam', '.local', 'share', 'Steam', 'steamapps', 'libraryfolders.vdf'),
    path.join(programFilesX86, 'Steam', 'steamapps', 'libraryfolders.vdf'),
    path.join(programFiles, 'Steam', 'steamapps', 'libraryfolders.vdf')
  ]);

  const folders = [];
  for (const candidate of candidates) {
    if (!(await pathExists(candidate))) {
      continue;
    }

    const root = path.dirname(path.dirname(candidate));
    folders.push(root);

    const content = await fs.readFile(candidate, 'utf8');
    for (const match of content.matchAll(/"path"\s+"([^"]+)"/g)) {
      folders.push(match[1].replaceAll('\\\\', '\\'));
    }
  }

  return unique(folders);
}

async function isSteamGameInstalled(appId) {
  const installedAppIds = await getInstalledSteamAppIds();
  return installedAppIds.has(String(appId || '').trim());
}

async function getInstalledSteamAppIds() {
  const folders = await readSteamLibraryFolders();
  const installedAppIds = new Set();

  for (const folder of folders) {
    const steamapps = path.join(folder, 'steamapps');
    let entries = [];
    try {
      entries = await fs.readdir(steamapps, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      if (!entry.isFile() || !/^appmanifest_\d+\.acf$/i.test(entry.name)) {
        continue;
      }

      const appId = entry.name.match(/\d+/)?.[0];
      if (appId) {
        installedAppIds.add(appId);
      }
    }
  }

  return installedAppIds;
}

function shouldSkipLocalSteamApp(name) {
  return /^(proton|steam linux runtime|steamworks common redistributables|steamworks sdk redist)/i.test(name || '');
}

async function readLocalSteamGames() {
  const folders = await readSteamLibraryFolders();
  const games = [];

  for (const folder of folders) {
    const steamapps = path.join(folder, 'steamapps');
    let entries = [];
    try {
      entries = await fs.readdir(steamapps, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      if (!entry.isFile() || !/^appmanifest_\d+\.acf$/i.test(entry.name)) {
        continue;
      }

      const manifestPath = path.join(steamapps, entry.name);
      const content = await fs.readFile(manifestPath, 'utf8').catch(() => '');
      const appId = parseVdfString(content, 'appid') || entry.name.match(/\d+/)?.[0] || '';
      const name = parseVdfString(content, 'name') || `Steam ${appId}`;

      if (!appId || shouldSkipLocalSteamApp(name)) {
        continue;
      }

      games.push({ appid: appId, name, source: 'local' });
    }
  }

  return games;
}

async function readSteamApiGames(activeUser, steamApiKey) {
  if (!steamApiKey) {
    throw new Error('Configure a chave da API da Steam nas configuracoes.');
  }

  if (!activeUser?.steam_id) {
    throw new Error('Informe SteamID64, usuario ou link da Steam no perfil ativo.');
  }

  const steamId = await resolveSteamId(activeUser.steam_id, steamApiKey);
  const url = new URL('https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/');
  url.searchParams.set('key', steamApiKey);
  url.searchParams.set('steamid', steamId);
  url.searchParams.set('format', 'json');
  url.searchParams.set('include_appinfo', '1');
  url.searchParams.set('include_played_free_games', '1');
  url.searchParams.set('include_free_sub', '1');

  const payload = await fetchJson(url);
  return (payload.response?.games || []).map((game) => ({ ...game, source: 'api' }));
}

async function fetchSteamGridDbCover(appId) {
  const cleanAppId = String(appId || '').trim();
  if (!/^\d+$/.test(cleanAppId)) {
    return fail('App ID invalido para consulta no SteamGridDB.');
  }

  const data = await readData();
  const key = String(data.settings.steamGridDbApiKey || '').trim();
  if (!key) {
    return fail('Configure a API Key do SteamGridDB.');
  }

  const payload = await fetchJsonWithHeaders(
    `https://www.steamgriddb.com/api/v2/grids/steam/${cleanAppId}`,
    { Authorization: `Bearer ${key}` }
  );
  const image = Array.isArray(payload.data) ? payload.data.find((item) => item?.url) : null;

  return image?.url ? ok('Capa SteamGridDB carregada.', { image: image.url }) : fail('Nenhuma capa encontrada no SteamGridDB.');
}

function createWindow() {
  const appIconPath = getAppIconPath();
  mainWindow = new BrowserWindow({
    title: 'Bit&Rust Launcher',
    width: 1280,
    height: 800,
    ...(appIconPath ? { icon: appIconPath } : {}),
    minWidth: 960,
    minHeight: 620,
    backgroundColor: '#101114',
    fullscreen: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true
    }
  });

  mainWindow.removeMenu()
  mainWindow.setAlwaysOnTop(false, LAUNCHER_ALWAYS_ON_TOP_LEVEL);
  mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  mainWindow.loadFile(path.join(ROOT_DIR, 'interface', 'index.html'));

  mainWindow.on('closed', () => {
    destroyLauncherBrowserView();
    mainWindow = null;
  });

  mainWindow.on('focus', releaseGameMonitorOnLauncherFocus);
  mainWindow.on('restore', releaseGameMonitorOnLauncherFocus);
  mainWindow.on('show', releaseGameMonitorOnLauncherFocus);
}

function isStorePageOpen() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return false;
  }

  return mainWindow.webContents.getURL().includes('/interface/webapp.html');
}

function returnToGamesFromStore() {
  if (!isStorePageOpen()) {
    return;
  }

  destroyLauncherBrowserView();
  mainWindow.webContents.send('launcher:return-to-games');
}

function normalizeWebUrl(value) {
  const raw = String(value || '').trim();
  if (!raw) {
    throw new Error('URL vazia.');
  }

  const url = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  const parsed = new URL(url);
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('Apenas URLs http e https podem abrir no launcher.');
  }

  return parsed.toString();
}

function isDiscordUrl(value) {
  try {
    const host = new URL(String(value || '')).hostname.toLowerCase();
    return host === 'discord.com' || host.endsWith('.discord.com');
  } catch {
    return false;
  }
}

function escapeNotificationHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getDiscordUnreadCount(title) {
  const match = String(title || '').match(/^\((\d+)\)\s+/);
  return match ? Number(match[1]) || 0 : 0;
}

function showDiscordNotificationPopup(message = 'Nova mensagem no Discord') {
  const now = Date.now();
  if (now - lastDiscordPopupAt < 1200) {
    return;
  }

  lastDiscordPopupAt = now;

  if (discordNotificationWindow && !discordNotificationWindow.isDestroyed()) {
    discordNotificationWindow.close();
  }

  const display = screen.getPrimaryDisplay();
  const area = display.workArea;
  const width = 360;
  const height = 104;
  const x = Math.round(area.x + area.width - width - 24);
  const y = Math.round(area.y + 24);

  discordNotificationWindow = new BrowserWindow({
    width,
    height,
    x,
    y,
    frame: false,
    transparent: true,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    closable: true,
    focusable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    show: false,
    backgroundColor: '#00000000',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  discordNotificationWindow.setAlwaysOnTop(true, LAUNCHER_ALWAYS_ON_TOP_LEVEL);
  discordNotificationWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  discordNotificationWindow.setIgnoreMouseEvents(true);

  const safeMessage = escapeNotificationHtml(message);
  const html = `
<!doctype html>
<html>
<head>
<meta charset="utf-8">
<style>
html, body {
  width: 100%;
  height: 100%;
  margin: 0;
  overflow: hidden;
  font-family: "Segoe UI", Arial, sans-serif;
  background: transparent;
}
.popup {
  height: calc(100% - 16px);
  margin: 8px;
  display: grid;
  grid-template-columns: 48px 1fr;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  color: #f7f8ff;
  background: linear-gradient(135deg, rgba(32, 38, 69, 0.96), rgba(12, 16, 28, 0.96));
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 12px;
  box-shadow: 0 18px 48px rgba(0, 0, 0, 0.45);
}
.icon {
  width: 48px;
  height: 48px;
  display: grid;
  place-items: center;
  border-radius: 12px;
  background: #5865f2;
  font-size: 27px;
  font-weight: 900;
}
strong {
  display: block;
  margin-bottom: 3px;
  font-size: 15px;
  line-height: 1.2;
}
span {
  display: block;
  color: #c9d0ff;
  font-size: 13px;
  line-height: 1.35;
}
</style>
</head>
<body>
  <div class="popup">
    <div class="icon">D</div>
    <div>
      <strong>Discord</strong>
      <span>${safeMessage}</span>
    </div>
  </div>
</body>
</html>`;

  discordNotificationWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
  discordNotificationWindow.once('ready-to-show', () => {
    if (!discordNotificationWindow?.isDestroyed()) {
      discordNotificationWindow.showInactive();
    }
  });
  discordNotificationWindow.on('closed', () => {
    discordNotificationWindow = null;
  });

  setTimeout(() => {
    if (discordNotificationWindow && !discordNotificationWindow.isDestroyed()) {
      discordNotificationWindow.close();
    }
  }, DISCORD_NOTIFICATION_POPUP_MS);
}

function handleDiscordTitleForPopup(title) {
  if (!isDiscordUrl(launcherBrowserCurrentUrl)) {
    lastDiscordUnreadCount = 0;
    return;
  }

  const unreadCount = getDiscordUnreadCount(title);
  if (unreadCount > lastDiscordUnreadCount) {
    const suffix = unreadCount === 1 ? 'mensagem nova' : `${unreadCount} mensagens novas`;
    showDiscordNotificationPopup(`Voce tem ${suffix}.`);
  }

  lastDiscordUnreadCount = unreadCount;
}

function normalizeBrowserBounds(bounds = {}) {
  const windowBounds = mainWindow?.getContentBounds() || { width: 1280, height: 800 };
  const x = Math.max(0, Math.round(Number(bounds.x) || 0));
  const y = Math.max(0, Math.round(Number(bounds.y) || 0));
  const maxWidth = Math.max(320, windowBounds.width - x);
  const maxHeight = Math.max(240, windowBounds.height - y);
  const width = Math.max(320, Math.min(maxWidth, Math.round(Number(bounds.width) || maxWidth)));
  const height = Math.max(240, Math.min(maxHeight, Math.round(Number(bounds.height) || maxHeight)));

  return { x, y, width, height };
}

function ensureLauncherBrowserView() {
  if (launcherBrowserView) {
    return launcherBrowserView;
  }

  launcherBrowserView = new BrowserView({
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  launcherBrowserView.webContents.setWindowOpenHandler(({ url }) => {
    launcherBrowserView.webContents.loadURL(url);
    return { action: 'deny' };
  });

  launcherBrowserView.webContents.on('will-navigate', (event, url) => {
    if (!/^https?:\/\//i.test(url)) {
      event.preventDefault();
    }
  });

  launcherBrowserView.webContents.on('did-navigate', (_event, url) => {
    launcherBrowserCurrentUrl = url;
    if (!isDiscordUrl(url)) {
      lastDiscordUnreadCount = 0;
    }
  });

  launcherBrowserView.webContents.on('did-navigate-in-page', (_event, url) => {
    launcherBrowserCurrentUrl = url;
    if (!isDiscordUrl(url)) {
      lastDiscordUnreadCount = 0;
    }
  });

  launcherBrowserView.webContents.on('page-title-updated', (_event, title) => {
    handleDiscordTitleForPopup(title);
  });

  mainWindow.addBrowserView(launcherBrowserView);
  return launcherBrowserView;
}

function destroyLauncherBrowserView() {
  if (!launcherBrowserView) {
    return;
  }

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.removeBrowserView(launcherBrowserView);
  }

  if (!launcherBrowserView.webContents.isDestroyed()) {
    launcherBrowserView.webContents.destroy();
  }

  launcherBrowserView = null;
  launcherBrowserPoint = { x: 0, y: 0 };
  launcherBrowserCurrentUrl = '';
  lastDiscordUnreadCount = 0;
}

function setLauncherBrowserBounds(bounds) {
  if (!launcherBrowserView) {
    return null;
  }

  const normalized = normalizeBrowserBounds(bounds);
  launcherBrowserView.setBounds(normalized);
  return normalized;
}

function sendBrowserMouseMove(x, y) {
  if (!launcherBrowserView) {
    return fail('Nenhuma pagina aberta no launcher.');
  }

  const bounds = launcherBrowserView.getBounds();
  launcherBrowserPoint = {
    x: Math.max(0, Math.min(bounds.width - 1, Math.round(Number(x) || 0))),
    y: Math.max(0, Math.min(bounds.height - 1, Math.round(Number(y) || 0)))
  };

  launcherBrowserView.webContents.sendInputEvent({
    type: 'mouseMove',
    x: launcherBrowserPoint.x,
    y: launcherBrowserPoint.y,
    movementX: 0,
    movementY: 0
  });

  return ok('Mouse movido.');
}

function sendBrowserClick(button = 'left') {
  if (!launcherBrowserView) {
    return fail('Nenhuma pagina aberta no launcher.');
  }

  const mouseButton = button === 'right' ? 'right' : 'left';
  launcherBrowserView.webContents.sendInputEvent({
    type: 'mouseDown',
    button: mouseButton,
    clickCount: 1,
    x: launcherBrowserPoint.x,
    y: launcherBrowserPoint.y
  });
  launcherBrowserView.webContents.sendInputEvent({
    type: 'mouseUp',
    button: mouseButton,
    clickCount: 1,
    x: launcherBrowserPoint.x,
    y: launcherBrowserPoint.y
  });

  return ok('Clique enviado.');
}

function sendBrowserKey(key) {
  if (!launcherBrowserView) {
    return fail('Nenhuma pagina aberta no launcher.');
  }

  const keyMap = {
    Return: 'Enter',
    BackSpace: 'Backspace',
    space: 'Space',
    Space: 'Space'
  };
  const keyCode = keyMap[key] || String(key || '');
  launcherBrowserView.webContents.sendInputEvent({ type: 'keyDown', keyCode });
  launcherBrowserView.webContents.sendInputEvent({ type: 'keyUp', keyCode });
  return ok('Tecla enviada.');
}

async function pickFile(options = {}) {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    ...options
  });

  return result.canceled ? null : result.filePaths[0];
}

async function pickDirectory(options = {}) {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    ...options
  });

  return result.canceled ? null : result.filePaths[0];
}

async function scanDirectoryForRoms(emulator) {
  if (!emulator || !emulator.romsPath) {
    return [];
  }

  const allowed = (emulator.extensions && emulator.extensions.length ? emulator.extensions : ROM_DEFAULT_EXTENSIONS)
    .map((ext) => ext.trim().toLowerCase())
    .filter(Boolean)
    .map((ext) => (ext.startsWith('.') ? ext : `.${ext}`));

  let entries = [];
  try {
    entries = await fs.readdir(emulator.romsPath, { withFileTypes: true });
  } catch {
    return [];
  }

  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => path.join(emulator.romsPath, entry.name))
    .filter((filePath) => allowed.includes(path.extname(filePath).toLowerCase()))
    .map((filePath) => {
      const title = path.basename(filePath, path.extname(filePath));
      return {
        id: `rom:${emulator.id}:${filePath}`,
        type: 'rom',
        title,
        path: filePath,
        emulatorId: emulator.id,
        emulatorName: emulator.name
      };
    });
}

function launchDetached(command, args = []) {
  const child = spawn(command, args, {
    detached: true,
    stdio: 'ignore',
    shell: process.platform === 'win32',
    env: buildChildEnv()
  });
  child.unref();
}

function runPowerCommand(action) {
  const commands = {
    win32: {
      restart: { command: 'shutdown.exe', args: ['/r', '/t', '0'] },
      shutdown: { command: 'shutdown.exe', args: ['/s', '/t', '0'] }
    },
    linux: {
      restart: { command: 'systemctl', args: ['reboot'] },
      shutdown: { command: 'systemctl', args: ['poweroff'] }
    }
  };

  const platformCommands = commands[process.platform];
  const selected = platformCommands?.[action];

  if (!selected) {
    return fail('Recurso disponivel apenas no Linux e Windows.');
  }

  try {
    launchDetached(selected.command, selected.args);
    return ok(action === 'restart' ? 'Reiniciando o sistema.' : 'Desligando o sistema.');
  } catch (error) {
    return fail(`Nao foi possivel executar o comando: ${error.message}`);
  }
}

function buildChildEnv() {
  const env = { ...process.env };
  delete env.ELECTRON_RUN_AS_NODE;
  delete env.NODE_OPTIONS;
  delete env.ELECTRON_ENABLE_LOGGING;
  delete env.ELECTRON_NO_ATTACH_CONSOLE;
  return env;
}

function launchAndCheck(command, args = [], monitorToken = null) {
  return new Promise((resolve) => {
    let settled = false;
    let output = '';
    const child = spawn(command, args, {
      detached: true,
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: process.platform === 'win32',
      env: buildChildEnv(),
      cwd: process.env.HOME || ROOT_DIR
    });

    const finish = (result) => {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timer);
      resolve(result);
    };

    const appendOutput = (chunk) => {
      output = `${output}${chunk.toString()}`.slice(-1600);
    };

    const timer = setTimeout(() => {
      child.unref();
      finish({ ok: true });
    }, 3500);

    child.stdout?.on('data', appendOutput);
    child.stderr?.on('data', appendOutput);

    child.on('error', (error) => {
      finish({ ok: false, message: error.message });
    });

    child.on('exit', (code, signal) => {
      if (settled) {
        finishGameMonitor(monitorToken);
        return;
      }

      const cleanOutput = output.trim();
      if (code === 0) {
        finish({ ok: true, message: cleanOutput });
        return;
      }

      finish({
        ok: false,
        message: explainLaunchFailure(cleanOutput || `Processo encerrou com codigo ${code ?? signal}.`)
      });
    });
  });
}

function setLauncherControllerPaused(paused) {
  controllerPausedByGame = Boolean(paused);
  mainWindow?.webContents.send('launcher:controller-paused', controllerPausedByGame);
}

  function keepLauncherFixedOnTop() {
    if (!mainWindow || mainWindow.isDestroyed()) {
      return false;
    }

    mainWindow.setAlwaysOnTop(true, LAUNCHER_ALWAYS_ON_TOP_LEVEL);

    try {
      mainWindow.setVisibleOnAllWorkspaces(false, { visibleOnFullScreen: true });
    } catch {
      // Some window managers do not support this flag; always-on-top still helps.
    }

    return true;
  } 

function bringLauncherToFront() {
  if (!keepLauncherFixedOnTop()) {
    return fail('Janela do launcher indisponivel.');
  }

  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }

  if (!mainWindow.isVisible()) {
    mainWindow.show();
  }

  mainWindow.setFullscreen(true);
  mainWindow.moveTop();
  mainWindow.focus();

  return ok('Foco retornado ao launcher.');
}

function focusLauncherWindow() {
  const response = bringLauncherToFront();

  if (!response.ok) {
    return response;
  }

  releaseGameMonitorOnLauncherFocus(true);

  return response;
}

function beginGameMonitor(type = 'external') {
  activeGameMonitorToken += 1;
  activeGameMonitorType = type;
  activeGameMonitorStartedAt = Date.now();
  setLauncherControllerPaused(true);
  return activeGameMonitorToken;
}

function finishGameMonitor(token) {
  if (!token || token !== activeGameMonitorToken) {
    return;
  }

  setLauncherControllerPaused(false);
  activeGameMonitorType = null;
  activeGameMonitorStartedAt = 0;
  bringLauncherToFront();
}

function releaseGameMonitorOnLauncherFocus(force = false) {
  if (!controllerPausedByGame) {
    return;
  }

  const token = activeGameMonitorToken;
  const minFocusReleaseDelayMs = 2 * 60 * 1000;
  const elapsed = Date.now() - activeGameMonitorStartedAt;

  if (!force && elapsed < minFocusReleaseDelayMs) {
    scheduleGameMonitorTick(
      token,
      () => {
        if (mainWindow?.isFocused()) {
          releaseGameMonitorOnLauncherFocus();
        }
      },
      minFocusReleaseDelayMs - elapsed
    );
    return;
  }

  activeGameMonitorToken += 1;
  activeGameMonitorType = null;
  activeGameMonitorStartedAt = 0;
  setLauncherControllerPaused(false);
}

function scheduleGameMonitorTick(token, callback, delay = 2000) {
  setTimeout(() => {
    if (token !== activeGameMonitorToken) {
      return;
    }

    callback();
  }, delay);
}

async function readTextFile(filePath) {
  try {
    return await fs.readFile(filePath, 'utf8');
  } catch {
    return '';
  }
}

async function processHasSteamAppId(pid, appId) {
  const procDir = path.join('/proc', pid);
  const [cmdline, environ] = await Promise.all([
    readTextFile(path.join(procDir, 'cmdline')),
    readTextFile(path.join(procDir, 'environ'))
  ]);

  const normalizedCommand = cmdline.replace(/\0/g, ' ');
  const normalizedEnv = environ.replace(/\0/g, '\n');
  const steamAppPattern = new RegExp(`(?:SteamAppId|SteamGameId|STEAM_COMPAT_APP_ID|SteamAppID)=${appId}(?:\\n|$)`);

  if (steamAppPattern.test(normalizedEnv)) {
    return true;
  }

  return new RegExp(`(?:steam://rungameid/|applaunch\\s+| -applaunch\\s+)${appId}(?:\\D|$)`, 'i').test(normalizedCommand);
}

async function isSteamAppProcessRunning(appId) {
  if (process.platform !== 'linux') {
    return false;
  }

  let entries = [];
  try {
    entries = await fs.readdir('/proc', { withFileTypes: true });
  } catch {
    return false;
  }

  for (const entry of entries) {
    if (!entry.isDirectory() || !/^\d+$/.test(entry.name) || Number(entry.name) === process.pid) {
      continue;
    }

    if (await processHasSteamAppId(entry.name, appId)) {
      return true;
    }
  }

  return false;
}

function monitorSteamGame(appId, token) {
  if (process.platform !== 'linux') {
    scheduleGameMonitorTick(token, () => finishGameMonitor(token), 5 * 60 * 1000);
    return;
  }

  let seenRunning = false;
  const startedAt = Date.now();
  const waitForStartMs = 5 * 60 * 1000;

  const tick = async () => {
    const running = await isSteamAppProcessRunning(appId);

    if (token !== activeGameMonitorToken) {
      return;
    }

    if (running) {
      seenRunning = true;
    }

    if (seenRunning && !running) {
      finishGameMonitor(token);
      return;
    }

    if (!seenRunning && Date.now() - startedAt > waitForStartMs) {
      finishGameMonitor(token);
      return;
    }

    scheduleGameMonitorTick(token, tick);
  };

  scheduleGameMonitorTick(token, tick, 3000);
}

function explainLaunchFailure(message) {
  if (/snap-confine.*apparmor/i.test(message)) {
    return `${message}\n\nRetroArch instalado via Snap nao conseguiu iniciar porque o servico snapd.apparmor nao esta ativo/configurado. Tente iniciar o servico snapd.apparmor ou instalar o RetroArch por outro formato.`;
  }

  return message;
}

async function assertReadable(filePath, label) {
  try {
    await fs.access(filePath);
    return null;
  } catch {
    return `${label} nao encontrado ou sem permissao: ${filePath}`;
  }
}

function retroArchCommand(emulator) {
  const configuredPath = emulator.retroArchPath || '';

  if (configuredPath === '/snap/bin/retroarch') {
    return {
      command: 'snap',
      args: ['run', 'retroarch']
    };
  }

  return {
    command: configuredPath,
    args: []
  };
}

async function openExternalUrl(url) {
  try {
    await shell.openExternal(url);
    return;
  } catch (error) {
    if (process.platform !== 'linux') {
      throw error;
    }
  }

  const opener = process.env.XDG_CURRENT_DESKTOP ? 'xdg-open' : 'gio';
  launchDetached(opener, opener === 'gio' ? ['open', url] : [url]);
}

async function openSteamInstall(appId) {
  await openExternalUrl(`steam://install/${appId}`);
  return ok(`Abrindo instalação do Steam App ID ${appId}.`, {
    install_required: true,
    app_id: appId
  });
}

async function launchItem(item) {
  if (!item) {
    return { ok: false, message: 'Item invalido.' };
  }

  try {

    if (item.type === 'lutris') {
      if (!item.lutrisId) {
        return fail('Jogo Lutris sem ID.');
      }

      const hasLutris = await commandExists('lutris');
      if (!hasLutris) {
        return fail('Lutris não está instalado ou não está no PATH.');
      }

      const monitorToken = beginGameMonitor('external');

      const result = await launchAndCheck(
        'lutris',
        [`lutris:rungameid/${item.lutrisId}`],
        monitorToken
      );

      if (!result.ok) {
        finishGameMonitor(monitorToken);
      }

      return result.ok ? ok('Jogo iniciado pelo Lutris.') : result;
    }
    
    if (item.type === 'steam') {
      if (!item.appId) {
        return { ok: false, message: 'Jogo Steam sem App ID.' };
      }

      const appId = String(item.appId);
      const installed = await isSteamGameInstalled(appId);

      if (!installed) {
        return openSteamInstall(appId);
      }

      const monitorToken = beginGameMonitor('steam');
      await openExternalUrl(`steam://rungameid/${appId}`);
      monitorSteamGame(appId, monitorToken);
      return { ok: true };
    }

    if (item.type === 'web') {
      await openExternalUrl(item.url);
      return { ok: true };
    }

    if (item.type === 'executable') {
      const missing = await assertReadable(item.path, 'Executavel');
      if (missing) {
        return { ok: false, message: missing };
      }

      const monitorToken = beginGameMonitor('external');
      const result = await launchAndCheck(item.path, [], monitorToken);
      if (!result.ok) {
        finishGameMonitor(monitorToken);
      }
      return result;
    }

    if (item.type === 'rom') {
      const data = await readData();
      const emulator = data.emulators.map(toUiEmulator).find((candidate) => candidate.id === item.emulatorId);
      if (!emulator || !emulator.retroArchPath || !emulator.corePath) {
        return { ok: false, message: 'Emulador sem RetroArch ou core configurado.' };
      }

      const missingRetroArch = await assertReadable(emulator.retroArchPath, 'RetroArch');
      const missingCore = await assertReadable(emulator.corePath, 'Core do RetroArch');
      const missingRom = await assertReadable(item.path, 'ROM');
      const missing = missingRetroArch || missingCore || missingRom;
      if (missing) {
        return { ok: false, message: missing };
      }

      const retroArch = retroArchCommand(emulator);
      const monitorToken = beginGameMonitor('external');
      const result = await launchAndCheck(retroArch.command, [...retroArch.args, '-L', emulator.corePath, item.path], monitorToken);
      if (!result.ok) {
        finishGameMonitor(monitorToken);
      }
      return result.ok ? { ok: true } : result;
    }

    return { ok: false, message: 'Tipo de item desconhecido.' };
  } catch (error) {
    setLauncherControllerPaused(false);
    return { ok: false, message: error.message };
  }
}

ipcMain.handle('data:read', readData);
ipcMain.handle('data:write', async (_event, data) => writeData(data));

ipcMain.handle('dialog:pickFile', async (_event, options) => pickFile(options));
ipcMain.handle('dialog:pickDirectory', async (_event, options) => pickDirectory(options));

ipcMain.handle('library:scanRoms', async (_event, emulators) => {
  const result = await Promise.all((Array.isArray(emulators) ? emulators : []).map(scanDirectoryForRoms));
  return result.flat();
});

ipcMain.handle('launcher:launch', async (_event, item) => launchItem(item));
ipcMain.handle('launcher:focus', () => focusLauncherWindow());
ipcMain.handle('app:dataPath', async () => DATA_FILE);
ipcMain.handle('app:createId', async (_event, prefix) => createId(prefix || 'item'));

ipcMain.handle('py:sair_launcher', () => {
  app.quit();
  return ok('Launcher encerrado.');
});

ipcMain.handle('py:obter_estado_intro', async () => {
  const data = await readData();
  return { ok: true, mostrar_intro: data.settings.introSeen !== true };
});

ipcMain.handle('py:marcar_intro_exibida', async () => {
  const data = await readData();
  data.settings.introSeen = true;
  await writeData(data);
  return ok('Abertura marcada como exibida.');
});

ipcMain.handle('py:listar_jogos', async () => listAllUiGames());

ipcMain.handle('py:adicionar_jogo_steam', async (_event, nome, appIdOuCaminho, categoria) => (
  addOrEditGame({ nome, appIdOuCaminho, categoria })
));

ipcMain.handle('py:editar_jogo_adicionado', async (_event, id, nome, appIdOuCaminho, categoria) => (
  addOrEditGame({ id, nome, appIdOuCaminho, categoria })
));

ipcMain.handle('py:excluir_jogo_adicionado', async (_event, id) => {
  const data = await readData();
  const before = data.games.length;
  data.games = data.games.filter((game) => game.id !== id);

  if (data.games.length === before) {
    return fail('Apenas jogos adicionados manualmente podem ser excluidos aqui.');
  }

  await writeData(data);
  return ok('Jogo excluido.');
});

ipcMain.handle('py:iniciar_jogo', async (_event, jogo) => {
  const resolvedGame = await resolveGameForLaunch(jogo);
  if (!resolvedGame) {
    return fail('Jogo nao encontrado na biblioteca.');
  }

  const item = buildLaunchItem(resolvedGame);
  if (!item) {
    return fail('Tipo de jogo desconhecido ou jogo sem dados de inicializacao.');
  }

  const response = await launchItem(item);
  if (!response.ok) {
    return response;
  }

  return {
    ...response,
    message: response.message || (item.type === 'steam' ? `Abrindo Steam App ID ${item.appId}.` : 'Jogo iniciado.')
  };
});

ipcMain.handle('py:adicionar_jogo_lutris', async (_event, nome, lutrisId, categoria) => (
  addOrEditLutrisGame({ nome, lutrisId, categoria })
));

ipcMain.handle('py:editar_jogo_lutris', async (_event, id, nome, lutrisId, categoria) => (
  addOrEditLutrisGame({ id, nome, lutrisId, categoria })
));

ipcMain.handle('py:adicionar_emulador', async (_event, nome, retroarchPath, corePath, romsPath, extensions) => {
  const data = await readData();
  const emulator = fromUiEmulator({
    id: createId('emulator'),
    nome: String(nome || '').trim(),
    retroarch_path: String(retroarchPath || '').trim(),
    core_path: String(corePath || '').trim(),
    roms_path: String(romsPath || '').trim(),
    extensions: parseExtensions(extensions)
  });

  if (!emulator.nome || !emulator.retroArchPath || !emulator.corePath || !emulator.romsPath) {
    return fail('Informe nome, RetroArch, core e pasta de ROMs.');
  }

  data.emulators.push(emulator);
  await writeData(data);
  const roms = await listRoms(data);
  return ok('Emulador salvo.', { emulador: toUiEmulator(emulator), roms: roms.filter((rom) => rom.emulador_id === emulator.id).map(toUiGame) });
});

ipcMain.handle('py:editar_emulador', async (_event, id, nome, retroarchPath, corePath, romsPath, extensions) => {
  const data = await readData();
  const emulatorIndex = data.emulators.findIndex((emulator) => toUiEmulator(emulator).id === id);

  if (emulatorIndex < 0) {
    return fail('Emulador nao encontrado.');
  }

  const emulator = fromUiEmulator({
    ...toUiEmulator(data.emulators[emulatorIndex]),
    id,
    nome: String(nome || '').trim(),
    retroarch_path: String(retroarchPath || '').trim(),
    core_path: String(corePath || '').trim(),
    roms_path: String(romsPath || '').trim(),
    extensions: parseExtensions(extensions)
  });

  if (!emulator.nome || !emulator.retroArchPath || !emulator.corePath || !emulator.romsPath) {
    return fail('Informe nome, RetroArch, core e pasta de ROMs.');
  }

  data.emulators[emulatorIndex] = emulator;
  await writeData(data);
  const roms = await listRoms(data);
  return ok('Emulador atualizado.', { emulador: toUiEmulator(emulator), roms: roms.filter((rom) => rom.emulador_id === emulator.id).map(toUiGame) });
});

ipcMain.handle('py:alterar_nome_exibicao_rom', async (_event, id, nome) => {
  const data = await readData();
  const roms = await listRoms(data);
  const rom = roms.find((candidate) => candidate.id === id);

  if (!rom) {
    return fail('ROM nao encontrada.');
  }

  data.romDisplayNames[rom.caminho] = String(nome || '').trim();
  await writeData(data);
  const updated = { ...rom, nome: data.romDisplayNames[rom.caminho] };
  return ok('Nome de exibicao salvo.', { jogo: toUiGame(updated) });
});

ipcMain.handle('py:salvar_steam_config', async (_event, key) => {
  const data = await readData();
  data.settings.steamApiKey = String(key || '').trim();
  await writeData(data);
  return ok('Chave da Steam salva.');
});

ipcMain.handle('py:obter_steam_config', async () => {
  const data = await readData();
  return { ok: true, configured: Boolean(data.settings.steamApiKey), steam_api_configured: Boolean(data.settings.steamApiKey) };
});

ipcMain.handle('py:limpar_cache_steam', async () => {
  const data = await readData();
  data.settings.steamLibraryCache = { updatedAt: 0, games: [] };
  await writeData(data);
  return ok('Cache da Steam limpo.');
});

ipcMain.handle('py:obter_protondb_resumo', async (_event, appId) => {
  try {
    return await getProtonDbSummary(appId);
  } catch (error) {
    return fail(`Erro ao consultar ProtonDB: ${error.message}`);
  }
});

ipcMain.handle('py:salvar_steamgriddb_config', async (_event, key) => {
  const data = await readData();
  data.settings.steamGridDbApiKey = String(key || '').trim();
  await writeData(data);
  return ok('Chave do SteamGridDB salva.');
});

ipcMain.handle('py:obter_steamgriddb_config', async () => {
  const data = await readData();
  return { ok: true, configured: Boolean(data.settings.steamGridDbApiKey), steamgriddb_api_configured: Boolean(data.settings.steamGridDbApiKey) };
});

ipcMain.handle('py:obter_steamgriddb_capa', async (_event, appId) => {
  try {
    return await fetchSteamGridDbCover(appId);
  } catch (error) {
    return fail(`Erro ao consultar SteamGridDB: ${error.message}`);
  }
});

ipcMain.handle('py:salvar_retroachievements_config', async (_event, key) => {
  const data = await readData();
  data.settings.retroachievementsApiKey = String(key || '').trim();
  await writeData(data);
  return ok('Chave do RetroAchievements salva.');
});

ipcMain.handle('py:obter_configuracoes_perfil', async () => {
  const data = await readData();
  return {
    ok: true,
    retroachievements_api_configured: Boolean(data.settings.retroachievementsApiKey),
    steam_api_configured: Boolean(data.settings.steamApiKey)
  };
});

ipcMain.handle('py:salvar_configuracoes_perfil', async (_event, retroKey, steamKey, retroUser, steamUser) => {
  const data = await readData();
  if (String(retroKey || '').trim()) {
    data.settings.retroachievementsApiKey = String(retroKey).trim();
  }
  if (String(steamKey || '').trim()) {
    data.settings.steamApiKey = String(steamKey).trim();
  }

  if (String(retroUser || steamUser || '').trim()) {
    const activeUserIndex = data.users.findIndex((user) => user.active);
    if (activeUserIndex >= 0) {
      const activeUser = fromUiUser(data.users[activeUserIndex]);
      if (String(retroUser || '').trim()) {
        activeUser.retroachievements_username = String(retroUser).trim();
        activeUser.retroachievementsUser = String(retroUser).trim();
      }
      if (String(steamUser || '').trim()) {
        activeUser.steam_id = String(steamUser).trim();
        activeUser.steamUser = String(steamUser).trim();
      }
      data.users[activeUserIndex] = activeUser;
    }
  }

  await writeData(data);
  return ok('Configuracoes salvas.');
});

ipcMain.handle('py:listar_usuarios', async () => {
  const data = await readData();
  return { ok: true, usuarios: data.users.map(toUiUser) };
});

ipcMain.handle('py:adicionar_usuario', async (_event, nome, retroUsername, steamId, active) => {
  const data = await readData();
  const user = fromUiUser({
    id: createId('user'),
    nome: String(nome || '').trim(),
    retroachievements_username: String(retroUsername || '').trim(),
    steam_id: String(steamId || '').trim(),
    active: Boolean(active) || data.users.length === 0
  });

  if (!user.nome) {
    return fail('Informe o nome do usuario.');
  }

  if (user.active) {
    data.users = data.users.map((candidate) => ({ ...candidate, active: false }));
  }

  data.users.push(user);
  await writeData(data);
  return ok('Usuario salvo.', { usuario: toUiUser(user) });
});

ipcMain.handle('py:editar_usuario', async (_event, id, nome, retroUsername, steamId, active) => {
  const data = await readData();
  const userIndex = data.users.findIndex((user) => user.id === id);

  if (userIndex < 0) {
    return fail('Usuario nao encontrado.');
  }

  const user = fromUiUser({
    id,
    nome: String(nome || '').trim(),
    retroachievements_username: String(retroUsername || '').trim(),
    steam_id: String(steamId || '').trim(),
    active: Boolean(active)
  });

  if (!user.nome) {
    return fail('Informe o nome do usuario.');
  }

  if (user.active) {
    data.users = data.users.map((candidate) => ({ ...fromUiUser(candidate), active: false }));
  }

  data.users[userIndex] = user;
  if (!data.users.some((candidate) => candidate.active) && data.users[0]) {
    data.users[0].active = true;
  }

  await writeData(data);
  return ok('Usuario atualizado.', { usuario: toUiUser(user) });
});

ipcMain.handle('py:selecionar_usuario', async (_event, id) => {
  const data = await readData();
  const exists = data.users.some((user) => user.id === id);

  if (!exists) {
    return fail('Usuario nao encontrado.');
  }

  data.users = data.users.map((user) => ({ ...fromUiUser(user), active: user.id === id }));
  await writeData(data);
  return ok('Usuario ativo atualizado.');
});

ipcMain.handle('py:excluir_usuario', async (_event, id) => {
  const data = await readData();
  data.users = data.users.filter((user) => user.id !== id).map(fromUiUser);
  if (!data.users.some((user) => user.active) && data.users[0]) {
    data.users[0].active = true;
  }
  await writeData(data);
  return ok('Usuario excluido.');
});

ipcMain.handle('py:obter_usuario_ativo', async () => {
  const data = await readData();
  const user = data.users.map(toUiUser).find((candidate) => candidate.active);
  return user ? ok('Usuario ativo carregado.', { usuario: user }) : fail('Nenhum usuario ativo.', { usuario: null });
});

function mergeSteamLibraryIntoData(data, steamGames) {
  const gamesByAppId = new Map();
  steamGames.forEach((steamGame) => {
    const appId = String(steamGame.appid || '').trim();
    if (!appId) {
      return;
    }

    const current = gamesByAppId.get(appId);
    if (!current || current.source === 'local') {
      gamesByAppId.set(appId, steamGame);
    }
  });

  const imported = [];
  const updated = [];

  gamesByAppId.forEach((steamGame) => {
    const appId = String(steamGame.appid);
    const existingIndex = data.games.findIndex((game) => String(toUiGame(game).app_id) === appId);
    const playtime = {
      playtime_forever: Number(steamGame.playtime_forever || 0),
      playtime_2weeks: Number(steamGame.playtime_2weeks || 0)
    };

    if (existingIndex >= 0) {
      const existing = toUiGame(data.games[existingIndex]);
      const merged = fromUiGame({
        ...existing,
        nome: existing.nome || steamGame.name || `Steam ${appId}`,
        ...playtime
      });
      data.games[existingIndex] = merged;
      updated.push(toUiGame(merged));
      return;
    }

    const game = fromUiGame({
      id: createId('steam'),
      nome: steamGame.name || `Steam ${appId}`,
      tipo: 'steam',
      app_id: appId,
      categoria: 'Outros',
      ...playtime
    });
    data.games.push(game);
    imported.push(toUiGame(game));
  });

  return { gamesByAppId, imported, updated };
}

ipcMain.handle('py:importar_biblioteca_steam', async () => {
  const data = await readData();
  const activeUser = data.users.map(toUiUser).find((user) => user.active);

  try {
    let apiGames = [];
    let localGames = [];

    try {
      apiGames = await readSteamApiGames(activeUser, data.settings.steamApiKey);
    } catch (error) {
      return fail(`Nao foi possivel importar a biblioteca completa da Steam: ${error.message}`);
    }

    if (!apiGames.length) {
      return fail('A Steam Web API nao retornou jogos. Verifique se a Steam API Key esta correta, se o SteamID do perfil ativo esta certo e se a biblioteca do perfil esta publica.');
    }

    localGames = await readLocalSteamGames().catch((error) => {
      console.warn('Falha ao ler biblioteca local da Steam:', error.message);
      return [];
    });

    const steamGames = [...apiGames, ...localGames];
    data.settings.steamLibraryCache = {
      updatedAt: Date.now(),
      games: steamGames
    };

    const { gamesByAppId, imported, updated } = mergeSteamLibraryIntoData(data, steamGames);
    await writeData(data);
    const installedSteamAppIds = await getInstalledSteamAppIds().catch((error) => {
      console.warn('Falha ao verificar jogos Steam instalados:', error.message);
      return new Set();
    });
    const jogos = await Promise.all(
      [...imported, ...updated].map((game) => enrichSteamInstallStatus(game, installedSteamAppIds))
    );
    const sourceLabel = `${apiGames.length} pela Web API, ${localGames.length} instalados localmente como complemento`;
    return ok(`${imported.length} jogos novos importados da Steam. ${updated.length} jogos atualizados com dados da Steam. Encontrados: ${gamesByAppId.size} (${sourceLabel}).`, { jogos });
  } catch (error) {
    return fail(`Erro ao importar biblioteca Steam: ${error.message}`);
  }
});

ipcMain.handle('py:obter_retroachievements_perfil', async () => {
  try {
    return await getRetroAchievementOfTheWeek();
  } catch (error) {
    return fail(`Erro ao consultar RetroAchievements: ${error.message}`);
  }
});

ipcMain.handle('py:obter_retroachievements_usuario', async (_event, username) => {
  try {
    return await getRetroUserProfile(username);
  } catch (error) {
    return fail(`Erro ao consultar RetroAchievements: ${error.message}`);
  }
});

ipcMain.handle('py:obter_steam_usuario', async (_event, steamInput) => {
  try {
    return await getSteamProfile(steamInput);
  } catch (error) {
    return fail(`Erro ao consultar Steam: ${error.message}`);
  }
});

ipcMain.handle('py:obter_resolucao_atual', () => {
  const size = screen.getPrimaryDisplay().size;
  return { ok: true, width: size.width, height: size.height, label: `${size.width}x${size.height}` };
});

ipcMain.handle('py:alterar_resolucao', async (_event, label) => {
  const data = await readData();
  data.settings.resolution = String(label || '').trim();
  await writeData(data);
  return ok('Resolucao preferida salva. A troca real de resolucao do sistema nao e feita pelo Electron.');
});

ipcMain.handle('py:reiniciar_sistema', () => runPowerCommand('restart'));
ipcMain.handle('py:desligar_sistema', () => runPowerCommand('shutdown'));

ipcMain.handle('py:controles_suportados', () => ok('Controles via HTML5 Gamepad API.', {
  controles: ['Xbox/SDL via Gamepad API', 'PlayStation/SDL via Gamepad API', 'Nintendo/SDL via Gamepad API', 'Controles genericos compatíveis com navegador']
}));

ipcMain.handle('py:info_controle_atual', () => ({ ok: true, nome: 'Detectado pela Gamepad API do navegador' }));

ipcMain.handle('py:abrir_url_sistema', async (_event, url) => {
  try {
    await shell.openExternal(String(url || ''));
    return ok('URL aberta no sistema.');
  } catch (error) {
    return fail(error.message);
  }
});

ipcMain.handle('py:abrir_url_launcher', async (_event, url, _title, bounds) => {
  try {
    const normalizedUrl = normalizeWebUrl(url);
    const view = ensureLauncherBrowserView();
    const normalizedBounds = setLauncherBrowserBounds(bounds);
    launcherBrowserCurrentUrl = normalizedUrl;
    lastDiscordUnreadCount = 0;
    launcherBrowserPoint = {
      x: Math.round(normalizedBounds.width / 2),
      y: Math.round(normalizedBounds.height / 2)
    };
    await view.webContents.loadURL(normalizedUrl);
    sendBrowserMouseMove(launcherBrowserPoint.x, launcherBrowserPoint.y);
    return ok('URL aberta no navegador interno do launcher.', { bounds: normalizedBounds });
  } catch (error) {
    destroyLauncherBrowserView();
    return fail(error.message);
  }
});

ipcMain.handle('py:fechar_url_launcher', () => {
  destroyLauncherBrowserView();
  return ok('Navegador interno fechado.');
});

ipcMain.handle('py:posicionar_url_launcher', (_event, bounds) => {
  const normalizedBounds = setLauncherBrowserBounds(bounds);
  return normalizedBounds ? ok('Navegador reposicionado.', { bounds: normalizedBounds }) : fail('Nenhuma pagina aberta no launcher.');
});

ipcMain.handle('py:recarregar_url_launcher', () => {
  if (!launcherBrowserView) {
    return fail('Nenhuma pagina aberta no launcher.');
  }

  launcherBrowserView.webContents.reload();
  return ok('Pagina recarregada.');
});

ipcMain.handle('py:voltar_url_launcher', () => {
  if (!launcherBrowserView) {
    return fail('Nenhuma pagina aberta no launcher.', { shouldClose: true });
  }

  if (launcherBrowserView.webContents.canGoBack()) {
    launcherBrowserView.webContents.goBack();
    return ok('Voltando na pagina.', { shouldClose: false });
  }

  return ok('Sem historico de navegacao.', { shouldClose: true });
});

ipcMain.handle('py:mover_mouse_sistema', (_event, x, y) => sendBrowserMouseMove(x, y));
ipcMain.handle('py:mover_mouse_relativo_sistema', (_event, dx, dy) => {
  const nextX = launcherBrowserPoint.x + (Number(dx) || 0);
  const nextY = launcherBrowserPoint.y + (Number(dy) || 0);
  return sendBrowserMouseMove(nextX, nextY);
});
ipcMain.handle('py:clicar_mouse_sistema', () => sendBrowserClick('left'));
ipcMain.handle('py:clicar_mouse_direito_sistema', () => sendBrowserClick('right'));
ipcMain.handle('py:rolar_mouse_sistema', (_event, direction) => {
  if (!launcherBrowserView) {
    return fail('Nenhuma pagina aberta no launcher.');
  }

  launcherBrowserView.webContents.sendInputEvent({
    type: 'mouseWheel',
    x: launcherBrowserPoint.x,
    y: launcherBrowserPoint.y,
    deltaY: direction === 'up' ? 520 : -520,
    wheelTicksY: direction === 'up' ? 3 : -3
  });
  return ok('Rolagem enviada.');
});
ipcMain.handle('py:tecla_sistema', (_event, key) => sendBrowserKey(key));
ipcMain.handle('py:digitar_texto_sistema', (_event, text) => {
  if (!launcherBrowserView) {
    return fail('Nenhuma pagina aberta no launcher.');
  }

  launcherBrowserView.webContents.insertText(String(text || ''));
  return ok('Texto digitado.');
});

app.whenReady().then(() => {
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    if (permission === 'notifications' && isDiscordUrl(webContents.getURL())) {
      callback(true);
      return;
    }

    callback(false);
  });

  session.defaultSession.setPermissionCheckHandler((webContents, permission, requestingOrigin) => {
    const origin = requestingOrigin || webContents?.getURL?.() || '';
    return permission === 'notifications' && isDiscordUrl(origin);
  });

  app.on('web-contents-created', (_event, contents) => {
    contents.on('before-input-event', (inputEvent, input) => {
      if (input.type !== 'keyDown' || input.key !== 'Escape' || !isStorePageOpen()) {
        return;
      }

      inputEvent.preventDefault();
      returnToGamesFromStore();
    });
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
