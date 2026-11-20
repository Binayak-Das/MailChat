let lastSoundPlayedAt = 0;

// Authentic WhatsApp incoming message notification tone generator
export const playWhatsAppNotificationSound = () => {
  const audioEnabled = localStorage.getItem('mailchat_pref_audio_alerts') !== 'false';
  if (!audioEnabled) return;

  // Debounce rapid duplicate triggers within 250ms
  const nowMs = Date.now();
  if (nowMs - lastSoundPlayedAt < 250) return;
  lastSoundPlayedAt = nowMs;

  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    const playMarimbaPulse = (freq, startTime, duration, volume) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      const overtone = ctx.createOscillator();
      const overtoneGain = ctx.createGain();
      overtone.type = 'triangle';
      overtone.frequency.setValueAtTime(freq * 2, startTime);

      gain.gain.setValueAtTime(volume, startTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

      overtoneGain.gain.setValueAtTime(volume * 0.35, startTime);
      overtoneGain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration * 0.6);

      osc.connect(gain);
      overtone.connect(overtoneGain);
      gain.connect(ctx.destination);
      overtoneGain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + duration);
      overtone.start(startTime);
      overtone.stop(startTime + duration);
    };

    const triggerTone = () => {
      const now = ctx.currentTime;
      // WhatsApp iconic 2-note marimba chime:
      // First strike: G5 (784 Hz)
      playMarimbaPulse(784, now, 0.08, 0.28);
      // Second strike: C6 (1046.5 Hz)
      playMarimbaPulse(1046.5, now + 0.075, 0.24, 0.35);

      setTimeout(() => {
        ctx.close().catch(() => { });
      }, 1000);
    };

    if (ctx.state === 'suspended') {
      ctx.resume().then(triggerTone).catch(triggerTone);
    } else {
      triggerTone();
    }
  } catch (err) {
    console.warn('Audio alert error:', err);
  }
};

export default playWhatsAppNotificationSound;
