# Critérios de Clean Code e Manutenção Fácil

O time real deste projeto são sessões de IA (e uma pessoa) retomando o trabalho a frio, laboratório
após laboratório. Código difícil de entender sem contexto extra é o maior risco de manutenção aqui —
mais do que em um time humano fixo, porque quem lê o código amanhã pode não ter visto a sessão em que
foi escrito. Otimizar para "dá para entender só lendo o código + o `CONTEXT.md` do laboratório".

## 1. Nomenclatura e clareza

- **[MUST]** Nomes de variável/função/componente descrevem o quê, não como (ex.: `calcularRecompensa`,
  não `processarDados2`). Evitar abreviação não óbvia.
- **[MUST]** Nomes de domínio do jogo (quest, badge, moeda, família, entitlement) são consistentes em
  todo o código, alinhados à terminologia usada em `prompt.md` — não inventar sinônimo novo por
  arquivo (ex.: não misturar `reward`/`prize`/`recompensa` para o mesmo conceito).
- **[SHOULD]** Funções e componentes pequenos o suficiente para caber numa leitura sem rolar a tela
  várias vezes; se uma função faz "e" duas coisas não relacionadas, considerar separar.

## 2. Comentários e documentação inline

- **[MUST]** Sem comentário para explicar o que o código já diz por nomes bem escolhidos. Comentário
  só quando o "porquê" não é óbvio: uma restrição escondida, um workaround para um bug específico de
  biblioteca, uma decisão que parece estranha sem contexto (ex.: "usamos delay de 300ms aqui porque o
  Stripe webhook X chega antes do redirect Y em alguns browsers").
- **[MUST]** Nenhum comentário referenciando a sessão de IA, o laboratório atual ou um ticket externo
  ("adicionado no lab-03", "corrige o bug reportado pelo usuário") — isso pertence ao `CONTEXT.md` do
  laboratório e ao histórico do git, não ao código, que precisa continuar fazendo sentido depois que
  esse contexto não existir mais.

## 3. Estrutura de pastas

- **[MUST]** Organizar por domínio/feature (ex.: `quests/`, `progressao/`, `familia/`), não só por
  tipo técnico (`components/`, `hooks/`, `services/` genéricos misturando features não relacionadas) —
  facilita achar tudo que pertence a uma feature ao dar manutenção nela.
- **[SHOULD]** Um `README.md` curto por módulo não trivial (ex.: como o motor de quests decide
  dificuldade adaptativa) quando a lógica não é óbvia lendo só os nomes de arquivo.

## 4. Duplicação e reuso

- **[MUST]** Antes de criar um novo componente de UI, checar se um equivalente já existe no design
  system (ver `02-design-profissional.md` seção 4) — não recriar botão/card/modal com pequenas
  variações.
- **[SHOULD]** Extrair para função/módulo compartilhado qualquer lógica repetida 3+ vezes; duas
  repetições ainda podem ser coincidência, mas revisar se compartilham intenção.
- **[MUST]** Não introduzir abstração/generalização para um caso hipotético futuro que ainda não
  existe no backlog (`prompt.md` seção 6) — resolver o problema atual, não o problema imaginado.

## 5. Testes

- **[MUST]** Lógica de domínio (cálculo de recompensa, validação de resposta de quest, regra de
  entitlement por assinatura) tem teste unitário — é a camada mais barata de testar (funções puras, ver
  `03-arquitetura-sistema.md`) e a mais custosa de errar silenciosamente (ex.: dar recompensa errada,
  liberar feature paga de graça).
- **[SHOULD]** Ao menos um teste de integração cobrindo o loop principal completo (explorar → resolver
  desafio → ganhar recompensa, `prompt.md` seção 5) antes de fechar o laboratório que o implementa.
- **[SHOULD]** Regras de segurança críticas (RLS, parental gate, validação de webhook — ver
  `01-seguranca.md`) têm teste automatizado, não só verificação manual, porque regressão silenciosa
  aqui tem custo alto.

## 6. Convenções de código e ferramentas

- **[MUST]** Linter e formatter configurados desde o primeiro laboratório de código (ESLint +
  Prettier para TS/JS; `dotnet format`/analyzers para C# na Opção C) e rodando antes de qualquer
  commit — evita debate de estilo e mantém diffs legíveis entre sessões.
- **[SHOULD]** Checagem de tipos estrita (TypeScript `strict: true`, ou nullable reference types em
  C#) — pega classe inteira de bug antes de rodar, especialmente valioso quando quem revisa o código
  troca de sessão para sessão.

## 7. Commits e histórico

- **[MUST]** Mensagens de commit descrevem o "porquê"/intenção, não só listam arquivos alterados —
  o histórico de commit é uma fonte de contexto para a próxima sessão, junto com o `CONTEXT.md`.
- **[SHOULD]** Commits pequenos e coesos (uma mudança lógica por commit) em vez de um commit gigante
  no fim do laboratório — facilita reverter ou revisar uma decisão isolada depois.

## 8. Dívida técnica e documentação de decisões

- **[MUST]** Toda dívida técnica consciente (ex.: "pulamos rate limiting neste endpoint por agora")
  vai explicitamente na seção "Pendências / dívidas conhecidas" do `CONTEXT.md` do laboratório — ver
  `labs/_templates/CONTEXT.md`. Dívida não documentada é dívida que ninguém vai lembrar de pagar.
- **[SHOULD]** Decisões técnicas com trade-off relevante (escolha de biblioteca, padrão de state
  management, corte de escopo) registradas na seção "Decisões técnicas tomadas" do mesmo
  `CONTEXT.md`, com o porquê — não só o quê.

## Checklist rápido de code review (self-review antes de fechar um laboratório)

- [ ] Nomes de domínio consistentes com `prompt.md` e com o resto do código?
- [ ] Algum comentário supérfluo ou referenciando contexto de sessão para remover?
- [ ] Componente/lógica nova duplica algo que já existia?
- [ ] Lógica de domínio crítica tem teste?
- [ ] Lint/format/typecheck passam limpos?
- [ ] Dívida técnica consciente está anotada no `CONTEXT.md` do laboratório?
