# Laboratorio 234 - Aparencia efetiva da assinatura

Status: implementado localmente; validacao de ponta a ponta pendente
Inicio: 2026-09-23
Fim: -
Commit inicial: e387563840415333a670504adc87fbc7ca327382
Prioridade: P0

## Problema e hipotese

Depois do fim do entitlement, a loja podia indicar o bloqueio dos itens
familiares enquanto o avatar salvo ainda exibia esses itens no mundo ou no
perfil publico. Uma aparencia efetiva, separada do save, deve manter a regra
cosmetica consistente e restaurar a escolha anterior se o acesso voltar.

## Usuario beneficiado

Crianca e responsavel: o jogo preserva as conquistas e escolhas, mas apresenta
com clareza quais visuais pertencem a assinatura.

## Escopo e criterios de aceite

- [x] Mascarar avatar, chapeu, oculos, cabelo e cores `subscriptionOnly` sem
  alterar o perfil salvo ou os cosmeticos gratuitos/conquistados.
- [x] Aplicar a aparencia efetiva no mundo 3D, na loja, no painel de amigos,
  na presenca multiplayer e no snapshot publico do heartbeat.
- [x] Proteger a atualizacao do avatar publico com o segredo do perfil.
- [x] Restaurar a aparencia salva quando o entitlement volta.
- [x] Cobrir transicoes e categorias com testes unitarios; rodar testes,
  TypeScript, lint e build.
- [ ] Validar no navegador/tablet com assinatura ativa, expirada e reativada,
  incluindo outro jogador visualizando o perfil publico.

## Fora de escopo

- Mudar preco, Checkout, concessao do entitlement ou catalogo de itens.
- Apagar itens pagos ou bloquear progresso educacional.
- Publicar em producao sem revisao e teste do fluxo real.

## Metricas e riscos

Meta: zero visual `subscriptionOnly` exibido sem entitlement apos a
revalidacao; zero perda de cosmeticos gratuitos ou escolhas salvas. Medir
incidentes de divergencia loja/mundo/perfil e regressao no heartbeat.

O perfil publico atualiza no tick de 60 segundos; perfis locais sem segredo
salvo nao conseguem corrigir o avatar publico ate novo registro. A PR #119
(Lab 230, lojinha infantil) tambem altera a loja e deve ser integrada com
revisao da mesma regra ao sair do rascunho.
