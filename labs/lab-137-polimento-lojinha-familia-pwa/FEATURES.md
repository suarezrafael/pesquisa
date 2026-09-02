# Laboratório 137 — Polimento da lojinha de avatar, link /família e cache do PWA

Status: concluído
Início: 2026-09-01
Fim: 2026-09-01
Commit inicial: cf1621c2071c8f88dcc6154d5e68f3f07e497158

## Objetivo do laboratório

Fechar os 4 itens de backlog reportados na sequência do lab-133 (`labs/CURRENT.md`, "Backlog novo
reportado pelo usuário nesta sessão"), ainda não formalizados em lab próprio.

## Funcionalidades planejadas
- [x] Câmera da lojinha de avatar: investigar se o arrastar-pra-girar (lab-118) regrediu; avatar
  reportado como "escuro" na lojinha — mais luz se confirmado. (sem regressão na câmera; luz
  corrigida com IBL/`environmentTexture`)
- [x] Mais roupas texturizadas / mais opções na lojinha de avatar (expandir
  `data/customization.ts`, reaproveitando os `style`s do lab-122).
- [x] Link de acesso ao painel `/familia` de dentro do jogo, quando o perfil já está pareado
  (entitlement ativo).
- [x] Cache do PWA (service worker) desatualizado em produção (achado colateral do lab-134) —
  configurar atualização automática em vez de exigir limpeza manual.

## Fora de escopo (explicitamente adiado)
- Qualquer item de backlog além destes 4.
