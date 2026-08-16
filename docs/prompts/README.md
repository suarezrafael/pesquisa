# Prompts de Engenharia — Segurança, Design, Arquitetura e Clean Code

Esta pasta contém um conjunto de documentos de referência para **instruir uma IA (ou pessoa) que for
programar o jogo** descrito em `prompt.md`. Enquanto `prompt.md` define *o quê* construir (produto,
mercado, monetização) e `labs/` controla *quando* cada pedaço é construído (escopo por iteração), os
arquivos aqui definem *como* construir com qualidade: os critérios não-negociáveis de segurança,
design profissional, arquitetura e manutenibilidade que se aplicam a **todo** laboratório, não a um
específico.

## Arquivos

1. **[01-seguranca.md](./01-seguranca.md)** — segurança técnica (OWASP, auth, dados) e segurança
   infantil (compliance, moderação, parental gate). Não-negociável dado o público-alvo (crianças).
2. **[02-design-profissional.md](./02-design-profissional.md)** — critérios de design de jogo e UI/UX
   profissional: acessibilidade, game feel, design system, performance percebida, áudio.
3. **[03-arquitetura-sistema.md](./03-arquitetura-sistema.md)** — arquitetura técnica: camadas,
   módulos, contratos de API, dados, tempo real, observabilidade — para as stacks descritas em
   `prompt.md` seção 7.
4. **[04-manutencao-clean-code.md](./04-manutencao-clean-code.md)** — clean code, testes, estrutura de
   pastas, convenções de commit/review, dívida técnica — como manter o código fácil de dar
   manutenção conforme o jogo cresce.

## Como usar

### Como prompt de sistema / instrução para IA
Cole o conteúdo do arquivo relevante (ou todos) no início de uma sessão de programação para fixar os
critérios de qualidade antes de gerar código. Os quatro documentos foram escritos para funcionar como
**checklist de aceite**: qualquer código gerado para este projeto deve satisfazer os itens marcados
como obrigatórios em cada um.

### Durante um laboratório
Ao abrir um novo `labs/lab-NN-slug/FEATURES.md`, revise se as funcionalidades planejadas tocam algum
critério destes documentos (ex.: uma feature de chat aciona `01-seguranca.md` seção sobre moderação).
Ao fechar o laboratório em `CONTEXT.md`, registre desvios conscientes desses critérios como dívida
técnica explícita — não como omissão silenciosa.

### Prompt operacional resumido
Para colar diretamente numa sessão de IA de programação:

> "Antes de gerar ou revisar qualquer código deste projeto, aplique os critérios de
> `docs/prompts/01-seguranca.md`, `02-design-profissional.md`, `03-arquitetura-sistema.md` e
> `04-manutencao-clean-code.md`. O público-alvo são crianças de ~10 anos — trate os critérios de
> segurança infantil e privacidade como obrigatórios, não como sugestão. Para qualquer decisão de
> stack, siga a Opção A, B ou C descrita em `prompt.md` seção 7, conforme o que já estiver em uso no
> laboratório atual (`labs/CURRENT.md`)."

## Escopo e limites

Estes documentos são **agnósticos da stack específica** onde possível (princípios), mas dão exemplos
concretos para as três opções de stack de `prompt.md` seção 7 (React/Phaser/Supabase;
PlayCanvas-Babylon/Firebase; ASP.NET Core/Azure) onde a stack importa. Se o laboratório atual escolher
uma stack diferente das três, adapte os exemplos mas mantenha os princípios.
