# Contexto — Laboratório 238 — Toque direto nos portais de jogos

Preenchido em: 2026-09-24
Commit inicial: b45a6bb973ee153e28eb9a7928b3504e0fde4617

## Implementado

- `World3D.tsx`: toque/click curto na placa visível seleciona o mesmo portal acionado por E; pinça e arraste cancelam a seleção, e o toque fora do canvas não atua.
- O picking de Babylon roda só no `pointerup` dentro do saguão e filtra apenas as quatro placas; `skipPointerMovePicking` permanece ativo.
- Placas maiores e dica de interação coerente com toque/click.
- `portalTap.ts` e teste: limite de deslocamento do dedo para distinguir toque de arraste.

## Verificação

- `npm run test`: 306/306 testes passaram.
- `npm run build`: passou.
- `npm run lint`: passou com dois avisos preexistentes fora deste lab.
- Navegador local: cena carregou, sem erros no console. A interação física dentro do saguão não foi reproduzida em um tablet nesta sessão.

## Pendências

- Confirmar no Redmi Pad 2: tocar Memória e as outras placas, arrastar a câmera, pinçar zoom e pressionar E como alternativa.
- O playtest infantil e as pendências do Lab 237 continuam abertos; não atribuir melhora de seleção sem medição.

## Próximo passo

Usar o retorno da criança no tablet para calibrar o tamanho visual das placas e o limite de gesto se necessário.
