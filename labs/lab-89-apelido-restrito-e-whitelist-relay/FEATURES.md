# Laboratório 89 — apelido restrito a letras + lista branca de mensagens do relay

Status: concluído
Início: 2026-08-24
Fim: 2026-08-24
Commit inicial: faf6c91cf8424f0e8a88497652f00be09fec5307

## Objetivo do laboratório
Fechar os dois achados de segurança do lab-88/`docs/prompts/05-escala-e-viabilidade.md` que
ficaram fora de escopo por não serem sobre sobrecarga: G4 (o campo de apelido é texto livre sem
nenhuma restrição, então uma criança pode digitar o próprio nome real e ele é transmitido pra
todo mundo) e o restante de G5 (o relay repassa qualquer objeto JSON de tipo desconhecido pra
todos os jogadores, não só as mensagens de `chat` que já têm lista fechada).

Direção de produto confirmada com o usuário nesta sessão (2026-08-24, `AskUserQuestion`): o
apelido continua sendo texto livre (não vira um gerador fixo obrigatório — o gerador de
`data/nicknames.ts`, lab-21, continua existindo só como atalho opcional), mas passa a aceitar
**só letras** (sem números/símbolos) e passa por uma **lista de bloqueio de palavras**. Não é
pedido detecção de PII (padrão de telefone, "meu insta é...", etc.) — fora de escopo por decisão
explícita do usuário, fica pra uma iteração futura se algum caso real aparecer.

## Funcionalidades planejadas
- [x] **Restringir o campo de apelido a letras** (`Onboarding.tsx`) — `onChange` agora passa por
  `sanitizeNicknameChars` (`app/src/data/nicknameFilter.ts`, novo), removendo ao vivo qualquer
  caractere que não seja letra (incl. acentuada) ou espaço enquanto a criança digita, não só na
  submissão. `generateNickname()` (`data/nicknames.ts`) perdeu o sufixo numérico pelo mesmo
  motivo — senão o próprio botão "Gerar" produziria um apelido que o campo recusaria.
- [x] **Lista de bloqueio de palavras** — `NICKNAME_BLOCKED_TERMS` em
  `app/src/data/nicknameFilter.ts` (~40 termos: xingamento comum, calão sexual, referência a
  violência/ódio), comparada após normalizar (NFD + minúsculo + só a-z, pega variação de
  acento/espaçamento). `isNicknameAllowed()` é chamado no submit do Onboarding e desabilita o
  botão com uma mensagem de erro inline se o apelido bater na lista.
- [x] **Validação no relay também, não só no cliente** — confirmado na auditoria que o apelido
  trafega em DUAS mensagens, não só `chat`: toda mensagem `state` (enviada continuamente enquanto
  o jogador se move, `multiplayer.ts:sendState`) também carrega `name` cru. `server-cf-relay/
  src/index.ts` ganhou uma cópia própria da mesma lógica (`sanitizedNameForBroadcast`, mesmo
  motivo de duplicação do `QUICK_CHAT_IDS` já existente — Worker não importa TS do app). Diferença
  de propósito importante: o relay **sanitiza** em vez de recusar a mensagem inteira — um cliente
  com um apelido salvo antes desta correção continua sincronizando posição/estado normalmente, só
  o nome de exibição vira "Jogador" se não passar na validação, em vez de a conexão simplesmente
  parar de funcionar.
- [x] **Lista branca de tipos de mensagem no relay** (G5) — protocolo real levantado em
  `multiplayer.ts`: só `state`, `attack` e `chat` são originados pelo cliente hoje (`welcome`/
  `leave` são gerados só pelo próprio relay). `ALLOWED_CLIENT_MESSAGE_TYPES` filtra qualquer outro
  `msg.type` antes de sequer entrar na lógica de broadcast, e cada um dos três tipos aceitos ganhou
  validação mínima de formato (`isVec3` pra `position`/`facing`/`fromPos`/`toPos`, enum fechado
  pra `kind`/`enemyKind` do ataque, tipo primitivo checado nos demais campos) — uma mensagem
  malformada é descartada, não repassada pros outros jogadores.
- [x] **Testado ao vivo contra produção** (script próprio, WebSocket cru — não o cliente oficial,
  justamente pra confirmar que o relay não confia só na validação do client): apelido com
  número+símbolo+palavra bloqueada (`"Idiota123!!"`) chegou como `"Jogador"` tanto em `state`
  quanto em `chat`; apelido limpo (`"Raposa Corajosa"`) passou sem alteração (sem regressão);
  `state` malformado (faltando `position`) não foi repassado; mensagem de tipo desconhecido
  (`"evil-broadcast-test"`) não foi repassada. Script de carga do lab-85 confirma tráfego
  legítimo intacto depois do deploy: 8/8 jogadores conectados, 56 mensagens `state` enviadas, 374
  recebidas de volta, mesma redução de 14,3x vs. o protocolo antigo já medida no lab-85.

## Fora de escopo (explicitamente adiado)
- **Detecção de PII** (telefone, nome+sobrenome, "me chama no insta") — decisão explícita do
  usuário nesta sessão: não pedido agora, fica pra se um caso real aparecer.
- **Gerador de apelido obrigatório** (apelido deixar de ser editável) — rejeitado como direção;
  o campo continua editável, só fica restrito a letras + lista de bloqueio.
- **Caminho de denúncia/bloqueio entre jogadores** (mencionado em G4 como ausente) — é uma
  funcionalidade de produto maior (UI de denúncia, o que acontece com uma denúncia, etc.), não
  cabe no mesmo laboratório que a validação de apelido; avaliar como próximo passo depois deste.
- **Autenticação de socket no relay** — já estava fora de escopo do lab-88 pelo mesmo motivo
  (mudança de protocolo maior); a lista branca de tipos de mensagem deste laboratório reduz boa
  parte do mesmo risco sem precisar disso agora.
