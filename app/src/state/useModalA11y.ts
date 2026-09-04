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

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onCloseRef.current()
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
