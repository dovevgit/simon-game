import type { ColorId } from '../game/colors.ts';

// Pitches inspired by the original Simon device; clearly distinct from each other.
export const TONE_FREQUENCIES: Record<ColorId, number> = {
  green: 415,
  red: 310,
  yellow: 252,
  blue: 209,
};

const ATTACK_S = 0.01;
const RELEASE_S = 0.04;
const TONE_GAIN = 0.3;

const WIN_NOTES = [523.25, 659.25, 783.99, 1046.5]; // C5 E5 G5 C6
const WIN_NOTE_S = 0.12;
const WIN_LAST_NOTE_S = 0.4;
const LOSS_NOTES = [196, 147];
const LOSS_NOTE_S = 0.4;
const LOSS_GAIN = 0.18;

type Voice = {
  oscillator: OscillatorNode;
  gain: GainNode;
};

let context: AudioContext | null = null;
const activeVoices = new Set<Voice>();

type AudioContextConstructor = typeof AudioContext;

function getAudioContextConstructor(): AudioContextConstructor | undefined {
  const legacy = (window as unknown as { webkitAudioContext?: AudioContextConstructor })
    .webkitAudioContext;
  return window.AudioContext ?? legacy;
}

// Must be called from a user gesture. Rejects when sound cannot be enabled,
// so the game never starts a silent sequence.
export async function unlock(): Promise<void> {
  const AudioContextCtor = getAudioContextConstructor();
  if (!AudioContextCtor) throw new Error('Web Audio API is not supported');
  if (!context) context = new AudioContextCtor();
  if (context.state !== 'running') await context.resume();
  if (context.state !== 'running') throw new Error(`AudioContext is ${context.state}`);
}

function runningContext(): AudioContext | null {
  return context && context.state === 'running' ? context : null;
}

function createVoice(
  ctx: AudioContext,
  frequency: number,
  type: OscillatorType,
  peak: number,
  startAt: number,
): Voice {
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = type;
  oscillator.frequency.value = frequency;
  // Short envelope prevents clicks at the start and end of each note.
  gain.gain.setValueAtTime(0, startAt);
  gain.gain.linearRampToValueAtTime(peak, startAt + ATTACK_S);
  oscillator.connect(gain);
  gain.connect(ctx.destination);
  oscillator.start(startAt);

  const voice: Voice = { oscillator, gain };
  activeVoices.add(voice);
  oscillator.onended = () => {
    oscillator.disconnect();
    gain.disconnect();
    activeVoices.delete(voice);
  };
  return voice;
}

function releaseVoice(ctx: AudioContext, voice: Voice, at = ctx.currentTime) {
  const param = voice.gain.gain;
  param.cancelScheduledValues(at);
  param.setValueAtTime(param.value, at);
  param.linearRampToValueAtTime(0, at + RELEASE_S);
  try {
    voice.oscillator.stop(at + RELEASE_S);
  } catch {
    // Already stopped.
  }
}

function playNotes(
  notes: readonly number[],
  type: OscillatorType,
  peak: number,
  durationFor: (index: number) => number,
) {
  const ctx = runningContext();
  if (!ctx) return;
  let startAt = ctx.currentTime;
  notes.forEach((frequency, index) => {
    const duration = durationFor(index);
    const voice = createVoice(ctx, frequency, type, peak, startAt);
    const endAt = startAt + duration;
    voice.gain.gain.setValueAtTime(peak, endAt - RELEASE_S);
    voice.gain.gain.linearRampToValueAtTime(0, endAt);
    voice.oscillator.stop(endAt);
    startAt = endAt;
  });
}

let currentTone: Voice | null = null;

// Starts a sustained tone for a color and returns a function that stops this tone only.
// Only one color tone sounds at a time.
export function startTone(color: ColorId): () => void {
  const ctx = runningContext();
  if (!ctx) return () => {};
  if (currentTone) releaseVoice(ctx, currentTone);

  const voice = createVoice(ctx, TONE_FREQUENCIES[color], 'triangle', TONE_GAIN, ctx.currentTime);
  currentTone = voice;
  return () => {
    if (currentTone !== voice) return;
    currentTone = null;
    releaseVoice(ctx, voice);
  };
}

export function playWin() {
  playNotes(WIN_NOTES, 'triangle', TONE_GAIN, (index) =>
    index === WIN_NOTES.length - 1 ? WIN_LAST_NOTE_S : WIN_NOTE_S,
  );
}

export function playLoss() {
  playNotes(LOSS_NOTES, 'sawtooth', LOSS_GAIN, () => LOSS_NOTE_S);
}

// Silences every tone and motif immediately.
export function stopAll() {
  currentTone = null;
  if (!context) return;
  const ctx = context;
  activeVoices.forEach((voice) => releaseVoice(ctx, voice));
}
