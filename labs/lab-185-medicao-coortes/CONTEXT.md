# Contexto — Laboratório 185 — Medição de coortes de retenção e qualidade

Preenchido em: 2026-09-12
Commit inicial → final: c324d29860d896eca704104fc25369b355710464..HEAD (ver `git log` na branch
`lab-185-medicao-coortes`)

## O que foi feito

Investigação prévia (antes de codar, ver `FEATURES.md`) confirmou a premissa do backlog e mapeou o
pipeline de eventos já maduro (`trackEvent` → `POST /events` → allowlist → `product_events`) e a
retenção D1/D7 já existente mas incompleta (sem D0, sem comparação de coorte). O lab fechou os 6
itens planejados:

- **3 eventos novos** (`camera_recenter_used`, `cosmetic_equipped`, `planet_travel_completed`) na
  allowlist `PRODUCT_EVENT_TYPES` (`app/server-accounts/src/domain.ts`) + trackers finos em
  `app/src/productAnalytics.ts`, mesmo padrão de `trackHouseVisited`. Disparados em:
  `world3d/World3D.tsx` (`handleRecenterCamera`, `landRocket`) e `state/useProfile.ts` (7 funções
  `equip*`, disparo dentro da própria função de estado — não na UI — pra funcionar
  independentemente de qual componente chama).
- **`docs/event-catalog.md`**: 3 linhas novas na tabela de eventos + seção nova "Nível de
  agregação" consolidando a limitação device_id-only (antes espalhada em notas por evento) + 3
  bullets novos na seção "Qual métrica alimenta" (câmera, loja, planetas) + menção de
  `newDevicesToday`/`cohortComparison` na entrada de retenção já existente.
- **`newDevicesToday`** (D0) — adicionado à mesma query CTE que já calculava D1/D7
  (`handleAdminMetrics`), um `select count(*) from first_seen where day0 = current_date` a mais no
  `select` final, sem round-trip extra ao banco.
- **`cohortComparison`** via `?cohortSplitDate=YYYY-MM-DD` — nova query reaproveitando a MESMA
  estrutura de CTE (`first_seen`/`d1_eligible`/`d1_returned`/`d7_eligible`/`d7_returned`), trocando
  o `select` final por `count(*) filter (where day0 < data)` (grupo "antes") e
  `count(*) filter (where day0 >= data)` (grupo "depois") pra devolver os dois numa única ida ao
  banco. Só aparece na resposta quando o parâmetro é passado (spread condicional,
  `...(cohortComparison ? {...} : {})`) — não muda o formato pra quem já consome o endpoint sem o
  parâmetro.
- **`weeklyFunnel`** ganhou 3 chaves novas (`cameraRecenterUsed`, `cosmeticEquipped`,
  `planetTravelCompleted`), mesmo padrão `weeklyDevices(tipo)` das 8 chaves já existentes.
- **`guardrails: string[]`** no próprio JSON de resposta — repete as 2 limitações mais importantes
  (agregação por dispositivo, amostra pequena) pra quem só consome a API sem abrir o catálogo.
- **Nova função pura testada**: `isValidIsoDateOnly` (`domain.ts`) valida `YYYY-MM-DD` com
  checagem de calendário real (não só regex — `30 de fevereiro` passa no regex mas falha na
  reconstrução via `Date.UTC`), usada pra validar `cohortSplitDate` antes de interpolar na query
  (400 em vez de erro de SQL/resultado sem sentido com uma data malformada). 3 casos de teste em
  `domain.test.ts`.

## Decisões técnicas tomadas

- **`cosmetic_equipped` só dispara ao EQUIPAR um item real (`id !== null`), nunca ao voltar pro
  padrão** — o sinal de engajamento é "escolheu um cosmético", não "removeu um"; se contássemos os
  dois, alternar rapidamente entre itens (comum numa lojinha) infla artificialmente o número.
- **`planet_travel_completed` só na chegada de verdade ao destino, não ao desistir e voltar à
  origem** — `landRocket()` já distingue os dois casos via `arrivedAtDestination` (usado também
  pra decidir cartão-postal); reaproveitar essa mesma flag em vez de inventar uma checagem nova.
- **Disparo do evento de cosmético dentro de `useProfile.ts`, não na UI (`AvatarShop.tsx`)** — o
  hook é o único ponto real de mutação de estado, chamado por qualquer componente que decida
  equipar algo; colocar o `trackEvent` na UI arriscaria esquecer um caminho (ex.: um atalho de
  teclado ou outro painel que chame `equipHat` diretamente) e duplicar ou perder o evento.
- **D0/cohort comparison reaproveitam a MESMA CTE de sempre, não uma tabela nova** — evita
  qualquer migração (checado antes de codar: `product_events` já tem tudo que essas duas métricas
  precisam) e mantém as 3 formas de olhar retenção (D1/D7 globais, D0 diário, antes/depois) sempre
  coerentes entre si (mesma definição de `day0`, mesma janela de elegibilidade).
- **`cohortComparison` só aparece na resposta quando `?cohortSplitDate=` é passado** (em vez de
  sempre presente com valores nulos) — não quebra nenhum consumidor existente do endpoint que não
  conhece esse campo novo.
- **Validação de data com checagem de calendário real, não só regex** — `/^\d{4}-\d{2}-\d{2}$/`
  sozinho aceita "2026-02-30"; a query com uma data assim ou dá erro de SQL feio (Postgres rejeita
  data inválida) ou, pior, o Postgres podia interpretar de um jeito inesperado dependendo do modo —
  melhor recusar com 400 e mensagem clara antes de chegar na query.

## Pendências / dívidas conhecidas

- **Agregação por device, não por criança, continua sem solução real** — decisão explícita de
  escopo (ver "Fora de escopo" no `FEATURES.md`): resolver isso amarrando eventos a
  `player_identities` é uma mudança de arquitetura maior, não um catálogo/instrumentação. Impacto
  prático: os 3 eventos novos deste lab herdam a MESMA imprecisão já aceita pro resto do funil.
- **`activated_at` de assinatura continua sem coluna própria** (pendência do lab-165, não deste
  lab) — `weeklyCommercial` não tem "assinaturas ativadas na semana" por esse motivo, inalterado.
- **Lab 179 (Planetas interativos v1) vai precisar de eventos PRÓPRIOS de interação** —
  `planet_travel_completed` mede só a CHEGADA, não o que a criança faz depois de chegar (NPC,
  mini-puzzle, coletável) — registrado explicitamente como fora de escopo deste lab.

## Funcionalidades planejadas que NÃO foram concluídas

Nenhuma — as 6 funcionalidades planejadas em `FEATURES.md` foram concluídas e verificadas ao vivo
contra produção (leitura) e num navegador real (os 3 eventos novos).

## O que o próximo laboratório deve desenvolver

Seguindo a ordem recomendada por `docs/growth-retention-monetization-backlog.md` (seção 12), o
próximo item é o **Lab 179 — Planetas interativos v1** (P0): pelo menos 3 interações por planeta
existente (NPC com fala catalogada, objeto acionável, mini-puzzle ambiental, coletável ou segredo
visual), instrumentadas com eventos próprios (não reaproveitar `planet_travel_completed`, que este
lab deixou medindo só a chegada), sem texto livre/UGC.

## Estado do repositório ao final

- Branch: `lab-185-medicao-coortes`.
- `npx tsc -b` (app) e `npx tsc --noEmit` (server-accounts): limpos. `npm run test`: app 178/178
  (inalterado, mudança client-side é só chamada de tracker, sem lógica nova testável isolada);
  server-accounts 134/134 (3 novos, `isValidIsoDateOnly`). `npm run build` (app): limpo, sem
  regressão de bundle.
- Nenhuma migração de banco — `product_events` já tinha tudo necessário.
- **Verificado ao vivo contra produção** (`wrangler dev` local, porta 8790, banco de PRODUÇÃO
  real, só leitura): `GET /admin/metrics` respondeu com `newDevicesToday`/`weeklyFunnel` (3 chaves
  novas, todas 0 — nenhum evento novo em produção ainda, esperado) e `guardrails`;
  `?cohortSplitDate=2026-09-01` devolveu `before.d1.eligibleDevices` (76) + `after.d1.eligibleDevices`
  (47) = 123, EXATAMENTE igual a `totalDevices` (123) — confirma que o split cobre o conjunto
  inteiro sem sobra nem duplicata; `?cohortSplitDate=2026-99-99` confirmado devolvendo 400.
- **Verificado ao vivo num navegador real** (Chrome via automação, `npm run dev` local, perfil de
  teste já existente): os 3 eventos novos capturados via monkey-patch de `window.fetch` —
  `camera_recenter_used` no clique do botão ⟲; `cosmetic_equipped` (`meta.slot: "hat"`) ao equipar
  um boné pela lojinha real; `planet_travel_completed` (`meta.toPlanetId: "marte"`) numa viagem de
  foguete completa (embarcar via tecla E perto do foguete, decolar, pousar — cartão-postal "Novo
  cartão-postal: Saudações de Marte!" confirmado na tela). Nenhum erro de console em nenhum
  momento dos testes.
