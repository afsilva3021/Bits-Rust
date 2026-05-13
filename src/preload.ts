// @ts-nocheck
const { clipboard, contextBridge, ipcRenderer, webUtils } = require('electron');

const launcherAPI = {
  readData: () => ipcRenderer.invoke('data:read'),
  writeData: (data) => ipcRenderer.invoke('data:write', data),
  pickFile: (options) => ipcRenderer.invoke('dialog:pickFile', options),
  pickDirectory: (options) => ipcRenderer.invoke('dialog:pickDirectory', options),
  scanRoms: (emulators) => ipcRenderer.invoke('library:scanRoms', emulators),
  launch: (item) => ipcRenderer.invoke('launcher:launch', item),
  focusLauncher: () => ipcRenderer.invoke('launcher:focus'),
  readClipboardText: () => clipboard.readText(),
  writeClipboardText: (text) => clipboard.writeText(String(text || '')),
  dataPath: () => ipcRenderer.invoke('app:dataPath'),
  createId: (prefix) => ipcRenderer.invoke('app:createId', prefix),
  getPathForFile: (file) => webUtils.getPathForFile(file),
  onReturnToGames: (callback) => {
    const listener = () => callback();
    ipcRenderer.on('launcher:return-to-games', listener);
    return () => ipcRenderer.removeListener('launcher:return-to-games', listener);
  },
  onControllerPaused: (callback) => {
    const listener = (_event, paused) => callback(Boolean(paused));
    ipcRenderer.on('launcher:controller-paused', listener);
    return () => ipcRenderer.removeListener('launcher:controller-paused', listener);
  },
  onNativeBrowserControllerAction: (callback) => {
    const listener = (_event, action, payload) => callback(String(action || ''), payload || {});
    ipcRenderer.on('launcher:native-browser-controller-action', listener);
    return () => ipcRenderer.removeListener('launcher:native-browser-controller-action', listener);
  }
};

const pywebviewApi = {
  sair_launcher: () => ipcRenderer.invoke('py:sair_launcher'),
  obter_estado_intro: () => ipcRenderer.invoke('py:obter_estado_intro'),
  marcar_intro_exibida: () => ipcRenderer.invoke('py:marcar_intro_exibida'),
  listar_jogos: () => ipcRenderer.invoke('py:listar_jogos'),
  adicionar_jogo_steam: (nome, appIdOuCaminho, categoria) => ipcRenderer.invoke('py:adicionar_jogo_steam', nome, appIdOuCaminho, categoria),
  editar_jogo_adicionado: (id, nome, appIdOuCaminho, categoria) => ipcRenderer.invoke('py:editar_jogo_adicionado', id, nome, appIdOuCaminho, categoria),
  adicionar_jogo_lutris: (nome, lutrisId, categoria) => ipcRenderer.invoke('py:adicionar_jogo_lutris', nome, lutrisId, categoria),
  editar_jogo_lutris: (id, nome, lutrisId, categoria) => ipcRenderer.invoke('py:editar_jogo_lutris', id, nome, lutrisId, categoria),
  excluir_jogo_adicionado: (id) => ipcRenderer.invoke('py:excluir_jogo_adicionado', id),
  iniciar_jogo: (jogo) => ipcRenderer.invoke('py:iniciar_jogo', jogo),
  adicionar_emulador: (nome, retroarchPath, corePath, romsPath, extensions) => ipcRenderer.invoke('py:adicionar_emulador', nome, retroarchPath, corePath, romsPath, extensions),
  editar_emulador: (id, nome, retroarchPath, corePath, romsPath, extensions) => ipcRenderer.invoke('py:editar_emulador', id, nome, retroarchPath, corePath, romsPath, extensions),
  alterar_nome_exibicao_rom: (id, nome) => ipcRenderer.invoke('py:alterar_nome_exibicao_rom', id, nome),
  importar_biblioteca_steam: () => ipcRenderer.invoke('py:importar_biblioteca_steam'),
  salvar_steam_config: (key) => ipcRenderer.invoke('py:salvar_steam_config', key),
  obter_steam_config: () => ipcRenderer.invoke('py:obter_steam_config'),
  limpar_cache_steam: () => ipcRenderer.invoke('py:limpar_cache_steam'),
  obter_protondb_resumo: (appId) => ipcRenderer.invoke('py:obter_protondb_resumo', appId),
  salvar_steamgriddb_config: (key) => ipcRenderer.invoke('py:salvar_steamgriddb_config', key),
  obter_steamgriddb_config: () => ipcRenderer.invoke('py:obter_steamgriddb_config'),
  obter_steamgriddb_capa: (appId) => ipcRenderer.invoke('py:obter_steamgriddb_capa', appId),
  salvar_retroachievements_config: (key) => ipcRenderer.invoke('py:salvar_retroachievements_config', key),
  obter_retroachievements_perfil: () => ipcRenderer.invoke('py:obter_retroachievements_perfil'),
  obter_retroachievements_usuario: (username) => ipcRenderer.invoke('py:obter_retroachievements_usuario', username),
  obter_steam_usuario: (steamId) => ipcRenderer.invoke('py:obter_steam_usuario', steamId),
  listar_usuarios: () => ipcRenderer.invoke('py:listar_usuarios'),
  adicionar_usuario: (nome, retroUsername, steamId, active) => ipcRenderer.invoke('py:adicionar_usuario', nome, retroUsername, steamId, active),
  editar_usuario: (id, nome, retroUsername, steamId, active) => ipcRenderer.invoke('py:editar_usuario', id, nome, retroUsername, steamId, active),
  selecionar_usuario: (id) => ipcRenderer.invoke('py:selecionar_usuario', id),
  excluir_usuario: (id) => ipcRenderer.invoke('py:excluir_usuario', id),
  obter_usuario_ativo: () => ipcRenderer.invoke('py:obter_usuario_ativo'),
  obter_configuracoes_perfil: () => ipcRenderer.invoke('py:obter_configuracoes_perfil'),
  salvar_configuracoes_perfil: (retroKey, steamKey, retroUser, steamUser) => ipcRenderer.invoke('py:salvar_configuracoes_perfil', retroKey, steamKey, retroUser, steamUser),
  obter_resolucao_atual: () => ipcRenderer.invoke('py:obter_resolucao_atual'),
  alterar_resolucao: (label) => ipcRenderer.invoke('py:alterar_resolucao', label),
  reiniciar_sistema: () => ipcRenderer.invoke('py:reiniciar_sistema'),
  desligar_sistema: () => ipcRenderer.invoke('py:desligar_sistema'),
  controles_suportados: () => ipcRenderer.invoke('py:controles_suportados'),
  info_controle_atual: () => ipcRenderer.invoke('py:info_controle_atual'),
  abrir_url_sistema: (url) => ipcRenderer.invoke('py:abrir_url_sistema', url),
  abrir_url_launcher: (url, title, bounds) => ipcRenderer.invoke('py:abrir_url_launcher', url, title, bounds),
  listar_url_launcher: () => ipcRenderer.invoke('py:listar_url_launcher'),
  registrar_url_launcher: (url, title) => ipcRenderer.invoke('py:registrar_url_launcher', url, title),
  ativar_url_launcher: (tabId, bounds) => ipcRenderer.invoke('py:ativar_url_launcher', tabId, bounds),
  ocultar_url_launcher: () => ipcRenderer.invoke('py:ocultar_url_launcher'),
  fechar_url_launcher: (tabId) => ipcRenderer.invoke('py:fechar_url_launcher', tabId),
  posicionar_url_launcher: (bounds) => ipcRenderer.invoke('py:posicionar_url_launcher', bounds),
  mostrar_teclado_virtual: (state, bounds) => ipcRenderer.invoke('py:mostrar_teclado_virtual', state, bounds),
  atualizar_teclado_virtual: (state, bounds) => ipcRenderer.invoke('py:atualizar_teclado_virtual', state, bounds),
  fechar_teclado_virtual: () => ipcRenderer.invoke('py:fechar_teclado_virtual'),
  recarregar_url_launcher: () => ipcRenderer.invoke('py:recarregar_url_launcher'),
  voltar_url_launcher: () => ipcRenderer.invoke('py:voltar_url_launcher'),
  mover_mouse_sistema: (x, y) => ipcRenderer.invoke('py:mover_mouse_sistema', x, y),
  mover_mouse_relativo_sistema: (dx, dy) => ipcRenderer.invoke('py:mover_mouse_relativo_sistema', dx, dy),
  clicar_mouse_sistema: () => ipcRenderer.invoke('py:clicar_mouse_sistema'),
  clicar_mouse_direito_sistema: () => ipcRenderer.invoke('py:clicar_mouse_direito_sistema'),
  rolar_mouse_sistema: (direction) => ipcRenderer.invoke('py:rolar_mouse_sistema', direction),
  tecla_sistema: (key) => ipcRenderer.invoke('py:tecla_sistema', key),
  digitar_texto_sistema: (text) => ipcRenderer.invoke('py:digitar_texto_sistema', text),
  definir_modo_teclado_navegador: (open) => ipcRenderer.send('launcher:native-browser-keyboard-mode', Boolean(open)),
  definir_modo_modal_navegador: (open) => ipcRenderer.send('launcher:native-browser-modal-mode', Boolean(open))
};

contextBridge.exposeInMainWorld('launcherAPI', launcherAPI);
contextBridge.exposeInMainWorld('pywebview', { api: pywebviewApi });

window.addEventListener('DOMContentLoaded', () => {
  window.dispatchEvent(new Event('pywebviewready'));
});

export {};
