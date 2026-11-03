/**
 * sound-notifications.ts
 * Centralized audio & prominent visual notification system for Aram Creations.
 * Synthesizes luxury audio chimes via Web Audio API (zero external assets needed)
 * and dispatches global notification events for operations.
 */

// Safe Web Audio API Singleton
let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  try {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      void audioCtx.resume();
    }
    return audioCtx;
  } catch {
    return null;
  }
}

/**
 * Plays a warm, 2-note luxury success chime.
 * Tone: C5 (523.25 Hz) -> E5 (659.25 Hz) with gentle exponential decay.
 */
export function playSuccessChime() {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;

    // Note 1 (C5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(523.25, now);
    gain1.gain.setValueAtTime(0.06, now);
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);
    osc1.connect(gain1).connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.28);

    // Note 2 (E5) - slightly higher, luxury resonance
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(659.25, now + 0.12);
    gain2.gain.setValueAtTime(0.07, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);
    osc2.connect(gain2).connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.55);
  } catch {
    // Fail silently if browser blocks autoplay audio
  }
}

/**
 * Plays an alert/error sound (low subtle double-pulse).
 */
export function playErrorChime() {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.setValueAtTime(260, now + 0.12);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.35);
  } catch {}
}

export type NotificationPayload = {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  message: string;
  duration?: number;
};

/**
 * Dispatches a prominent visual notification with audio feedback.
 */
export function notifyOperationSuccess(title: string, message: string, duration: number = 4500) {
  playSuccessChime();
  if (typeof window !== 'undefined') {
    const detail: NotificationPayload = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      type: 'success',
      title,
      message,
      duration
    };
    window.dispatchEvent(new CustomEvent('aram-notification', { detail }));
  }
}

export function notifyOperationError(title: string, message: string, duration: number = 6000) {
  playErrorChime();
  if (typeof window !== 'undefined') {
    const detail: NotificationPayload = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      type: 'error',
      title,
      message,
      duration
    };
    window.dispatchEvent(new CustomEvent('aram-notification', { detail }));
  }
}

export function notifyOperationInfo(title: string, message: string, duration: number = 4000) {
  playSuccessChime();
  if (typeof window !== 'undefined') {
    const detail: NotificationPayload = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      type: 'info',
      title,
      message,
      duration
    };
    window.dispatchEvent(new CustomEvent('aram-notification', { detail }));
  }
}

