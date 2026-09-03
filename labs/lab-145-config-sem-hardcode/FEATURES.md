# Laboratório 145 — Tira URL hardcoded do Worker de contas (G15, parte segura)

Status: concluído
Início: 2026-09-03
Fim: 2026-09-03
Commit inicial: ac6f1f8f25525d0f4ab9d5eff8b4a600655ad29e

## Objetivo do laboratório

Resolve a PARTE SEGURA de G15 de `docs/prompts/05-escala-e-viabilidade.md`: "`NEON_AUTH_JWKS_URL`
e o fallback `https://app-two-flax-92.vercel.app` estão hardcoded no Worker (contra o `[MUST]` de
`03-arquitetura §5`)". Escolhido pelo usuário via `AskUserQuestion` antes do lab-144 (G13 vs. G15),
com a ressalva já explícita naquela pergunta: a parte de trocar o DNS pra CNAME e rotacionar a API
key ampla do Neon (resto de G15) NÃO entra aqui — mexe em infraestrutura de produção ao vivo e
exige confirmação separada.

## Funcionalidades planejadas
- [x] `NEON_AUTH_JWKS_URL` movido de constante hardcoded (`src/index.ts`) pra `[vars]`
  (`wrangler.toml`) — `createRemoteJWKSet` agora é criado via cache lazy (`getJwks(env)`), já que
  `env` só existe dentro do handler, não no escopo do módulo.
- [x] Fallback de `origin` em `/checkout`/`/billing-portal` (usado quando a chamada não traz
  header `Origin`) movido pra `[vars] DEFAULT_ORIGIN` — trocado de propósito pro domínio próprio
  (`missaoaprendizado.com`) em vez do domínio antigo da Vercel.
- [x] `requireUserId` passou a receber `env` (precisa da URL do JWKS pra verificar o JWT).
- [x] `README.md` (`app/server-accounts`) documentando a mudança e deixando explícito o que FICOU
  de fora de propósito (DNS/rotação de chave).

## Fora de escopo (explicitamente adiado, confirmado com o usuário antes de começar)
- Trocar o DNS de `missaoaprendizado.com` dos registros A atuais (`76.76.21.21`) pro CNAME
  sugerido pela Vercel — os registros A já funcionam (`vercel domains verify: ok`), então isso é
  uma otimização, não uma correção de bug; mudança em infraestrutura de produção ao vivo.
- Rotacionar a API key pessoal do Neon (`missao-aprender-agent`, escopo de conta inteira) usada
  pra provisionar/rodar scripts administrativos — ação de credencial que precisa de confirmação
  explícita, e rotacionar sem cuidado quebraria `migrate.mjs`/`inspect.mjs`/scripts futuros até uma
  nova key ser configurada em todo lugar que a usa.
- G4 (apelido/texto livre) e o consentimento parental pro multiplayer (G13, adiado no lab-144)
  continuam fora, não pedidos nesta rodada.
