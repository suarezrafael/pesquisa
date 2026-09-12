# Laboratório 185 — Medição de coortes de retenção e qualidade

Status: concluído
Início: 2026-09-12
Fim: 2026-09-12
Commit inicial: c324d29860d896eca704104fc25369b355710464

## Objetivo do laboratório

Fechar o item P0/P1 `docs/growth-retention-monetization-backlog.md`, seção "Lab 185 - Medição de
coortes de retenção e qualidade" — confirmado com o usuário via `AskUserQuestion` como o próximo
lab (em vez de pular direto pro Lab 179 - Planetas interativos v1), depois de checar que a
premissa do documento ("faltar evento pra provar os labs 176-178") é real: câmera, lojinha e
planetas não têm nenhum evento de analytics hoje.

## Investigação prévia (antes de codar)

Levantamento do código real feito antes de escrever este documento (não presumir a partir da
descrição do backlog):

- **Pipeline de eventos já existe e está maduro**: `app/src/productAnalytics.ts` (`trackEvent()`,
  função privada compartilhada) → `POST /events` → `handleTrackEvent`
  (`app/server-accounts/src/index.ts`) → validado contra a allowlist `PRODUCT_EVENT_TYPES`
  (`app/server-accounts/src/domain.ts:164-188`) → gravado em `product_events` (`device_id`,
  `event_type`, `occurred_at`, `meta` jsonb opcional). Tipo desconhecido nunca vira linha (400).
  Cada tracker público é uma função nomeada fina em cima do `trackEvent` privado (ex.:
  `trackPlayClick`, `trackHouseVisited`) — padrão a seguir pros eventos novos.
- **Agregação é só por `device_id`** (`crypto.randomUUID()` em `localStorage`,
  `getOrCreateDeviceId`, `state/storage.ts`), nunca por perfil/criança — já documentado como
  limitação conhecida em `docs/event-catalog.md` (aparelho compartilhado/trocado não é distinguido
  de criança diferente). Não existe conceito de "perfil anônimo" separado do device — resolver
  isso de verdade (ex.: amarrar eventos a `player_identities`, lab-159) seria uma mudança de
  arquitetura bem maior que "catálogo + eventos novos + saída de métricas", fora de escopo deste
  lab — a decisão aqui é DOCUMENTAR a limitação com clareza (já parcialmente feito), não resolvê-la.
- **`PRODUCT_EVENT_TYPES` (13 tipos hoje) não tem NADA de câmera, loja/lojinha, ou planetas** —
  confirma a premissa do backlog. Lab-178 (câmera) e lab-176 (lojinha) foram implementados com
  zero telemetria; `boardRocket`/`landRocket` (viagem entre planetas, `World3D.tsx`) idem.
- **D1/D7 retenção JÁ EXISTE** (`handleAdminMetrics`, `index.ts:1426-1461` calcula,
  `index.ts:1553-1562` devolve) — genérico sobre TODO tipo de evento (não específico de uma
  feature), com `day0` (primeiro evento de cada `device_id`) calculado internamente numa CTE mas
  NUNCA exposto como métrica própria. **Não existe nenhuma comparação de coorte antes/depois** — é
  um número global único, sem como isolar "só quem chegou depois do lab X". Este é o núcleo
  genuinamente novo deste lab, não os eventos de feature (que são só "mais 3 tipos na allowlist,
  mesmo padrão de sempre").
- **Padrão pra adicionar métrica nova ao `GET /admin/metrics`**: dois caminhos já estabelecidos —
  `weeklyFunnel` (`index.ts:1507-1525`, conta dispositivos únicos por tipo de evento nos últimos 7
  dias, um `Map` sobre uma query já agrupada) pra métricas baseadas em EVENTO; `weeklySocial`/
  `weeklyCommercial` (`index.ts:1531-1549`) pra métricas que já têm estado numa tabela própria
  (nunca duplicar em evento o que o banco já sabe).
- **Nenhuma migração nova é necessária** — `product_events` já tem `device_id`/`occurred_at`/
  `meta`, suficiente pra tudo planejado abaixo (eventos novos via allowlist só, comparação
  antes/depois via parâmetro de consulta sobre dados já existentes). Próxima migração seria
  `0011_<slug>.sql` (`app/server-accounts/migrations/`, padrão `NNNN_snake_case.sql`,
  `alter table ... if not exists`, DDL idempotente) — só entra em cena se algo aqui realmente
  precisar de coluna/tabela nova, o que não parece ser o caso.

## Funcionalidades planejadas

- [x] 3 eventos novos na allowlist (`PRODUCT_EVENT_TYPES`) + tracker cliente (mesmo padrão fino de
      `trackPlayClick`), um por área citada no backlog:
      - `camera_recenter_used` (clique no botão ⟲, lab-178) — é literalmente a métrica que o
        próprio Lab 178 já prometia medir ("menor uso repetido de recenter",
        `docs/growth-retention-monetization-backlog.md`, seção Lab 178) e nunca instrumentou.
      - `cosmetic_equipped` (equipar boné/óculos/cor via lojinha, `AvatarShop.tsx`/`useProfile.ts`)
        — sinal de engajamento com o loop de customização. Implementado nos 7 slots (`hat`,
        `shirtColor`, `pantsColor`, `shoeColor`, `backpackColor`, `hairShape`, `glasses`) dentro de
        `useProfile.ts`, não na UI — dispara não importa qual componente chame a função de equipar.
      - `planet_travel_completed` (pouso bem-sucedido, `landRocket()`, `meta: { toPlanetId }`) —
        base pra medir exploração de planetas antes do Lab 179 adicionar interações lá dentro. Só
        na chegada de VERDADE (`arrivedAtDestination`), não ao desistir no meio e voltar à origem.
      (referência: backlog, Lab 185, "eventos novos necessários para câmera, loja e planetas")
- [x] `docs/event-catalog.md` atualizado com os 3 eventos novos (mesmo formato de tabela já usado)
      e uma seção nova "Nível de agregação" consolidando a limitação device_id-only (antes
      espalhada em notas por evento).
      (referência: backlog, Lab 185, "catálogo de eventos, allowlist de propriedades, nível de
      agregação")
- [x] `GET /admin/metrics` ganha `newDevicesToday` (contagem de `device_id` cujo `day0` é hoje —
      o "D0" que falta hoje; `totalDevices` já existe mas é cumulativo desde sempre, não um
      corte diário) ao lado de `d1Retention`/`d7Retention` já existentes.
      (referência: backlog, Lab 185, critério de aceite "D0/D1/D7... possuem evento/propriedade
      mapeados")
- [x] `GET /admin/metrics` ganha comparação de coorte antes/depois: parâmetro de consulta opcional
      (`?cohortSplitDate=YYYY-MM-DD`) que, quando presente, recalcula d1/d7 retenção separado pra
      dispositivos com `day0` antes vs. a partir dessa data (reaproveita a MESMA CTE já existente,
      só com `count(*) filter (where ...)` pra devolver os dois grupos numa única ida ao banco) —
      devolvido como `cohortComparison: { splitDate, before: {...}, after: {...} }` quando o
      parâmetro é passado, omitido quando não é (não muda o formato de resposta pra quem já
      consome o endpoint sem o parâmetro). Data inválida devolve 400 com mensagem clara
      (`isValidIsoDateOnly`, nova função pura em `domain.ts`, testada).
      (referência: backlog, Lab 185, critério de aceite "a saída permite comparar coortes
      antes/depois")
- [x] `weeklyFunnel` ganha as 3 chaves novas (`cameraRecenterUsed`, `cosmeticEquipped`,
      `planetTravelCompleted`), mesmo padrão de `weeklyDevices(tipo)` já usado pras outras 8
      chaves.
- [x] Nota de guardrails no próprio JSON de resposta (`guardrails: string[]`) — device-based, não
      criança-based; nenhum dado pessoal infantil coletado; amostras pequenas produzem percentuais
      instáveis. (referência: backlog, Lab 185, critério de aceite "guardrails aparecem no
      relatório")
- [x] Teste automatizado da função pura nova: `isValidIsoDateOnly` (`domain.ts`) ganhou 3 casos de
      teste em `domain.test.ts` (data real incl. ano bissexto, formato errado/vazio/com hora, data
      inexistente no calendário tipo 30 de fevereiro) — a query SQL em si continua não testável
      por unidade, mesmo padrão do resto de `handleAdminMetrics` (I/O puro, sem lógica isolável).
- [x] Verificado ao vivo contra produção (mesmo padrão de todo lab anterior que mexeu em
      `server-accounts`): `wrangler dev` local (porta 8790) contra o banco de PRODUÇÃO real, só
      leitura — `newDevicesToday`/`weeklyFunnel` com as 3 chaves novas responderam corretamente;
      `?cohortSplitDate=2026-09-01` devolveu `before`/`after` cuja soma de `eligibleDevices` (76+47)
      bateu EXATAMENTE com `totalDevices` (123); data malformada (`2026-99-99`) confirmada
      devolvendo 400. Os 3 eventos novos disparados de verdade num navegador real (Chrome via
      automação, `npm run dev` local): `camera_recenter_used` no clique do botão ⟲, `cosmetic_equipped`
      (`meta.slot: "hat"`) ao equipar um boné na lojinha, `planet_travel_completed`
      (`meta.toPlanetId: "marte"`) numa viagem de foguete completa de verdade (embarcar, decolar,
      pousar — cartão-postal de Marte confirmado na tela), todos capturados via monkey-patch de
      `window.fetch`.

## Fora de escopo (explicitamente adiado)

- Resolver de verdade a agregação por device vs. criança (amarrar eventos a `player_identities`)
  — mudança de arquitetura maior, documentar a limitação é suficiente pra este lab.
- Ferramenta de BI paga, publicidade, segmentação individual de criança — fora de escopo explícito
  do próprio item do backlog.
- Interações de planeta de verdade (NPC, mini-puzzle, colecionável) — isso é o Lab 179, este lab
  só cria o evento de VIAGEM (chegada), não interações dentro do planeta.
- Nova tabela/migração de "coorte" — a comparação antes/depois é feita via parâmetro de consulta
  sobre `product_events` já existente, sem persistir nada novo.
- `activated_at` pra assinatura (pendência já registrada em `docs/event-catalog.md` desde o
  lab-165) — continua fora de escopo, exigiria coluna nova e webhook mais preciso do Stripe.
