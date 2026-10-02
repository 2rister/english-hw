/* Original generative score. No film music or external audio service. */
export class Sound {
  constructor() { this.enabled=localStorage.getItem('orbital-sound')!=='off'; this.step=0; }
  async unlock() {
    if (!this.ctx) {
      this.ctx=new (window.AudioContext||window.webkitAudioContext)();
      this.master=this.ctx.createGain(); this.master.gain.value=.16; this.master.connect(this.ctx.destination);
    }
    await this.ctx.resume(); this.set(this.enabled);
  }
  set(enabled) {
    this.enabled=enabled; localStorage.setItem('orbital-sound',enabled?'on':'off');
    if (this.master) this.master.gain.setTargetAtTime(enabled?.16:0,this.ctx.currentTime,.1);
    if (enabled && this.ctx && !this.interval) { this.score(); this.interval=setInterval(()=>this.score(),1150); }
    if (!enabled && this.interval) { clearInterval(this.interval); this.interval=null; }
  }
  note(frequency,duration=1,volume=.12,type='sine',delay=0) {
    if (!this.ctx || !this.enabled) return;
    const t=this.ctx.currentTime+delay, oscillator=this.ctx.createOscillator(), envelope=this.ctx.createGain();
    oscillator.type=type; oscillator.frequency.value=frequency;
    envelope.gain.setValueAtTime(0,t); envelope.gain.linearRampToValueAtTime(volume,t+.04);
    envelope.gain.exponentialRampToValueAtTime(.0001,t+duration);
    oscillator.connect(envelope); envelope.connect(this.master); oscillator.start(t); oscillator.stop(t+duration+.05);
  }
  score() {
    const chords=[[55,82.41,110,164.81],[43.65,65.41,87.31,130.81],[65.41,98,130.81,196],[49,73.42,98,146.83]];
    const chord=chords[Math.floor(this.step/8)%4], note=chord[this.step%4];
    this.note(note,4,.065); this.note(note*2,3,.035,'triangle');
    if (this.step%4===0) this.note(chord[0]/2,5,.08);
    this.step++;
  }
  effect(kind) {
    if (kind==='correct') { [330,440,660].forEach((f,i)=>this.note(f,.35,.13,'sine',i*.09)); }
    if (kind==='wrong') { this.note(160,.45,.2,'triangle'); this.note(80,.6,.22,'triangle',.1); }
    if (kind==='select') this.note(520,.1,.09,'sine');
    if (kind==='boost') [110,220,440,880].forEach((f,i)=>this.note(f,1,.12,'triangle',i*.12));
    if (kind==='explode') this.noise();
    if (kind==='win') [261.63,329.63,392,523.25].forEach((f,i)=>this.note(f,2,.15,'sine',i*.15));
  }
  noise() {
    if (!this.ctx || !this.enabled) return;
    const buffer=this.ctx.createBuffer(1,this.ctx.sampleRate,this.ctx.sampleRate), data=buffer.getChannelData(0);
    for (let i=0;i<data.length;i++) data[i]=(Math.random()*2-1)*(1-i/data.length);
    const source=this.ctx.createBufferSource(), filter=this.ctx.createBiquadFilter(); filter.type='lowpass';filter.frequency.value=900;
    source.buffer=buffer; source.connect(filter); filter.connect(this.master); source.start();
  }
  suspend() { if (this.interval) clearInterval(this.interval);this.interval=null;this.ctx?.suspend(); }
}
