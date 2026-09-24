# Laboratório 238 — Toque direto nos portais de jogos

Status: implementado na branch; validação no tablet pendente
Início: 2026-09-24
Fim: -
Commit inicial: b45a6bb973ee153e28eb9a7928b3504e0fde4617

## Objetivo do laboratório

Permitir que a criança selecione Memória e os demais jogos tocando na placa do saguão,
sem depender exclusivamente da aproximação exata e do botão E.

## Funcionalidades planejadas

- [x] Tocar/clicar na placa seleciona o jogo visível, mantendo E como alternativa (backlog 212: controles mobile; relato do usuário sobre Memória).
- [x] Arraste de câmera, pinça, toque fora da placa e toque em HUD não selecionam jogo (backlog UX 188: linguagem de interativos).
- [x] Placas têm alvo visual maior sem se sobrepor; picking só ocorre no toque concluído, sem custo por quadro (critérios de design mobile/performance).
- [x] Testes do reconhecimento de toque e abertura da cena no navegador local.
- [ ] Validar o toque direto e a pinça no Redmi Pad 2 com uma criança.

## Fora de escopo

- Mudar regras/recompensas dos minijogos.
- Mudar a entrada/posição da Central ou o controle do carro.
- Alterar assinatura/entitlement da PR #125.
- Declarar concluído o playtest no Redmi Pad 2 sem medição física.
