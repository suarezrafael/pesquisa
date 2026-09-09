# Laboratório 164 — jornada de ativação de 10 minutos

Status: em andamento
Início: 2026-09-09
Fim: -
Commit inicial: ad1944e0cfce007c73e0002eddf77cef72cbc58d

## Objetivo do laboratório

Primeiro item do novo backlog guiado por métricas (`docs/market-metrics-engagement-backlog.md`,
seção 6, "Lab 163 — Jornada de ativação de 10 minutos") — **renumerado para lab-164** porque o
"lab-163" real deste repositório já foi consumido pelo perfil público de amigo (último item do
plano do lab-158, ver `labs/lab-163-perfil-publico-amigo/`). Mesmo padrão de renumeração já usado
entre os labs 160→161→162 quando um pedido pontual do usuário consumiu um número do meio de um
plano em sequência.

Pergunta de mercado que este lab responde (citação direta do documento, seção 9): "uma criança
nova consegue chegar sozinha ao primeiro ciclo de diversão + aprendizagem + recompensa antes de
desistir?" — nenhum recurso de social, assinatura, relatório ou aquisição compensa uma primeira
sessão confusa; a ativação infantil é a ponte entre a promessa de mercado e o produto real.

**Prioridade confirmada pelo usuário para os próximos laboratórios** (mesma ordem da seção 10 do
documento, cada um renumerado +1 pelo mesmo motivo acima):
1. lab-164 (este) — jornada de ativação de 10 minutos.
2. lab-165 — catálogo de eventos e dashboard semanal de produto (doc: "Lab 164").
3. lab-166 — página familiar com proposta paga transparente (doc: "Lab 165").
4. lab-167 — mapa de habilidades e relatório de aprendizagem (doc: "Lab 166").

## Estado atual do onboarding (levantado antes de planejar o escopo)

- `components/Tutorial.tsx`: 4 slides estáticos de texto (bem-vindo, como mover, escolinhas de
  missão, recompensas) — sem marcador visual no mundo 3D, sem apontar uma escolinha específica.
- Não existe hoje um "objetivo guiado" no planeta: a criança decide sozinha pra qual escolinha ir
  primeiro, sem indicação visual de "comece aqui".
- `productAnalytics.ts` já tem `trackPlayClick`/`trackQuestCompleted`/`session_start`/`session_end`
  — falta o instrumento fino de ativação (tempo até primeiro controle, tempo até primeiro desafio,
  tempo até primeira recompensa, evento de "ciclo de ativação concluído").
- Confirma a lacuna já identificada na matriz do documento (seção 5, linha "Fantasia jogável
  imediata"): "primeiro objetivo ainda precisa ficar guiado e inevitavelmente compreensível".

## Funcionalidades planejadas

(Escopo citado quase literalmente da seção 6 do documento, "Lab 163", adaptado aos arquivos reais
deste repositório)

- [ ] Objetivo guiado no primeiro acesso — perfil novo, sem `completedQuestIds`: indicar
      visualmente qual escolinha procurar primeiro (referência: `docs/market-metrics-engagement-
      backlog.md` seção 6, Lab 163/P0).
- [ ] Marcador visual no planeta (seta/holograma/trilha) apontando a primeira escolinha, sem
      atrapalhar quem já é jogador antigo (perfil com progresso não vê o marcador).
- [ ] Primeira missão curta já identificada/priorizada entre as existentes em `data/quests.ts`
      (não uma quest nova — reaproveitar o catálogo atual).
- [ ] Evento novo de instrumentação: ciclo de ativação concluído em até 10 minutos
      (`time_to_first_control`, `time_to_first_learning_challenge`, `time_to_first_reward` — nomes
      citados na seção 4 "Métricas de apoio" do documento), adicionado a `productAnalytics.ts` +
      allowlist `PRODUCT_EVENT_TYPES` (`server-accounts/src/domain.ts`, mesmo padrão do lab-161).
- [ ] Recompensa da primeira missão continua gratuita/idêntica ao fluxo atual — este lab não cria
      recompensa nova, só mede e guia o caminho até ela.
- [ ] Estado salvo: se a criança sair no meio do ciclo guiado e voltar, retoma sem repetir o que já
      fez (reaproveita `completedQuestIds`/`localStorage` já existentes).

## Fora de escopo (explicitamente adiado)

- Assinatura, loja paga, multiplayer complexo e novo planeta (citado explicitamente no documento).
- Catálogo de eventos completo/dashboard (isso é o lab-165, já sequenciado).
- Qualquer mudança na página `/familia` (lab-166).
- Mapa de habilidades/relatório (lab-167).
- Testes de usuário reais (5 crianças/responsáveis) — isso é pesquisa (`Pesquisa 1`/`Pesquisa 2` do
  documento), não implementação; pode ser conduzida depois deste lab, fora do código.

## Critérios de aceite (citados do documento, seção 6)

Criança entra por "Jogar agora", entende para onde ir, completa a missão, responde o desafio,
recebe recompensa não paga e vê o próximo objetivo — tudo sem criar conta adulta.

## Métricas esperadas (citadas do documento)

Ativação em 10 minutos (meta inicial 45–60%, seção 4), `time_to_first_learning_challenge`,
`time_to_first_reward`, D1 por coorte.
