let audioContext = null;

function getContext() {
  const AudioCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtor) return null;
  if (!audioContext) audioContext = new AudioCtor();
  return audioContext;
}

// Browsers block audio until a user gesture happens; call this once on the
// first click anywhere in the app so the alarm can play later, unattended.
export function unlockAudio() {
  const ctx = getContext();
  if (ctx && ctx.state === "suspended") ctx.resume();
}

export function playAlarm() {
  const ctx = getContext();
  if (!ctx) return;
  if (ctx.state === "suspended") ctx.resume();

  const now = ctx.currentTime;
  [0, 0.28].forEach((offset) => {
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = "square";
    oscillator.frequency.value = 880;
    gain.gain.setValueAtTime(0.0001, now + offset);
    gain.gain.exponentialRampToValueAtTime(0.2, now + offset + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.2);
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start(now + offset);
    oscillator.stop(now + offset + 0.22);
  });
}
