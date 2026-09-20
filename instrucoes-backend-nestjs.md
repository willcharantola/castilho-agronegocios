# Instruções — Backend NestJS: cálculo de `valor_total` por modalidade

> Este repositório contém apenas o front-end (Next.js). O backend (NestJS,
> exposto em `NEXT_PUBLIC_API_URL`, ver `INTEGRACAO-FRONTEND.md`) vive em
> outro repositório, então as alterações descritas abaixo **não puderam ser
> aplicadas a partir daqui** — precisam ser replicadas manualmente no
> repositório do backend. A contraparte no front-end (cálculo em tempo real
> no cadastro de gado, `src/app/(app)/negocios/novo/gado/page.tsx`) já foi
> implementada.

## O que mudar

Ajustar o método `calcularValores` (usado antes de persistir o `Gado` no
banco) para ramificar por `negocio.modalidade` (`"arroba" | "kg" | "cabeca"`),
em vez de assumir sempre a fórmula de arroba.

```typescript
private calcularValores(
  pesoTotal: number,
  rendimentoCarcaca: number,
  modalidade: 'arroba' | 'kg' | 'cabeca',
  valorUnidade: number,
): ValoresCalculados {
  switch (modalidade) {
    case 'arroba': {
      const peso_calculo = pesoTotal * (rendimentoCarcaca / 100);
      const peso_arroba = Math.ceil(peso_calculo / 15);
      const valor_total = peso_arroba * valorUnidade;
      return { peso_calculo, peso_arroba, valor_total };
    }
    case 'kg': {
      const valor_total = valorUnidade * pesoTotal;
      return { peso_calculo: 0, peso_arroba: 0, valor_total };
    }
    case 'cabeca': {
      const valor_total = valorUnidade;
      return { peso_calculo: 0, peso_arroba: 0, valor_total };
    }
    default:
      throw new BadRequestException(`Modalidade inválida: ${modalidade}`);
  }
}
```

**Correção de bug incluída:** a implementação atual da modalidade `"arroba"`
calcula `valor_total = peso_calculo * peso_arroba` (peso × peso), o que está
errado — deve ser `peso_arroba * valorUnidade` (peso × valor monetário pago
por arroba), como no trecho acima.

Ajustar também o ponto que chama `calcularValores`, passando
`negocio.modalidade` e `negocio.valor_arroba` como `valorUnidade`.

## Campo "valor por unidade" — reaproveitando `valor_arroba`

O campo `valor_arroba` (em `negocio`) está sendo reaproveitado, por ora, como
o "valor por unidade" nas três modalidades (valor por arroba, por kg, ou por
cabeça, dependendo do contexto) — não foi criado um campo genérico novo
(`valor_unidade`). Adicionar comentário no código:

```typescript
// TODO: confirmar com o responsável pelo projeto se o campo deveria ser
// renomeado para algo mais genérico como valor_unidade, já que hoje seu
// nome sugere ser exclusivo da modalidade arroba.
```

## `peso_calculo` / `peso_arroba` fora da modalidade arroba

Para `"kg"` e `"cabeca"` esses dois campos não se aplicam. O trecho acima
retorna `0` para manter a assinatura de `ValoresCalculados` inalterada, mas
avaliar se faz mais sentido gravá-los como `NULL` no banco quando a
modalidade não for `"arroba"` (em vez de `0`, que pode ser lido erroneamente
como valor real) — nesse caso, ajustar o schema do Prisma e a migration
correspondente.

## Ambiguidade adicional encontrada (fora do escopo original)

A tela de detalhe do negócio no front-end
(`src/app/(app)/negocios/[id]/page.tsx`) exibe "Peso p/ cálculo" e "Peso da
@" para cada gado, e o rótulo "Valor p/ arroba" para `negocio.valor_arroba`,
independente da modalidade — não foram ajustados nesta tarefa porque as
instruções originais (`instrucoes-calculo.md`) só cobriam o formulário de
cadastro (tempo real / "estimado"). Se `peso_calculo`/`peso_arroba` passarem
a vir como `NULL` da API para `"kg"`/`"cabeca"` (ver seção acima), essa tela
também precisará ser ajustada para ocultar esses campos, e o rótulo "Valor
p/ arroba" provavelmente deveria virar algo genérico como "Valor p/ Un."
(já usado no formulário de cadastro).
