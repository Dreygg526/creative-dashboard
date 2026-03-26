import { useRef, useState, useCallback } from "react";

export function useAudio() {
  const [isAudioUnlocked, setIsAudioUnlocked] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const unlockedRef = useRef(false);

  const getCtx = () => {
    if (!audioCtxRef.current) {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      audioCtxRef.current = new AC();
    }
    return audioCtxRef.current;
  };

  const playBeep = useCallback((ctx: AudioContext) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = "sine";
    const t = ctx.currentTime;

    // Two-tone chime: pleasant and distinct
    osc.frequency.setValueAtTime(523, t);        // C5
    osc.frequency.setValueAtTime(659, t + 0.15); // E5

    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.4, t + 0.05);
    gain.gain.setValueAtTime(0.4, t + 0.15);
    gain.gain.linearRampToValueAtTime(0, t + 0.4);

    osc.start(t);
    osc.stop(t + 0.4);
  }, []);

  // Call this on the first user click — unlocks audio context
  const unlockAudio = useCallback(() => {
    if (unlockedRef.current) return;
    try {
      const ctx = getCtx();
      ctx.resume().then(() => {
        unlockedRef.current = true;
        setIsAudioUnlocked(true);
      });
    } catch (e) {
      console.warn("unlock failed", e);
    }
  }, []);

  // Call this to actually play the sound
  const playNotificationSound = useCallback(() => {
    try {
      const ctx = getCtx();
      const doPlay = () => playBeep(ctx);

      if (ctx.state === "suspended") {
        ctx.resume().then(doPlay);
      } else {
        doPlay();
      }

      unlockedRef.current = true;
      setIsAudioUnlocked(true);
    } catch (e) {
      console.warn("play failed", e);
    }
  }, [playBeep]);

  return { isAudioUnlocked, unlockAudio, playNotificationSound };
}