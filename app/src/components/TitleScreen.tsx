interface TitleScreenProps {
  onPlay: () => void
}

export function TitleScreen({ onPlay }: TitleScreenProps) {
  return (
    <div className="screen title-screen">
      <div className="title-planet">🪐</div>
      <h1>Missão Aprender</h1>
      <p className="subtitle">
        Um mini-planeta cheio de missões escondidas! Caminhe pela superfície, encontre as
        escolinhas com o professor na porta e resolva desafios de lógica, matemática e leitura
        pra ganhar moedas e badges.
      </p>
      <button type="button" className="primary-button" onClick={onPlay}>
        Jogar 🚀
      </button>
    </div>
  )
}
