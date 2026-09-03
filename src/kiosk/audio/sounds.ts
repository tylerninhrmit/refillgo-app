let ctx: AudioContext | null = null;

export function unlockAudio() {
  try {
    ctx = ctx ?? new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    if (ctx.state === 'suspended') void ctx.resume();
  } catch {
    ctx = null;
  }
}

function tone(freq: number, dur: number, type: OscillatorType, gain = 0.18, when = 0) {
  if (!ctx) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, ctx.currentTime + when);
  g.gain.exponentialRampToValueAtTime(gain, ctx.currentTime + when + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + when + dur);
  o.connect(g).connect(ctx.destination);
  o.start(ctx.currentTime + when);
  o.stop(ctx.currentTime + when + dur + 0.05);
}

export function ding() {
  tone(880, 0.18, 'sine');
  tone(1320, 0.28, 'sine', 0.14, 0.09);
}

export function bonk() {
  tone(220, 0.22, 'square', 0.12);
  tone(160, 0.3, 'square', 0.1, 0.12);
}

export function chime() {
  tone(660, 0.15, 'sine');
  tone(880, 0.15, 'sine', 0.16, 0.12);
  tone(1100, 0.3, 'sine', 0.14, 0.24);
}
