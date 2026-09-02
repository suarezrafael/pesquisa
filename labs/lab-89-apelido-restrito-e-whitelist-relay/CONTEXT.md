# Contexto — Laboratório 89 — apelido restrito a letras + lista branca de mensagens do relay

Preenchido em: 2026-08-24
Commit inicial → final: faf6c91cf8424f0e8a88497652f00be09fec5307..HEAD

## O que foi feito
- **`app/src/data/nicknameFilter.ts`** (novo): `sanitizeNicknameChars()` remove ao vivo qualquer
  caractere que não seja letra (incl. acentuada) ou espaço; `isNicknameAllowed()` checa formato +
  uma lista de ~40 termos bloqueados (xingamento comum, calão sexual, referência a violência/ódio
  em português), comparados após normalizar (NFD + minúsculo + só a-z — pega variação óbvia de
  acento/espaçamento, não é um filtro de linguagem completo).
- **`Onboarding.tsx`**: campo de apelido usa `sanitizeNicknameChars` no `onChange` (bloqueia
  número/símbolo enquanto digita, não só no fim) e `isNicknameAllowed` no submit (mensagem de erro
  inline + botão desabilitado se bater na lista de bloqueio). Placeholder trocado de
  `"RaposaCorajosa42"` pra `"Raposa Corajosa"` (não pode mais ter número).
- **`data/nicknames.ts`**: `generateNickname()` perdeu o sufixo numérico — senão o próprio botão
  "🎲 Gerar" ia produzir um apelido que o campo recusaria.
- **Auditoria confirmou que o apelido trafega em DUAS mensagens, não só `chat`**: toda mensagem
  `state` (`multiplayer.ts:sendState`, disparada continuamente enquanto o jogador se move) também
  carrega `name` cru — não estava documentado antes deste laboratório.
- **`server-cf-relay/src/index.ts`**: cópia própria da validação de apelido (`sanitizedNameForBroadcast`,
  mesma lista de termos bloqueados) aplicada tanto em `chat.name` quanto em `state.name` antes de
  repassar pra outros jogadores. Diferente do cliente, o relay **sanitiza em vez de recusar a
  mensagem inteira** — decisão deliberada, ver "Decisões técnicas".
- **Lista branca de tipos de mensagem no relay** (`ALLOWED_CLIENT_MESSAGE_TYPES`): só `state`,
  `attack` e `chat` (os únicos que o cliente hoje origina, confirmado lendo `multiplayer.ts`) são
  aceitos; qualquer outro `msg.type` é descartado antes de entrar na lógica de broadcast. Cada um
  dos três tipos aceitos ganhou validação mínima de formato (`isVec3` pra posição/direção/pontos
  de ataque, enum fechado pra `kind`/`enemyKind`, tipo primitivo checado nos campos restantes).
- **Deploy em produção do relay** (`missao-aprender-relay-v2`) e **verificação ao vivo** de tudo
  acima com um script próprio conectando via WebSocket cru (não o cliente oficial do jogo).

## Direção de produto confirmada com o usuário
Perguntado via `AskUserQuestion` (2026-08-24) como o apelido deveria deixar de ser texto livre —
três opções: gerador fixo obrigatório, texto livre + filtro completo (normalização/PII), ou texto
livre restrito (só letras + lista de bloqueio, sem tentar detectar PII). **O usuário escolheu a
terceira**: o apelido continua editável livremente, só fica mais restrito. Isso define o escopo
inteiro deste laboratório — detecção de PII foi propositalmente deixada de fora, não é uma
omissão.

## Números medidos (ao vivo, contra produção)
| Teste | Entrada | Resultado esperado | Resultado medido |
|---|---|---|---|
| `state.name` sujo | `"Idiota123!!"` | sanitizado pra `"Jogador"` | ✅ `"Jogador"` |
| `state.name` limpo | `"Raposa Corajosa"` | passa sem alteração | ✅ `"Raposa Corajosa"` |
| `state` malformado (sem `position`) | — | descartado, não repassado | ✅ não chegou nada |
| `chat.name` sujo | `"Burro456"` | sanitizado pra `"Jogador"` | ✅ `"Jogador"` |
| `type` desconhecido | `"evil-broadcast-test"` | descartado, não repassado | ✅ não chegou nada |
| Tráfego legítimo (script do lab-85, 8 jogadores/12s) | — | sem regressão | ✅ 8/8 conectados, 56 `state` enviados, 374 recebidos, redução de 14,3x vs. protocolo pré-lab-85 mantida |

## Decisões técnicas tomadas
- **O relay sanitiza o nome em vez de recusar a mensagem inteira quando o apelido não passa na
  validação.** Motivo: diferente da mensagem de `chat` (evento avulso, tanto faz perder uma), o
  `state` carrega posição/aparência/XP/moedas — é o que sincroniza o jogador com todo mundo. Um
  apelido salvo em `localStorage` ANTES deste laboratório pode não passar na validação nova (tinha
  número, por exemplo); se o relay recusasse a mensagem inteira, esse jogador simplesmente
  sumiria da tela dos outros sem nenhum aviso, sem ter feito nada de errado além de logar antes da
  correção existir. Cair pro nome genérico `"Jogador"` é uma degradação visível e razoável, não
  uma quebra silenciosa.
- **Lista de bloqueio comparada como substring, não palavra inteira.** Simples de propósito — o
  usuário pediu "texto livre restrito", não um filtro de linguagem sofisticado. Aceita o risco de
  algum falso positivo ocasional (uma palavra legítima que contenha um termo bloqueado como
  substring) como troca por não ter que manter/testar um analisador mais complexo; a lista evita
  deliberadamente termos curtos/ambíguos que colidiriam com nomes reais comuns em português (ex.:
  não inclui abreviações de 2-3 letras que apareceriam dentro de nomes próprios).
- **Restrição de caractere (só letra + espaço) é a defesa principal, a lista de bloqueio é
  secundária.** A restrição de caractere sozinha já fecha toda a classe de contorno via
  número/símbolo (l33t speak, ano de nascimento, telefone parcial) sem precisar de nenhuma lista
  pra manter — é por isso que a lista de bloqueio pôde ficar deliberadamente simples.
- **Duplicar a lógica de validação entre `app/src` e `server-cf-relay/src`** em vez de tentar
  compartilhar — mesmo padrão já estabelecido pelo `QUICK_CHAT_IDS` (comentário original do lab-54
  no arquivo do relay): o Worker é um deploy TypeScript separado do Vite, não dá pra importar
  direto sem acoplar os dois builds. Mantê-los em sincronia manualmente é uma dívida aceita, não
  um descuido.

## Pendências / dívidas conhecidas
- **Nenhum caminho de denúncia/bloqueio entre jogadores** — G4 original mencionava isso como
  ausente; continua ausente. É uma funcionalidade de produto maior (UI de denúncia + o que
  acontece depois de uma denúncia), decisão de escopo, não esquecimento.
- **Lista de bloqueio de ~40 termos não é exaustiva** — decisão consciente (ver "Decisões
  técnicas"); se surgir um caso real de um termo ofensivo passando, é só adicionar na lista em
  ambos os arquivos (`app/src/data/nicknameFilter.ts` e `server-cf-relay/src/index.ts`).
- **Perfis já criados antes deste laboratório** com apelido contendo número/símbolo continuam
  funcionando no jogo (nada força re-onboarding) — eles só vão ver o próprio nome trocado por
  "Jogador" na visão dos OUTROS jogadores (o relay sanitiza o broadcast), mas continuam vendo o
  próprio nome original na própria tela (isso não passa pelo relay). Não é um bug, é a
  consequência esperada da decisão de sanitizar em vez de recusar — mas vale documentar caso
  algum usuário estranhe a assimetria.

## Funcionalidades planejadas que NÃO foram concluídas
- Nenhuma do escopo definido no `FEATURES.md` ficou de fora.

## O que o próximo laboratório deve desenvolver
Com G3 (lab-88) e G4/G5 (este laboratório) resolvidos, os itens de segurança/escala documentados
em `docs/prompts/05-escala-e-viabilidade.md` seção 7 que ainda restam sem solução são G6
(entitlement/progresso 100% client-side, risco de receita — editar uma chave de `localStorage`
libera conteúdo pago) e a autenticação de socket do relay (adiada explicitamente em ambos os
últimos dois laboratórios). Se o usuário não redirecionar a prioridade, G6 é o próximo item de
maior severidade documentado e ainda em aberto.

## Estado do repositório ao final
- Branch: `worktree-abstract-wobbling-owl`
- Relay (`missao-aprender-relay-v2`) já deployado em produção com as mudanças deste laboratório.
- App (`server-accounts` não foi tocado neste laboratório — só `app/src` e `server-cf-relay`) —
  build de produção (`npm run build`) e suíte de testes (`npm run test`, 31 testes) confirmados
  limpos antes do commit; deploy do frontend acontece via Vercel a partir do git (não manual nesta
  sessão).
- Como verificar o que foi construído: `cd app && npm run test`; `cd app/server-cf-relay && npx
  tsc --noEmit -p tsconfig.json`; `cd app/server-cf-relay && npm run load-test -- --players 8
  --duration-s 12` contra o relay em produção.
