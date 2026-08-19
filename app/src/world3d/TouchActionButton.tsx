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

  return (
    <div
      className={`touch-action-button ${className}`}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {label}
    </div>
  )
}
