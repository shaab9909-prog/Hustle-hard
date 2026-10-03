// Web Audio Synthesizer (Chimes, Rain, Noise, Alpha Waves)
class AudioEngine {
  constructor() {
    this.ctx = null;
    this.noiseNode = null;
    this.gainNode = null;
    this.binauralOsc1 = null;
    this.binauralOsc2 = null;
    this.binauralGain = null;
    this.currentAmbientType = 'off';
  }

  init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playChime() {
    this.init();
    const now = this.ctx.currentTime;
    const freqs = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6 chord
    freqs.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.12);

      gain.gain.setValueAtTime(0, now + idx * 0.12);
      gain.gain.linearRampToValueAtTime(0.18, now + idx * 0.12 + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.12 + 1.8);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now + idx * 0.12);
      osc.stop(now + idx * 0.12 + 2.0);
    });
  }

  setAmbient(type, volume = 0.3) {
    this.init();
    this.stopAmbient();
    if (type === 'off') {
      this.currentAmbientType = 'off';
      return;
    }

    this.currentAmbientType = type;
    const bufferSize = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    if (type === 'rain' || type === 'brown') {
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        data[i] = (lastOut + (0.02 * white)) / 1.02;
        lastOut = data[i];
        data[i] *= 3.5;
      }
    } else if (type === 'white') {
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
    }

    if (type === 'rain' || type === 'brown' || type === 'white') {
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;

      const filter = this.ctx.createBiquadFilter();
      filter.type = type === 'rain' ? 'lowpass' : (type === 'brown' ? 'lowpass' : 'bandpass');
      filter.frequency.value = type === 'rain' ? 800 : (type === 'brown' ? 350 : 1200);

      this.gainNode = this.ctx.createGain();
      this.gainNode.gain.setValueAtTime(volume * 0.5, this.ctx.currentTime);

      noise.connect(filter);
      filter.connect(this.gainNode);
      this.gainNode.connect(this.ctx.destination);
      noise.start();
      this.noiseNode = noise;
    } else if (type === 'alpha') {
      this.binauralOsc1 = this.ctx.createOscillator();
      this.binauralOsc2 = this.ctx.createOscillator();
      this.binauralGain = this.ctx.createGain();
      
      this.binauralOsc1.frequency.value = 210;
      this.binauralOsc2.frequency.value = 220; // 10Hz Alpha difference

      this.binauralGain.gain.setValueAtTime(volume * 0.25, this.ctx.currentTime);

      this.binauralOsc1.connect(this.binauralGain);
      this.binauralOsc2.connect(this.binauralGain);
      this.binauralGain.connect(this.ctx.destination);

      this.binauralOsc1.start();
      this.binauralOsc2.start();
    }
  }

  setVolume(vol) {
    if (this.gainNode) {
      this.gainNode.gain.setValueAtTime(vol * 0.5, this.ctx.currentTime);
    }
    if (this.binauralGain) {
      this.binauralGain.gain.setValueAtTime(vol * 0.25, this.ctx.currentTime);
    }
  }

  stopAmbient() {
    if (this.noiseNode) {
      try { this.noiseNode.stop(); } catch(e){}
      this.noiseNode = null;
    }
    if (this.binauralOsc1) {
      try { this.binauralOsc1.stop(); } catch(e){}
      this.binauralOsc1 = null;
    }
    if (this.binauralOsc2) {
      try { this.binauralOsc2.stop(); } catch(e){}
      this.binauralOsc2 = null;
    }
  }
}

export const soundEngine = new AudioEngine();
