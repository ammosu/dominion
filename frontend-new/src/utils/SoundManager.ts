export class SoundManager {
  private static instance: SoundManager;
  private enabled: boolean = true;
  private audioContext: AudioContext | null = null;

  static getInstance(): SoundManager {
    if (!SoundManager.instance) {
      SoundManager.instance = new SoundManager();
    }
    return SoundManager.instance;
  }

  private constructor() {
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }

  playCardDraw() {
    this.playTone(400, 0.1, 0.05);
  }

  playCardPlay() {
    this.playTone(600, 0.15, 0.08);
  }

  playCardBuy() {
    this.playTone(800, 0.2, 0.1);
  }

  playPhaseChange() {
    this.playTone(500, 0.15, 0.1);
  }

  playGameOver() {
    setTimeout(() => this.playTone(523, 0.2, 0.1), 0);
    setTimeout(() => this.playTone(659, 0.2, 0.1), 200);
    setTimeout(() => this.playTone(784, 0.3, 0.15), 400);
  }

  private playTone(frequency: number, duration: number, volume: number) {
    if (!this.enabled || !this.audioContext) return;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.01,
      this.audioContext.currentTime + duration
    );

    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + duration);
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  isEnabled(): boolean {
    return this.enabled;
  }
}
