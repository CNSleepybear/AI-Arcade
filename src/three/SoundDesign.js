/** Layered, original Web Audio cues. One bus, limited voices, no downloaded assets. */
export class SoundDesign {
  constructor(context, destination) {
    this.ctx = context;
    this.voices = 0;
    this.lastCue = new Map();
    this.bus = context.createGain();
    this.limiter = context.createDynamicsCompressor();
    this.limiter.threshold.value = -12; this.limiter.knee.value = 12; this.limiter.ratio.value = 8;
    this.bus.connect(this.limiter); this.limiter.connect(destination);
    let saved = null;
    try { saved = localStorage.getItem('arcade_sfx_volume'); } catch {}
    const parsed = saved === null ? 0.65 : Number(saved);
    this.volume = Number.isFinite(parsed) ? Math.max(0, Math.min(1, parsed)) : 0.65;
    this.bus.gain.value = this.volume;
    this.noise = context.createBuffer(1, Math.ceil(context.sampleRate * 0.35), context.sampleRate);
    const samples = this.noise.getChannelData(0);
    for(let i=0;i<samples.length;i++) samples[i] = Math.random()*2-1;
    const unlock = () => { if (context.state === 'suspended') context.resume().catch(() => {}); };
    document.addEventListener('pointerdown', unlock, { passive: true });
    document.addEventListener('keydown', unlock, { passive: true });
  }

  setVolume(value) {
    this.volume = Math.max(0, Math.min(1, Number(value) || 0));
    this.bus.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.015);
    try { localStorage.setItem('arcade_sfx_volume', String(this.volume)); } catch {}
  }

  _tone(freq, delay, duration, amplitude, type = 'sine', endFreq = freq) {
    if (this.voices >= 28) return;
    this.voices++;
    const now = this.ctx.currentTime + delay, osc=this.ctx.createOscillator(), gain=this.ctx.createGain();
    osc.type=type; osc.frequency.setValueAtTime(freq,now); osc.frequency.exponentialRampToValueAtTime(Math.max(20,endFreq),now+duration);
    gain.gain.setValueAtTime(0,now); gain.gain.linearRampToValueAtTime(amplitude,now+0.006); gain.gain.exponentialRampToValueAtTime(0.0001,now+duration);
    osc.connect(gain); gain.connect(this.bus); osc.start(now); osc.stop(now+duration+0.01);
    osc.onended=()=>{osc.disconnect();gain.disconnect();this.voices--;};
  }

  _noise(duration, amplitude, frequency, highpass = false) {
    if(this.voices>=28) return;
    this.voices++;
    const now=this.ctx.currentTime,src=this.ctx.createBufferSource(),filter=this.ctx.createBiquadFilter(),gain=this.ctx.createGain();
    src.buffer=this.noise;filter.type=highpass?'highpass':'lowpass';filter.frequency.value=frequency;
    gain.gain.setValueAtTime(amplitude,now);gain.gain.exponentialRampToValueAtTime(0.0001,now+duration);
    src.connect(filter);filter.connect(gain);gain.connect(this.bus);src.start(now);src.stop(now+duration+0.01);
    src.onended=()=>{src.disconnect();filter.disconnect();gain.disconnect();this.voices--;};
  }

  play(id, level = 1, options = {}) {
    if(this.ctx.state!=='running'||this.volume===0||document.hidden) return;
    this._schedule(id, level, options);
  }

  _schedule(id, level = 1, options = {}) {
    const now=this.ctx.currentTime, cooldown=id==='sfx_hover'?0.075:id==='sfx_step'?0.12:0.045;
    if(now-(this.lastCue.get(id)??-1)<cooldown) return;
    this.lastCue.set(id,now);
    const a=level;
    switch(id) {
      case 'sfx_hover': this._tone(740,0,.055,.045*a,'triangle',890); break;
      case 'sfx_confirm': this._tone(440,0,.09,.12*a,'triangle');this._tone(660,.045,.15,.09*a);this._noise(.025,.035*a,2200,true);break;
      case 'sfx_coin':
        this._tone(1319,0,.18,.16*a,'triangle');this._tone(1976,.065,.24,.1*a);this._tone(2637,.07,.11,.035*a);this._noise(.025,.045*a,3500,true);break;
      case 'sfx_shard':
        [659,988,1319,1661].forEach((f,i)=>{this._tone(f,i*.055,.42,.1*a/(1+i*.2),'sine');this._tone(f*2,i*.055+.045,.28,.025*a);});
        this._tone(196,0,.35,.09*a,'triangle',392);break;
      case 'sfx_drink':
        [520,780,1040,690].forEach((f,i)=>this._tone(f,i*.06,.09,.07*a,'sine',f*1.2));this._noise(.15,.025*a,900);break;
      case 'sfx_step': {
        const wood=options.surface==='tavern',stone=options.surface==='depths';
        this._noise(.075,.12*a,wood?850:stone?1600:1100);
        this._tone(wood?125:stone?190:165,0,.06,.12*a,'sine',wood?65:90);break;
      }
      case 'sfx_portal':
        this._tone(110,0,.65,.13*a,'sine',660);this._tone(164.81,.06,.7,.07*a,'triangle',988);this._noise(.3,.025*a,1600);break;
      case 'sfx_arrive': [330,494,660].forEach((f,i)=>this._tone(f,i*.06,.4,.07*a));break;
      case 'sfx_achievement': [523,659,784,1047].forEach((f,i)=>this._tone(f,i*.1,.5,.12*a,'triangle'));this._tone(131,0,.6,.09*a);break;
      case 'sfx_boot': [220,330,440,660].forEach((f,i)=>this._tone(f,i*.06,.24,.065*a));break;
      case 'sfx_cat':
        this._tone(610,0,.14,.075*a,'triangle',820);this._tone(820,.12,.24,.06*a,'sine',530);this._tone(74,.1,.4,.06*a,'sine',62);break;
      case 'sfx_eve': this._tone(554,0,.11,.06*a,'sine');this._tone(830,.045,.16,.045*a,'sine');break;
      default: break;
    }
  }
}
