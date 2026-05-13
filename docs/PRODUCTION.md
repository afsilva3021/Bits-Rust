# Producao

Este documento descreve o fluxo recomendado para preparar, validar e gerar pacotes do Bit&Rust Launcher.

## Estrutura de Release

- `src/`: fontes TypeScript do processo principal do Electron, preload seguro, persistencia e preload do navegador interno, junto das saidas JavaScript compiladas.
- `interface/`: telas HTML, CSS, assets e TypeScript do renderer compilado para JavaScript.
- `scripts/`: automacoes locais para iniciar, diagnosticar e empacotar.
- `tests/`: testes unitarios executados com `node --test`.
- `data/`: pasta reservada para dados locais em desenvolvimento. Bancos SQLite e backups JSON nao entram no Git.
- `dist/`: saida de builds. Nao entra no Git.
- `.cache/`: cache local do Electron/electron-builder. Nao entra no Git.
- `squashfs-root/`: extracao local de AppImage. Nao entra no Git.

## Validacao Antes do Build

Execute:

```bash
npm run verify
```

Esse comando roda:

- `npm run check`: valida a sintaxe dos JavaScripts principais, renderers, preloads e scripts de build.
- `npm test`: executa os testes unitarios.

Antes das validacoes, o fluxo roda `tsc -p tsconfig.json` para atualizar os `.js` e `.js.map` usados em runtime.

## Builds de Producao

Linux AppImage e `.deb`:

```bash
npm run release:linux
```

Apenas AppImage:

```bash
npm run verify
npm run build:appimage
```

Apenas `.deb`:

```bash
npm run verify
npm run build:deb
```

Windows:

```bash
npm run release:win
```

Ao gerar Windows a partir do Linux, instale Wine antes de rodar o build.

## Artefatos

Os pacotes sao gerados em `dist/`.

Artefatos esperados:

- Linux AppImage: `BitRust Launcher-<versao>-linux-x86_64.AppImage`
- Linux Debian: `BitRust Launcher-<versao>-linux-amd64.deb`
- Windows installer: `BitRust Launcher-Setup-<versao>-win-<arch>.exe`
- Windows portable: `BitRust Launcher-Portable-<versao>-win-<arch>.exe`

## Dados Locais

Em desenvolvimento, o banco fica em:

```text
data/launcher.db
```

Em app empacotado, os dados ficam no diretorio de usuario do sistema operacional, via `app.getPath('userData')`.

Nao versionar:

- `data/launcher.db`
- `data/launcher.db-shm`
- `data/launcher.db-wal`
- `data/launcher.json`
- chaves de API
- logs locais

## Checklist de Release

1. Atualizar `version` em `package.json`.
2. Rodar `npm install` quando houver mudancas de dependencia.
3. Rodar `npm run verify`.
4. Rodar o build desejado.
5. Testar o pacote gerado fora do diretorio do projeto.
6. Confirmar que `dist/`, `.cache/`, `squashfs-root/` e `data/*.db` continuam fora do Git.
7. Publicar apenas os artefatos finais de `dist/`.

## Observacoes de Empacotamento

- `asar` fica ativado para proteger e compactar os arquivos da aplicacao.
- `sqlite3` fica em `asarUnpack` porque usa binding nativo.
- `npmRebuild` fica desativado; o script de build verifica o binding local do SQLite e tenta reconstruir quando necessario para a plataforma atual.
- `scripts/after-pack.js` ajusta permissoes do `chrome-sandbox` no Linux empacotado.
