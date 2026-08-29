# Instruções — Emulação do Cadastro de Gado (Demonstração)

## Contexto

Esta é uma funcionalidade de **demonstração** para apresentar ao cliente o comportamento esperado da tela de "Cadastro de Gado", simulando os cálculos automáticos que o sistema fará. Não é necessário persistir esses dados no banco nesta etapa — o objetivo é simular o comportamento em tempo real no front-end, usando estado local (client-side).

## Comportamento esperado

### 1. Cálculo automático de campos

Ao preencher os campos de entrada do formulário, os seguintes campos devem ser **calculados automaticamente** (não editáveis manualmente pelo usuário), atualizando em tempo real conforme o usuário digita:

| Campo calculado | Fórmula |
|---|---|
| **Peso para Cálculo** | Peso Total × (Rendimento de Carcaça do negócio / 100) |
| **Peso da Arroba** | Peso para Cálculo / 15 |
| **Valor Total** | Peso para Cálculo × Peso da Arroba |

> **Nota para o Claude Code:** implemente exatamente essas fórmulas, na ordem indicada (Peso para Cálculo depende do Peso Total e do Rendimento de Carcaça; Peso da Arroba depende do Peso para Cálculo; Valor Total depende dos dois anteriores). Se o "Rendimento de Carcaça" não estiver disponível no formulário de gado (ele pertence ao cadastro de Negócio), use um valor mockado fixo (ex: 50%) para esta demonstração, ou receba esse valor como prop do componente pai (tela de negócio), deixando claro no código com um comentário que essa integração real virá depois.

**Campos de entrada (preenchidos pelo usuário):**
- Denominação (texto)
- Gênero (Macho/Fêmea)
- Peso Total (numérico)

**Campos calculados (somente leitura, atualizados em tempo real):**
- Peso para Cálculo
- Peso da Arroba
- Valor Total

### 2. Ao clicar em "Cadastrar"

- Os campos de **entrada** do formulário (Denominação, Gênero, Peso Total) devem ser **limpos**, voltando ao estado inicial, prontos para o cadastro do próximo gado.
- Os campos calculados também devem ser resetados junto com o formulário.
- **Dois valores agregados, exibidos fora do formulário (ex: no cabeçalho do card do negócio, como já está no mockup), devem ser atualizados e mantidos entre os cadastros:**

| Campo agregado | Fórmula |
|---|---|
| **Cabeças cadastradas** | Contador incremental: +1 a cada clique em "Cadastrar" |
| **Valor médio por cabeça** | Soma do Valor Total de todas as cabeças cadastradas até o momento / Quantidade de cabeças cadastradas |

Esses dois valores **não são limpos** ao cadastrar — eles persistem e se atualizam a cada novo gado adicionado, simulando o comportamento visto no mockup ("Cabeças: 15" e "Valor médio p/ cabeça: R$ 4.171,00").

## Escopo técnico

- Toda a lógica pode ser implementada com **estado local do componente React** (`useState`), sem necessidade de chamada à API ou persistência no banco — é uma simulação para demonstração.
- Manter a tipagem em TypeScript (evitar `any`), incluindo tipos para o estado do formulário e para a lista de gados cadastrados na sessão.
- Seguir o layout já existente no mockup de "Cadastro de Gado" (campos: Denominação, Gênero, Valor, Peso Total, Peso p/ Cálculo, Peso da Arroba, Valor Total, botão "Cadastrar").
- Deixar um comentário no código indicando que esta é uma implementação de demonstração e que, na versão final, o cadastro deverá persistir os dados via API (`POST /api/gados`) e recalcular os agregados a partir dos dados reais do banco, não do estado local.

## Observação sobre as fórmulas

Ao revisar as fórmulas, notei que **Valor Total = Peso para Cálculo × Peso da Arroba** multiplica duas grandezas de peso entre si, o que foge do cálculo comum do setor (normalmente Valor Total = Peso da Arroba × Valor pago por arroba, que é um valor monetário). Se essa fórmula foi definida intencionalmente para fins de demonstração (por exemplo, o cliente só quer ver o comportamento dinâmico dos campos, sem se ater à precisão do valor exibido), pode seguir como está. Mas vale confirmar antes de repassar ao Claude Code, para não ter que ajustar a lógica depois caso o cliente questione o valor exibido na demonstração.