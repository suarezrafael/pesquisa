// Áudio ambiente sintetizado via Web Audio API — sem depender de nenhum arquivo baixado
// (evita qualquer questão de licença/tamanho): vento (ruído filtrado com rajadas), uma
// melodia curta estilo chiptune de fundo, e som de passo sintetizado sob demanda.

let audioCtx: AudioContext | null = null
let started = false
let muted = false

const WIND_VOLUME = 0.05
const MUSIC_VOLUME = 0.05

interface Note {
  freq: number
  dur: number
}

// Melodinha alegre e curta em dó maior, no espírito "8-bit de joguinho casual" — repete em loop.
const MELODY: Note[] = [
  { freq: 523.25, dur: 0.22 }, // C5
  { freq: 659.25, dur: 0.22 }, // E5
  { freq: 783.99, dur: 0.22 }, // G5
  { freq: 659.25, dur: 0.22 }, // E5
  { freq: 698.46, dur: 0.22 }, // F5
  { freq: 880.0, dur: 0.22 }, // A5
  { freq: 783.99, dur: 0.44 }, // G5 (mais longa)
  { freq: 659.25, dur: 0.22 }, // E5
  { freq: 587.33, dur: 0.22 }, // D5
  { freq: 698.46, dur: 0.22 }, // F5
  { freq: 659.25, dur: 0.22 }, // E5
  { freq: 523.25, dur: 0.44 }, // C5 (mais longa)
]

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

  const windGain = ctx.createGain()
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

  // Trilha: melodia chiptune (onda quadrada + baixo em triângulo), com um filtro passa-baixa
  // suave pra tirar o excesso de aspereza do 8-bit puro.
  const musicFilter = ctx.createBiquadFilter()
  musicFilter.type = 'lowpass'
  musicFilter.frequency.value = 3200
  const musicGain = ctx.createGain()
  musicGain.gain.value = MUSIC_VOLUME
  musicFilter.connect(musicGain)
  musicGain.connect(ctx.destination)

  let noteIndex = 0
  function playNote() {
    if (!audioCtx) return
    const note = MELODY[noteIndex % MELODY.length]
    const now = audioCtx.currentTime

    const osc = audioCtx.createOscillator()
    osc.type = 'square'
    osc.frequency.value = note.freq
    const noteGain = audioCtx.createGain()
    noteGain.gain.setValueAtTime(0, now)
    noteGain.gain.linearRampToValueAtTime(1, now + 0.015)
    noteGain.gain.linearRampToValueAtTime(0, now + note.dur * 0.9)
    osc.connect(noteGain).connect(musicFilter)
    osc.start(now)
    osc.stop(now + note.dur)

    if (noteIndex % MELODY.length === 0) {
      const bass = audioCtx.createOscillator()
      bass.type = 'triangle'
      bass.frequency.value = 130.81 // C3
      const bassGain = audioCtx.createGain()
      bassGain.gain.setValueAtTime(0, now)
      bassGain.gain.linearRampToValueAtTime(0.8, now + 0.02)
      bassGain.gain.linearRampToValueAtTime(0, now + 0.9)
      bass.connect(bassGain).connect(musicFilter)
      bass.start(now)
      bass.stop(now + 1)
    }

    noteIndex++
    window.setTimeout(playNote, note.dur * 1000)
  }
  playNote()
}

export function playFootstep(): void {
  if (!audioCtx || muted) return
  const ctx = audioCtx
  const now = ctx.currentTime
  const bufferSize = Math.floor(ctx.sampleRate * 0.08)
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize)
  }
  const src = ctx.createBufferSource()
  src.buffer = buffer
  const filter = ctx.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = 900
  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0.09, now)
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08)
  src.connect(filter).connect(gain).connect(ctx.destination)
  src.start(now)
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
