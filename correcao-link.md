# Instruções — Correção do modo Standalone (iOS) e Ícone da Tela Inicial

## Contexto

O app já está sendo adicionado à tela inicial do iPhone e funcionando na maior parte do tempo. Dois problemas específicos precisam ser corrigidos:

1. Em algumas telas, o iOS está saindo do modo "app instalado" (tela cheia, sem barra de navegador) e abrindo uma camada de navegação por cima, com um X para fechar e a URL visível no topo — como se fosse um link externo aberto dentro do app.
2. O ícone que aparece na tela inicial do iPhone (ao lado do nome do app) não está exibindo a logo — aparece um ícone genérico/em branco no lugar.

## Problema 1 — Navegação saindo do modo standalone

### Causa provável

Esse comportamento acontece tipicamente quando algum link ou botão usa `target="_blank"` ou `window.open(...)`, forçando o iOS a abrir o conteúdo em um novo contexto de navegação, o que quebra a experiência de "app instalado" (modo standalone/PWA).

### O que fazer

1. Buscar em todo o projeto por ocorrências de:
   - `target="_blank"`
   - `window.open(`
   - Links usando a tag `<a href="...">` nativa em vez do componente `<Link>` do Next.js, especialmente em navegações internas (entre páginas do próprio app)

2. Para cada ocorrência encontrada:
   - Se for uma **navegação interna** (ex: da lista de negócios para o detalhe de um negócio), substituir por `<Link href="...">` do `next/link`, sem `target="_blank"`.
   - Se for um **link externo necessário** (ex: um link para fora do sistema, como WhatsApp ou e-mail), avaliar se realmente precisa abrir em nova aba. Caso precise, isso é aceitável, mas confirmar que não está sendo usado por engano em navegação que deveria ser interna.

3. Revisar também se existe algum redirecionamento (`redirect`, `router.push`) que aponta para a URL completa do domínio (ex: `https://castilho-agronegocios.vercel.app/...`) em vez de um caminho relativo (`/negocios/123`). Apontar para a URL absoluta do próprio domínio pode, em certos casos, fazer o iOS tratar a navegação como saindo do contexto do app instalado.

4. Depois das correções, listar no resumo da tarefa quais arquivos/componentes foram alterados, para que eu possa testar removendo e adicionando o atalho novamente na tela inicial do iPhone.

## Problema 2 — Ícone da tela inicial não aparece

### Contexto técnico

Os arquivos atuais são `apple-icon.svg` e `icon.svg`, salvos dentro da pasta `app/`. O iOS (Safari) **não tem suporte confiável a SVG como `apple-touch-icon`** — historicamente, esse ícone precisa ser um raster (PNG), não vetor. Isso é a causa mais provável do ícone não aparecer.

### O que fazer

1. Converter o conteúdo de `apple-icon.svg` para um arquivo **PNG de 180x180px**, sem transparência no fundo (usar uma cor sólida de fundo, alinhada à identidade visual da Castilho Agronegócios), e salvar como:
   ```
   app/apple-icon.png
   ```
2. Fazer o mesmo para o `icon.svg`, gerando também uma versão PNG (`app/icon.png`), já que o suporte a SVG para o favicon/ícone geral também é inconsistente em navegadores mais antigos e no próprio iOS em alguns contextos. Se o Next.js permitir manter ambos (SVG para navegadores modernos + PNG como fallback), utilizar essa abordagem; caso contrário, priorizar o PNG.
3. Remover ou renomear os arquivos `.svg` antigos caso o Next.js esteja usando algum deles por convenção de nome, para evitar conflito entre `icon.svg` e `icon.png` coexistindo (o Next.js pode usar apenas um automaticamente, verificar qual tem prioridade).
4. Confirmar que o `metadata` do `app/layout.tsx` não está sobrescrevendo esses ícones com um caminho manual incorreto — se houver uma configuração manual de `icons` no objeto `metadata`, ajustar para apontar para os novos arquivos PNG.

### Observação importante

Depois de qualquer alteração nos ícones, o cache do iOS costuma manter a versão antiga. Para testar corretamente:
1. Remover o atalho atual da tela inicial
2. Forçar o fechamento completo do Safari (não só fechar a aba)
3. Acessar o site novamente e adicionar à tela inicial de novo

Sem esses passos, o ícone antigo (ou em branco) pode continuar aparecendo mesmo após a correção no código, dando a falsa impressão de que o problema não foi resolvido.