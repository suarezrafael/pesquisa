# Contexto do laboratorio 234

Base: `origin/main` em `e387563840415333a670504adc87fbc7ca327382`.

## Decisao

`effectiveCosmeticProfile` projeta o perfil persistido para a aparencia
permitida pelo entitlement atual. O save continua intacto, inclusive para
backup/restauracao; nao se remove um item comprado/conquistado da crianca.
`GameApp` entrega essa projecao aos consumidores visuais. `World3D` consulta
o perfil mais recente ao terminar o setup assincrono da cena. O Worker recebe
o avatar publico no heartbeat somente com o segredo UUID do perfil; clientes
anteriores continuam usando o contrato sem esse campo.

## Verificacao e pendencias

Testes cobrem o mascara/restauracao, itens gratuitos e normalizacao do novo
campo no Worker. A verificacao manual com assinatura real, expiracao,
reativacao e segundo jogador ainda e necessaria. O heartbeat so sincroniza
o perfil publico no proximo tick (ate 60 segundos). Nao houve deploy neste
lab. A PR #119 esta em rascunho e pode exigir rebase/reconciliacao da loja.
