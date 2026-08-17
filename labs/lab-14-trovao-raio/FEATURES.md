# Laboratório 14 — Trovão e raio

Status: em andamento
Início: 2026-08-16
Fim: -
Commit inicial: 5dbf00507f74ab29f57d4901a349b8cca036e96e

## Objetivo do laboratório
Completar o clima dinâmico do lab-10 (que já implementou chuva) com trovão e raio — pedido
original do usuário no lab-09, adiado explicitamente em três labs seguidos
(`labs/lab-10-clima-npcs-trilha/CONTEXT.md`, `labs/lab-11-parkour/CONTEXT.md`,
`labs/lab-12-chat-seguro/CONTEXT.md`, `labs/lab-13-bonecos-3d/CONTEXT.md`).

Escolhido como próximo item entre os pendentes (ruas+carros, loja navegável, trovão/raio, itens de
backend/conta) por ser o mais contido e o único que estende trabalho já pronto (o sistema de chuva
do lab-10) em vez de abrir uma área nova grande — usuário pediu "continue o próximo laboratório"
sem especificar prioridade.

## Funcionalidades planejadas
- [ ] Relâmpago visual: clareamento rápido da cena (flash de luz) em intervalos aleatórios,
      só durante a chuva (reaproveita o estado `raining`/`rainAmount` do lab-10).
- [ ] Trovão sintetizado: som grave/estrondoso via Web Audio API (mesmo padrão do vento/chuva em
      `ambientAudio.ts` — sem asset externo), disparado com um pequeno atraso depois do relâmpago
      (luz viaja mais rápido que o som — detalhe que ajuda a vender o efeito).
- [ ] Frequência/intensidade aleatória, não previsível — nem todo raio é seguido de trovão audível
      imediato (tempestade distante vs. próxima), dentro de limites razoáveis pra não virar
      irritante num jogo infantil.
- [ ] Verificação end-to-end: rodar o dev server, forçar chuva (`window.__forceRain(true)`,
      hook de DEV já existente) e confirmar visualmente/pelo estado da cena que o flash de
      relâmpago dispara e o som de trovão tem timing coerente com o flash.

## Fora de escopo (explicitamente adiado)
- Ruas e carros, loja navegável (interior), itens de backend/conta — pendências maiores, sem
  relação com este pedido.
- Chuva em si — já implementada no lab-10, não é retrabalhada aqui além do necessário pra
  integrar o trovão/raio ao mesmo estado de clima.
