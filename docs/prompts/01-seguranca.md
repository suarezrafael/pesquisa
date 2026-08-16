# Critérios de Segurança

Público-alvo: crianças de ~10 anos. Isso torna segurança infantil e privacidade **requisitos
obrigatórios de produto**, não apenas boas práticas técnicas — um incidente aqui não é só um bug, é um
risco legal e de confiança das famílias. Trate todo item marcado **[MUST]** como bloqueador de merge;
itens **[SHOULD]** podem ser adiados para um laboratório futuro, mas devem ser registrados como dívida
técnica no `CONTEXT.md` do laboratório, não esquecidos silenciosamente.

## 1. Segurança infantil e compliance (prioridade máxima)

- **[MUST]** Nenhum chat de texto livre entre crianças no MVP. Se houver comunicação social, usar
  apenas mensagens pré-definidas ("quick chat" / emotes), nunca campo de texto livre — ver
  `prompt.md` seção 11.
- **[MUST]** Nenhuma coleta de dado pessoal da criança além do mínimo necessário para o jogo
  funcionar (privacy by design). Nome de exibição pode ser um apelido gerado, não nome real.
  E-mail, dados de pagamento e dados de contato pertencem exclusivamente à conta do responsável.
- **[MUST]** Qualquer fluxo de pagamento ou upsell é acessível apenas pelo **portal dos
  responsáveis** (`/familia`), nunca dentro do client de jogo da criança — ver `prompt.md` seção
  15.3.
- **[MUST]** **Parental gate** obrigatório antes de: qualquer tela de preço, qualquer alteração de
  dados de conta, qualquer link externo ao app. Implementação mínima: pergunta que uma criança de 10
  anos dificilmente responde de cabeça sob pressão de tempo (ex.: multiplicação de dois dígitos),
  nunca um simples botão "Sou responsável".
- **[MUST]** Sem propaganda direcionada a crianças, sem dark patterns de conversão (ex.: contagem
  regressiva de urgência mirando a criança, notificação push de compra para o perfil infantil).
- **[SHOULD]** Se/quando houver recurso social expandido (P2, `prompt.md` backlog), qualquer texto
  gerado por outro usuário passa por filtro de linguagem antes de ser exibido, e há um caminho de
  denúncia/bloqueio visível à criança e ao responsável.
- **[SHOULD]** Documentar no repositório (não necessariamente neste MVP) a política de privacidade e
  o mapeamento de compliance aplicável (LGPD no Brasil; COPPA se houver usuários nos EUA) antes de
  qualquer lançamento público real — ver `prompt.md` seção 10.

## 2. Autenticação e sessão

- **[MUST]** Autenticação delegada a um provedor testado (Supabase Auth / Firebase Auth / GoTrue via
  API no caso da Opção C) — nunca implementar hashing de senha ou gestão de sessão do zero.
- **[MUST]** Sessão da criança e sessão do responsável são logicamente separadas mesmo quando ligadas
  à mesma conta família: a UI infantil nunca expõe rotas, tokens ou estado que pertence ao portal dos
  responsáveis.
- **[MUST]** Tokens (JWT/refresh token) armazenados seguindo o padrão do provedor
  (ex.: cookies `httpOnly`/`secure` quando disponível); nunca em `localStorage` se o provedor
  oferecer alternativa mais segura.
- **[SHOULD]** Expiração e renovação de sessão configuradas explicitamente (não usar defaults sem
  revisar); logout also limpa qualquer cache local de progresso sensível.

## 3. Autorização e dados

- **[MUST]** Toda tabela com dado por usuário/família usa controle de acesso a nível de linha (Row
  Level Security no Postgres/Supabase) — nunca confiar apenas em filtro no client para restringir
  quem lê/escreve o quê.
- **[MUST]** Um perfil de criança só pode ler/escrever seu próprio progresso; a conta responsável só
  acessa dados dos perfis vinculados à sua `family_account_id` (ver `prompt.md` seção 15.3).
- **[MUST]** Toda entrada vinda do client (respostas de quest, nome de exibição, eventos de
  progresso) é validada e sanitizada no backend antes de persistir — nunca confiar em validação só no
  front-end, mesmo que o front já valide para dar feedback rápido.
- **[SHOULD]** Rate limiting em endpoints sensíveis (login, conclusão de quest, resgate de
  recompensa) para mitigar abuso/farming automatizado.

## 4. Segurança de aplicação web (OWASP)

Aplicar a lista OWASP Top 10 como checklist mínimo para qualquer superfície web (PWA e portal dos
responsáveis):

- **[MUST]** Prevenir XSS: nunca renderizar HTML não sanitizado vindo de dado de usuário (nome de
  exibição, mensagens pré-definidas); usar escaping padrão do framework (React já escapa por
  padrão — não usar `dangerouslySetInnerHTML`/`innerHTML` com dado de usuário).
- **[MUST]** Prevenir SQL/NoSQL injection: usar sempre queries parametrizadas ou o ORM/query builder
  do provedor (Supabase client, Entity Framework Core) — nunca concatenar string de usuário em SQL.
- **[MUST]** Prevenir CSRF em qualquer endpoint que muda estado a partir do portal dos responsáveis
  (ex.: usar tokens anti-CSRF ou `SameSite=strict` em cookies de sessão, conforme o mecanismo de auth
  escolhido).
- **[MUST]** HTTPS obrigatório em todos os ambientes que não sejam localhost (os tiers gratuitos
  recomendados em `prompt.md` seção 8 já oferecem TLS por padrão — não desabilitar).
- **[SHOULD]** Content Security Policy (CSP) básica configurada no front-end para limitar origens de
  script/iframe, reduzindo impacto de um XSS que escape a defesa primária.

## 5. Segredos e configuração

- **[MUST]** Nenhuma chave secreta (service role key do Supabase, chave secreta do Stripe,
  connection string com credencial) em código versionado ou em variável exposta ao client. Chaves
  secretas vivem só no backend/edge function; o client usa apenas chaves públicas/anon.
- **[MUST]** Webhooks de pagamento (Stripe) validam a assinatura do payload antes de processar
  qualquer evento — nunca confiar no conteúdo do webhook sem verificar a assinatura.
- **[SHOULD]** `.env`/segredos locais listados em `.gitignore` desde o primeiro commit que os
  introduzir; usar um `.env.example` sem valores reais para documentar quais variáveis existem.

## 6. Dependências e cadeia de suprimento

- **[SHOULD]** Rodar auditoria de dependências (`npm audit`, `dotnet list package --vulnerable`, ou
  equivalente) antes de cada laboratório fechar, e tratar vulnerabilidades críticas/altas antes do
  merge.
- **[SHOULD]** Preferir bibliotecas com manutenção ativa e uso amplo a pacotes pouco mantidos,
  especialmente em qualquer código que toque autenticação, pagamento ou sanitização de entrada.

## 7. Logging e observabilidade sem vazar dados

- **[MUST]** Logs de aplicação nunca incluem dado pessoal da criança (nome real se existir, e-mail,
  dado de pagamento) nem segredos (token, chave). Logar identificadores técnicos (ex.: `user_id`),
  não conteúdo sensível.
- **[SHOULD]** Erros voltados ao usuário são genéricos ("algo deu errado, tente novamente"); detalhes
  técnicos (stack trace, query) vão para log de servidor, nunca para a resposta HTTP em produção.

## Checklist rápido antes de qualquer merge que toque dado de usuário ou pagamento

- [ ] RLS/regra de autorização cobre a nova tabela ou endpoint?
- [ ] Entrada validada no backend, não só no client?
- [ ] Algum dado de criança novo sendo coletado? Está no mínimo necessário e documentado?
- [ ] Fluxo de pagamento/preço passa pelo parental gate e fica fora do client infantil?
- [ ] Segredo novo está fora do código versionado e fora do bundle do client?
- [ ] Log novo não vaza PII nem segredo?
