import { useRef, useState } from "react";

export function useAudio() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const [isAudioUnlocked, setIsAudioUnlocked] = useState(false);

  const playNotificationSound = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!audioContextRef.current) audioContextRef.current = new AudioContextClass();
      const ctx = audioContextRef.current;
      if (ctx?.state === "suspended") ctx.resume();
      if (!ctx) return;

      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.type = "sine";
      const now = ctx.currentTime;
      oscillator.frequency.setValueAtTime(880, now);
      oscillator.frequency.exponentialRampToValueAtTime(1320, now + 0.1);
      oscillator.frequency.exponentialRampToValueAtTime(880, now + 0.2);
      oscillator.frequency.exponentialRampToValueAtTime(1100, now + 0.4);
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.3, now + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
      oscillator.start(now);
      oscillator.stop(now + 0.5);
      setIsAudioUnlocked(true);
    } catch (e) {
      console.warn("Audio play failed.", e);
    }
  };

  return { isAudioUnlocked, playNotificationSound };
}