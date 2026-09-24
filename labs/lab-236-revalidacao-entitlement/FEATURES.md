# Laboratorio 236 - Revalidacao de entitlement durante a sessao

Status: implementado localmente; validacao com assinatura real pendente
Inicio: 2026-09-24
Fim: -
Commit inicial: e5dfa817699eeeb208dfcfa1e2e6ea904637bd52
Prioridade: P1
Origem: pendencia do Lab 234 e Fase D em `docs/plano-comercial-backend.md`.

## Problema e hipotese

O jogo revalidava a assinatura apenas ao abrir a pagina ou resgatar um codigo.
Uma sessao longa podia manter visuais familiares apos cancelamento ate o proximo
reload. Revalidacao silenciosa durante a sessao deve corrigir a aparencia sem
interromper a crianca nem afetar o conteudo educativo.

## Usuario beneficiado

Crianca, responsavel e amigos que veem o perfil publico.

## Escopo e criterios de aceite

- [x] Consultar `/entitlement` ao iniciar, depois de pelo menos 5 minutos com
  aba visivel, e ao voltar a aba se esse intervalo ja passou.
- [x] Manter o cache em falha de rede/servidor; 401 continua inativando acesso.
- [x] Ignorar resposta de token antigo depois de desvincular ou trocar codigo.
- [x] Sincronizar aparencia efetiva publica imediatamente quando `active`
  muda, com segredo do perfil quando disponivel.
- [x] Manter heartbeat de 60 segundos e clientes legados sem segredo.
- [x] Cobrir politica de tempo e payload do perfil publico com testes; rodar
  build, testes e lint.
- [ ] Validar cancelamento, reativacao, offline e segundo jogador em navegador
  e Redmi Pad 2 com assinatura real.

## Fora de escopo

- Mudar Stripe, preco, portal adulto ou o endpoint do Worker.
- Revogar cosmeticos do save ou bloquear missao/progresso/cooperacao.
- Prometer revogacao imediata em modo offline.

## Metricas e riscos

Meta: estado cosmetico atualizado em ate 6 minutos de uma mudanca no servidor
durante jogo visivel, ou ao voltar a aba apos 5 minutos; perfil publico deve
acompanhar a transicao assim que o heartbeat imediato concluir. Isso e alvo de
validacao, nao resultado medido. A rede offline mantem o cache por design;
identidades legadas sem segredo nao podem atualizar o emoji publico.
