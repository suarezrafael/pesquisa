// Áudio ambiente sintetizado via Web Audio API — sem depender de nenhum arquivo baixado
// (evita qualquer questão de licença/tamanho) — vento (ruído filtrado com rajadas) + uma
// trilha suave de fundo (acorde longo com osciladores levemente detunados).

let audioCtx: AudioContext | null = null
let windGain: GainNode | null = null
let musicGain: GainNode | null = null
let started = false
let muted = false

const WIND_VOLUME = 0.05
const MUSIC_VOLUME = 0.045

export function startAmbience(): void {
  if (started) return
  started = true

  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
  if (!AudioContextClass) return
  const ctx = new AudioContextClass()
  audioCtx = ctx

  // Vento: ruído "marrom" (mais grave/suave que ruído branco puro) passado por um filtro
  // passa-faixa, com uma rajada lenta (LFO) modulando o volume pra não ficar um som constante.
  const bufferSize = ctx.sampleRate * 2
  const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
  const data = noiseBuffer.getChannelData(0)
  let last = 0
  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1
    last = (last + 0.02 * white) / 1.02
    data[i] = last * 3.2
  }
  const noiseSource = ctx.createBufferSource()
  noiseSource.buffer = noiseBuffer
  noiseSource.loop = true

  const windFilter = ctx.createBiquadFilter()
  windFilter.type = 'bandpass'
  windFilter.frequency.value = 480
  windFilter.Q.value = 0.6

  windGain = ctx.createGain()
  windGain.gain.value = WIND_VOLUME
  noiseSource.connect(windFilter).connect(windGain).connect(ctx.destination)
  noiseSource.start()

  const gustLfo = ctx.createOscillator()
  gustLfo.frequency.value = 0.06
  const gustLfoGain = ctx.createGain()
  gustLfoGain.gain.value = WIND_VOLUME * 0.5
  gustLfo.connect(gustLfoGain)
  gustLfoGain.connect(windGain.gain)
  gustLfo.start()

  // Trilha ambiente: acorde suave (A3, C#4, E4, A4) com vibrato bem leve por nota,
  // pra não soar estático — volume baixo, de fundo, nunca competindo com os efeitos do jogo.
  musicGain = ctx.createGain()
  musicGain.gain.value = 0
  musicGain.connect(ctx.destination)
  musicGain.gain.linearRampToValueAtTime(MUSIC_VOLUME, ctx.currentTime + 3)

  const notes = [220, 277.18, 329.63, 440]
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.value = freq
    const oscGain = ctx.createGain()
    oscGain.gain.value = 0.5
    osc.connect(oscGain).connect(musicGain!)
    osc.start()

    const vibrato = ctx.createOscillator()
    vibrato.frequency.value = 0.08 + i * 0.02
    const vibratoGain = ctx.createGain()
    vibratoGain.gain.value = 1.2
    vibrato.connect(vibratoGain)
    vibratoGain.connect(osc.frequency)
    vibrato.start()
  })
}

export function toggleMute(): boolean {
  muted = !muted
  if (audioCtx) {
    if (muted) audioCtx.suspend()
    else audioCtx.resume()
  }
  return muted
}

export function isMuted(): boolean {
  return muted
}
