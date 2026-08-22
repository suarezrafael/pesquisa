interface WeaponBagPanelProps {
  hasSword: boolean
  hasGun: boolean
  selected: 'sword' | 'gun' | null
  onSelect: (weapon: 'sword' | 'gun') => void
  onClose: () => void
}

const WEAPON_INFO: Record<'sword' | 'gun', { emoji: string; name: string; hint: string }> = {
  sword: {
    emoji: '🗡️',
    name: 'Espada',
    hint: 'Pressione E perto de um ET em Marte pra nocauteá-lo.',
  },
  gun: {
    emoji: '🔫',
    name: 'Arma a Laser',
    hint: 'Pressione E perto de um robô em Marte pra nocauteá-lo.',
  },
}

// Mochila (lab-63, pedido do usuário: "se eu peguei ambas o boneco deve ter uma bolsa virtual em
// que voce ve o item e pode selecionar navegando no painel e clicando") — mostra só os itens já
// coletados. Selecionar aqui troca qual arma fica visível na mão do boneco e qual delas o "E"
// livre (fora de combate) usa, desde o lab-76 — a regra de COMBATE EM MARTE (espada vs. ET, arma
// vs. robô) continua automática por tipo de inimigo desde o lab-61, não depende dessa seleção.
export function WeaponBagPanel({ hasSword, hasGun, selected, onSelect, onClose }: WeaponBagPanelProps) {
  const items: Array<'sword' | 'gun'> = []
  if (hasSword) items.push('sword')
  if (hasGun) items.push('gun')

  return (
    <div className="chat-panel bag-panel">
      <div className="chat-panel-header">
        <span>🎒 Mochila</span>
        <button type="button" className="modal-close" onClick={onClose} aria-label="Fechar mochila">
          ×
        </button>
      </div>

      <div className="bag-panel-items">
        {items.map((weapon) => {
          const info = WEAPON_INFO[weapon]
          return (
            <button
              key={weapon}
              type="button"
              className={`bag-item${selected === weapon ? ' bag-item-selected' : ''}`}
              onClick={() => onSelect(weapon)}
            >
              <span className="bag-item-emoji">{info.emoji}</span>
              <span className="bag-item-name">{info.name}</span>
            </button>
          )
        })}
      </div>

      {selected && <p className="bag-item-hint">{WEAPON_INFO[selected].hint}</p>}
      {items.length === 0 && <p className="chat-empty">Nenhum item ainda — explore a Terra pra achar a espada e a arma.</p>}
    </div>
  )
}
