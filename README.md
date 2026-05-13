# Bit&Rust Launcher

Launcher desktop de jogos recriado com Electron.js. A aplicacao usa HTML, CSS e TypeScript compilado para JavaScript no renderer, Electron no processo principal e persistencia local em SQLite, sem Python.

## Recursos

- Interface desktop local com Electron.
- Biblioteca com jogos Steam, executaveis locais, ROMs detectadas em pastas de emuladores e atalhos web.
- Pesquisa de jogos por regex na tela `Meus Jogos`, combinando busca textual com filtros de categoria.
- Cadastro de jogos Steam por App ID.
- Importacao da biblioteca completa da Steam pela Steam Web API, incluindo jogos nao instalados.
- Cadastro de executaveis locais por caminho completo.
- Cadastro de emuladores com seletores de arquivo para RetroArch/core e seletor de pasta para ROMs.
- Inicializacao de jogos Steam por `steam://rungameid/<app_id>`.
- Inicializacao de executaveis locais.
- Inicializacao de ROMs via RetroArch com `retroarch -L <core> <rom>`.
- Nome de exibicao customizado para ROMs sem renomear o arquivo original.
- Web App interno com atalhos para YouTube, Google e Discord.
- Navegador interno em `BrowserView` para paginas controladas pelo launcher.
- Abas internas para acessar, alternar e fechar paginas web abertas.
- Teclado virtual e cursor virtual para navegacao web com controle/gamepad.
- Cadastro de usuarios locais com usuario RetroAchievements e Steam.
- Configuracoes de tema, resolucao preferida e chaves de API.
- Persistencia em `data/launcher.db`.

## Requisitos

- Node.js 18 ou superior.
- Steam instalada para abrir jogos Steam.
- RetroArch instalado para usar emuladores/ROMs.
- Wine instalado apenas se voce for gerar build Windows a partir do Linux.

## Instalacao

Instale as dependencias do projeto:

```bash
npm install
```

## Como Executar

Rode o launcher com:

```bash
npm start
```

O script `npm run dev` executa o mesmo fluxo de inicializacao.

Se no Linux o Electron encerrar com `SIGTRAP` ou erro de sandbox, corrija as permissoes do helper local:

```bash
npm run fix:sandbox
npm start
```

Tambem existe um diagnostico rapido:

```bash
npm run doctor
```

Para validar a sintaxe dos arquivos JavaScript principais:

```bash
npm run check
```

O codigo-fonte da aplicacao fica em TypeScript (`.ts`). Os arquivos `.js` ao lado deles sao gerados por:

```bash
npm run compile
```

Para rodar os testes unitarios:

```bash
npm test
```

Para validar tudo antes de empacotar:

```bash
npm run verify
```

## Uso

### Meus Jogos

A tela `Meus Jogos` exibe a biblioteca local e permite filtrar por categoria ou pesquisar usando regex.

Exemplos de pesquisa:

- `mario|zelda`: encontra jogos com Mario ou Zelda no nome/metadados.
- `^super`: encontra jogos que comecam com Super.
- `resident.*evil`: encontra nomes com Resident seguido de Evil.

A busca nao diferencia maiusculas/minusculas. Se a regex estiver invalida, o launcher mostra um aviso e evita aplicar um filtro quebrado.

Com controle/gamepad, navegue ate o campo de pesquisa e pressione `X` para abrir o modal com teclado virtual. No teclado: `A` seleciona tecla, `B` fecha, `X` apaga, `LB/RB` alterna maiusculas, `LT/RT` move o cursor e `Buscar` aplica a pesquisa.

### Steam

Para importar toda a biblioteca Steam, configure primeiro:

- Steam Web API Key nas configuracoes ou no modal de adicionar jogo.
- Usuario Steam no perfil ativo. Pode ser SteamID64, vanity URL ou link `steamcommunity.com/id/...` / `steamcommunity.com/profiles/...`.

Depois clique em `Importar Steam`. A importacao usa a Steam Web API como fonte principal, portanto tambem traz jogos que nao estao baixados. Quando a Steam esta instalada localmente, os manifests `appmanifest_*.acf` sao usados apenas como complemento para marcar jogos instalados.

Jogos Steam nao instalados ficam marcados como `Nao instalado`. Ao tentar iniciar um jogo Steam ausente, o launcher abre o fluxo de instalacao pela Steam.

### RetroArch e ROMs

No botao `Adicionar emulador`, informe:

- Nome do emulador.
- Arquivo do RetroArch.
- Arquivo do core `.so`, `.dll` ou equivalente.
- Pasta exata das ROMs, por exemplo `/home/alex/ROMS/cps2`.
- Extensoes aceitas separadas por virgula, por exemplo `.zip, .gba, .sfc`.

O launcher lista os arquivos diretamente dentro da pasta configurada que tenham extensao permitida. Para arcade/MAME/FinalBurn, normalmente a extensao sera `.zip`.

### Web App

O menu `Web App` abre `interface/webapp.html`, com atalhos para YouTube, Google e Discord.

Paginas interativas como YouTube, Google e Discord abrem no modo integrado do launcher para manter suporte a controle/gamepad. O launcher tambem mantem uma lista de abas internas, permitindo voltar para `Meus Jogos`, reabrir uma pagina ja iniciada ou fechar paginas em segundo plano.

Durante a navegacao web, o controle/gamepad pode mover o cursor virtual, acionar cliques, voltar, recarregar e abrir o teclado virtual. A tecla `Esc` fecha o navegador interno e retorna para `Meus Jogos`.

## Builds

Para gerar o build padrao definido no `electron-builder`:

```bash
npm run build
```

Para gerar AppImage e `.deb` no Linux:

```bash
npm run build:linux
```

Para gerar apenas AppImage:

```bash
npm run build:appimage
```

Saida esperada em `dist/`:

- `BitRust Launcher-<versao>-linux-x86_64.AppImage`

Para gerar apenas pacote `.deb`:

```bash
npm run build:deb
```

Saida esperada em `dist/`:

- `BitRust Launcher-<versao>-linux-amd64.deb`

Para gerar pacotes do Windows:

```bash
npm run build:win
```

Saidas esperadas em `dist/`:

- instalador NSIS `.exe`
- versao portable `.exe`
- pasta `win-unpacked/`

Ao gerar Windows a partir do Linux, o `electron-builder` exige Wine instalado. Em uma maquina Windows, o mesmo comando deve gerar os artefatos sem Wine.

Para o fluxo completo de release, veja [docs/PRODUCTION.md](docs/PRODUCTION.md).

## Persistencia

Em desenvolvimento, o launcher cria automaticamente o banco:

```text
data/launcher.db
```

Em build instalado/empacotado, o banco e criado no diretorio de dados do usuario do sistema operacional, nao dentro da pasta do app. Assim o pacote nao leva os dados locais da sua maquina.

Exemplos:

- Linux AppImage/empacotado: `~/.config/bit-rust-launcher/data/launcher.db` ou `~/.config/BitRust Launcher/data/launcher.db`, dependendo do identificador usado pelo Electron na execucao.
- Windows: `%APPDATA%\BitRust Launcher\data\launcher.db`

Na primeira execucao com SQLite, o app migra automaticamente os dados existentes de:

```text
data/launcher.json
```

O JSON fica apenas como origem de migracao/backup. Depois disso, a fonte principal passa a ser o SQLite.

O banco guarda:

- `games`: jogos Steam e executaveis locais.
- `emulators`: configuracoes de RetroArch, core, pasta de ROMs e extensoes.
- `users`: usuarios do launcher, RetroAchievements, Steam e usuario ativo.
- `settings`: tema, resolucao preferida e chaves de API.
- `rom_display_names`: nomes customizados para ROMs descobertas.

`data/launcher.db`, `data/launcher.db-*` e `data/launcher.json` ficam no `.gitignore` porque podem conter caminhos locais e chaves privadas.

## Estrutura

```text
.
├── package.json
├── tsconfig.json
├── README.md
├── data/
│   ├── launcher.db
│   └── launcher.json          # legado/backup: usado para migracao inicial
├── scripts/
│   ├── after-pack.js
│   ├── build.js
│   ├── electron-doctor.sh
│   ├── fix-electron-sandbox.sh
│   ├── run-electron.js
│   └── start-electron.sh
├── src/
│   ├── browser-view-controller-preload.ts
│   ├── browser-view-controller-preload.js
│   ├── main.ts
│   ├── main.js
│   ├── preload.ts
│   ├── preload.js
│   ├── storage.ts
│   ├── storage.js
│   └── ico/
│       ├── ico.ico
│       └── ico.png
├── interface/
│   ├── index.html
│   ├── settings.html
│   ├── users.html
│   ├── virtual-keyboard.html
│   ├── webapp.html
│   └── src/
│       ├── css/
│       │   └── style.css
│       ├── img/
│       │   ├── backgrounds/
│       │   └── perfil/
│       ├── js/
│       │   ├── browser-control-mode.ts
│       │   ├── browser-control-mode.js
│       │   ├── modal-alert.ts
│       │   ├── modal-alert.js
│       │   ├── page-tabs-modal.ts
│       │   ├── page-tabs-modal.js
│       │   ├── script.ts
│       │   ├── script.js
│       │   ├── settings.ts
│       │   ├── settings.js
│       │   ├── store.ts
│       │   ├── store.js
│       │   ├── users.ts
│       │   └── users.js
│       └── medias/
└── tests/
    └── unit/
        └── browser-control-mode.test.js
```

## Observacoes

- O projeto nao usa Python. O Electron expoe uma camada `window.pywebview.api` apenas para compatibilidade com a interface original.
- Edite preferencialmente os arquivos `.ts`; os `.js` e `.js.map` sao saidas de compilacao usadas pelo Electron e pelos HTMLs.
- Prefira organizar novas regras de UI em classes TypeScript quando houver estado proprio, eventos e validacao. A pesquisa da biblioteca usa `GameSearchController` em `interface/src/js/script.ts` como referencia desse padrao.
- Bootstrap e Bootstrap Icons sao carregados de `node_modules`, sem depender de CDN para abrir a interface.
- A navegacao por controle/gamepad usa a Gamepad API do navegador.
- A importacao de biblioteca Steam usa a Steam Web API com jogos free/playable incluidos e tambem complementa com manifests locais `appmanifest_*.acf` quando a Steam esta instalada na maquina. O cache da Steam nao substitui a importacao manual; ao clicar em importar, a Web API e consultada novamente.
- A tela de perfil consulta Steam Web API e RetroAchievements Web API usando as chaves salvas nas configuracoes.
- Para Steam, informe SteamID64, link `steamcommunity.com/id/...`, link `steamcommunity.com/profiles/...` ou vanity URL resolvivel pela Steam API.
- YouTube, Google e Discord sao tratados como paginas interativas e usam o modo integrado do launcher para preservar controles, cursor virtual e teclado virtual.
- Para uma visao por pastas e responsabilidades dos arquivos, veja [docs/PROJECT_STRUCTURE.md](docs/PROJECT_STRUCTURE.md).
- Para documentacao detalhada de funcoes JavaScript, HTML e CSS, veja [docs/JAVASCRIPT_REFERENCE.md](docs/JAVASCRIPT_REFERENCE.md) e [docs/HTML_CSS_REFERENCE.md](docs/HTML_CSS_REFERENCE.md).
