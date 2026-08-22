# Laboratório 61 — Espada, arma e voo do foguete apontando pro destino

Status: concluído
Início: 2026-08-20
Fim: 2026-08-20
Commit inicial: 30fa7180620651b3d54b1a845be8e274280e6ec7

## Objetivo do laboratório
Usuário: "o foguete, a camera deve ficar na parte de traz do foguete, ele deve voar apontando pro
planeta de destino e pousar de ré. ao pousar em marte logo já morri não tem nem como dar golpe
nele, crie uma espada que deve ser pega na terra para usar no planeta pra nocautear o ET e uma
arma para usar no robô, dê dicas de como encontrar a espada e a arma senão não tem como sobreviver
ao ET e ao robô em Marte." — dois pedidos: (1) o foguete deve apontar pro destino durante o
cruzeiro do voo (não só decolar reto e pousar de pé, como ficou no lab-59), com a câmera atrás
dele; (2) o combate em Marte (lab-60) estava impossível de vencer — precisa de armas pra reagir.

## Funcionalidades planejadas
- [x] **Voo em três fases** — decolagem travada reta (herdado do lab-59), CRUZEIRO com o nariz
      apontando pra tangente da curva de voo (rumo ao planeta de destino, pedido novo do
      usuário), e um "flip" suave pro pouso de ré nos instantes finais.
- [x] **Espada** (pega na Terra) — nocauteia ETs em Marte apertando E perto de um, com a espada
      equipada.
- [x] **Arma a laser** (pega na Terra) — nocauteia robôs em Marte apertando E perto de um, com a
      arma equipada.
- [x] **Dicas de localização** — legendas flutuantes sempre visíveis nos dois itens (funcionam
      como a dica pedida), mais um aviso ao embarcar rumo a Marte sem os dois.
- [x] Build (typecheck + produção) passa.
- [x] Verificado ao vivo (dev server + teleporte de debug): espada e arma pegáveis (mesh some,
      vira `hasSwordRef`/`hasGunRef`), combate funcional (inimigo nocauteado vira invisível e
      para de perseguir/atacar), viagem de ida e volta continua funcionando sem erro no console.

## Fora de escopo (explicitamente adiado)
- Indicador visual permanente de quais armas estão equipadas (ex.: ícones no HUD) — as legendas
  flutuantes + a mensagem de aviso ao embarcar já cobrem o pedido de "dar dicas", um indicador
  fixo fica pra um próximo pedido explícito.
- Combate contra o ET/robô sem a arma certa (esquivar, fugir, etc.) — apertar E sem a arma
  correspondente simplesmente não faz nada; o jogador ainda pode tentar fugir andando.
