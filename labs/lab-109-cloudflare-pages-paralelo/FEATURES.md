# Laboratório 109 — Cloudflare Pages em paralelo (resto de Fase F)

Status: em andamento
Início: 2026-08-29
Fim: -
Commit inicial: a03044bd4b2841423a60e8b53640026ffc8dbb9c

## Objetivo do laboratório
Escolhido pelo usuário entre as opções restantes de backlog (Fase F/secrets do lab-104/bug de
morros invisíveis), depois que as 4 frentes do lab-104 (Minha Casa + múltiplos perfis) ficaram
completas. `docs/plano-comercial-backend.md` ("Achado crítico": o plano Hobby da Vercel proíbe uso
comercial) recomenda migrar a hospedagem do front-end pra Cloudflare Pages antes do lançamento
comercial — mesma conta já usada pelos Workers (relé + contas), mantém a infraestrutura 100%
grátis (objetivo do usuário), sem a restrição de uso comercial não documentada no Hobby da Vercel.

**Escopo desta fatia, confirmado com o usuário na pergunta que escolheu este laboratório**: preparar
um deploy NOVO e PARALELO em Cloudflare Pages, sem mexer no site ao vivo nem no DNS
(`missaoaprendizado.com` continua apontando pra Vercel até o usuário decidir migrar de verdade).

## Investigado antes de planejar
- `docs/plano-comercial-backend.md` (linhas 12-38, 226-250): confirma a recomendação e o
  raciocínio — consolidar numa conta só (a mesma dos Workers), sem custo, migração é uma fase à
  parte que "não bloqueia o trabalho de contas/backend".
- `npx wrangler whoami`: escopo da sessão CLI já inclui `pages (write)` — dá pra criar/publicar um
  projeto Cloudflare Pages sem pedir nada novo ao usuário.
- `npx wrangler pages project list`: nenhum projeto Pages existe ainda nesta conta — projeto novo,
  sem risco de colidir com algo já em uso.
- `app/vite.config.ts`: build de produção continua saindo em `dist/` (padrão do Vite, sem
  `build.outDir` customizado) — mesmo artefato que já vai pro Vercel hoje, sem mudança de build.
- `labs/lab-104-deploy-automatico-ci/CONTEXT.md`: precedente direto de deploy via CI (Vercel +
  Workers) — mesmo padrão de passo condicional (`if: github.ref == 'refs/heads/main' && ...`) seria
  reaproveitado se este laboratório decidir automatizar o deploy do Pages também.

## Decisões técnicas tomadas (antes de implementar)
- **Nenhuma mudança de DNS/domínio próprio** — `missaoaprendizado.com` continua 100% na Vercel até
  o usuário decidir migrar de verdade (ação separada, futura, exige trocar registro DNS na
  Cloudflare — risco real de derrubar o site ao vivo se feito errado, por isso fica fora do escopo
  desta fatia).
- **Vercel continua sendo o deploy de produção** — este laboratório não desliga nem substitui nada
  que já funciona; o objetivo é só ter Cloudflare Pages FUNCIONANDO e verificado, pronto pra virar
  o deploy principal quando o usuário decidir.
- **Deploy manual nesta fatia, não automático via CI** — evita ter DOIS pipelines de deploy
  automático rodando em paralelo pro mesmo front-end antes de qualquer decisão sobre qual vai ser o
  definitivo; a automação via CI (mesmo padrão do lab-104) fica pro laboratório que efetivamente
  fizer o corte pra Cloudflare Pages.

## Funcionalidades planejadas
- [ ] Criar o projeto Cloudflare Pages (`wrangler pages project create`) na mesma conta dos
      Workers.
- [ ] Publicar o build de produção atual (`npm run build` + `wrangler pages deploy dist`) — sem
      mexer em nenhuma variável de ambiente/segredo do lado do servidor (o front-end já fala com
      os Workers via URL absoluta, não relativa — confirmar isso lendo o código antes de publicar).
- [ ] Verificar ao vivo, na URL `*.pages.dev` gerada: onboarding, mundo 3D carrega, `/familia`
      carrega, chamadas pro backend de contas/relé de multiplayer funcionam normalmente (mesma
      origem cruzada que já funciona hoje no Vercel).
- [ ] Documentar em `CONTEXT.md` o passo de corte final (trocar DNS) como ação EXPLICITAMENTE do
      usuário, nunca executada por esta sessão.

## Fora de escopo (explicitamente adiado)
- Trocar o DNS de `missaoaprendizado.com`/desligar o projeto Vercel — decisão e ação do usuário,
  quando ele decidir que o Cloudflare Pages está pronto pra virar produção de verdade.
- Automatizar o deploy do Pages via CI — fica pro laboratório que fizer o corte de verdade.
- Sair do modo teste do Stripe, Resend (as outras duas partes de Fase F) — decisões/credenciais
  separadas, não pedidas nesta escolha.
