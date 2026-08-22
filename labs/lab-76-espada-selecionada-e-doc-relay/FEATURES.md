# Laboratório 76 — espada selecionada na mão + documentação do relay Cloudflare

Status: concluído
Início: 2026-08-22
Fim: 2026-08-22
Commit inicial: 8bce81d45aec2dfc31942ef26a6724708ea1f217

## Objetivo do laboratório
Dois pedidos do usuário nesta rodada:
1. "quando eu estiver com espada selecionada ela deve aparecer na mao do boneco e ao pressionar E
   deve faser o som de espada e mexer o braco, mesmo sem estar em marte" — mesma ideia do lab-74
   (disparo livre da arma a laser), agora pra espada, e junto com isso a seleção da mochila
   (lab-63) passa a ter efeito visual de verdade pela primeira vez.
2. "em https://github.com/suarezrafael/pesquisa/tree/main/app/server-cf-relay documentar num
   readme o detalhe minucioso tecnico de como o server foi desenvolvido qual servico usar e onde
   foi hospedado e quais as capacidades tecnicas do servidor quantos usuarios pode aguentar na
   versao free."

(Um terceiro pedido da mesma rodada — desligar o app antigo do Fly.io v1 — não gerou mudança de
código; ver `CONTEXT.md` pra detalhes de por que não foi possível concluir.)

## Funcionalidades planejadas
- [x] Seleção na mochila (`selectedWeapon`) passa a controlar qual arma fica visível na mão
- [x] Espada selecionada + "E" fora de combate: toca som de espada e mexe o braço
- [x] Arma a laser selecionada + "E" fora de combate: continua funcionando (lab-74), agora
  condicionado à seleção em vez de só "ter a arma"
- [x] Combate em Marte auto-seleciona a arma certa ao nocautear um inimigo (pra não sacudir o
  braço de uma arma que não está visível na mão)
- [x] `README.md` novo em `app/server-cf-relay/` com arquitetura, hospedagem e capacidade do
  plano Free

## Fora de escopo (explicitamente adiado)
- Desligar/apagar o app Fly.io v1 — bloqueado pela própria Cloudflare/Fly.io (ver `CONTEXT.md`),
  não é uma limitação deste laboratório.
