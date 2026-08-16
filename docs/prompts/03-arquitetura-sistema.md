# Critérios de Arquitetura de Sistema

Aplica-se às três stacks descritas em `prompt.md` seção 7 (Opção A: React/Phaser/Supabase; Opção B:
PlayCanvas-Babylon/Firebase; Opção C: React/Phaser + ASP.NET Core/Azure + Supabase Postgres). Os
princípios abaixo são independentes de stack; os exemplos concretos indicam onde a stack muda o
"como".

## 1. Separação de camadas (MUST em qualquer stack)

Manter sempre 4 camadas logicamente separadas, mesmo em um MVP pequeno — a separação é o que permite
trocar peças (ex.: Opção A → Opção C) sem reescrever o jogo:

1. **Apresentação/Jogo** (React + Phaser/PlayCanvas/Babylon): cenas, UI, input, animação, áudio.
   Não contém regra de negócio (ex.: cálculo de recompensa, validação de resposta de quest) além do
   necessário para feedback imediato/otimista.
2. **Domínio/Regras de jogo**: lógica de quest, progressão, cálculo de recompensa, elegibilidade de
   feature por assinatura. Deve ser testável sem instanciar a engine gráfica nem o backend — funções
   puras sempre que possível.
3. **Acesso a dados/API**: chamadas ao backend (Supabase client, ou API HTTP do backend .NET na Opção
   C), mapeamento de DTO ↔ modelo de domínio. Isola o resto do app de mudanças no formato de resposta
   do backend.
4. **Backend/persistência**: Postgres (Supabase) + regras de autorização (RLS), ou, na Opção C, API
   ASP.NET Core que aplica as mesmas regras de domínio no servidor (nunca confiar só na validação do
   client — ver `01-seguranca.md` seção 3).

Regra prática: se uma função de cálculo de recompensa ou validação de resposta está escrita dentro de
um componente de UI ou de uma cena do Phaser, ela está na camada errada — mover para a camada de
domínio.

## 2. Contrato de dados e API

- **[MUST]** Definir o formato dos dados principais (perfil de criança, quest, progresso, entitlement
  de assinatura) num único lugar (tipos TypeScript compartilhados, ou schema OpenAPI/DTO em C# na
  Opção C) e reutilizar em front e back — evitar duplicar a forma do dado em vários arquivos que podem
  divergir.
- **[MUST]** Endpoints/queries novos seguem um padrão de nomenclatura e formato de erro consistente
  (ex.: sempre `{ data, error }` ou sempre exceção tratada no mesmo nível) — inconsistência aqui é a
  maior fonte de bugs bobos em integrações front/back.
- **[SHOULD]** Versionar mudanças que quebram compatibilidade de formato de dado salvo (ex.: mudar a
  estrutura de `progress` de um perfil) com uma migração explícita, nunca sobrescrever silenciosamente
  o formato antigo.

## 3. Tempo real (coop/sala)

- **[MUST]** Tempo real é uma camada isolada e opcional: o jogo deve continuar funcionando (modo
  solo) se o canal de realtime cair — nunca acoplar o loop principal de gameplay solo à disponibilidade
  do Realtime/SignalR.
- Opção A/B: usar o Realtime nativo do Supabase/Firestore para salas simples antes de introduzir um
  servidor de jogo dedicado (Colyseus) — só subir a complexidade quando o padrão de uso justificar
  (ver `prompt.md` seção 8).
- Opção C: Azure SignalR Service F1 tem limite de conexões simultâneas — desenhar salas pequenas e
  desconectar sessões ociosas, não assumir escala ilimitada no tier gratuito.

## 4. Gestão de estado no client

- **[MUST]** Um único lugar concentra o estado de progressão/sessão do jogador (ex.: um store
  central), evitando estado duplicado e dessincronizado entre cena de jogo e UI de HUD.
- **[SHOULD]** Diferenciar claramente estado **efêmero de cena** (posição de personagem, animação em
  curso) de estado **persistente de domínio** (nível, moedas, quests concluídas) — só o segundo é
  sincronizado com o backend.

## 5. Configuração por ambiente

- **[MUST]** Variáveis de ambiente/config separadas por ambiente (local/dev, staging se existir,
  produção); nenhuma URL ou chave de ambiente hardcoded no código-fonte.
- **[SHOULD]** Um único arquivo de configuração central por ambiente, não valores de config
  espalhados em múltiplos arquivos.

## 6. Observabilidade mínima

- **[MUST]** Erros não tratados no client e no backend são capturados e logados em algum lugar visível
  (mesmo que seja só o console estruturado ou o free tier de uma ferramenta como PostHog/Sentry) —
  "silenciosamente falhar" é inaceitável mesmo em MVP.
- **[SHOULD]** Eventos-chave de produto (quest concluída, sessão iniciada, erro de pagamento) são
  instrumentados desde o primeiro laboratório que os introduz, para alimentar as métricas de
  `prompt.md` seção 12 sem precisar de um laboratório extra só de instrumentação depois.

## 7. Caminho de evolução/escala

- **[SHOULD]** Desenhar a camada de domínio (item 1) de forma que trocar de stack de backend (ex.:
  migrar da Opção A para a Opção C, ou vice-versa) exija reescrever a camada de acesso a
  dados/API, não a lógica de jogo. Isso é o que a Opção C do `prompt.md` seção 7 já assume ao manter o
  mesmo front-end/jogo.
- **[SHOULD]** Documentar decisões de arquitetura não óbvias como ADR curto (Architecture Decision
  Record) quando a escolha tiver trade-off relevante — ligar ao fluxo de laboratórios: a decisão e o
  "porquê" vão no `CONTEXT.md` do laboratório em que foram tomadas (ver `04-manutencao-clean-code.md`
  seção sobre documentação).

## Checklist rápido antes de introduzir um novo módulo/serviço

- [ ] A lógica nova está na camada certa (domínio vs. apresentação vs. acesso a dados)?
- [ ] O formato de dado novo está definido em um único lugar reutilizado por front e back?
- [ ] Se depende de realtime, o jogo degrada bem sem ele?
- [ ] Novas variáveis de ambiente estão centralizadas, não hardcoded?
- [ ] Erros novos são capturados/logados, não engolidos silenciosamente?
