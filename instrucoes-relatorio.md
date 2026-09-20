# Instruções — Geração de Relatório (.docx) a partir de Modelo Pronto

## Contexto

Existe um botão (ícone de documento) na tela de listagem de negócios que deve gerar um relatório com os dados atualmente filtrados na tela. O cliente já forneceu um **modelo de documento pronto** (`modelo-relatorio.docx`), que deve ser usado como base — os dados dos negócios filtrados devem ser inseridos dentro desse modelo, mantendo o layout/identidade visual que ele já define (logo, cabeçalho, rodapé).

## Sobre o arquivo de modelo

O arquivo está em `modelo-relatorio.docx`. **Mover esse arquivo para a pasta `public/` do projeto** (ex: `public/templates/modelo-relatorio.docx`), não deixá-lo em `src/app/docs`. Isso é necessário porque a geração do relatório vai acontecer no navegador (ver seção "Onde gerar o relatório" abaixo), e arquivos dentro de `src/app` não são acessíveis via `fetch()` no client — apenas arquivos dentro de `public/` são servidos como assets estáticos pelo Next.js.

### Estrutura atual do modelo (já inspecionada)

- **Cabeçalho**: logo da empresa + texto "Castilho Agronegócios CRECI:123456-J CNPJ: 12.345.678/0001-95"
- **Corpo**: contém apenas o placeholder `{{nome-relatorio}}`
- **Rodapé**: contém apenas o placeholder `{{data-emissao}}`

**Importante:** o modelo, como está hoje, **não tem nenhuma tabela ou estrutura para listar os negócios**. Isso precisa ser adicionado ao próprio arquivo `.docx` como parte desta tarefa (ver próxima seção) — não é só uma questão de preencher placeholders existentes, é necessário estender o modelo.

## Biblioteca a ser usada: `docxtemplater`

Usar o pacote `docxtemplater` (junto com `pizzip`, sua dependência para ler o `.docx` como arquivo ZIP) para preencher o modelo. Essa biblioteca roda tanto no navegador quanto no Node, suporta placeholders simples (`{nome_do_campo}`) e **loops** para repetir uma seção (como uma linha de tabela) para cada item de um array — necessário aqui para listar múltiplos negócios.

```bash
npm install docxtemplater pizzip
```

Para o download do arquivo gerado no navegador:

```bash
npm install file-saver
npm install -D @types/file-saver
```

## Passo 1 — Editar o modelo `.docx` para adicionar a tabela de negócios

Abrir o arquivo `modelo-relatorio.docx` e adicionar, no corpo do documento (abaixo do `{{nome-relatorio}}`), uma tabela com uma linha de cabeçalho fixa e uma linha de dados usando a sintaxe de loop do `docxtemplater`:

| Fazenda | Vendedor | Data do Negócio | Modalidade | Valor Total | Comissão |
|---|---|---|---|---|---|
| `{#negocios}{fazenda}` | `{vendedor}` | `{data_negocio}` | `{modalidade}` | `{valor_total}` | `{comissao}{/negocios}` |

Na prática, isso significa: a **primeira célula** da linha de dados começa com `{#negocios}` (abre o loop) antes do placeholder `{fazenda}`, e a **última célula** da mesma linha termina com `{/negocios}` (fecha o loop) depois do placeholder `{comissao}`. O `docxtemplater` repete essa linha inteira da tabela para cada item do array `negocios` passado ao gerar o documento.

Ajustar as colunas conforme os campos que já existem na tela de listagem de negócios (adicionar/remover colunas conforme o que já é exibido lá, para manter consistência entre o que o usuário vê filtrado na tela e o que aparece no relatório gerado).

Depois de editar, salvar o arquivo de volta em `public/templates/modelo-relatorio.docx`.

## Passo 2 — Onde gerar o relatório

Gerar no **front-end (navegador)**, não no backend NestJS. Isso porque:
- Os dados filtrados já estão carregados na tela (não precisa de nova consulta ao banco)
- O backend está rodando em uma instância AWS com recursos limitados, e deve-se evitar adicionar processamento pesado desnecessário nela nesta fase do projeto

## Passo 3 — Implementação (exemplo de função)

```typescript
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import { saveAs } from "file-saver";

interface NegocioRelatorio {
  fazenda: string;
  vendedor: string;
  data_negocio: string;
  modalidade: string;
  valor_total: string;
  comissao: string;
}

async function gerarRelatorio(negociosFiltrados: NegocioRelatorio[]) {
  const response = await fetch("/templates/modelo-relatorio.docx");
  const templateArrayBuffer = await response.arrayBuffer();

  const zip = new PizZip(templateArrayBuffer);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
  });

  doc.render({
    "nome-relatorio": "Relatório de Negócios",
    "data-emissao": new Date().toLocaleDateString("pt-BR"),
    negocios: negociosFiltrados.map((n) => ({
      fazenda: n.fazenda,
      vendedor: n.vendedor,
      data_negocio: new Date(n.data_negocio).toLocaleDateString("pt-BR"),
      modalidade: n.modalidade,
      valor_total: `R$ ${Number(n.valor_total).toFixed(2)}`,
      comissao: `R$ ${Number(n.comissao).toFixed(2)}`,
    })),
  });

  const blob = doc.getZip().generate({
    type: "blob",
    mimeType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });

  saveAs(blob, `relatorio-negocios-${Date.now()}.docx`);
}
```

Conectar essa função ao botão de ícone de documento já existente na tela de negócios, passando os dados atualmente filtrados na listagem (o mesmo conjunto de dados exibido na tela no momento do clique).

## Ponto em aberto — formato final do arquivo (.docx vs .pdf)

O modelo fornecido é um `.docx`, e a implementação acima gera um **`.docx` preenchido** como resultado, não um PDF. Isso é o caminho mais simples e leve (não exige LibreOffice/conversão no servidor, o que seria pesado para a instância atual).

**Se o cliente especificamente precisar do arquivo final em PDF** (não `.docx`), avisar que isso exigiria uma etapa adicional de conversão, que normalmente depende de uma ferramenta como LibreOffice rodando no servidor — não recomendado na instância EC2 atual, dada sua limitação de recursos (já enfrentamos problemas de memória com processos bem mais leves que isso). Nesse caso, as alternativas seriam:
- Converter usando um serviço de terceiros/API externa dedicada a isso
- Ou pedir para o usuário exportar manualmente o `.docx` gerado para PDF (via Word/Google Docs/Pages), já que a maioria dos leitores de documento faz essa conversão facilmente

Confirmar com o responsável pelo projeto qual formato final é realmente esperado antes de investir tempo numa conversão para PDF, caso isso seja considerado necessário depois.

## Resumo do que fazer

1. Mover `modelo-relatorio.docx` para `public/templates/`
2. Editar o `.docx` para adicionar a tabela de negócios com a sintaxe de loop do `docxtemplater` (`{#negocios}...{/negocios}`)
3. Instalar `docxtemplater`, `pizzip`, `file-saver`
4. Implementar a função de geração no front-end, conectada ao botão já existente
5. Testar com pelo menos 2-3 negócios filtrados para confirmar que o loop da tabela repete corretamente
6. Relatar ao final se o cliente confirmou o formato `.docx` como aceitável, ou se será necessário investigar a conversão para PDF