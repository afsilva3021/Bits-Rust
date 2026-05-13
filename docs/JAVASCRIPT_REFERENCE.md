# Referencia JavaScript

Este documento descreve os arquivos JavaScript do projeto e a funcao de cada rotina nomeada. As funcoes estao agrupadas por arquivo para facilitar manutencao.

## `src/storage.js`

Camada de persistencia local em SQLite, com migracao a partir do antigo JSON.

| Funcao | O que faz |
| --- | --- |
| `cloneDefaultData` | Cria uma copia limpa da estrutura padrao de dados. |
| `normalizeData` | Garante que jogos, emuladores, usuarios e configuracoes sempre existam em formato valido. |
| `openDatabase` | Abre o banco SQLite local. |
| `run` | Executa SQL sem retorno de linhas. |
| `all` | Executa SQL e retorna todas as linhas. |
| `get` | Executa SQL e retorna uma unica linha. |
| `initSchema` | Cria as tabelas do banco quando necessario. |
| `readJsonData` | Le o arquivo JSON legado usado antes do SQLite. |
| `hasAnyRows` | Verifica se o banco ja possui dados persistidos. |
| `writeDataToDb` | Grava a estrutura normalizada nas tabelas SQLite. |
| `migrateJsonIfNeeded` | Migra dados do JSON legado para SQLite quando o banco ainda esta vazio. |
| `getDb` | Inicializa e reutiliza a conexao SQLite. |
| `parseRowData` | Converte o campo JSON salvo em uma linha para objeto JavaScript. |
| `readData` | Le todos os dados persistidos e devolve a estrutura usada pelo app. |
| `writeData` | Normaliza e grava todos os dados no banco. |

## `src/main.js`

Processo principal do Electron. Gerencia janela, IPC, Steam, RetroAchievements, SteamGridDB, SQLite, execucao de jogos, navegador integrado, teclado virtual e cursor virtual.

### Utilitarios e conversao de dados

| Funcao | O que faz |
| --- | --- |
| `createId` | Gera IDs locais com prefixo e timestamp. |
| `ok` | Monta resposta IPC de sucesso. |
| `fail` | Monta resposta IPC de erro. |
| `withTimeout` | Limita o tempo de uma Promise. |
| `normalizeCategory` | Normaliza categorias vazias ou ausentes. |
| `getGameSortName` | Define o nome usado para ordenar jogos. |
| `getGameGroupPriority` | Prioriza grupos na ordenacao, com Steam antes dos demais. |
| `sortGamesSteamFirst` | Ordena biblioteca colocando Steam em destaque. |
| `sortGamesByName` | Ordena lista alfabeticamente. |
| `getAppIconPath` | Resolve o caminho do icone do aplicativo. |
| `isExecutableInput` | Detecta se um valor parece caminho de executavel. |
| `parseExtensions` | Converte texto de extensoes em lista normalizada. |
| `toUiUser` | Converte usuario interno para formato usado pela interface. |
| `fromUiUser` | Converte usuario da interface para formato persistido. |
| `toUiGame` | Converte jogo persistido para objeto de UI. |
| `fromUiGame` | Converte jogo recebido da UI para persistencia. |
| `toUiEmulator` | Converte emulador persistido para objeto de UI. |
| `fromUiEmulator` | Converte emulador recebido da UI para persistencia. |

### Biblioteca e jogos

| Funcao | O que faz |
| --- | --- |
| `buildLaunchItem` | Transforma um jogo da UI em item executavel. |
| `resolveGameForLaunch` | Resolve dados finais de um jogo antes de iniciar. |
| `listRoms` | Varre emuladores e gera entradas de ROM detectadas. |
| `listAllUiGames` | Lista jogos salvos e ROMs em formato pronto para a UI. |
| `addOrEditGame` | Cria ou edita jogo Steam/executavel local. |
| `enrichSteamInstallStatus` | Marca jogo Steam como instalado ou nao instalado. |
| `addOrEditLutrisGame` | Cria ou edita jogo Lutris. |
| `scanDirectoryForRoms` | Lista ROMs de uma pasta usando extensoes configuradas. |
| `launchDetached` | Inicia processo externo desacoplado do Electron. |
| `launchAndCheck` | Inicia processo externo e acompanha falhas iniciais. |
| `assertReadable` | Confirma se um caminho existe e pode ser lido. |
| `retroArchCommand` | Resolve comando do RetroArch para um emulador. |
| `openExternalUrl` | Abre URL no sistema operacional. |
| `openSteamInstall` | Abre fluxo de instalacao da Steam para um App ID. |
| `launchItem` | Decide como iniciar Steam, executavel, Lutris ou ROM. |
| `explainLaunchFailure` | Converte mensagens de erro tecnico em texto mais claro. |

### APIs externas

| Funcao | O que faz |
| --- | --- |
| `unsupportedSystemAutomation` | Retorna erro para automacoes de sistema ainda nao reimplementadas. |
| `fetchJson` | Busca URL e retorna JSON validado. |
| `fetchJsonWithHeaders` | Busca JSON com cabecalhos customizados. |
| `absoluteRetroUrl` | Converte caminhos RetroAchievements em URL absoluta. |
| `retroBadgeUrl` | Normaliza URL de badge/conquista RetroAchievements. |
| `normalizeRetroProfile` | Padroniza dados de perfil RetroAchievements. |
| `normalizeRetroAchievement` | Padroniza dados de conquista RetroAchievements. |
| `getRetroApiKey` | Le chave RetroAchievements salva. |
| `getActiveRetroUsername` | Resolve usuario RetroAchievements ativo. |
| `getRetroUserProfile` | Consulta perfil RetroAchievements. |
| `getRetroAchievementOfTheWeek` | Consulta conquista da semana do RetroAchievements. |
| `extractSteamVanity` | Extrai vanity URL ou identificador Steam de texto/link. |
| `resolveSteamId` | Resolve SteamID64 a partir de ID, link ou vanity. |
| `getSteamProfile` | Consulta perfil Steam. |
| `getProtonDbSummary` | Consulta resumo ProtonDB de um App ID. |
| `isSteamLibraryCacheValid` | Valida cache local da biblioteca Steam. |
| `getCachedSteamLibrary` | Recupera cache Steam ainda valido. |
| `unique` | Remove valores duplicados. |
| `pathExists` | Verifica existencia de caminho. |
| `commandExists` | Verifica se comando existe no PATH. |
| `parseVdfString` | Extrai valor simples de arquivo VDF da Steam. |
| `readSteamLibraryFolders` | Descobre pastas de biblioteca Steam. |
| `isSteamGameInstalled` | Confirma se um App ID tem manifest local. |
| `getInstalledSteamAppIds` | Lista App IDs instalados localmente. |
| `shouldSkipLocalSteamApp` | Filtra entradas locais que nao devem virar jogo. |
| `readLocalSteamGames` | Le jogos instalados por manifests locais. |
| `readSteamApiGames` | Importa biblioteca Steam pela Web API. |
| `fetchSteamGridDbCover` | Busca capa no SteamGridDB. |
| `mergeSteamLibraryIntoData` | Mescla biblioteca Steam importada com dados locais. |

### Janela, sistema e monitoramento

| Funcao | O que faz |
| --- | --- |
| `createWindow` | Cria a janela principal do Electron e registra eventos. |
| `pickFile` | Abre seletor nativo de arquivo. |
| `pickDirectory` | Abre seletor nativo de pasta. |
| `runPowerCommand` | Executa reiniciar/desligar conforme sistema operacional. |
| `buildChildEnv` | Monta ambiente para processos filhos. |
| `setLauncherControllerPaused` | Pausa ou retoma controle do launcher durante jogos/navegador. |
| `bringLauncherToFront` | Tenta trazer a janela do launcher para frente. |
| `focusLauncherWindow` | Foca a janela principal. |
| `beginGameMonitor` | Inicia token de monitoramento de jogo externo. |
| `finishGameMonitor` | Encerra monitoramento e restaura controle. |
| `releaseGameMonitorOnLauncherFocus` | Libera monitoramento quando o launcher volta ao foco. |
| `scheduleGameMonitorTick` | Agenda verificacoes recorrentes de processo. |
| `readTextFile` | Le arquivo texto com fallback seguro. |
| `processHasSteamAppId` | Detecta App ID Steam associado a processo. |
| `isSteamAppProcessRunning` | Verifica se um jogo Steam segue rodando. |
| `monitorSteamGame` | Monitora processo Steam iniciado pelo launcher. |

### Navegador integrado, Discord e teclado virtual

| Funcao | O que faz |
| --- | --- |
| `getLauncherBrowserSession` | Obtem sessao persistente do navegador interno. |
| `getLauncherBrowserPartitionPath` | Resolve pasta fisica da particao do navegador. |
| `resetLauncherBrowserVolatileStorage` | Limpa dados volateis da sessao do navegador. |
| `healLauncherBrowserSessionStorage` | Corrige estado local problemático da sessao web. |
| `configureLauncherBrowserSession` | Configura permissoes, headers e comportamento da sessao web. |
| `isStorePageOpen` | Verifica se a tela Web App esta aberta. |
| `returnToGamesFromStore` | Volta do Web App para a biblioteca. |
| `normalizeWebUrl` | Normaliza texto para URL valida. |
| `isDiscordUrl` | Detecta URL do Discord. |
| `escapeNotificationHtml` | Escapa HTML em notificacoes. |
| `getDiscordUnreadCount` | Extrai contador de nao lidas do titulo do Discord. |
| `showDiscordNotificationPopup` | Mostra popup nativo de notificacao do Discord. |
| `ensureVirtualBrowserCursorWindow` | Cria janela transparente do cursor virtual. |
| `hideVirtualBrowserCursor` | Oculta cursor virtual. |
| `moveVirtualBrowserCursor` | Move cursor virtual sobre o BrowserView. |
| `ensureVirtualKeyboardWindow` | Cria janela do teclado virtual externo. |
| `positionVirtualKeyboard` | Posiciona teclado virtual na area do navegador. |
| `updateVirtualKeyboardWindow` | Sincroniza teclas/estado do teclado virtual. |
| `hideVirtualKeyboardWindow` | Fecha ou oculta teclado virtual. |
| `handleDiscordTitleForPopup` | Dispara notificacao quando o titulo do Discord muda. |
| `normalizeBrowserBounds` | Normaliza retangulo usado pelo BrowserView. |
| `getActiveLauncherBrowserTab` | Retorna aba web ativa. |
| `getActiveLauncherBrowserView` | Retorna BrowserView da aba ativa. |
| `sendNativeBrowserControllerAction` | Envia acao de controle para o renderer. |
| `focusLauncherControlRenderer` | Retorna foco ao renderer do launcher. |
| `serializeLauncherBrowserTab` | Converte aba interna para dados da UI. |
| `listLauncherBrowserTabs` | Lista abas web abertas. |
| `getLauncherBrowserPageKey` | Classifica URL como YouTube, Google, Discord ou generica. |
| `getLauncherBrowserTabIdentity` | Calcula identidade usada para reaproveitar abas. |
| `findLauncherBrowserTabByUrl` | Localiza aba existente para uma URL. |
| `compactLauncherBrowserTabs` | Remove abas destruidas da memoria. |
| `attachLauncherBrowserTab` | Anexa BrowserView ativo na janela principal. |
| `createLauncherBrowserTab` | Cria uma nova aba BrowserView. |
| `destroyLauncherBrowserView` | Fecha uma aba BrowserView. |
| `destroyAllLauncherBrowserViews` | Fecha todas as abas web internas. |
| `hideActiveLauncherBrowserView` | Desanexa a aba ativa sem destrui-la. |
| `setLauncherBrowserBounds` | Reposiciona o BrowserView. |
| `sendBrowserMouseMove` | Envia movimento de mouse ao BrowserView. |
| `sendBrowserClick` | Envia clique ao BrowserView. |
| `sendBrowserKey` | Envia tecla ao BrowserView. |

### IPC principal

Os handlers `ipcMain.handle(...)` sao a API consumida pelo renderer via `preload.js`.

| Canal | O que faz |
| --- | --- |
| `data:read` / `data:write` | Le e grava dados brutos. |
| `dialog:pickFile` / `dialog:pickDirectory` | Abrem seletores nativos. |
| `library:scanRoms` | Varre ROMs dos emuladores informados. |
| `launcher:launch` | Inicia um item da biblioteca. |
| `launcher:focus` | Foca a janela principal. |
| `app:dataPath` / `app:createId` | Expoem caminho de dados e geracao de IDs. |
| `py:sair_launcher` | Fecha o app. |
| `py:obter_estado_intro` / `py:marcar_intro_exibida` | Controlam exibicao da intro. |
| `py:listar_jogos` | Lista biblioteca completa. |
| `py:adicionar_jogo_steam` / `py:editar_jogo_adicionado` / `py:excluir_jogo_adicionado` | Gerenciam jogos Steam/executaveis. |
| `py:iniciar_jogo` | Inicia jogo selecionado. |
| `py:adicionar_jogo_lutris` / `py:editar_jogo_lutris` | Gerenciam entradas Lutris. |
| `py:adicionar_emulador` / `py:editar_emulador` | Gerenciam emuladores RetroArch. |
| `py:alterar_nome_exibicao_rom` | Salva nome amigavel de ROM. |
| `py:salvar_steam_config` / `py:obter_steam_config` / `py:limpar_cache_steam` | Gerenciam chave e cache Steam. |
| `py:obter_protondb_resumo` | Consulta ProtonDB. |
| `py:salvar_steamgriddb_config` / `py:obter_steamgriddb_config` / `py:obter_steamgriddb_capa` | Gerenciam SteamGridDB. |
| `py:salvar_retroachievements_config` | Salva chave RetroAchievements. |
| `py:obter_configuracoes_perfil` / `py:salvar_configuracoes_perfil` | Le e grava chaves/usuarios de perfil. |
| `py:listar_usuarios` / `py:adicionar_usuario` / `py:editar_usuario` / `py:selecionar_usuario` / `py:excluir_usuario` / `py:obter_usuario_ativo` | Gerenciam usuarios locais. |
| `py:importar_biblioteca_steam` | Importa biblioteca Steam. |
| `py:obter_retroachievements_perfil` / `py:obter_retroachievements_usuario` | Consultam RetroAchievements. |
| `py:obter_steam_usuario` | Consulta perfil Steam. |
| `py:obter_resolucao_atual` / `py:alterar_resolucao` | Le e altera resolucao. |
| `py:reiniciar_sistema` / `py:desligar_sistema` | Executam acoes de energia. |
| `py:controles_suportados` / `py:info_controle_atual` | Informam suporte a controles. |
| `py:abrir_url_sistema` | Abre URL fora do launcher. |
| `py:abrir_url_launcher` / `py:listar_url_launcher` / `py:registrar_url_launcher` / `py:ativar_url_launcher` / `py:ocultar_url_launcher` / `py:fechar_url_launcher` / `py:posicionar_url_launcher` | Gerenciam abas do navegador interno. |
| `py:mostrar_teclado_virtual` / `py:atualizar_teclado_virtual` / `py:fechar_teclado_virtual` | Gerenciam teclado virtual externo. |
| `py:recarregar_url_launcher` / `py:voltar_url_launcher` | Controlam navegacao web. |
| `py:mover_mouse_sistema` / `py:mover_mouse_relativo_sistema` / `py:clicar_mouse_sistema` / `py:clicar_mouse_direito_sistema` / `py:rolar_mouse_sistema` | Traduzem entrada de controle para mouse no BrowserView. |
| `py:tecla_sistema` / `py:digitar_texto_sistema` | Enviam teclado/texto ao BrowserView. |
| `launcher:native-browser-controller-action` | Recebe comandos do preload do BrowserView. |
| `launcher:native-browser-keyboard-mode` | Informa se teclado virtual esta aberto. |
| `launcher:native-browser-modal-mode` | Informa se modal do navegador esta aberto. |

## `src/preload.js`

Expõe APIs seguras no renderer:

- `window.pywebview.api`: replica a API esperada pela interface original, encaminhando chamadas para canais IPC.
- `window.pywebview.onNativeBrowserControllerAction`: assina acoes vindas do navegador integrado.
- APIs de dados, dialogs, biblioteca, foco, URL launcher, teclado virtual, mouse e teclado sao wrappers finos sobre `ipcRenderer.invoke` ou `ipcRenderer.send`.

## `src/browser-view-controller-preload.js`

Preload executado dentro das paginas web abertas no `BrowserView`.

| Funcao | O que faz |
| --- | --- |
| `pressedOnce` | Detecta pressionamento unico de botao do gamepad. |
| `readDirection` | Converte direcional/analogico em `up`, `down`, `left` ou `right`. |
| `sendAction` | Envia uma acao de controle ao processo principal. |
| `invokeInput` | Invoca canal IPC para entrada de mouse/teclado. |
| `loop` | Loop por `requestAnimationFrame` que le gamepad e gera comandos. |

## `interface/src/js/browser-control-mode.js`

Define se uma URL deve abrir no navegador integrado ou em outro modo.

| Funcao | O que faz |
| --- | --- |
| `getHostname` | Extrai hostname seguro de uma URL. |
| `isInteractiveControllerPage` | Detecta hosts que precisam manter controle no launcher, como YouTube, Google e Discord. |
| `resolveBrowserOpenMode` | Forca modo `launcher` para paginas interativas e preserva o modo pedido para as demais. |

## `interface/src/js/page-tabs-modal.js`

Modal global para acessar ou fechar abas web abertas.

| Funcao | O que faz |
| --- | --- |
| `pageIcon` | Escolhe icone da aba conforme pagina. |
| `ensureModal` | Cria o modal dinamicamente se ainda nao existir. |
| `isOpen` | Informa se o modal esta visivel. |
| `optionTemplate` | Cria botao de opcao no modal. |
| `getOptions` | Retorna opcoes selecionaveis. |
| `updateSelection` | Atualiza foco e destaque da opcao selecionada. |
| `readTabs` | Le abas abertas via API do launcher. |
| `openAccess` | Abre modal de acesso/alternancia de abas. |
| `openClose` | Abre modal para fechar abas. |
| `close` | Fecha modal e limpa estado. |
| `navigate` | Move selecao por direcao. |
| `confirm` | Executa acesso ou fechamento da opcao escolhida. |
| `handleAction` | Traduz acoes de controle em confirmar/voltar. |

## `interface/src/js/modal-alert.js`

Cria alertas e confirmacoes globais com suporte a teclado e gamepad. Ele centraliza mensagens do launcher e evita depender de `alert()` nativo.

## `interface/src/js/users.js`

Controla a tela de usuarios.

| Funcao | O que faz |
| --- | --- |
| `applyTheme` | Aplica tema salvo. |
| `showMessage` | Exibe mensagem em elemento de alerta. |
| `escapeHtml` | Escapa texto antes de inserir HTML. |
| `getKeyboardFields` | Lista campos que usam teclado virtual. |
| `setActiveKeyboardInput` | Define input ativo do teclado virtual. |
| `getKeyboardButtons` | Lista botoes do teclado virtual. |
| `getKeyboardCharacter` | Resolve caractere considerando shift. |
| `updateKeyboardLabels` | Atualiza textos das teclas. |
| `updateKeyboardSelection` | Atualiza selecao visual do teclado. |
| `buildVirtualKeyboard` | Monta teclado virtual da tela. |
| `getKeyboardButtonAt` | Localiza tecla por linha/coluna. |
| `moveVirtualKeyboardSelection` | Move selecao do teclado. |
| `insertIntoActiveInput` | Insere texto no input ativo. |
| `backspaceActiveInput` | Apaga caractere no input ativo. |
| `moveActiveInputCursor` | Move cursor do input ativo. |
| `toggleKeyboardField` | Alterna foco entre campos. |
| `pressVirtualKeyboardKey` | Executa a tecla selecionada. |
| `launcherKeyboardShortcut` | Trata atalhos globais do controle. |
| `selectUser` | Marca usuario como ativo. |
| `deleteUser` | Exclui usuario local. |
| `resetUserForm` | Limpa formulario de usuario. |
| `editUser` | Preenche formulario para edicao. |
| `getUserActionButtons` | Lista botoes de acao dos usuarios. |
| `updateUserActionSelection` | Atualiza selecao por controle nos botoes. |
| `renderUsers` | Renderiza lista de usuarios. |
| `loadUsers` | Carrega usuarios da API. |
| `launcherNavigate` | Move foco entre areas da tela. |
| `launcherActivate` | Ativa item selecionado. |
| `launcherModalAction` | Encaminha acao para modal aberto. |
| `launcherBack` | Volta/fecha menu/modal. |
| `launcherToggleTheme` | Alterna tema. |
| `readGamepadDirection` | Le direcao do gamepad. |
| `startHtmlGamepadControl` | Inicia loop de navegacao por gamepad. |

## `interface/src/js/settings.js`

Controla configuracoes, chaves de API, resolucao e teclado virtual.

| Funcao | O que faz |
| --- | --- |
| `applyTheme` | Aplica tema. |
| `renderControllerList` | Renderiza lista de controles suportados. |
| `loadResolution` | Le resolucao atual. |
| `changeResolution` | Solicita mudanca de resolucao. |
| `loadControllers` | Carrega informacoes de controle. |
| `loadProfileSettings` | Carrega chaves e usuarios de perfil. |
| `getKeyboardFields` | Lista campos editaveis pelo teclado virtual. |
| `setActiveKeyboardInput` | Define campo ativo. |
| `getKeyboardButtons` | Lista botoes do teclado. |
| `getKeyboardCharacter` | Resolve caractere da tecla. |
| `updateKeyboardLabels` | Atualiza letras conforme shift. |
| `updateKeyboardSelection` | Atualiza foco no teclado. |
| `buildVirtualKeyboard` | Cria teclado virtual. |
| `getKeyboardButtonAt` | Localiza tecla por grade. |
| `moveVirtualKeyboardSelection` | Move foco do teclado. |
| `insertIntoActiveInput` | Insere texto no campo ativo. |
| `backspaceActiveInput` | Apaga texto no campo ativo. |
| `moveActiveInputCursor` | Move cursor do input. |
| `readClipboardText` | Le texto da area de transferencia. |
| `writeClipboardText` | Escreve texto na area de transferencia. |
| `getClipboardInput` | Resolve input alvo de copiar/colar. |
| `getInputSelectedText` | Obtem texto selecionado no input. |
| `copyApiKey` | Copia chave da API. |
| `pasteApiKey` | Cola chave da API. |
| `openActiveApiActionMenu` | Abre menu de copiar/colar do campo ativo. |
| `toggleKeyboardField` | Alterna entre campos. |
| `pressVirtualKeyboardKey` | Executa tecla selecionada. |
| `getNavbarItems` | Lista itens da barra superior. |
| `getSidebarItems` | Lista itens do menu lateral. |
| `isSidebarOpen` | Verifica menu lateral aberto. |
| `clearNavigationSelection` | Limpa selecao visual. |
| `setNavigationArea` | Define area ativa para controle. |
| `updateNavigationSelection` | Atualiza foco visual. |
| `launcherNavigate` | Move foco por direcao. |
| `launcherActivate` | Ativa item selecionado. |
| `launcherBack` | Volta ou fecha menu. |
| `launcherToggleTheme` | Alterna tema. |
| `launcherModalAction` | Encaminha acao para modal. |
| `launcherKeyboardShortcut` | Trata atalhos do controle. |
| `initSettings` | Inicializa tela e listeners. |
| `readGamepadDirection` | Le direcional/analogico. |
| `startHtmlGamepadControl` | Inicia loop de gamepad. |
| `maybeStartHtmlGamepadControl` | Inicia controle quando a API estiver pronta. |

## `interface/src/js/store.js`

Controla Web App, navegador interno, abas, cursor, teclado virtual e navegacao por controle.

| Funcao | O que faz |
| --- | --- |
| `applyTheme` | Aplica tema salvo. |
| `getBrowserControls` | Lista controles do navegador. |
| `updateBrowserSelection` | Atualiza selecao no navegador/teclado. |
| `clampBrowserCursor` | Mantem cursor virtual dentro da area valida. |
| `updateBrowserCursor` | Atualiza posicao visual do cursor. |
| `getBrowserScreenPoint` | Calcula coordenada absoluta do cursor. |
| `getBrowserBounds` | Calcula bounds do navegador interno. |
| `getActiveBrowserFrame` | Retorna webview ativo quando usado. |
| `setupBrowserFrameEvents` | Registra eventos do frame web. |
| `ensureBrowserWebview` | Garante webview interno para modo local. |
| `browserPageIdFromUrl` | Classifica URL para ID de pagina. |
| `browserPageIcon` | Escolhe icone da pagina. |
| `loadBrowserPageTabs` | Le abas salvas no sessionStorage. |
| `saveBrowserPageTabs` | Salva abas no sessionStorage. |
| `addBrowserPageTab` | Adiciona/atualiza aba local. |
| `closeBrowserPageTab` | Fecha aba local. |
| `getBrowserChoiceOptions` | Lista opcoes do modal de abas. |
| `ensureBrowserChoiceModal` | Cria modal de escolha de abas. |
| `isBrowserChoiceModalOpen` | Verifica se modal de abas esta aberto. |
| `hideBrowserChoiceModal` | Fecha modal de abas. |
| `createBrowserChoiceOption` | Cria botao de opcao de aba. |
| `updateBrowserChoiceSelection` | Atualiza foco no modal de abas. |
| `navigateBrowserChoice` | Move foco do modal. |
| `openBrowserStartModal` | Abre modal de acesso a paginas. |
| `openBrowserCloseModal` | Abre modal de fechamento de paginas. |
| `confirmBrowserChoice` | Confirma opcao do modal. |
| `sendBrowserInputEvent` | Envia evento de input ao navegador. |
| `insertBrowserText` | Digita texto no navegador. |
| `sendBrowserKeyShortcut` | Envia atalho de teclado. |
| `moveBrowserTextCursor` | Move cursor de texto no navegador. |
| `focusBrowserFrame` | Foca o frame web. |
| `startNativeBrowserFocusGuard` | Mantem foco correto entre launcher e BrowserView. |
| `stopNativeBrowserFocusGuard` | Para guarda de foco. |
| `prepareBrowserFrame` | Prepara frame para URL. |
| `positionNativeLauncherBrowser` | Reposiciona BrowserView nativo. |
| `polishBrowserPage` | Ajusta detalhes da pagina web quando possivel. |
| `syncSystemMouse` | Sincroniza cursor virtual com processo principal. |
| `moveBrowserMouse` | Move mouse virtual. |
| `launcherMouseMove` | Move cursor pelo controle. |
| `reportBrowserSystemInputIssue` | Mostra erro de input do navegador quando necessario. |
| `clickBrowserCursor` | Clica no ponto atual do cursor. |
| `scrollBrowserPage` | Rola pagina web. |
| `getBrowserKeys` | Lista teclas do teclado virtual. |
| `browserKeyLabel` | Converte valor de tecla em label. |
| `buildBrowserKeyboard` | Monta teclado virtual web. |
| `updateBrowserKeyboardSelection` | Atualiza foco do teclado web. |
| `getBrowserKeyboardState` | Serializa estado do teclado para janela externa. |
| `syncNativeBrowserKeyboard` | Sincroniza teclado web com processo principal. |
| `getActiveLauncherTabId` | Consulta aba ativa no processo principal. |
| `hideNativeBrowserForControllerModal` | Oculta BrowserView enquanto modal de controle esta aberto. |
| `restoreNativeBrowserAfterControllerModal` | Restaura BrowserView apos modal. |
| `openNativeControllerModal` | Abre modal global de abas pelo processo principal. |
| `getBrowserKeyAt` | Localiza tecla por grade. |
| `moveBrowserKeyboard` | Move foco no teclado web. |
| `pressBrowserKey` | Executa tecla do teclado web. |
| `toggleBrowserKeyboard` | Abre/fecha teclado virtual. |
| `openStoreUrl` | Abre URL da loja/webapp. |
| `activateStoreTab` | Ativa aba existente. |
| `registerOpenPageBeforeLeaving` | Registra pagina aberta antes de sair. |
| `closeStoreBrowser` | Fecha navegador interno. |
| `returnToGames` | Volta para biblioteca. |
| `reloadStoreBrowser` | Recarrega pagina web. |
| `browserBackAction` | Volta historico ou fecha navegador. |
| `getStoreCards` | Lista cards de atalhos web. |
| `getNavbarItems` | Lista itens da barra. |
| `getSidebarItems` | Lista itens do menu lateral. |
| `isSidebarOpen` | Verifica menu lateral. |
| `clearNavigationSelection` | Limpa selecao atual. |
| `setNavigationArea` | Define area selecionada. |
| `updateNavigationSelection` | Atualiza destaque/foco. |
| `launcherNavigate` | Navega por cards/menu/teclado. |
| `launcherActivate` | Ativa item atual. |
| `launcherBack` | Volta, fecha modal ou navegador. |
| `launcherToggleTheme` | Alterna tema. |
| `launcherModalAction` | Trata acao de modal. |
| `launcherKeyboardShortcut` | Executa atalhos do controle. |
| `readGamepadDirection` | Le direcao do gamepad. |
| `startHtmlGamepadControl` | Inicia loop de controle. |
| `maybeStartHtmlGamepadControl` | Aguarda ambiente e inicia gamepad. |

## `interface/src/js/script.js`

Controla a tela principal da biblioteca.

### Intro, perfil e tema

| Funcao | O que faz |
| --- | --- |
| `createModalFallback` | Cria fallback simples para Bootstrap Modal. |
| `createOffcanvasFallback` | Cria fallback simples para Bootstrap Offcanvas. |
| `finishIntro` | Encerra tela de intro. |
| `enterLauncherOrShowProfileSelection` | Decide entrar na biblioteca ou mostrar perfis. |
| `startIntroPlayback` | Inicia video/fluxo da intro. |
| `initializeIntro` | Inicializa intro e estado salvo. |
| `getProfileSelectionItems` | Lista cards de perfil. |
| `updateProfileSelection` | Atualiza selecao de perfil. |
| `renderProfileSelection` | Renderiza perfis de entrada. |
| `showProfileSelection` | Mostra tela de escolha de perfil. |
| `selectStartupProfile` | Seleciona perfil inicial. |
| `navigateProfileSelection` | Navega entre perfis. |
| `applyTheme` | Aplica tema. |
| `requestPowerAction` | Solicita desligar/reiniciar. |

### Biblioteca e navegacao

| Funcao | O que faz |
| --- | --- |
| `getGameCards` | Lista cards visiveis de jogo. |
| `getNavbarItems` | Lista itens da navbar. |
| `getAddGameNavbarIndex` | Localiza botao de adicionar jogo. |
| `normalizeCategory` | Normaliza categoria. |
| `isSteamGameNotInstalled` | Detecta jogo Steam ausente. |
| `getCategoryButtons` | Lista filtros de categoria. |
| `applyCategoryFilter` | Filtra biblioteca por categoria. |
| `getCurrentGameColumns` | Calcula colunas atuais da grade. |
| `isFirstGameRowSelected` | Verifica se selecao esta na primeira linha. |
| `scrollLibraryHeaderIntoView` | Rola ate o cabecalho. |
| `getSidebarItems` | Lista itens do menu lateral. |
| `isSidebarOpen` | Verifica menu lateral. |
| `clearNavigationSelection` | Limpa selecao. |
| `setNavigationArea` | Define area ativa. |
| `updateNavigationSelection` | Atualiza foco/destaque. |
| `updateSelectedGame` | Marca card selecionado. |
| `updateLibraryCount` | Atualiza contador da biblioteca. |
| `launcherNavigate` | Move foco geral. |
| `launcherActivate` | Ativa item selecionado. |
| `launcherModalAction` | Executa acao em modal. |
| `launcherBack` | Volta ou fecha tela/modal. |
| `launcherToggleTheme` | Alterna tema. |

### Formulario, erros e perfis externos

| Funcao | O que faz |
| --- | --- |
| `showAddSteamError` | Exibe erro do modal Steam. |
| `updateSteamApiStatus` | Atualiza status da chave Steam. |
| `loadSteamApiStatus` | Carrega status da Steam API. |
| `showAddEmulatorError` | Exibe erro do modal de emulador. |
| `showAddLutrisError` | Exibe erro do modal Lutris. |
| `showRaError` | Exibe erro RetroAchievements/Steam. |
| `formatNumber` | Formata numeros. |
| `formatPlaytime` | Formata minutos de jogo. |
| `getGamePlaytimeHtml` | Monta HTML de tempo de jogo. |
| `setText` | Atualiza texto de elemento por ID. |
| `getRetroAchievementsUsername` | Resolve usuario RetroAchievements ativo. |
| `getSteamUsername` | Resolve usuario Steam ativo. |
| `loadActiveUser` | Carrega usuario ativo. |
| `openProfileSourceSelector` | Abre seletor Steam/RetroAchievements. |
| `openSelectedProfileSource` | Abre fonte escolhida. |
| `refreshActiveProfileSource` | Atualiza fonte de perfil aberta. |
| `setProfileModeLabels` | Ajusta labels entre Steam e RetroAchievements. |
| `renderRetroAchievementsProfile` | Renderiza perfil/conquistas RA. |
| `personaStateLabel` | Traduz estado online da Steam. |
| `renderSteamProfile` | Renderiza perfil Steam. |
| `loadRetroAchievementsProfile` | Busca perfil RA ativo. |
| `loadRetroAchievementsUser` | Busca usuario RA informado. |
| `loadSteamProfile` | Busca perfil Steam. |

### Modais de paginas, teclado e formularios

| Funcao | O que faz |
| --- | --- |
| `isControllerAccessModalOpen` | Verifica modal de acesso a paginas. |
| `isControllerClosePageModalOpen` | Verifica modal de fechar paginas. |
| `getControllerPageOptions` | Lista opcoes do modal. |
| `updateControllerPageSelection` | Atualiza selecao do modal. |
| `navigateControllerPageModal` | Navega no modal. |
| `createControllerPageOption` | Cria opcao do modal. |
| `readControllerBrowserTabs` | Le abas do navegador. |
| `renderControllerAccessOptions` | Renderiza opcoes de acesso. |
| `renderControllerCloseOptions` | Renderiza opcoes de fechamento. |
| `openControllerAccessModal` | Abre modal de acessar paginas. |
| `openControllerClosePageModal` | Abre modal de fechar paginas. |
| `openControllerModalFromSessionFlag` | Abre modal indicado por sessionStorage. |
| `confirmControllerAccess` | Confirma acesso a pagina. |
| `confirmControllerClosePage` | Fecha pagina selecionada. |
| `getKeyboardButtons` | Lista teclas. |
| `setActiveKeyboardInput` | Define campo ativo. |
| `getKeyboardCharacter` | Resolve caractere. |
| `updateKeyboardLabels` | Atualiza labels. |
| `useVirtualKeyboard` | Escolhe contexto do teclado. |
| `buildVirtualKeyboard` | Monta teclado. |
| `isRomRenameKeyboardOpen` | Verifica teclado de renomear ROM. |
| `isVirtualKeyboardOpen` | Verifica teclado geral. |
| `updateKeyboardSelection` | Atualiza selecao. |
| `getKeyboardButtonAt` | Localiza tecla. |
| `moveVirtualKeyboardSelection` | Move foco do teclado. |
| `insertIntoActiveInput` | Insere texto. |
| `backspaceActiveInput` | Apaga texto. |
| `moveActiveInputCursor` | Move cursor. |
| `toggleKeyboardField` | Alterna campo. |
| `pressVirtualKeyboardKey` | Executa tecla. |
| `launcherKeyboardShortcut` | Atalhos do controle. |

### Cards, imagens, ProtonDB e SteamGridDB

| Funcao | O que faz |
| --- | --- |
| `getGameDestination` | Resolve destino textual de jogo. |
| `getFileInputPath` | Le caminho selecionado em input de arquivo. |
| `formatSelectedPath` | Mostra caminho de forma amigavel. |
| `updateFileDisplay` | Atualiza campo visual de arquivo/pasta. |
| `resetPathInputDisplay` | Reseta campo visual de caminho. |
| `getDirectoryInputPath` | Le caminho de pasta selecionado. |
| `openEmulatorForm` | Abre formulario de emulador. |
| `openGameForm` | Abre formulario Steam/executavel. |
| `getSteamImage` | Resolve imagem Steam. |
| `getExecutableImage` | Resolve imagem padrao de executavel. |
| `getRomImage` | Resolve imagem de ROM. |
| `getLutrisImage` | Resolve imagem Lutris. |
| `getGameImage` | Escolhe imagem final do card. |
| `escapeHtml` | Escapa HTML. |
| `escapeAttribute` | Escapa atributo HTML. |
| `withUiTimeout` | Limita espera de chamada UI. |
| `formatProtonTier` | Traduz tier ProtonDB. |
| `isLinuxCompatibleTier` | Verifica tier compativel Linux. |
| `setProtonTierBadgeStyle` | Aplica estilo do badge ProtonDB. |
| `setCardProtonTier` | Atualiza badge ProtonDB no card. |
| `loadProtonDbTierForCard` | Busca ProtonDB para card. |
| `loadSteamGridDbCoverForCard` | Busca capa SteamGridDB para card. |
| `createSteamGameCard` | Cria card HTML de jogo. |
| `removeAddedGameCard` | Remove card por ID. |
| `removeRomCardsByEmulator` | Remove cards de ROM de um emulador. |
| `loadSteamGames` | Carrega biblioteca e renderiza cards. |

### Modal de detalhes e inicializacao

| Funcao | O que faz |
| --- | --- |
| `getTrailerModalActions` | Lista botoes do modal de detalhes. |
| `updateModalActionSelection` | Atualiza selecao do modal. |
| `clearModalActionSelection` | Limpa selecao do modal. |
| `launcherNavigateModal` | Navega dentro do modal. |
| `launcherActivateModal` | Ativa botao do modal. |
| `activateControllerConfirm` | Confirma modal global. |
| `readGamepadDirection` | Le direcao do gamepad. |
| `getControllerScrollTarget` | Resolve area que deve rolar com analogico. |
| `scrollModalWithAnalog` | Rola modal com analogico. |
| `isGamepadNeutral` | Verifica se controle esta neutro. |
| `runControllerAction` | Executa acao de controle. |
| `startHtmlGamepadControl` | Inicia loop de gamepad. |
| `resetLauncherControllerInput` | Bloqueia input por curto periodo para evitar repeticao. |
| `isLauncherFocusShortcutPressed` | Detecta atalho de retomar foco do launcher. |
| `wasLauncherFocusShortcutPressed` | Detecta se atalho ja estava pressionado. |
| `requestLauncherFocusFromShortcut` | Solicita foco do launcher. |
| `maybeStartHtmlGamepadControl` | Aguarda ambiente e inicia controle. |
| `getLocalVideoFallback` | Resolve video local alternativo. |
| `createVideoPlayer` | Cria player de video/trailer. |
| `playCurrentVideo` | Toca video atual. |
| `openTrailer` | Abre modal de detalhes/trailer. |
| `openAddedGame` | Abre detalhes de jogo. |
| `stopVideo` | Para player atual. |
| `editarJogoSelecionado` | Abre edicao do jogo selecionado. |
| `editarEmuladorSelecionado` | Abre edicao do emulador da ROM. |
| `alterarNomeRomSelecionada` | Abre painel de nome da ROM. |
| `salvarNomeRomSelecionada` | Salva nome customizado da ROM. |
| `excluirJogoSelecionado` | Exclui jogo selecionado. |
| `iniciarJogo` | Inicia jogo exibido no modal. |

## Scripts de build

### `scripts/build.js`

| Funcao | O que faz |
| --- | --- |
| `runSyntaxCheck` | Valida sintaxe dos arquivos JS antes do build. |
| `writeNpmShim` | Cria shim temporario para chamadas do npm usadas pelo builder. |
| `patchNpmDependencyCollector` | Corrige coleta de dependencias do electron-builder. |
| `shellQuote` | Escapa caminhos para shell. |
| `createTargets` | Define targets AppImage, deb ou Windows. |
| `run` | Executa o fluxo completo de build. |
| `ensureNativeSqliteBinding` | Garante binding nativo do SQLite. |

### `scripts/verify.js`

| Funcao | O que faz |
| --- | --- |
| `run` | Executa comando e encerra em caso de erro. |
| `checkSyntax` | Roda `node --check` nos JS principais. |
| `runTests` | Executa testes unitarios. |
