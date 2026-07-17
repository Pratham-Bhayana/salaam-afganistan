/** Short chime via Web Audio — no asset file required. */
let sharedCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AC =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  if (!sharedCtx) sharedCtx = new AC();
  return sharedCtx;
}

/** Unlock audio on first user gesture (browsers block autoplay until then). */
export function unlockNotificationAudio() {
  const ctx = getCtx();
  if (!ctx) return;
  if (ctx.state === "suspended") {
    void ctx.resume();
  }
}

export function playNotificationSound() {
  try {
    const ctx = getCtx();
    if (!ctx) return;

    const start = () => {
      const now = ctx.currentTime;

      const master = ctx.createGain();
      master.gain.setValueAtTime(0.0001, now);
      master.gain.exponentialRampToValueAtTime(0.22, now + 0.02);
      master.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);
      master.connect(ctx.destination);

      // Two-tone soft alert
      const tones = [
        { freq: 880, at: 0 },
        { freq: 1174.7, at: 0.12 },
      ];

      for (const tone of tones) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(tone.freq, now + tone.at);
        gain.gain.setValueAtTime(0.0001, now + tone.at);
        gain.gain.exponentialRampToValueAtTime(0.9, now + tone.at + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + tone.at + 0.28);
        osc.connect(gain);
        gain.connect(master);
        osc.start(now + tone.at);
        osc.stop(now + tone.at + 0.32);
      }
    };

    if (ctx.state === "suspended") {
      void ctx.resume().then(start).catch(() => undefined);
    } else {
      start();
    }
  } catch {
    /* ignore audio failures */
  }
}
