# Estrutura do Projeto

## Raiz

- `package.json`: metadados do app, scripts npm e configuracao do `electron-builder`.
- `package-lock.json`: lockfile das dependencias npm.
- `tsconfig.json`: configuracao de compilacao TypeScript para os processos Electron e renderer.
- `README.md`: guia principal de instalacao, uso e build.
- `.gitignore`: impede versionamento de dependencias, builds, caches, bancos locais e segredos.

## `src/`

- `main.ts`: processo principal do Electron. Cria a janela, registra IPCs, gerencia banco, integra Steam/RetroAchievements/SteamGridDB, inicia jogos, controla `BrowserView`, teclado virtual, cursor virtual e builds de resposta para o renderer.
- `preload.ts`: ponte segura entre renderer e processo principal, expondo `window.pywebview.api` para manter compatibilidade com a interface original.
- `storage.ts`: camada SQLite. Cria schema, migra dados legados de JSON e normaliza leitura/escrita de dados.
- `browser-view-controller-preload.ts`: preload injetado no `BrowserView` para traduzir gamepad em acoes do navegador integrado.
- `*.js` e `*.js.map`: saidas geradas por `npm run compile`, consumidas pelo Electron em runtime.
- `ico/`: icones usados pelo Electron e pelos pacotes.

## `interface/`

- `index.html`: tela principal da biblioteca, modais de jogos/emuladores/perfis, intro, filtros e detalhes de jogo.
- `webapp.html`: tela de atalhos web e container do navegador integrado.
- `settings.html`: configuracoes de resolucao, controles e chaves de API.
- `users.html`: cadastro, edicao, selecao e exclusao de usuarios locais.
- `virtual-keyboard.html`: janela de teclado virtual usada pelo navegador integrado.
- `src/css/style.css`: estilos globais, temas, biblioteca, modais, perfis, Web App, teclado e estados de controle.
- `src/js/*.ts`: fontes TypeScript do renderer. Cada arquivo corresponde a uma tela ou utilitario global.
- `src/js/*.js` e `src/js/*.js.map`: saidas geradas por `npm run compile`, carregadas pelos HTMLs.
- `src/js/script.ts`: logica da biblioteca principal, Steam, RetroAchievements, modais, formulario de jogos, gamepad e inicializacao de jogos.
- `src/js/store.ts`: logica do Web App, navegador integrado, abas, teclado virtual, cursor virtual e navegacao por controle.
- `src/js/settings.ts`: logica da tela de configuracoes, chaves de API, resolucao, teclado virtual e controle.
- `src/js/users.ts`: logica de usuarios, formulario, selecao ativa, teclado virtual e controle.
- `src/js/modal-alert.ts`: modal global de alerta/confirmacao com suporte a controle.
- `src/js/page-tabs-modal.ts`: modal global para acessar ou fechar abas web abertas.
- `src/js/browser-control-mode.ts`: decide quando uma URL deve usar o modo integrado do launcher.
- `src/img/`: imagens de fundo e avatar local.
- `src/medias/`: video da intro.

## `scripts/`

- `run-electron.js`: resolve o binario local do Electron e inicia o app.
- `build.js`: compila TypeScript, valida sintaxe, prepara cache/shim do npm, confere SQLite nativo e chama `electron-builder`.
- `after-pack.js`: ajuste pos-empacotamento, principalmente permissao do sandbox no Linux.
- `electron-doctor.sh`: diagnostico rapido do ambiente Electron.
- `fix-electron-sandbox.sh`: corrige permissao do sandbox local em ambiente Linux.
- `start-electron.sh`: inicializacao alternativa via shell no Linux.

## `tests/`

- `unit/browser-control-mode.test.js`: garante que paginas interativas como YouTube, Google e Discord usem o modo correto do navegador do launcher.

## Documentacao detalhada

- `docs/JAVASCRIPT_REFERENCE.md`: explica os arquivos JavaScript, funcoes nomeadas e canais IPC.
- `docs/HTML_CSS_REFERENCE.md`: explica a estrutura das telas HTML e os blocos de CSS.
- `docs/PRODUCTION.md`: descreve validacao, build e checklist de release.

## Pastas Locais Nao Versionadas

- `node_modules/`: dependencias instaladas.
- `dist/`: pacotes gerados.
- `.cache/`: cache de build.
- `squashfs-root/`: conteudo extraido de AppImage.
- `data/*.db`: banco SQLite local.
