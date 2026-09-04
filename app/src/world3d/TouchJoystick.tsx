import { useRef, useState } from 'react'

interface TouchJoystickProps {
  onChange: (vector: { x: number; y: number }) => void
  // lab-152 (achado do review automático do Copilot no PR do portão parental): o joystick fica
  // FORA do container que `World3D.tsx` marca `inert` quando um modal abre — sem repassar `inert`
  // até aqui, arrastar o dedo nele continuava movendo o personagem por baixo de qualquer modal.
  inert?: boolean
}

const MAX_RADIUS = 42

export function TouchJoystick({ onChange, inert }: TouchJoystickProps) {
  const baseRef = useRef<HTMLDivElement>(null)
  const activePointerId = useRef<number | null>(null)
  const [knob, setKnob] = useState({ x: 0, y: 0 })

  function updateFromPointer(clientX: number, clientY: number) {
    const base = baseRef.current
    if (!base) return
    const rect = base.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    let dx = clientX - centerX
    let dy = clientY - centerY
    const distance = Math.hypot(dx, dy)
    if (distance > MAX_RADIUS) {
      dx = (dx / distance) * MAX_RADIUS
      dy = (dy / distance) * MAX_RADIUS
    }
    setKnob({ x: dx, y: dy })
    onChange({ x: dx / MAX_RADIUS, y: dy / MAX_RADIUS })
  }

  function handlePointerDown(e: React.PointerEvent) {
    activePointerId.current = e.pointerId
    e.currentTarget.setPointerCapture(e.pointerId)
    updateFromPointer(e.clientX, e.clientY)
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (activePointerId.current !== e.pointerId) return
    updateFromPointer(e.clientX, e.clientY)
  }

  function handlePointerUp(e: React.PointerEvent) {
    if (activePointerId.current !== e.pointerId) return
    activePointerId.current = null
    setKnob({ x: 0, y: 0 })
    onChange({ x: 0, y: 0 })
  }

  return (
    <div
      ref={baseRef}
      className="joystick-base"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      inert={inert}
    >
      <div
        className="joystick-knob"
        style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }}
      />
    </div>
  )
}
