interface TouchActionButtonProps {
  className: string
  label: string
  // Pulo é um evento (dispara uma vez ao tocar); correr é um estado (fica "ligado" enquanto o
  // dedo segura) — por isso `onPress` (sempre chamado ao tocar) e `onRelease` (opcional, só os
  // botões do tipo "segurar" precisam).
  onPress: () => void
  onRelease?: () => void
}

export function TouchActionButton({ className, label, onPress, onRelease }: TouchActionButtonProps) {
  function handlePointerDown(e: React.PointerEvent) {
    e.currentTarget.setPointerCapture(e.pointerId)
    onPress()
  }

  function handlePointerUp() {
    onRelease?.()
  }

  // lab-150 (2º achado do review automático do Copilot, mesmo PR): virar `<button>` dá foco/role
  // de graça, mas Enter/Espaço disparam evento de TECLADO (`keydown`/`keyup`), não `pointer*` —
  // sem isso, o botão continuava inutilizável via teclado apesar da semântica correta. `e.repeat`
  // evita que o auto-repeat do sistema operacional (segurar a tecla) chame `onPress` de novo a
  // cada repetição — só a primeira pressionada conta, mesmo comportamento de `handlePointerDown`
  // (chamado uma vez só ao tocar, não a cada frame que o dedo continua em cima do botão).
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.repeat) return
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault() // Espaço rolaria a página senão
      onPress()
    }
  }

  function handleKeyUp(e: React.KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') onRelease?.()
  }

  // lab-150 (achado do review automático do Copilot nos PRs #2 e #5, nunca lido antes desta
  // sessão): era um `<div>` clicável — sem role/foco/teclado, um leitor de tela não anuncia isso
  // como um botão de verdade. `<button type="button">` dá semântica correta de graça (o CSS já
  // reseta os estilos padrão de botão nativo, ver `.touch-action-button` em `index.css`).
  return (
    <button
      type="button"
      className={`touch-action-button ${className}`}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
    >
      {label}
    </button>
  )
}
