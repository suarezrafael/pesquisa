import { useEffect, useRef } from 'react'

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

    // Achado do review automático do Copilot: o trap de Tab acima só intercepta Tab quando o
    // foco JÁ está dentro do painel — um CLIQUE de mouse num elemento focável fora da raiz (ex.
    // o `<canvas>` do jogo, focável por padrão pelo Babylon.js) rouba o foco pra lá diretamente,
    // sem passar pelo trap nenhuma vez; a partir dali, o próximo Tab segue a ordem padrão do
    // documento e escapa do painel. Um listener de `focusin` pega esse caso (e qualquer outro
    // "foco pulou pra fora por fora do teclado") e devolve o foco pra raiz do painel
    // imediatamente.
    function handleFocusIn(e: FocusEvent) {
      if (!rootRef.current) return
      const target = e.target as Node | null
      if (target && !rootRef.current.contains(target)) {
        rootRef.current.focus()
      }
    }
    window.addEventListener('focusin', handleFocusIn)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('focusin', handleFocusIn)
      previouslyFocused?.focus()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return rootRef
}
