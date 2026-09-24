# Contexto — Laboratório 237 — Acesso e controle da Central de Jogos

Preenchido em: 2026-09-24
Commit inicial: e5dfa817699eeeb208dfcfa1e2e6ea904637bd52

## Implementado

- `World3D.tsx`: nova direção candidata para a Central; gatilho de entrada adiantado em relação à porta e raio de entrada separado dos portais.
- `nearestInteraction.ts`: escolhe a placa mais próxima na sobreposição dos raios, independentemente da ordem da lista; dica visual usa a mesma decisão.
- `World3D.tsx`: toque iniciado na metade direita gira o avatar; a câmera acompanha a mesma direção. No saguão, a posição inicial da câmera é sincronizada com o teleporte.
- `nearestInteraction.test.ts`: cobre sobreposição em Memória e ausência de alvo fora do raio.

## Validação

- `npm run test`: 304/304 testes passaram.
- `npm run build`: passou.
- `npm run lint`: passou com dois avisos preexistentes fora deste lab.
- Navegador local: a cena abriu sem erro no console; o teste de controle por toque físico e percurso completo ficou pendente.

## Pendências

- Testar entrada com carro passando, seleção de Memória, câmera, pinça e saída no Redmi Pad 2 antes de considerar a UX encerrada.
- Confirmar visualmente que a nova posição da Central está livre de obstáculos no trajeto real do jogador.

## Próximo passo

Coletar retorno das crianças no tablet; ajustar posição/alcance com base em falha reproduzível, se houver.
