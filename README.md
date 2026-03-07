# Slow Network Simulator (Firefox Add-on)

Addon para Firefox para simular lentidão de navegação por regras de URL (`exact` ou `regex`), com UI compacta em tema escuro.

## Estratégia de matching

Quando múltiplas regras ativas correspondem à mesma URL, o addon usa **a regra com maior `delayMs`**. Em empate, vence a primeira cadastrada.

## Estrutura do projeto

- `src/manifest.json`: manifest da extensão (Firefox)
- `src/background.ts`: listener `webRequest` com atraso artificial + ações da extensão
- `src/popup/*`: interface do popup (HTML/CSS/TS)
- `src/core/*`: regras, validação, persistência e matching
- `tests/*`: testes unitários com Vitest
- `scripts/build.mjs`: build simples com esbuild

## Requisitos

- Node.js 20+
- npm

## Rodar localmente

```bash
npm install
npm test
npm run build
```

## Carregar temporariamente no Firefox

1. Execute `npm run build`.
2. Abra `about:debugging` no Firefox.
3. Clique em **This Firefox**.
4. Clique em **Load Temporary Add-on...**.
5. Selecione o arquivo `dist/manifest.json`.

## Gerar build

```bash
npm run build
```

Saída em `dist/`.

## Como a lentidão foi implementada

- O `background.ts` registra `browser.webRequest.onBeforeRequest` com `blocking`.
- Para cada requisição HTTP(S), verifica regras ativas que casam com a URL.
- Se houver match, retorna uma `Promise` resolvida após `setTimeout(delayMs)`.
- A edição do delay no card envia ação para o background e atualiza persistência imediatamente, então novas requisições já usam o novo valor.

## Como o layout de referência foi adaptado

- Painel compacto escuro com bordas arredondadas e destaque verde para estados ativos.
- Cabeçalho com nome, subtítulo e toggle global.
- Formulário simples para regras por URL (`exact`/`regex`) e delay por regra.
- Cards de regras com botão de `Pausar/Retomar`, badge de tipo, delay editável inline e exclusão.
- Rodapé com resumo de regras ativas e requisições afetadas na sessão.

## Privacidade

- Sem coleta de dados.
- Sem código remoto.
- Persistência apenas em `browser.storage.local`.
