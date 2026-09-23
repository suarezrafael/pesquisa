# Auditoria de monetizacao infantil - Lab 230

Data: 2026-09-23. Origem: UX 189 em
`docs/growth-retention-monetization-backlog.md`, P0 do `VERB-MAP.md` do Lab 228
e regra inegociavel de `docs/plano-comercial-backend.md`.

| Superficie | Antes | Ajuste neste lab | Limite |
| --- | --- | --- | --- |
| Lojinha: avatar, chapeu, oculos e roupas | Coroa no nome e tag `Assinantes` com cadeado para item indisponivel | Tag informativa `Visual da familia`, sem CTA, preco real ou urgencia; itens compraveis continuam com moedas ganhas jogando | Verificar se a crianca compreende a diferenca entre moeda e colecao da familia em playtest |
| Minha Casa | Coroa em set familiar e tag `Assinantes`; recompensa de planeta tinha cadeado | Mesmo componente de tag familiar; recompensa mostra objetivo de jogo com planeta | Ainda nao houve playtest na casa |
| Vinculo por codigo | Texto pedia a crianca para solicitar codigo a quem cuida dela | Instrucao condicional: usar codigo ja recebido ou continuar jogando; link para area adulta preservado | O portao parental e o portal nao foram alterados |
| Portal `/familia` | Preco, beneficios e checkout do responsavel | Inalterado: copy de R$ 4,99/mes, relatorio, backup e cosmeticos continua separado do jogo | Testar compreensao com responsaveis antes de concluir UX 189 |

## Evidencia de codigo e interface

- `AvatarShop.tsx`, `MyHousePanel.tsx` e `PairingScreen.tsx` nao exibem preco em
  reais, urgencia, botao de assinatura nem checkout. `FamilyVisualTag.tsx`
  reaproveita a mesma tag nao interativa nos catalogos infantis.
- No Edge local, a lojinha foi aberta e inspecionada em desktop e 390x844.
  Texto inicial, preview fixo, abas e cards com `Visual da familia` ficaram
  visiveis; o rotulo quebrou em duas linhas sem sair do card no viewport menor.
  A tela de codigo mostrou `Sem codigo, pode continuar jogando normalmente`.
- 293/293 testes, lint (dois avisos preexistentes) e build passaram. O Edge
  automatizado ficou perto de 1 FPS no mundo; isso nao mede tablet nem valida
  interacao completa de uma crianca.

## Riscos ainda abertos

- `AvatarShop.tsx` deriva `equipped` do perfil salvo, mesmo quando
  `entitlementActive` e falso. `World3D.tsx` tambem le os cosmeticos do perfil
  para renderizar o avatar. Um item familiar equipado antes do vencimento pode
  parecer `Em uso` ou permanecer visivel apos a revalidacao. Corrigir o estado
  efetivo de cosmeticos em um lab de entitlement, com testes de assinatura
  ativa, vencida e retorno do acesso; nao resolver so ocultando a tag na UI.
- O uso do link `/familia` parte do jogo, mas o portal adulto aplica o portao
  parental. Revisao de seguranca deve confirmar o percurso final no navegador.
- Nao ha entrevistas com 5-8 duplas nem medicao de compreensao ou relatos de
  pressao. A mudanca de copy e uma hipotese de UX, nao ganho comprovado.
