# Instruções — MVP Front-end (Castilho Agronegócios)

## Contexto

Este é um MVP temporário para apresentação ao cliente. O objetivo é **listar os dados já existentes no banco de dados** (negócios e gado), sem construir ainda um backend robusto e separado. Depois desta versão inicial, o sistema evoluirá para uma arquitetura com backend dedicado — por isso, a solução aqui deve ser funcional, mas simples de substituir depois.

## Stack obrigatória

- **Framework**: Next.js com **TypeScript** (não usar JavaScript puro em nenhum arquivo)
- **Estilização**: Tailwind CSS
- **Componentes base**: shadcn/ui
- **ORM**: Prisma, conectando diretamente ao banco PostgreSQL hospedado no RDS (AWS)
- **Camada de dados**: usar API Routes do próprio Next.js (`/app/api/...`) como intermediário entre o front e o banco — **não conectar o Prisma diretamente em componentes client-side**

## Estilo visual

- O cliente vai usar o sistema **exclusivamente em iPhone/Safari**, e pediu um visual semelhante aos aplicativos nativos da Apple (estilo "Liquid Glass" do iOS 26).
- Implementar o efeito de vidro fosco manualmente com `backdrop-filter`, blur e bordas/sombras sutis em elementos como cards, barra de navegação e cabeçalhos — **não usar bibliotecas de terceiros experimentais** para isso.
- Testar prioritariamente a compatibilidade com Safari/WebKit, não apenas Chromium.
- Priorizar layout mobile-first, já que o uso real será em iPhone.

## Banco de dados — schema atual

O banco já existe e está populado no RDS. O Prisma deve ler o schema existente com `npx prisma db pull`, mas para referência, a estrutura é:

```prisma
model Empresa {
  empresa_id Int      @id @default(autoincrement())
  cnpj       String
  creci      String
  nome       String
  usuarios   Usuario[]
  negocios   Negocio[]
}

model Usuario {
  user_id     Int     @id @default(autoincrement())
  empresa_id  Int
  nome        String
  sobrenome   String
  email       String  @unique
  senha       String
  empresa     Empresa @relation(fields: [empresa_id], references: [empresa_id])
}

model Negocio {
  negocio_id          Int      @id @default(autoincrement())
  empresa_id          Int
  valor_total         Decimal?
  valor_medio         Decimal?
  vendedor            String
  fazenda             String
  merchant            String
  comprador           String?
  qtd_animais         Int?
  rendimento_carcaca  Decimal
  mais_pesado         Decimal?
  mais_leve           Decimal?
  data_negocio        DateTime
  comissao            Decimal
  valor_arroba        Decimal
  modalidade          String
  empresa             Empresa  @relation(fields: [empresa_id], references: [empresa_id])
  gados               Gado[]
}

model Gado {
  gado_id      Int      @id @default(autoincrement())
  negocio_id   Int
  valor_total  Decimal?
  peso_arroba  Decimal
  peso_calculo Decimal
  peso_total   Decimal
  data_pesagem DateTime?
  genero       String
  denominacao  String
  negocio      Negocio  @relation(fields: [negocio_id], references: [negocio_id])
}
```

A `DATABASE_URL` de conexão será fornecida separadamente em um arquivo `.env` (não versionado no Git).

## O que construir nesta etapa

### 1. API Routes (leitura apenas, por enquanto)

- `GET /api/negocios` — retorna todos os negócios cadastrados
- `GET /api/negocios/[id]` — retorna um negócio específico, incluindo os gados relacionados
- `GET /api/gados?negocio_id=X` — retorna os gados de um negócio específico (pode ser dispensado se o endpoint acima já incluir os gados aninhados)

Não é necessário implementar criação, edição ou exclusão nesta etapa — é uma versão apenas de visualização para apresentação.

### 2. Telas (seguir os mockups já compartilhados anteriormente)

**Tela: Home**
- Botão/atalho para "Negócios Cadastrados" (lista)
- Não é necessário implementar "Cadastrar Novo Negócio" nesta etapa (pode ficar como placeholder desabilitado)

**Tela: Lista de Negócios Cadastrados**
- Lista todos os negócios vindos de `GET /api/negocios`
- Exibir por card: fazenda, vendedor, data do negócio, comissão, quantidade de cabeças (seguir visual do mockup anexado anteriormente)
- Não é obrigatório implementar filtros (por período/vendedor) nesta etapa — pode ser um `<select>` estático sem lógica funcional ainda, claramente sinalizado como placeholder

**Tela: Detalhe do Negócio**
- Ao clicar em um negócio da lista, mostrar os detalhes (fazenda, vendedor, rendimento de carcaça, valor por arroba, modalidade, valor médio por cabeça)
- Listar os gados vinculados àquele negócio (denominação, gênero, peso, valor total) — seguir o mockup da tela "Negócios Cadastrados" com a lista de "Nelore" etc.

### 3. Telas sem mockup definido (não construir agora)

As telas abaixo aparecem nos requisitos funcionais do projeto, mas **ainda não têm mockup definido** e **não fazem parte do escopo desta versão temporária**:
- Login / autenticação real (por enquanto, pode-se pular a tela de login e ir direto para a Home, ou usar uma tela de login estática sem validação real)
- Aprovação de usuários
- Perfil do usuário / perfil da empresa
- Gráficos gerais (modal Bento)
- Geração de relatórios

Não implemente essas telas nesta etapa. Se fizer sentido, deixe comentários no código indicando onde essas features entrarão futuramente.

## Observações importantes para o Claude Code

- Esta é uma solução **temporária**. Priorize simplicidade e código limpo sobre otimizações prematuras — o objetivo é ter algo apresentável ao cliente o quanto antes, sabendo que o backend será refeito depois com uma arquitetura mais robusta (API separada, autenticação real, etc.).
- Mesmo sendo temporário, **não conecte credenciais do banco no lado client** — toda query ao banco deve passar pelas API Routes do Next.js.
- Use tipagem forte (TypeScript) em todas as respostas de API e nos componentes, evitando `any`.
- Trate estados de carregamento (loading) e erro nas telas que buscam dados da API, mesmo que de forma simples.
- Ao final desta etapa, o cliente deve conseguir abrir o link no iPhone dele e navegar: Home → Lista de Negócios → Detalhe de um Negócio com os gados listados.