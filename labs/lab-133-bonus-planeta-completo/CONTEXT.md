# Contexto — Laboratório 133 — Bônus por limpar um planeta inteiro

Preenchido em: 2026-08-30
Commit inicial → final: 6fc6ce4c7c0a0ad6de96c0fbcb7adf5b44fff998..HEAD

## O que foi feito

Item do backlog de engajamento discutido em chat, escolhido pelo usuário via `AskUserQuestion`
entre 4 opções. Responder a 6ª (última) escolinha de um planeta-destino agora credita, na mesma
resposta, um bônus imediato de +50 XP / +30 moedas (antes dos multiplicadores) — distinto do item
de mobília exclusivo do lab-130 (recompensa cosmética) e do combo do lab-132 (sequência entre
missões diferentes, não ligada a um planeta específico).

- **`state/progression.ts`**: `PLANET_CLEAR_BONUS_XP = 50`/`PLANET_CLEAR_BONUS_COINS = 30` novos.
  `applyPlanetQuestCompletion` credita o bônus (com os MESMOS multiplicadores de evento semanal e
  assinante aplicados à recompensa da própria pergunta) dentro do mesmo bloco `if
  (isPlanetFullyCompleted(...))` já usado desde o lab-130 pra conceder a mobília — sem gatilho novo.
  `CompletionResult` ganha `planetClearBonusXp?`/`planetClearBonusCoins?` (mesmo padrão opcional de
  `unlockedFurnitureItem`: só populados nessa resposta específica).
- **`App.tsx`**: `handleCompletePlanetQuest`/estado `reward` repassam os campos novos pro
  `RewardToast`.
- **`components/RewardToast.tsx`**: linha de bônus própria ("🌟 Bônus por limpar o planeta! +50
  XP · +30 moedas!"), separada da linha de mobília e da de combo — cada bônus é conceitualmente
  diferente (item vs. moeda/XP vs. moeda de sequência).

## Decisões técnicas tomadas

Ver `FEATURES.md` pro racional completo. Resumo: valores base ~2× a recompensa média de uma única
pergunta do planeta (grande o bastante pra parecer um marco de verdade, sem desequilibrar a
progressão); segue os multiplicadores de evento/assinante (ao contrário do pote de Marte/baú de
tesouro, que são moeda flat de exploração) porque está diretamente ligado a RESPONDER perguntas de
verdade, não a um achado de exploração pura.

## Verificação ao vivo — parcial, mesma limitação de ferramenta do lab-131

Tentativa real de alcançar a 6ª escolinha de Vênus (5 das 6 pré-completadas via `localStorage` pra
isolar a última resposta, mesma técnica já usada no lab-132): voo de foguete real confirmado até
Vênus (posição do avatar batendo com o centro/raio do planeta), mas todas as tentativas de usar
`window.__debugTeleport` pra andar até o totem restante (a ~6 unidades de distância) resultaram no
avatar "caindo" de volta pra Terra assim que um quadro renderizava — **reconfirma o achado do
lab-131** (não é sobre a distância do salto: até um deslocamento pequeno, ~6 unidades, dentro do
MESMO planeta já visitado, disparou o mesmo comportamento). Sem tempo/orçamento pra andar até lá com
teclado sintético real (a direção da câmera não era conhecida, exigiria um laço de tentativa e
erro), a verificação ao vivo do TOAST específico deste laboratório não foi concluída.

**Confiança na correção vem de dois lugares concretos, não só leitura de código**: (1) o bônus deste
laboratório entra no MESMO bloco `if (isPlanetFullyCompleted(...))` que já foi verificado ao vivo
funcionando corretamente no lab-130 (o toast "🎉 Planeta conquistado!" apareceu de verdade); (2) 5
testes unitários novos cobrem exatamente a matemática (com e sem multiplicador, com e sem
assinatura) e a condição de disparo (só na resposta que completa, nunca antes/depois).

## Nota de transparência

A verificação usou o perfil de dev local "Teste Missoes" — `completedPlanetQuestIds` teve
`planet-venus-1` a `planet-venus-5` adicionados direto via `localStorage` pra isolar a 6ª resposta
(mesma técnica de lab-132). `coins`/`xp` avançaram um pouco a mais nesse processo por conta de
moedas comuns coletadas incidentalmente andando pela Terra — sem adulteração desses dois campos
diretamente. Save local de dev, sem dado de produção/banco envolvido.

## Pendências / dívidas conhecidas

- **O toast do bônus de limpar o planeta não foi visto ao vivo** — ver seção acima. Se o usuário
  reportar que o bônus não aparece ao completar um planeta de verdade, o primeiro lugar a checar é
  se a 6ª resposta realmente passa pelo bloco `isPlanetFullyCompleted` (compartilhado com a
  mobília do lab-130 — se a mobília também não aparecer, o problema é no gatilho compartilhado, não
  no código novo deste laboratório).
- **Achado de ferramenta reforçado** (não é novo, mas agora confirmado mais especificamente):
  `__debugTeleport` não funciona em NENHUM deslocamento fora do planeta principal, mesmo pequeno —
  descarta de vez a hipótese de que só saltos grandes seriam o problema (levantada no lab-131).
  Registrado como reforço da lição já documentada lá: a única forma confiável de testar QUALQUER
  coisa que exija se mover DENTRO de um planeta-destino é caminhada real (teclado sintético +
  quadros forçados) desde o pouso, nunca `__debugTeleport` depois de já estar lá.

## Funcionalidades planejadas que NÃO foram concluídas

Todas as funcionalidades de código planejadas em `FEATURES.md` foram concluídas. Só a verificação
ao vivo do toast específico ficou pendente, pelo motivo explicado acima.

## Backlog adicional reportado pelo usuário durante este laboratório (ainda não formalizado em labs)

Reportado em chat, explicitamente marcado como backlog (não pra implementar agora):
- **Câmera da lojinha de avatar**: precisa dar pra girar pressionando e arrastando sobre a área
  (o usuário relatou que hoje não funciona assim — investigar se é regressão do que foi feito no
  lab-118, ou se o pedido é sobre uma tela/preview diferente).
- **Mais luz no avatar da lojinha**: hoje fica "muito escuro" segundo o usuário.
- **Mais roupas texturizadas na lojinha** (extensão do trabalho de texturas exclusivas do
  lab-122) e, de forma mais geral, **mais opções na lojinha**.
- **Painel `/familia` sem link de acesso de dentro do jogo**: quando o perfil já está vinculado a
  uma assinatura, a mensagem "Assinatura da família já vinculada! 🎉..." aparece mas não tem
  nenhum link/botão pra abrir o painel `/familia` de dentro do jogo depois disso.

## O que o próximo laboratório deve desenvolver

Do backlog maior discutido em chat, ainda não formalizado em labs (além dos 4 itens reportados
nesta sessão, listados acima): persistência de "Minha Casa" pra assinante (arquitetural, G6 do doc
de escala, precisa de conversa de produto/privacidade antes), segundo "chefe" em Júpiter,
mini-desafios temáticos por planeta, corrida/parkour temático, vitrine de troféus mais visual,
emotes/danças, evento sazonal, mascote/pet colecionável, cartão-postal colecionável, boletim/
certificado do explorador, clima ativo por planeta, "distress call" de NPC perdido. Sem prioridade
única — perguntar ao usuário antes de escolher o próximo (os 4 itens novos reportados nesta sessão
são candidatos fortes por serem bugs/lacunas relatados diretamente, não só ideias de brainstorm).

## Estado do repositório ao final

- Branch: `worktree-abstract-wobbling-owl`.
- `npm run test` (em `app/`): 75/75 passando (70→75, 5 testes novos em `progression.test.ts`).
- `npm run build` (em `app/`): typecheck + build de produção sem erros.
- Verificação ao vivo: PARCIAL — ver seções acima. Sem erro de console em nenhuma tentativa.
- Como verificar de novo (evitando a armadilha desta sessão): jogar normalmente (não via
  `__debugTeleport`) — voar de foguete até qualquer planeta-destino, responder as 6 escolinhas
  reais caminhando de verdade entre elas, confirmar o toast "🌟 Bônus por limpar o planeta!" na 6ª
  junto com o toast de mobília do lab-130.
