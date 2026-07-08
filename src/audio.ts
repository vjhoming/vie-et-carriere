// 8-bit Web Audio API Sound Synthesizer for "Vie et Carrière 3D"
// Simple synth matching the sound design of retro games.

class SoundManager {
  private ctx: AudioContext | null = null;
  private isBgmPlaying = false;
  private masterGain: GainNode | null = null;
  private audioElement: HTMLAudioElement | null = null;
  private isMuted = false;
  private duckTimeout: any = null;

  private initCtx() {
    if (!this.audioElement) {
      this.audioElement = new Audio('./music.mp3');
      this.audioElement.loop = true;
      this.audioElement.volume = this.isMuted ? 0 : 0.4;
      this.audioElement.muted = this.isMuted;
    }

    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.connect(this.ctx.destination);
      
      if (this.isMuted) {
        this.masterGain.gain.value = 0;
      }
    }

    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(e => console.warn('Failed to resume audio context', e));
    }
  }

  toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.masterGain) {
      this.masterGain.gain.value = this.isMuted ? 0 : 1;
    }
    if (this.audioElement) {
      this.audioElement.muted = this.isMuted;
      this.audioElement.volume = this.isMuted ? 0 : 0.4;
      if (this.isMuted) {
        this.audioElement.pause();
      } else if (this.isBgmPlaying) {
        this.audioElement.play().catch(e => console.warn('BGM resume on unmute failed', e));
      }
    }
    return this.isMuted;
  }
  
  getIsMuted(): boolean {
      return this.isMuted;
  }

  private duckBGM() {
    if (!this.audioElement || this.isMuted || !this.isBgmPlaying) return;
    this.audioElement.volume = 0.15;
    if (this.duckTimeout) {
      window.clearTimeout(this.duckTimeout);
    }
    this.duckTimeout = window.setTimeout(() => {
      if (this.audioElement && !this.isMuted && this.isBgmPlaying) {
        this.audioElement.volume = 0.4;
      }
    }, 600);
  }

  startBGM() {
    try {
      this.initCtx();
      if (!this.audioElement) return;
      
      this.isBgmPlaying = true;
      
      if (this.isMuted) {
        this.audioElement.muted = true;
        this.audioElement.volume = 0;
        return;
      }
      
      this.audioElement.muted = false;
      this.audioElement.volume = 0.4;
      
      if (this.audioElement.paused) {
        this.audioElement.play().catch(e => {
          console.warn('BGM play failed, registering fallback', e);
          const playOnInteraction = () => {
            if (this.isBgmPlaying && !this.isMuted && this.audioElement && this.audioElement.paused) {
              this.audioElement.play().catch(p => console.warn('Fallback play failed', p));
            }
            window.removeEventListener('click', playOnInteraction);
            window.removeEventListener('touchstart', playOnInteraction);
          };
          window.addEventListener('click', playOnInteraction);
          window.addEventListener('touchstart', playOnInteraction);
        });
      }
    } catch (e) {
      console.warn('Audio BGM error', e);
    }
  }

  stopBGM() {
    this.isBgmPlaying = false;
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.currentTime = 0;
    }
  }

  playJump() {
    try {
      this.initCtx();
      this.duckBGM();
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(150, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(600, this.ctx.currentTime + 0.15);
      
      gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.15);
      
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.15);
    } catch (e) {
      console.warn('Audio error', e);
    }
  }

  playHit() {
    try {
      this.initCtx();
      this.duckBGM();
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(120, this.ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(40, this.ctx.currentTime + 0.3);
      
      gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.3);
      
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.3);
    } catch (e) {
      console.warn('Audio error', e);
    }
  }

  playCoin() {
    try {
      this.initCtx();
      this.duckBGM();
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, this.ctx.currentTime); // C5
      osc.frequency.setValueAtTime(659.25, this.ctx.currentTime + 0.08); // E5
      
      gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.25);
      
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.25);
    } catch (e) {
      console.warn('Audio error', e);
    }
  }

  playBébé() {
    try {
      this.initCtx();
      this.duckBGM();
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(400, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(800, this.ctx.currentTime + 0.2);
      osc.frequency.exponentialRampToValueAtTime(600, this.ctx.currentTime + 0.4);
      
      gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.5);
      
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.5);
    } catch (e) {
      console.warn('Audio error', e);
    }
  }

  playBeer() {
    try {
      this.initCtx();
      this.duckBGM();
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(180, this.ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(220, this.ctx.currentTime + 0.1);
      osc.frequency.linearRampToValueAtTime(150, this.ctx.currentTime + 0.2);
      
      gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.3);
      
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.3);
    } catch (e) {
      console.warn('Audio error', e);
    }
  }

  playShoot() {
    try {
      this.initCtx();
      this.duckBGM();
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(800, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.12);
      
      gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.12);
      
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.12);
    } catch (e) {
      console.warn('Audio error', e);
    }
  }

  playExplode() {
    try {
      this.initCtx();
      this.duckBGM();
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(100, this.ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(10, this.ctx.currentTime + 0.35);
      
      gain.gain.setValueAtTime(0.35, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.35);
      
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.35);
    } catch (e) {
      console.warn('Audio error', e);
    }
  }

  playBerserk() {
    try {
      this.initCtx();
      this.duckBGM();
      if (!this.ctx || !this.masterGain) return;
      
      const playTone = (freq: number, start: number, duration: number) => {
        if (!this.ctx || !this.masterGain) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.12, start);
        gain.gain.linearRampToValueAtTime(0, start + duration);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(start);
        osc.stop(start + duration);
      };

      const now = this.ctx.currentTime;
      playTone(330, now, 0.08);
      playTone(392, now + 0.08, 0.08);
      playTone(523, now + 0.16, 0.08);
      playTone(659, now + 0.24, 0.2);
    } catch (e) {
      console.warn('Audio error', e);
    }
  }

  playWin() {
    try {
      this.initCtx();
      this.stopBGM(); // stop music on win
      if (!this.ctx || !this.masterGain) return;
      
      const playTone = (freq: number, start: number, duration: number) => {
        if (!this.ctx || !this.masterGain) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.1, start);
        gain.gain.linearRampToValueAtTime(0, start + duration);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(start);
        osc.stop(start + duration);
      };

      const now = this.ctx.currentTime;
      playTone(523.25, now, 0.1); // C5
      playTone(587.33, now + 0.1, 0.1); // D5
      playTone(659.25, now + 0.2, 0.1); // E5
      playTone(783.99, now + 0.3, 0.3); // G5
    } catch (e) {
      console.warn('Audio error', e);
    }
  }

  playGameOver() {
    try {
      this.initCtx();
      this.stopBGM(); // stop music on game over
      if (!this.ctx || !this.masterGain) return;
      
      const playTone = (freq: number, start: number, duration: number) => {
        if (!this.ctx || !this.masterGain) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.15, start);
        gain.gain.linearRampToValueAtTime(0, start + duration);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(start);
        osc.stop(start + duration);
      };

      const now = this.ctx.currentTime;
      playTone(293.66, now, 0.2); // D4
      playTone(277.18, now + 0.2, 0.2); // C#4
      playTone(261.63, now + 0.4, 0.2); // C4
      playTone(220.00, now + 0.6, 0.5); // A3
    } catch (e) {
      console.warn('Audio error', e);
    }
  }
}

export const audio = new SoundManager();
