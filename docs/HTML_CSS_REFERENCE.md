# Referencia HTML e CSS

Este documento explica a estrutura das telas HTML e os blocos principais de estilo do projeto.

## HTML

### `interface/index.html`

Tela principal do launcher.

- `<head>` carrega Bootstrap, Bootstrap Icons e `interface/src/css/style.css`.
- `#introScreen` mostra a abertura em video, com `#introVideo` e botao `#introSkip`.
- `#profileSelectionScreen` exibe os perfis locais antes de entrar na biblioteca.
- `.app-navbar` contem menu lateral, marca, troca de tema e botao `Adicionar jogo`.
- `#sidebar` e o menu lateral com links para Web App, Meus Jogos, Usuarios, configuracoes e acoes de energia.
- `main` contem cabecalho da biblioteca, botoes de adicionar emulador/importar Steam/adicionar Lutris/adicionar Steam, contador e grade `#gameGrid`.
- `.category-filter-bar` contem filtros por categoria.
- `#controllerAccessModal` permite acessar Meus Jogos ou abas web abertas pelo controle.
- `#controllerClosePageModal` permite fechar abas web abertas.
- `#addSteamModal` cadastra ou edita jogo Steam/executavel, categoria e chave Steam.
- `#addLutrisModal` cadastra ou edita entrada Lutris.
- `#profileSourceModal` escolhe entre perfil RetroAchievements e Steam.
- `#profileAchievementsModal` exibe perfil, conquistas, jogos recentes e configuracao RA.
- `#addEmulatorModal` cadastra ou edita RetroArch, core, pasta de ROMs e extensoes.
- `#trailerModal` mostra detalhes do jogo, player, descricao, botoes de iniciar/editar/excluir e painel de renomear ROM.
- Scripts carregados: Bootstrap, `modal-alert.js`, `page-tabs-modal.js`, `script.js`.

### `interface/webapp.html`

Tela dos atalhos web e navegador integrado.

- `<head>` carrega Bootstrap, Bootstrap Icons e CSS global.
- `.app-navbar` e `#sidebar` repetem a navegacao principal.
- `#storeGrid` lista cards para YouTube, Google e Discord.
- Cada `.store-card` usa `data-title`, `data-url` e `data-open-mode` para abrir pagina web.
- `#launcherBrowser` e o container do navegador interno.
- `#browserStage` delimita a area do navegador.
- `#browserFrame` e o `webview` usado quando o app nao esta em modo `BrowserView` nativo.
- `#browserCursor` desenha cursor virtual.
- `#browserVirtualKeyboard` recebe o teclado virtual HTML.
- Scripts carregados: Bootstrap, `modal-alert.js`, `page-tabs-modal.js`, `browser-control-mode.js`, `store.js`.

### `interface/settings.html`

Tela de configuracoes.

- `.app-navbar` e `#sidebar` mantem a navegacao padrao.
- Cabecalho `Sistema / Configuracoes` identifica a tela.
- `#resolutionButtons` contem botoes `720p` e `1080p`.
- `#currentResolution` e `#resolutionMessage` exibem estado e resultado.
- `#supportedControllers` e `#detectedController` exibem suporte de controle.
- `#profileSettingsForm` salva chaves RetroAchievements e Steam.
- `#retroApiKey` e `#steamApiKey` sao inputs de senha com menu copiar/colar.
- `#clearSteamCacheButton` limpa cache de biblioteca Steam.
- `#settingsVirtualKeyboard` e o teclado virtual da tela.
- Scripts carregados: Bootstrap, `modal-alert.js`, `page-tabs-modal.js`, `settings.js`.

### `interface/users.html`

Tela de usuarios locais.

- `.app-navbar` e `#sidebar` mantem a navegacao padrao.
- `#userForm` cria ou edita usuario.
- `#userName`, `#retroUsername`, `#steamId` guardam dados do perfil local.
- `#activeUser` marca usuario como ativo.
- `#virtualKeyboard` permite digitar com controle.
- `#saveUserButton` salva e `#cancelUserEditButton` cancela edicao.
- `#userError` e `#userSuccess` exibem feedback.
- `#userList` renderiza usuarios cadastrados.
- Scripts carregados: Bootstrap, `modal-alert.js`, `page-tabs-modal.js`, `users.js`.

### `interface/virtual-keyboard.html`

Janela independente do teclado virtual usado pelo navegador integrado.

- CSS fica embutido no proprio HTML para a janela ser autocontida.
- `.keyboard-modal` e a superficie visual.
- `.keyboard-header` mostra titulo e dica de botoes do controle.
- `#keyboard` recebe linhas e teclas via script inline.
- Script inline le parametros/estado, renderiza teclas, recebe mensagens IPC e atualiza selecao/shift.

## CSS: `interface/src/css/style.css`

O CSS usa variaveis no `:root` para tema escuro e sobrescreve em `[data-theme="light"]` para tema claro.

### Base e tema

- `:root`: define cores, sombras, bordas, gradientes e superficies do tema escuro.
- `[data-theme="light"]`: substitui variaveis para tema claro.
- `*`: aplica `box-sizing`.
- `body`: define fonte, cor, fundo e espacamento superior para navbar fixa.
- `body::before` e `body::after`: criam camadas visuais de fundo e grade animada.
- `body > *`: garante conteudo acima do fundo.
- `@keyframes background-drift` e `grid-drift`: animam fundo.
- `@media (prefers-reduced-motion: reduce)`: reduz animacoes para acessibilidade.

### Intro e selecao de perfil

- `.intro-screen`, `.intro-screen.is-hidden`, `.intro-video`, `.intro-skip`: controlam tela de abertura e botao de pular.
- `.profile-selection-screen`: tela fullscreen de escolha de usuario.
- `.profile-selection-panel`: painel central.
- `.profile-selection-header`, `.profile-selection-header h1`: cabecalho da escolha.
- `.profile-selection-grid`: grade de perfis.
- `.profile-select-card`: card de usuario.
- `.profile-select-card.is-controller-selected`: estado selecionado por controle.
- `.profile-add-icon`, `.profile-add-icon i`: icone de adicionar usuario.
- `.profile-select-card strong`, `.profile-select-card small`: tipografia do card.

### Navegacao global

- `.app-navbar`: barra superior fixa.
- `.navbar-brand`: marca Bit&Rust.
- `.offcanvas-title`: titulo do menu lateral.
- `.navbar-toggler:focus`, `.navbar-toggler-icon`: foco e icone do menu.
- `.theme-toggle`: botao circular de tema.
- `.theme-toggle:hover`: estado hover.
- `.nav-link`, `.nav-link.active`, `.nav-link.active i`: links do menu lateral.
- `.sidebar-utility-actions`: bloco inferior do menu.
- `.sidebar-settings-link`, `.sidebar-settings-link i`: link de configuracoes.
- `.user-section`, `.user-avatar`: area do usuario.
- `.dropdown-menu`, `.dropdown-item`, `.dropdown-item:hover`: menus Bootstrap customizados.

### Biblioteca e cards

- `.library-header`, `.section-kicker`, `.library-header h1`: cabecalho da biblioteca.
- `.library-actions`: grupo de botoes de acao.
- `.steam-add-button`, `.steam-add-button.is-active`: botoes adicionar/importar.
- `.library-stats`, `.library-stats i`: contador visual.
- `.category-filter-bar`: barra horizontal de categorias.
- `.category-filter-button`, `.category-filter-button.is-active`: botoes de filtro.
- `.game-card`: card base de jogo.
- `.game-card:hover`: elevacao visual no hover.
- `.game-card.is-selected`: destaque por controle.
- `.rom-card`: ajuste visual para ROMs.
- `.rom-card .play-circle`: botao play em ROM.
- `.game-card h6`: titulo do card.
- `.game-category-pill`, `.game-category-badge`: badges de categoria.
- `.game-install-badge`, `.game-install-badge.installed`, `.game-install-badge.not-installed`: status de instalacao.
- `.game-card-playtime`, `.game-playtime-summary`, `.game-playtime-summary span`, `.game-playtime-summary i`: tempo de jogo.
- `.game-thumb-container`, `.card-img-top`, `.image-overlay`, `.game-card:hover .image-overlay`, `.play-circle`: imagem, overlay e botao play.

### ProtonDB e compatibilidade

- `.game-proton-tier`: posicao do selo ProtonDB.
- `.proton-badge`: badge base.
- `.proton-tier-platinum`, `.proton-badge.platinum`: estilo platinum.
- `.proton-tier-gold`, `.proton-badge.gold`: estilo gold.
- `.proton-tier-silver`, `.proton-badge.silver`: estilo silver.
- `.proton-tier-bronze`, `.proton-badge.bronze`: estilo bronze.
- `.proton-tier-borked`, `.proton-badge.borked`: estilo borked.
- `.proton-tier-pending`, `.proton-badge.unknown`: estilo pendente/desconhecido.
- `.game-proton-tier + .game-category-badge`: espacamento quando ha os dois badges.

### Modais, detalhes e video

- `.modal-content`, `.modal-footer`, `.modal-xl`, `.modal-info-panel`, `.info-section`: base visual de modais.
- `.btn-close`: botao fechar adaptado ao tema.
- `.video-container-full`: area do player.
- `.game-detail-layout`, `.game-detail-preview-column`, `.game-detail-info`: layout do modal de detalhes.
- `.game-detail-info #infoTitle`: titulo do jogo no detalhe.
- `.game-detail-info .info-section`, `.game-detail-info #gameDescription`, `.game-detail-info #gameDescription em`: descricao.
- `#videoPlayer iframe`: iframe de trailer.
- `.modal-game-actions`, `.modal-game-actions .controller-action`: botoes do modal.
- `.steam-preview`, `.steam-preview img`, `.steam-preview-badge`: preview/capa Steam.
- `#infoTitle`, `.border-bottom`, `.text-muted`: ajustes globais usados no modal.

### Renomear ROM e teclado virtual

- `.rom-rename-panel`: painel de nome customizado da ROM.
- `.rom-rename-label`: label do campo.
- `.rom-rename-panel .form-control`: input de nome.
- `.rom-rename-keyboard`, `.rom-rename-keyboard .virtual-keyboard-row`, `.rom-rename-keyboard .virtual-key`, `.rom-rename-keyboard .virtual-key-wide`: teclado compacto dentro do modal.
- `.virtual-keyboard`: container de teclado virtual.
- `.virtual-keyboard-row`: linha de teclas.
- `.virtual-key`: tecla base.
- `.virtual-key.is-active`: tecla ativa/shift.
- `.virtual-key.is-controller-selected`: tecla selecionada por controle.
- `.virtual-key-wide`: tecla larga.
- `.form-control`, `.form-control::placeholder`, `.form-control:focus`, `.form-control.is-keyboard-active`: inputs e foco do teclado.

### RetroAchievements e Steam Profile

- `.profile-achievements-modal`: corpo do modal de perfil.
- `.ra-config-card.is-compact`: configuracao compacta.
- `.ra-config-form`: formulario de usuario/key.
- `.ra-hero`: cabecalho do perfil.
- `.ra-avatar`: avatar.
- `.ra-hero-copy h2`: nome.
- `.ra-presence`: presenca/status.
- `.ra-stat-grid`, `.ra-stat`, `.ra-stat span`, `.ra-stat small`: estatisticas.
- `.ra-games`, `.ra-game-card`, `.ra-game-card img`, `.ra-game-card small`: jogos recentes.
- `.ra-achievement-icon`, `.ra-achievement-title`, `.ra-achievement-card p`, `.ra-achievement-meta`, `.ra-achievement-meta span`: conquistas.

### Acoes por controle

- `.is-controller-selected:focus`: foco visual comum.
- `.navbar-brand.is-controller-selected`: selecao da marca.
- `.controller-action`: botao com linguagem de controle.
- `.controller-action:focus`: foco do botao.
- `.controller-action-a`: acao confirmar/iniciar.
- `.controller-action-b`: acao voltar/cancelar.
- `.controller-action-edit`: acao editar.
- `.controller-action-delete`: acao excluir.
- `.controller-badge`: bolinha com letra do botao.
- `.controller-confirm-backdrop`, `.controller-confirm-box`, `.controller-confirm-actions`, `.controller-confirm-actions .is-controller-selected`: confirmacao global.
- `.controller-page-list`: lista de paginas/abas.
- `.controller-page-option`, `.controller-page-option i`, `.controller-page-option > div`, `.controller-page-option span`, `.controller-page-option small`: opcao de aba web.

### Web App e navegador integrado

- `.store-page`: pagina do Web App.
- `.store-toolbar`: barra de filtros da loja.
- `.store-filter`, `.store-filter.active`: filtros da loja.
- `.store-card`, `.store-card:hover`: card de atalho web.
- `.store-card img`: imagem do card.
- `.store-web-thumb`: thumb com icone.
- `.store-web-youtube`, `.store-web-google`, `.store-web-discord`: cores especificas dos atalhos.
- `.store-card-body`, `.store-card h3`, `.store-card p`: corpo e texto do card.
- `.store-price-line`, `.old-price`, `.new-price`: estilos legados de preco.
- `.launcher-browser`: container do navegador.
- `body.browser-open`: estado global quando navegador esta aberto.
- `body.browser-open .app-navbar`, `body.browser-open .store-page`, `body.browser-open .launcher-browser`, `body.browser-open .modal-backdrop`: ajustes quando BrowserView esta ativo.
- `.launcher-browser-toolbar`: toolbar do navegador.
- `.launcher-browser-title`, `.launcher-browser-title i`: titulo e icone.
- `.launcher-browser-stage`: palco do navegador.
- `.launcher-browser webview`: webview HTML.
- `.launcher-browser.is-launcher-webview webview`: estado especifico de webview integrado.
- `.virtual-browser-cursor`, `.virtual-browser-cursor::before`: cursor virtual.
- `.browser-virtual-keyboard`: teclado virtual web.
- `.browser-keyboard-row`: linha do teclado web.
- `.browser-key`, `.browser-key:focus`, `.browser-key-wide`: teclas web.
- `.global-page-tabs-modal`, `.global-page-tabs-modal .modal-dialog`, `.global-page-tabs-modal .modal-content`: modal global de abas.

### Responsividade

- `@media (max-width: 991.98px)`: reorganiza modal de detalhes em telas medias.
- `@media (max-width: 575.98px)`: reduz modal, botoes e teclado em telas pequenas.
- `@media (max-width: 576px)`: ajusta layout geral mobile, botoes e estatisticas.
- `@media (max-width: 900px)`: adapta area de perfil/conquistas.
