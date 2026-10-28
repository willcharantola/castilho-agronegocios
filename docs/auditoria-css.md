# Auditoria de CSS repetido

Item 4 de `ajustes.md`: concentrar o CSS repetido entre as telas em `src/app/shared.css` e deixar
em cada `*.module.css` só o que é exclusivo dela, **sem mudança visual**.

## Método

1. Levantados todos os arquivos CSS rastreados: **57** (`globals.css` + 56 `*.module.css`), **4.166 linhas**.
2. Cada regra foi normalizada (ordem das propriedades, espaços, `0.75rem` ≡ `.75rem`, caixa) e agrupada
   pelo conjunto de declarações, separando o contexto `@media`. Entraram na lista os blocos
   **idênticos** em **3 ou mais arquivos**.
3. A migração foi feita por script, com estas regras:
   - só sai do módulo a regra com seletor simples (`.classe` ou `.classe::pseudo`) cujas declarações
     são **exatamente** as da classe global;
   - quando o bloco local tem as mesmas declarações **mais** propriedades que a global não define
     (ex.: `.page` com `padding-bottom: 5rem`), as extras ficam no módulo como override — a global e o
     override nunca definem a mesma propriedade no mesmo elemento;
   - se a classe local continua referenciada no módulo (outra regra, `@media`, pseudo-classe), o TSX
     mantém `styles.x` junto da global (`cn("list-card", styles.card)`);
   - módulos que ficaram vazios foram apagados junto com o `import`.
4. Depois, os valores repetidos viraram variáveis (seção abaixo), substituindo só valores idênticos.

## Blocos repetidos → classe global

`shared.css` é importado em `app/layout.tsx` logo depois de `globals.css`; os `*.module.css` das
telas carregam depois, então um override de página sempre vence a classe global.

| Classe global | Bloco local migrado | Arquivos | Onde aparece |
|---|---|---|---|
| `.page-container` | `.page` | 22 | `app/(app)/compradores/[id]/page.module.css`<br>`app/(app)/compradores/novo/page.module.css`<br>`app/(app)/compradores/page.module.css` (override: `padding-bottom: 5rem`)<br>`app/(app)/configuracoes/impostos-e-taxas/page.module.css`<br>`app/(app)/configuracoes/page.module.css`<br>`app/(app)/dashboard/page.module.css` (override: `padding-bottom: 5rem`)<br>`app/(app)/fazendas/[id]/page.module.css`<br>`app/(app)/fazendas/novo/page.module.css`<br>`app/(app)/fazendas/page.module.css` (override: `padding-bottom: 5rem`)<br>`app/(app)/negocios/[id]/gado/gado-page.module.css` (override: `padding-bottom: 6rem`)<br>`app/(app)/negocios/novo/comprador/page.module.css`<br>`app/(app)/negocios/novo/informacoes/page.module.css`<br>`app/(app)/negocios/novo/modalidade/page.module.css`<br>`app/(app)/negocios/novo/page.module.css`<br>`app/(app)/negocios/novo/pecuarista/page.module.css`<br>`app/(app)/negocios/novo/quantidade-cabecas/page.module.css` (override: `flex: 1`)<br>`app/(app)/negocios/page.module.css` (override: `padding-bottom: 5rem`)<br>`app/(app)/pecuaristas/[id]/page.module.css`<br>`app/(app)/pecuaristas/novo/dados/page.module.css`<br>`app/(app)/pecuaristas/novo/page.module.css`<br>`app/(app)/pecuaristas/page.module.css` (override: `padding-bottom: 5rem`)<br>`app/(app)/perfil/usuarios/usuario-form.module.css` (override: `padding-bottom: 6rem`) |
| `.page-narrow` | `.page` | 13 | `app/(app)/compradores/[id]/page.module.css`<br>`app/(app)/compradores/novo/page.module.css`<br>`app/(app)/configuracoes/impostos-e-taxas/page.module.css`<br>`app/(app)/configuracoes/page.module.css`<br>`app/(app)/fazendas/[id]/page.module.css`<br>`app/(app)/fazendas/novo/page.module.css`<br>`app/(app)/negocios/[id]/gado/gado-page.module.css`<br>`app/(app)/negocios/novo/gado/page.module.css`<br>`app/(app)/negocios/novo/informacoes/page.module.css`<br>`app/(app)/negocios/novo/quantidade-cabecas/page.module.css`<br>`app/(app)/pecuaristas/[id]/page.module.css`<br>`app/(app)/pecuaristas/novo/dados/page.module.css`<br>`app/(app)/perfil/usuarios/usuario-form.module.css` |
| `.page-wide` | `.page`, `.section` | 12 | `app/(app)/compradores/page.module.css`<br>`app/(app)/dashboard/page.module.css`<br>`app/(app)/fazendas/page.module.css`<br>`app/(app)/negocios/[id]/page.module.css`<br>`app/(app)/negocios/novo/comprador/page.module.css`<br>`app/(app)/negocios/novo/modalidade/page.module.css`<br>`app/(app)/negocios/novo/page.module.css`<br>`app/(app)/negocios/novo/pecuarista/page.module.css`<br>`app/(app)/negocios/page.module.css`<br>`app/(app)/pecuaristas/novo/page.module.css`<br>`app/(app)/pecuaristas/page.module.css`<br>`app/(app)/perfil/page.module.css` |
| `.page-title` | `.title` | 24 | `app/(app)/compradores/[id]/page.module.css`<br>`app/(app)/compradores/novo/page.module.css`<br>`app/(app)/compradores/page.module.css`<br>`app/(app)/configuracoes/impostos-e-taxas/page.module.css`<br>`app/(app)/configuracoes/page.module.css`<br>`app/(app)/dashboard/page.module.css`<br>`app/(app)/fazendas/[id]/page.module.css`<br>`app/(app)/fazendas/novo/page.module.css`<br>`app/(app)/fazendas/page.module.css`<br>`app/(app)/negocios/[id]/gado/gado-page.module.css`<br>`app/(app)/negocios/novo/comprador/page.module.css` (override: `margin-top: .5rem`)<br>`app/(app)/negocios/novo/gado/page.module.css`<br>`app/(app)/negocios/novo/informacoes/page.module.css` (override: `margin-top: .5rem`)<br>`app/(app)/negocios/novo/modalidade/page.module.css` (override: `margin-top: .5rem`)<br>`app/(app)/negocios/novo/page.module.css` (override: `margin-top: .5rem`)<br>`app/(app)/negocios/novo/pecuarista/page.module.css` (override: `margin-top: .5rem`)<br>`app/(app)/negocios/novo/quantidade-cabecas/page.module.css` (override: `margin-top: .5rem`)<br>`app/(app)/negocios/page.module.css`<br>`app/(app)/pecuaristas/[id]/page.module.css`<br>`app/(app)/pecuaristas/novo/dados/page.module.css`<br>`app/(app)/pecuaristas/novo/page.module.css`<br>`app/(app)/pecuaristas/page.module.css`<br>`app/(app)/perfil/usuarios/usuario-form.module.css`<br>`components/placeholder-screen.module.css` |
| `.section-title` | `.sectionTitle`, `.sessionTitle`, `.subtitle` | 5 | `app/(app)/negocios/[id]/page.module.css`<br>`app/(app)/negocios/novo/comprador/page.module.css`<br>`app/(app)/negocios/novo/gado/page.module.css`<br>`app/(app)/negocios/novo/modalidade/page.module.css`<br>`app/(app)/negocios/novo/pecuarista/page.module.css` |
| `.form-stack` | `.fields`, `.form` | 9 | `app/(app)/compradores/[id]/page.module.css`<br>`app/(app)/compradores/novo/page.module.css`<br>`app/(app)/configuracoes/impostos-e-taxas/page.module.css`<br>`app/(app)/fazendas/[id]/page.module.css`<br>`app/(app)/fazendas/novo/page.module.css`<br>`app/(app)/negocios/novo/informacoes/page.module.css`<br>`app/(app)/pecuaristas/[id]/page.module.css`<br>`app/(app)/pecuaristas/novo/dados/page.module.css`<br>`components/auth/step-form.module.css` |
| `.form-fields` | `.fields`, `.form` | 11 | `app/(app)/compradores/[id]/page.module.css`<br>`app/(app)/compradores/novo/page.module.css`<br>`app/(app)/configuracoes/impostos-e-taxas/page.module.css`<br>`app/(app)/fazendas/[id]/page.module.css`<br>`app/(app)/fazendas/novo/page.module.css`<br>`app/(app)/negocios/novo/informacoes/page.module.css`<br>`app/(app)/negocios/novo/quantidade-cabecas/page.module.css`<br>`app/(app)/pecuaristas/[id]/page.module.css`<br>`app/(app)/pecuaristas/novo/dados/page.module.css`<br>`app/(app)/perfil/usuarios/usuario-form.module.css`<br>`components/gado-form.module.css` |
| `.form-row` | `.row` | 5 | `app/(app)/negocios/novo/informacoes/page.module.css`<br>`app/(app)/negocios/novo/quantidade-cabecas/page.module.css`<br>`app/(app)/pecuaristas/[id]/page.module.css`<br>`app/(app)/pecuaristas/novo/dados/page.module.css`<br>`app/(app)/perfil/usuarios/usuario-form.module.css` |
| `.form-error` | `.authError`, `.error`, `.submitError` | 13 | `app/(app)/compradores/[id]/page.module.css`<br>`app/(app)/compradores/novo/page.module.css`<br>`app/(app)/configuracoes/impostos-e-taxas/page.module.css`<br>`app/(app)/fazendas/[id]/page.module.css`<br>`app/(app)/fazendas/novo/page.module.css`<br>`app/(app)/negocios/novo/informacoes/page.module.css`<br>`app/(app)/negocios/novo/quantidade-cabecas/page.module.css`<br>`app/(app)/pecuaristas/[id]/page.module.css`<br>`app/(app)/pecuaristas/novo/dados/page.module.css`<br>`app/(app)/perfil/usuarios/usuario-form.module.css`<br>`app/login/senha/page.module.css`<br>`components/comissao-form.module.css`<br>`components/gado-form.module.css` |
| `.field-error` | `.error` | 3 | `components/form/field.module.css`<br>`components/form/icon-field.module.css`<br>`components/form/otp-input.module.css` |
| `.date-input-fix` | `.filterField`, `.form` | 3 | `app/(app)/dashboard/page.module.css`<br>`app/(app)/negocios/novo/informacoes/page.module.css`<br>`components/gado-form.module.css` |
| `.search-box` | `.searchWrap` | 6 | `app/(app)/compradores/page.module.css`<br>`app/(app)/fazendas/page.module.css`<br>`app/(app)/negocios/novo/page.module.css`<br>`app/(app)/negocios/page.module.css`<br>`app/(app)/pecuaristas/novo/page.module.css`<br>`app/(app)/pecuaristas/page.module.css` |
| `.search-icon` | `.searchIcon` | 6 | `app/(app)/compradores/page.module.css`<br>`app/(app)/fazendas/page.module.css`<br>`app/(app)/negocios/novo/page.module.css`<br>`app/(app)/negocios/page.module.css`<br>`app/(app)/pecuaristas/novo/page.module.css`<br>`app/(app)/pecuaristas/page.module.css` |
| `.search-input` | `.searchInput` | 6 | `app/(app)/compradores/page.module.css`<br>`app/(app)/fazendas/page.module.css`<br>`app/(app)/negocios/novo/page.module.css`<br>`app/(app)/negocios/page.module.css`<br>`app/(app)/pecuaristas/novo/page.module.css`<br>`app/(app)/pecuaristas/page.module.css` |
| `.card-list` | `.list` | 12 | `app/(app)/compradores/page.module.css`<br>`app/(app)/configuracoes/page.module.css`<br>`app/(app)/dashboard/page.module.css`<br>`app/(app)/fazendas/page.module.css`<br>`app/(app)/negocios/novo/comprador/page.module.css`<br>`app/(app)/negocios/novo/modalidade/page.module.css`<br>`app/(app)/negocios/novo/page.module.css`<br>`app/(app)/negocios/novo/pecuarista/page.module.css`<br>`app/(app)/negocios/page.module.css`<br>`app/(app)/pecuaristas/novo/page.module.css`<br>`app/(app)/pecuaristas/page.module.css`<br>`app/(app)/perfil/page.module.css` |
| `.list-card` | `.card` | 10 | `app/(app)/compradores/page.module.css`<br>`app/(app)/configuracoes/page.module.css`<br>`app/(app)/fazendas/page.module.css`<br>`app/(app)/negocios/novo/comprador/page.module.css` (override: `width: 100%; cursor: pointer`)<br>`app/(app)/negocios/novo/modalidade/page.module.css` (override: `width: 100%; cursor: pointer`)<br>`app/(app)/negocios/novo/page.module.css` (override: `width: 100%; cursor: pointer`)<br>`app/(app)/negocios/novo/pecuarista/page.module.css` (override: `width: 100%; cursor: pointer`)<br>`app/(app)/negocios/page.module.css`<br>`app/(app)/pecuaristas/novo/page.module.css` (override: `width: 100%; cursor: pointer`)<br>`app/(app)/perfil/page.module.css` |
| `.summary-card` | `.fazendaCard` | 6 | `app/(app)/negocios/novo/comprador/page.module.css`<br>`app/(app)/negocios/novo/modalidade/page.module.css`<br>`app/(app)/negocios/novo/pecuarista/page.module.css`<br>`app/(app)/negocios/novo/quantidade-cabecas/page.module.css`<br>`app/(app)/pecuaristas/[id]/page.module.css`<br>`app/(app)/pecuaristas/novo/dados/page.module.css` |
| `.card-header` | `.cardHeader`, `.summaryHeader` | 3 | `app/(app)/negocios/[id]/page.module.css`<br>`app/(app)/negocios/novo/gado/page.module.css`<br>`app/(app)/pecuaristas/page.module.css` |
| `.card-icon` | `.cardIcon`, `.rowIcon` | 8 | `app/(app)/compradores/page.module.css`<br>`app/(app)/configuracoes/page.module.css`<br>`app/(app)/dashboard/page.module.css`<br>`app/(app)/fazendas/page.module.css`<br>`app/(app)/negocios/novo/page.module.css`<br>`app/(app)/negocios/page.module.css`<br>`app/(app)/pecuaristas/novo/page.module.css`<br>`app/(app)/perfil/page.module.css` |
| `.card-icon-on-dark` | `.cardIcon`, `.fazendaIcon`, `.summaryIcon` | 10 | `app/(app)/negocios/[id]/page.module.css`<br>`app/(app)/negocios/novo/comprador/page.module.css`<br>`app/(app)/negocios/novo/gado/page.module.css`<br>`app/(app)/negocios/novo/informacoes/page.module.css`<br>`app/(app)/negocios/novo/modalidade/page.module.css`<br>`app/(app)/negocios/novo/pecuarista/page.module.css`<br>`app/(app)/negocios/novo/quantidade-cabecas/page.module.css`<br>`app/(app)/pecuaristas/[id]/page.module.css`<br>`app/(app)/pecuaristas/novo/dados/page.module.css`<br>`app/(app)/pecuaristas/page.module.css` |
| `.card-info` | `.cardInfo` | 10 | `app/(app)/compradores/page.module.css`<br>`app/(app)/fazendas/page.module.css`<br>`app/(app)/negocios/novo/comprador/page.module.css`<br>`app/(app)/negocios/novo/modalidade/page.module.css`<br>`app/(app)/negocios/novo/page.module.css`<br>`app/(app)/negocios/novo/pecuarista/page.module.css`<br>`app/(app)/negocios/page.module.css`<br>`app/(app)/pecuaristas/novo/page.module.css`<br>`app/(app)/pecuaristas/page.module.css`<br>`app/(app)/perfil/page.module.css` |
| `.card-name` | `.cardFarm`, `.cardName` | 7 | `app/(app)/compradores/page.module.css`<br>`app/(app)/configuracoes/page.module.css`<br>`app/(app)/fazendas/page.module.css`<br>`app/(app)/negocios/novo/page.module.css`<br>`app/(app)/negocios/page.module.css`<br>`app/(app)/pecuaristas/novo/page.module.css`<br>`app/(app)/perfil/page.module.css` |
| `.card-meta` | `.cardMeta` | 4 | `app/(app)/compradores/page.module.css`<br>`app/(app)/fazendas/page.module.css`<br>`app/(app)/negocios/novo/page.module.css`<br>`app/(app)/negocios/page.module.css` |
| `.card-meta-on-dark` | `.cardMeta`, `.summarySeller` | 4 | `app/(app)/negocios/novo/comprador/page.module.css`<br>`app/(app)/negocios/novo/gado/page.module.css`<br>`app/(app)/negocios/novo/pecuarista/page.module.css`<br>`app/(app)/pecuaristas/page.module.css` |
| `.state-box` | `.state` | 17 | `app/(app)/compradores/[id]/page.module.css`<br>`app/(app)/compradores/page.module.css`<br>`app/(app)/configuracoes/impostos-e-taxas/page.module.css`<br>`app/(app)/fazendas/[id]/page.module.css`<br>`app/(app)/fazendas/page.module.css`<br>`app/(app)/negocios/[id]/gado/gado-page.module.css`<br>`app/(app)/negocios/[id]/page.module.css`<br>`app/(app)/negocios/novo/comprador/page.module.css`<br>`app/(app)/negocios/novo/gado/page.module.css`<br>`app/(app)/negocios/novo/page.module.css`<br>`app/(app)/negocios/novo/pecuarista/page.module.css`<br>`app/(app)/negocios/page.module.css`<br>`app/(app)/pecuaristas/[id]/page.module.css`<br>`app/(app)/pecuaristas/novo/page.module.css`<br>`app/(app)/pecuaristas/page.module.css`<br>`app/(app)/perfil/page.module.css`<br>`app/(app)/perfil/usuarios/usuario-form.module.css` |
| `.state-error` | `.stateError` | 17 | `app/(app)/compradores/[id]/page.module.css`<br>`app/(app)/compradores/page.module.css`<br>`app/(app)/configuracoes/impostos-e-taxas/page.module.css`<br>`app/(app)/fazendas/[id]/page.module.css`<br>`app/(app)/fazendas/page.module.css`<br>`app/(app)/negocios/[id]/gado/gado-page.module.css`<br>`app/(app)/negocios/[id]/page.module.css`<br>`app/(app)/negocios/novo/comprador/page.module.css`<br>`app/(app)/negocios/novo/gado/page.module.css`<br>`app/(app)/negocios/novo/page.module.css`<br>`app/(app)/negocios/novo/pecuarista/page.module.css`<br>`app/(app)/negocios/page.module.css`<br>`app/(app)/pecuaristas/[id]/page.module.css`<br>`app/(app)/pecuaristas/novo/page.module.css`<br>`app/(app)/pecuaristas/page.module.css`<br>`app/(app)/perfil/page.module.css`<br>`app/(app)/perfil/usuarios/usuario-form.module.css` |
| `.report-error` | `.error`, `.relatorioError` | 3 | `app/(app)/dashboard/page.module.css`<br>`app/(app)/negocios/[id]/page.module.css`<br>`app/(app)/negocios/page.module.css` |
| `.report-notice` | `.aviso`, `.relatorioAviso` | 3 | `app/(app)/dashboard/page.module.css`<br>`app/(app)/negocios/[id]/page.module.css`<br>`app/(app)/negocios/page.module.css` |
| `.retry-button` | `.retryButton` | 6 | `app/(app)/compradores/page.module.css`<br>`app/(app)/fazendas/page.module.css`<br>`app/(app)/negocios/[id]/page.module.css`<br>`app/(app)/negocios/page.module.css`<br>`app/(app)/pecuaristas/page.module.css`<br>`app/(app)/perfil/page.module.css` |

Caminhos relativos a `src/`. "override" = propriedades que ficaram no módulo daquela tela.

## Variáveis novas (`:root` em `shared.css`)

| Variável | Valor | Usos substituídos nos módulos |
|---|---|---|
| `--radius-box` | `5px` | 39 `border-radius` (+ as classes de `shared.css`) |
| `--color-ink-muted` | `color-mix(in oklch, var(--color-ink) 70%, transparent)` | 17 |
| `--color-ink-soft` | `color-mix(in oklch, var(--color-ink) 50%, transparent)` | ícone de busca (`shared.css`) |
| `--color-placeholder` | `color-mix(in oklch, var(--color-ink) 45%, transparent)` | placeholder da busca (`shared.css`) |
| `--color-on-dark-surface` | `rgb(255 255 255 / 15%)` | 4 (+ `.card-icon-on-dark`) |
| `--font-size-xs` / `-sm` / `-md` / `-title` | `0.75rem` / `0.85rem` / `0.9rem` / `1.25rem` | 18 / 10 / 24 / 2 |

Reaproveitadas as existentes: `--color-dark`, `--color-ink`, `--color-white` (no lugar de `#fff`),
`--color-danger`, `--form-max-width`.

## Decisões (o que ficou de fora e por quê)

- **`.tileValue`** (Início) tem as mesmas declarações de `.page-title`, mas é o número de um card,
  não um título: mantido no módulo.
- **Utilitários de uma propriedade** repetidos (`font-weight: 800`, `margin-top: 0.75rem` em
  botões que não são "tentar de novo", `position: relative`, `flex: 1`, `color: white`): virariam
  classes utilitárias sem significado; mantidos. Exceção: `.retryButton` → `.retry-button`, citado
  em `ajustes.md`.
- **Mesmas declarações, papéis diferentes**: `display:flex; column; gap:0.5rem` (`.dialogActions`,
  `.erroLista`, `.field`, `.sessionList`…), `0.9rem/700/dark` em `.label` do `Field`,
  `.totalLabel` e `.sessionName`, `1.5rem/800` em `.totalValue` e no título do cadastro, `.input` do
  formulário de comissão (= `.card-info`): mantidos nos módulos.
- **Variações de cor de `.cardMeta`** (`rgb(255 255 255 / 75%)`, ink 70% em `0.8rem`): menos de
  3 ocorrências com o mesmo papel; mantidas.
- **Componentes de UI** (`ui/button`, `ui/dialog`, `ui/select`, `ui/input`) ficaram fora: estilos
  próprios do componente.
- **Sombras**: nenhuma se repete mais de 2 vezes; sem variável.
- **Espaçamentos**: os `gap`/`padding` variam por contexto; sem tokens de espaçamento por ora.
- **iPhone**: preservados os safe-areas (`pt-safe`, `pb-safe`, globais), o `appearance: none` /
  `min-width: 0` dos inputs de data (agora `.date-input-fix`, aplicado no mesmo contêiner de antes) e
  os `minmax(0, 1fr)` que estavam nos módulos (não foram tocados). As `@media` da barra lateral
  (`min-width: 768px` e `min-height: 500px`) foram mantidas idênticas em `.page-narrow`,
  `.page-wide` e `.search-box`.

## Resultado

| | Antes | Depois |
|---|---|---|
| Arquivos CSS | 57 | 54 (4 módulos apagados, `shared.css` novo) |
| Linhas de CSS (total) | 4.166 | 2.632 |
| Linhas nos `*.module.css` | 3.994 | 2.204 (−1.790) |
| `shared.css` | — | 256 linhas (5,5 KB) |

## Verificação

- `npm run build` e `npm run lint` sem erros (lint: 0 erros; os 16 avisos já existiam antes).
- Capturas com Playwright (página inteira, API mockada com dados fixos, relógio fixo) **antes** e
  **depois** da migração em 390×844, 768×1024, 1280×800 e 320×568 (iPhone SE), em 27 telas: Início,
  Negócios, Detalhe do negócio, Novo negócio (todos os passos, inclusive quantidade de cabeças), Perfil
  (+ cadastro/edição de usuário), Dashboard, Configurações (+ Impostos e taxas), Fazendas, Pecuaristas,
  Compradores (lista, detalhe, cadastro) e Login. Comparação pixel a pixel (limiar 0): **108 capturas,
  0 diferenças**. A única divergência (`390x844 fazenda-detalhe`) também aparece entre duas capturas
  do mesmo build (desfoque do `backdrop-filter` sob a navbar fixa) e é idêntica à captura de controle.
