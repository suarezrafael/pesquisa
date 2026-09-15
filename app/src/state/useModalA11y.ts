import { useEffect, useRef } from 'react'

// Achado do review automático do Copilot: painéis pequenos (chat/ranking/mochila) podem ficar
// abertos AO MESMO TEMPO (estados independentes em `World3D.tsx`). Duas rodadas de tentativa de
// consertar isso com um listener de `focusin` POR INSTÂNCIA (uma pra cada painel) mostraram que a
// abordagem em si tem um problema estrutural: com N listeners independentes reagindo ao MESMO
// evento, quem "vence" e pra onde o foco vai depende só da ordem de registro, não de qual painel
// é o mais recente/visível — e um painel que acabou de abrir podia perder seu próprio foco inicial
// pro painel anterior antes mesmo de se registrar. A solução de verdade é UM ÚNICO listener
// compartilhado (não um por painel) mais uma PILHA ordenada (não um `Set`) de raízes montadas — o
// topo da pilha é sempre o painel mais recentemente aberto, e é ele (só ele) quem recupera o foco
// quando o alvo escapa de todos os painéis abertos.
const activeModalRoots: HTMLElement[] = []
let sharedFocusInListener: ((e: FocusEvent) => void) | null = null
// Achado do review automático do Copilot: o foco de "antes de qualquer painel abrir" só pode ser
// capturado quando a pilha está vazia (senão captura o painel de baixo, que pode fechar e sair do
// DOM antes do painel de cima) — guardado à parte de `previouslyFocused` (por instância) porque
// com painéis concorrentes fechando fora de ordem LIFO, o `previouslyFocused` de quem fecha por
// último não é o elemento certo pra restaurar (ver `registerModalRoot`/limpeza abaixo).
let stackOriginFocus: HTMLElement | null = null

function handleSharedFocusIn(e: FocusEvent) {
  const target = e.target as Node | null
  if (!target) return
  // Se o alvo já está dentro de QUALQUER painel aberto (não só o do topo), é uma troca de foco
  // legítima entre dois modais abertos ao mesmo tempo — ninguém precisa fazer nada.
  for (const root of activeModalRoots) {
    if (root.contains(target)) return
  }
  activeModalRoots[activeModalRoots.length - 1]?.focus()
}

function registerModalRoot(root: HTMLElement, previouslyFocused: HTMLElement | null) {
  // Achado do review automático do Copilot: só grava `stackOriginFocus` quando este é o PRIMEIRO
  // painel a abrir (pilha ainda vazia) — se já tem painel aberto, `previouslyFocused` desta
  // instância é o painel de baixo (que pode fechar antes deste), não o elemento de antes de
  // qualquer painel; sobrescrever aqui perderia o alvo de restauração certo.
  if (activeModalRoots.length === 0) {
    stackOriginFocus = previouslyFocused
  }
  activeModalRoots.push(root)
  if (!sharedFocusInListener) {
    sharedFocusInListener = handleSharedFocusIn
    window.addEventListener('focusin', sharedFocusInListener)
  }
}

function unregisterModalRoot(root: HTMLElement) {
  const index = activeModalRoots.indexOf(root)
  if (index !== -1) activeModalRoots.splice(index, 1)
  if (activeModalRoots.length === 0 && sharedFocusInListener) {
    window.removeEventListener('focusin', sharedFocusInListener)
    sharedFocusInListener = null
  }
}

// lab-121 (acessibilidade [SHOULD], docs/prompts/02-design-profissional.md §3): usado por todo
// painel/modal 2D do jogo. Três coisas de navegação por teclado que nenhum painel tinha: (1) Esc
// fecha, (2) o foco entra no painel ao abrir (sem isso, um usuário de teclado não tem indicação de
// onde o foco foi parar), (3) o foco volta pro elemento que abriu o painel ao fechar. O elemento
// raiz do painel precisa aplicar o `ref` devolvido e ter `tabIndex={-1}` (focável via script, não
// pela ordem normal de Tab).
export function useModalA11y(onClose: () => void) {
  const rootRef = useRef<HTMLDivElement>(null)
  // lab-150 (achado do review automático do Copilot no PR #8, nunca lido antes desta sessão): o
  // `useEffect` abaixo roda só uma vez (`[]`), então `handleKeyDown` fechava sobre o `onClose` da
  // PRIMEIRA renderização pra sempre — se o componente que usa este hook passar um `onClose` novo
  // (comum, já que geralmente é uma arrow function inline fechando sobre state/props atuais), Esc
  // continuava chamando a versão STALE. `onCloseRef` é atualizado em toda renderização (sem
  // precisar de efeito próprio pra isso) e lido de dentro do listener — mantém o listener
  // registrado só uma vez (comportamento de foco/registro inalterado), mas sempre chamando a
  // versão mais recente de `onClose`.
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null
    // Achado do review automático do Copilot: capturado numa variável local (não relido de
    // `rootRef.current` depois) — o React pode zerar `ref.current` de um nó sendo desmontado ANTES
    // da limpeza deste efeito rodar (comportamento documentado de `useEffect`), o que faria
    // `unregisterModalRoot(rootRef.current)` nunca achar o nó de verdade na pilha compartilhada.
    const root = rootRef.current
    // Achado do review automático do Copilot: registra a raiz na pilha compartilhada ANTES de
    // focar — se outro painel já estiver aberto quando este monta, focar a própria raiz primeiro
    // dispara um `focusin` síncrono cujo alvo (esta raiz nova) ainda não estaria na pilha
    // compartilhada; o listener do painel JÁ aberto trataria isso como "escape" e devolveria o
    // foco pra si mesmo, roubando o foco inicial do painel recém-aberto antes mesmo dele se
    // registrar.
    if (root) registerModalRoot(root, previouslyFocused)
    // Alguns painéis (ex. PairingScreen) já têm `autoFocus` num campo de formulário específico —
    // se o foco já está DENTRO do painel quando este efeito roda, não roubar de volta pro elemento
    // raiz; só move o foco quando nada dentro do painel já pegou o foco sozinho.
    if (!rootRef.current?.contains(document.activeElement)) {
      rootRef.current?.focus()
    }

    // Achado do review automático do Copilot: Esc fechava e o foco inicial entrava no painel, mas
    // nada impedia Tab de escapar PRA FORA dele enquanto aberto — um usuário de teclado conseguia
    // tabular direto pro resto da página/jogo por trás do painel, quebrando o isolamento que
    // `aria-modal`/`inert` (aplicados por quem usa este hook) prometem. Prende o foco dentro da
    // raiz do painel: Tab no ÚLTIMO elemento focável volta pro primeiro; Shift+Tab no PRIMEIRO vai
    // pro último — mesmo padrão de focus trap de diálogo modal.
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        // Achado do review automático do Copilot: cada instância registra seu PRÓPRIO listener
        // de `keydown` — com dois painéis montados ao mesmo tempo, um único Esc disparava os DOIS
        // `onClose`, fechando ambos de uma vez. Só a instância do TOPO da pilha (o painel mais
        // recentemente aberto) reage ao Esc; as instâncias mais abaixo na pilha ignoram, mesmo o
        // listener delas também tendo disparado pro mesmo evento.
        if (activeModalRoots[activeModalRoots.length - 1] !== rootRef.current) return
        onCloseRef.current()
        return
      }
      if (e.key !== 'Tab' || !rootRef.current) return
      const focusable = rootRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      // Achado do review automático do Copilot: quando nada dentro do painel tem `autoFocus`, o
      // foco inicial (efeito acima) cai na PRÓPRIA raiz (`tabIndex={-1}`) — que não entra em
      // `focusable` (excluída de propósito, já que `-1` não faz parte da ordem normal de Tab).
      // Sem tratar esse caso, Shift+Tab a partir da raiz não batia nem com `first` nem com `last`,
      // escapando do trap logo no PRIMEIRO Shift+Tab, antes mesmo do usuário ter tabulado uma vez.
      const onRoot = document.activeElement === rootRef.current
      if (e.shiftKey && (onRoot || document.activeElement === first)) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && (onRoot || document.activeElement === last)) {
        e.preventDefault()
        first.focus()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    // Achado do review automático do Copilot: o trap de Tab acima só intercepta Tab quando o foco
    // JÁ está dentro do painel — um CLIQUE de mouse num elemento focável fora da raiz (ex. o
    // `<canvas>` do jogo, focável por padrão pelo Babylon.js) rouba o foco pra lá diretamente, sem
    // passar pelo trap nenhuma vez; a partir dali, o próximo Tab segue a ordem padrão do documento
    // e escapa do painel. O listener COMPARTILHADO de `focusin` (registrado em
    // `registerModalRoot`, acima) pega esse caso — e qualquer outro "foco pulou pra fora por fora
    // do teclado" — devolvendo o foco pro painel do TOPO da pilha (o mais recentemente aberto).

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      if (root) unregisterModalRoot(root)
      // Achado do review automático do Copilot: com painéis concorrentes, o painel de BAIXO podia
      // fechar primeiro (fora da ordem LIFO natural) — restaurar `previouslyFocused` incondicional
      // roubava o foco do painel de CIMA (ainda aberto) de volta pro que veio antes de ambos. Se
      // ainda sobrar algum painel na pilha depois de remover este, o foco pertence a ele (o novo
      // topo).
      if (activeModalRoots.length > 0) {
        activeModalRoots[activeModalRoots.length - 1].focus()
        return
      }
      // Achado do review automático do Copilot (rodada 7): quando a pilha esvazia de verdade, o
      // elemento certo pra restaurar é o que tinha foco ANTES DO PRIMEIRO painel da pilha abrir
      // (`stackOriginFocus`) — não o `previouslyFocused` DESTA instância. Se este painel não foi o
      // primeiro a abrir (ex.: painel de baixo fechou primeiro, o de cima por último), o
      // `previouslyFocused` dele aponta pra raiz do painel de baixo, já removida do DOM nesse
      // ponto — `.focus()` num nó desconectado é um no-op, perdendo o foco de vez em vez de
      // devolver pro abridor original de toda a pilha.
      const originFocus = stackOriginFocus
      stackOriginFocus = null
      if (originFocus && document.contains(originFocus)) {
        originFocus.focus()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return rootRef
}
