# Contexto do laboratorio 236

Base: `origin/main` em `e5dfa817699eeeb208dfcfa1e2e6ea904637bd52`.

`useEntitlement` usa o token mais recente em uma ref. Revalida na montagem e
mantem um pulso de 1 minuto que so consulta o Worker se a aba estiver visivel
e a ultima tentativa tiver 5 minutos ou mais. O retorno a aba usa a mesma
politica. Uma resposta antiga e ignorada quando o token foi desvinculado ou
substituido; falha de rede/servidor preserva o cache.

`useHeartbeat` envia o look efetivo logo na transicao de `entitlement.active`,
alem do tick periodico existente. O avatar publico so acompanha a atualizacao
quando o perfil tem segredo salvo. Nao ha endpoint novo nem dado pessoal novo.

Testes unitarios cobrem a janela de revalidacao e o payload com/sem segredo.
Ainda nao houve teste real de cancelar/reativar uma assinatura durante jogo
continuo, nem medicao no Redmi Pad 2. O alvo de 6 minutos depende de rede e
resposta do Worker. Nao houve deploy neste lab.

Proxima validacao: comparar dois perfis no tablet, cancelar e reativar pelo
portal adulto, observar avatar local e publico sem recarregar a pagina; repetir
offline para confirmar que o jogo e o progresso permanecem disponiveis.
