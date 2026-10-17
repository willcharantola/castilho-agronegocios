# Instruções — Relatório Romaneio (2 modelos .docx)

## Contexto

O botão **"Gerar relatório"** da página `/negocios` hoje chama `gerarRelatorioNegocios(filtrados, fazendasPorId)` em `@/lib/relatorio` e gera um relatório simples (docxtemplater + pizzip + file-saver, template em `public/templates/`).

Passa a gerar **um romaneio por negócio**, em **dois modelos** (solução temporária até o cliente escolher):

- `public/templates/modelo-romaneio1.docx` — tabela de cabeças com todos os campos por animal
- `public/templates/modelo-romaneio2.docx` — grade fixa de 120 posições (6 colunas × 20 linhas) só com o peso

Os dois arquivos já estão prontos e **com os placeholders inseridos pelo desenvolvedor**. Não editar os .docx; apenas usá-los. Mantenha o relatório antigo se ainda for usado em outro lugar; caso contrário, substitua.

## Comportamento

- Para cada negócio da lista filtrada, buscar o detalhe (`fetchNegocio(id)`, que traz `gados`, `pecuarista`, `comprador`) e gerar os **dois** arquivos.
- Nome dos arquivos: `romaneio1-<fazenda>-<AAAA-MM-DD>.docx` e `romaneio2-<fazenda>-<AAAA-MM-DD>.docx` (sanitizar o nome da fazenda).
- Se houver mais de um negócio filtrado, gerar um .zip (JSZip) com todos os arquivos; se for só um, baixar os dois .docx direto.
- Manter estados `gerandoRelatorio` / `relatorioError` já existentes. Não precisa mudar a página além de continuar chamando a função.
- Negócios da modalidade `cabeca` não têm gados: gerar normalmente com a lista vazia (cabeçalho e totais preenchidos).

## Placeholders — cabeçalho e totais (iguais nos dois modelos)

| Placeholder | Origem |
|---|---|
| `{propriedade}` | nome da fazenda |
| `{ie}` | inscrição estadual (fazenda ou pecuarista — verificar o tipo `Fazenda`/`Pecuarista` em `@/lib/api/types`; vazio se não existir) |
| `{proprietario}` | nome do pecuarista |
| `{municipio}` | município da fazenda (vazio se não existir) |
| `{data}` | `data_negocio` (dd/mm/aaaa) |
| `{horario_inicial}` | `hora_inicio_pesagem` (HH:mm) |
| `{horario_final}` | `hora_fim_pesagem` (HH:mm) |
| `{total_animais}` | `qtd_animais` |
| `{total_kg}` | soma de `peso_total` dos gados |
| `{rend_arroba}` | `rendimento_carcaca` (do gado; se variar, usar a média) |
| `{media_peso}` | total_kg / total_animais |
| `{media_arroba}` | média de `peso_arroba` |
| `{valor_bruto}` | `valor_total` do negócio (moeda) |
| `{funrural}` | `valor_total * 0,015` (moeda) |
| `{senar}` | `valor_total * 0,002` (moeda) |
| `{banco_nome}` | dados bancários do **pecuarista** |
| `{banco_cpf}` | idem |
| `{banco_banco}` | idem |
| `{banco_agencia}` | idem |
| `{banco_conta}` | idem |
| `{banco_pix}` | idem |

Os dados bancários já estão vinculados ao pecuarista no banco. Ler os nomes reais dos campos em `Pecuarista` (`@/lib/api/types` / schema Prisma) e mapear. Se a API ainda não retorna esses campos em `NegocioDetail.pecuarista`, ajustar o `select`/`include` no backend.

`{conferente}` não é preenchido pelo sistema (fica em branco para assinatura).

Formatar com os helpers existentes (`formatCurrency`, `formatNumber`, `formatDate`). Valores `null` viram string vazia, nunca "null"/"undefined" (usar `nullGetter: () => ""` no docxtemplater).

## modelo-romaneio1 — tabela com linhas dinâmicas

A tabela "Cabeças Negociadas" tem uma única linha de dados com o loop `{#gados}` na primeira célula e `{/gados}` na última. O docxtemplater repete a linha para cada animal, então **não há linhas em branco no template** e a tabela cresce conforme o negócio.

Campos de cada item de `gados`:

`{denominacao}` `{genero}` `{carimbo}` `{ano}` `{peso_total}` `{peso_calculo}` `{rend_carcaca}` `{peso_arroba}` `{data_pesagem}` `{hora_pesagem}` `{valor_total}`

- `genero`: usar `formatGenero`. `carimbo` é o mês (1–12) e `ano` vem de `ano_carimbo`.
- Ordenar por `gado_id` (ordem de cadastro).

## modelo-romaneio2 — grade fixa de 120 posições

Cada posição tem um placeholder `{p1}` … `{p120}` (peso total do animal, formatado) ao lado do número fixo. Cada coluna termina com `{t1}` … `{t6}` (soma dos pesos da coluna: 1–20, 21–40, …, 101–120).

- O animal de índice `i` (0-based) preenche `p{i+1}`. Posições sem animal recebem `""`.
- Montar o objeto de dados com um loop `for` de 1 a 120 e calcular os totais por coluna.
- **Mais de 120 animais:** gerar um .docx por bloco de 120 (animais 1–120, 121–240, …), cada um com o cabeçalho e os totais **do negócio inteiro**, mas com a numeração da grade continuando (se possível, `{n1}`…`{n120}` para o número exibido; se o template tiver números fixos, avisar na tela que o negócio excede 120 e gerar só os blocos separados, nomeados `romaneio2-...-parte2.docx`). Os totais `{t1}`–`{t6}` valem para o bloco.
- Com até 120 animais, gera um único arquivo.

## Implementação sugerida

- `@/lib/relatorio-romaneio.ts` com `gerarRomaneios(negocios: NegocioDetail[])`, funções puras `montarDadosCabecalho(negocio)`, `montarDadosModelo1(negocio)`, `montarDadosModelo2(negocio)` (testáveis) e a função que carrega o template (`fetch('/templates/...')` → PizZip → Docxtemplater → `generate({ type: 'blob' })`).
- Reaproveitar a lógica de download já existente (`file-saver`).
- Offline: os templates em `public/templates/` devem entrar no precache do service worker (Serwist) para o relatório funcionar sem conexão.
- Tipagem forte, sem `any`.

## Verificação

1. Gerar com um negócio de poucos animais: conferir os dois arquivos abrindo no Word (e no Pages/iPhone).
2. Negócio com 25+ animais: romaneio1 deve ter 25+ linhas e quebrar de página sem erro; romaneio2 deve ter as posições 1–25 preenchidas e o restante vazio, totais corretos.
3. Negócio com mais de 120 animais: conferir os blocos extras.
4. Negócio `cabeca` (sem gados): sem erro, grade vazia.
5. Campos nulos não aparecem como "null".