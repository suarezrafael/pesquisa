# Laboratório 185 — Medição de coortes de retenção e qualidade

Status: em andamento
Início: 2026-09-12
Fim: -
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

- [ ] 3 eventos novos na allowlist (`PRODUCT_EVENT_TYPES`) + tracker cliente (mesmo padrão fino de
      `trackPlayClick`), um por área citada no backlog:
      - `camera_recenter_used` (clique no botão ⟲, lab-178) — é literalmente a métrica que o
        próprio Lab 178 já prometia medir ("menor uso repetido de recenter",
        `docs/growth-retention-monetization-backlog.md`, seção Lab 178) e nunca instrumentou.
      - `cosmetic_equipped` (equipar boné/óculos/cor via lojinha, `AvatarShop.tsx`/`useProfile.ts`)
        — sinal de engajamento com o loop de customização.
      - `planet_travel_completed` (pouso bem-sucedido, `landRocket()`, `meta: { toPlanetId }`) —
        base pra medir exploração de planetas antes do Lab 179 adicionar interações lá dentro.
      (referência: backlog, Lab 185, "eventos novos necessários para câmera, loja e planetas")
- [ ] `docs/event-catalog.md` atualizado com os 3 eventos novos (mesmo formato de tabela já usado)
      e uma seção explícita de "nível de agregação" documentando device_id vs. perfil anônimo (a
      limitação já é real e parcialmente documentada — consolidar num lugar claro).
      (referência: backlog, Lab 185, "catálogo de eventos, allowlist de propriedades, nível de
      agregação")
- [ ] `GET /admin/metrics` ganha `newDevicesToday` (contagem de `device_id` cujo `day0` é hoje —
      o "D0" que falta hoje; `totalDevices` já existe mas é cumulativo desde sempre, não um
      corte diário) ao lado de `d1Retention`/`d7Retention` já existentes.
      (referência: backlog, Lab 185, critério de aceite "D0/D1/D7... possuem evento/propriedade
      mapeados")
- [ ] `GET /admin/metrics` ganha comparação de coorte antes/depois: parâmetro de consulta opcional
      (`?cohortSplitDate=YYYY-MM-DD`) que, quando presente, recalcula d1/d7 retenção separado pra
      dispositivos com `day0` antes vs. a partir dessa data (reaproveita a MESMA CTE já existente,
      só com uma cláusula `where` a mais) — devolvido como `cohortComparison: { splitDate, before:
      {...}, after: {...} }` quando o parâmetro é passado, omitido quando não é (não muda o
      formato de resposta pra quem já consome o endpoint sem o parâmetro).
      (referência: backlog, Lab 185, critério de aceite "a saída permite comparar coortes
      antes/depois")
- [ ] `weeklyFunnel` ganha as 3 chaves novas (`cameraRecenterUsed`, `cosmeticEquipped`,
      `planetTravelCompleted`), mesmo padrão de `weeklyDevices(tipo)` já usado pras outras 8
      chaves.
- [ ] Nota de guardrails no próprio JSON de resposta (`guardrails: string[]` ou campo similar) —
      device-based, não criança-based; nenhum dado pessoal infantil coletado; números pequenos
      (`sampleSize` baixo) devem ser lidos com cautela. (referência: backlog, Lab 185, critério de
      aceite "guardrails aparecem no relatório")
- [ ] Teste automatizado das funções puras extraídas (ex.: se a lógica de split de coorte virar
      uma função testável fora do handler HTTP, seguindo o padrão de `domain.ts` já usado pro
      resto do backend) — só se houver lógica pura real a extrair; a query SQL em si não é
      testável por unidade da forma como o resto de `handleAdminMetrics` já funciona hoje (sem
      teste próprio, é I/O puro).
- [ ] Verificado ao vivo contra produção (mesmo padrão de todo lab anterior que mexeu em
      `server-accounts`): `wrangler dev` local, banco de PRODUÇÃO real, só leitura pros endpoints
      de métrica; os 3 eventos novos disparados de verdade num navegador real e confirmados
      aparecendo no `weeklyFunnel`.

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
