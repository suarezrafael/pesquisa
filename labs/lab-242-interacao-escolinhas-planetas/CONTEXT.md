# Contexto - Laboratorio 242 - Interacao nas escolinhas dos planetas

Preenchido em: 2026-09-27
Commit inicial -> implementacao: 504c8c6..c576a82

## O que foi feito

- `nearestPlanetSchoolQuest` escolhe a pergunta pendente mais proxima no planeta
  atual, com o mesmo raio estrito 1.8 da aproximacao automatica. Empate conserva
  a ordem do registro; nao altera progresso nem depende da engine.
- `handleInteractPress` usa a selecao para E e o botao touch existente, antes
  dos veiculos. Mantem o latch automatico: cancelar nao reabre por proximidade,
  mas uma acao explicita permite retomar sem afastamento.
- Placa mais proxima mostra uma dica em duas linhas; fonte/linguagem existentes,
  GUI sem hit-test e sem bloquear camera, ajuste de altura em telas <=450px.
  Modal/chat, voo, carro, interior e pergunta concluida ocultam a dica.
- F9, apenas em desenvolvimento, posiciona perto da primeira escolinha pendente
  de Venus pelo teleporte fisico existente. Nao responde nem concede recompensa;
  trecho de F9 nao encontrado no bundle de producao.
- Lab 241 (PR #129) mesclado/publicado em 504c8c6; documentacao atualizada com
  revisao, deploy e build confirmado em missaoaprendizado.com.

## Decisoes tecnicas

- Selecao manual nao apaga latch automatico: impedir loop de modais e permitir
  retomada sao comportamentos diferentes. Regra de resposta/recompensa permanece
  no callback existente de App/progressao.
- Distancias ao quadrado e registros existentes; nenhum vetor, malha, textura
  ou post-process novo no gameplay. Dica atualizada a 10 Hz, com escritas de alpha
  e offset somente quando mudam. Ha um TextBlock novo por escolinha construida.
- A interface continua separando adulto/crianca. Nenhuma mudanca em assinatura,
  coleta de dados ou chat catalogado.

## Verificacao

- App: 330 testes / 29 arquivos passaram; seis testes novos para selecao manual,
  alcance/altura, filtro, empate, retomada sem reabertura automatica e imutabilidade.
- Lint passou com os dois avisos preexistentes (PetPanel Fast Refresh e variavel
  nao usada no teste de server-accounts). TypeScript/build/PWA passaram; aviso
  preexistente de chunks grandes permanece.
- Auditoria encontrou fast-uri 3.1.5 (alta, transitiva via ajv/workbox). Atualizado
  para 3.1.8, compativel com ^3.0.1; lock restrito a versao/URL/integridade deste
  pacote, sem o churn de metadados gerado pelo npm local. npm audit: zero vulnerabilidades.
- Navegador local, perfil GPU fraca forcado: aproximacao abriu pergunta; fechar
  nao reabriu automaticamente. Teclado E e clique no botao Interagir retomaram
  a mesma pergunta sem deslocamento. E durante modal nao abriu outra pergunta.
- Resposta correta mostrou recompensa existente (+36 XP/+18 moedas com evento
  semanal) e placa concluida; E depois nao reabriu nem repetiu recompensa.
- Dica/layout conferidos por screenshots em 1280x720, 1138x633 e 844x390;
  duas linhas corrigem corte de texto, offset em tela baixa separa dica da barra.
  Sem erros de console na verificacao. Portao parental permaneceu fechado;
  nenhuma autorizacao de multiplayer foi concedida para o teste.
- F9 valida a interacao na escolinha, NAO a viagem ou caminhada desde o foguete.
  Clique no controle touch pelo navegador NAO valida touch/pinca fisicos.

## Pendencias / dividas

- Copilot overview, comentarios inline, threads e CI do HEAD devem ser revisados
  antes de declarar pronto para merge; registrar disposicao de cada achado.
- Playtest fisico Lab 240 e visita/retomada das escolinhas no Redmi Pad 2 continuam
  pendentes. Nao ha ganho medido de FPS, retencao ou aprendizagem neste lab.
- Portao de multiplayer mostrou cabecalho cortado em 844x390. Defeito fora do
  escopo desta interacao; priorizar ajuste de modais em tela baixa no proximo lab,
  preservando protecao parental e sem autorizar multiplayer durante QA.
- World3D continua monolitico; somente selecao extraida para funcao testavel.

## Funcionalidades planejadas nao concluidas

- Nenhum item de codigo ficou sem implementacao. Revisao/CI e teste fisico nao
  devem ser contados como aprovados por esta validacao local.

## Proximo laboratorio recomendado

- Proposta: corrigir altura/scroll das modais em celular horizontal (UX 189/190),
  sobretudo o portao parental observado acima. Pergunta: a familia consegue ler,
  recusar e fechar o fluxo com todos os controles visiveis, sem remover seguranca?
- Em paralelo, coletar o playtest fisico dos Labs 240-242; nao adicionar novas
  arenas/recompensas antes de verificar a jornada existente com as criancas.

## Estado do repositorio

- Branch: lab-242-interacao-escolinhas-planetas. PR #125 draft nao alterada.
- Arquivos locais .github/copilot-instructions.md e .vscode/ nao incluidos.
- Em app/: npm run test, npm run lint, npm run build. Servidor de dev existente
  em http://127.0.0.1:5174/; F9 apenas em desenvolvimento.
