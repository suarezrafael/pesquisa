import { useEffect, useRef } from 'react'

// lab-121 (acessibilidade [SHOULD], docs/prompts/02-design-profissional.md §3): usado por todo
// painel/modal 2D do jogo. Três coisas de navegação por teclado que nenhum painel tinha: (1) Esc
// fecha, (2) o foco entra no painel ao abrir (sem isso, um usuário de teclado não tem indicação de
// onde o foco foi parar), (3) o foco volta pro elemento que abriu o painel ao fechar. O elemento
// raiz do painel precisa aplicar o `ref` devolvido e ter `tabIndex={-1}` (focável via script, não
// pela ordem normal de Tab).
export function useModalA11y(onClose: () => void) {
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null
    // Alguns painéis (ex. PairingScreen) já têm `autoFocus` num campo de formulário específico —
    // se o foco já está DENTRO do painel quando este efeito roda, não roubar de volta pro elemento
    // raiz; só move o foco quando nada dentro do painel já pegou o foco sozinho.
    if (!rootRef.current?.contains(document.activeElement)) {
      rootRef.current?.focus()
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      previouslyFocused?.focus()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return rootRef
}
