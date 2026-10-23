import { t } from '../data/i18n.js';

/** E.V.E.'s expression and signal trace reflect real message/request states. */
export class EveCompanionView {
  constructor() {
    this.canvas=document.getElementById('eve-avatar-canvas');this.canvas.width=this.canvas.height=96;
    this.ctx=this.canvas.getContext('2d');this.phone=document.getElementById('eve-phone');
    this.state='idle';this.mood='neutral';this.online=false;this.time=0;this.frame=0;
    this.motion=window.matchMedia('(prefers-reduced-motion: reduce)');
    this.observer=new MutationObserver(()=>this.syncAnimation());this.observer.observe(this.phone,{attributes:true,attributeFilter:['class']});
    this.observer.observe(document.getElementById('app'),{attributes:true,attributeFilter:['style']});
    document.addEventListener('visibilitychange',()=>this.syncAnimation());this.motion.addEventListener('change',()=>this.syncAnimation());
    window.addEventListener('arcade:district',event=>{document.getElementById('eve-location').textContent=event.detail.name;});
    this.draw(0);this.syncAnimation();
  }

  syncAnimation() {
    cancelAnimationFrame(this.frame);this.frame=0;
    if(this.phone.classList.contains('eve-phone-hidden')||document.getElementById('app').style.display==='none'||document.hidden||this.motion.matches){this.draw(this.time);return;}
    const loop=now=>{if(!this.last||now-this.last>100){this.time=now/1000;this.draw(this.time);this.last=now;}this.frame=requestAnimationFrame(loop);};
    this.frame=requestAnimationFrame(loop);
  }

  syncMode(online) {this.online=online;this.updateLabels();this.draw(this.time);}
  updateLabels() {
    this.phone.dataset.state=this.state;
    this.phone.dataset.mode=this.online?'online':'offline';
    const label=document.getElementById('eve-state-label');
    label.setAttribute('data-i18n',`art.eve_${this.state}`);label.textContent=t(`art.eve_${this.state}`);
    document.getElementById('eve-mode-label').textContent=this.online?'MODE / API':'MODE / LOCAL';
    document.getElementById('eve-portrait-label').textContent=this.online?'E.V.E. / NEURAL LINK':'E.V.E. / LOCAL COMPANION';
  }
  thinking(){clearTimeout(this.speechTimer);this.state='thinking';this.updateLabels();this.draw(this.time);}
  idle(){this.state='idle';this.updateLabels();this.draw(this.time);}
  react(event){const key=String(event).toLowerCase();this.mood=key.includes('cat')||key.includes('shard')||key.includes('high_score')?'happy':key.includes('depth')?'curious':key.includes('over')||key.includes('miss')?'concerned':'neutral';}
  speak(text,count) {
    clearTimeout(this.speechTimer);this.state='speaking';this.updateLabels();
    const previous=document.getElementById('eve-previous');previous.disabled=count<=1;
    document.getElementById('eve-message-count').textContent=String(count).padStart(2,'0');
    this.draw(this.time);window.dispatchEvent(new Event('arcade:eve-message'));
    this.speechTimer=setTimeout(()=>this.idle(),Math.min(4200,Math.max(1400,text.length*55)));
  }

  draw(time) {
    const c=this.ctx,p=(x,y,w,h,color)=>{c.fillStyle=color;c.fillRect(x,y,w,h);};
    c.imageSmoothingEnabled=false;c.clearRect(0,0,96,96);p(0,0,96,96,'#152333');
    for(let y=8;y<96;y+=12)p(0,y,96,1,'#1e3346');
    const shift=this.motion.matches?0:Math.round(Math.sin(time*1.2)*.7);
    c.save();c.translate(0,shift);
    // Bob-cut lilac hair, warm face, cyan radio and structured dark jacket.
    p(24,17,48,58,'#606584');p(20,27,8,46,'#414d6b');p(69,27,8,46,'#3a4765');
    p(29,27,39,39,'#d8b7ad');p(34,63,29,9,'#bf9995');
    p(24,18,48,10,'#8589aa');p(27,15,36,5,'#a5a5be');
    p(25,27,16,13,'#8589aa');p(38,26,12,8,'#8589aa');p(49,25,20,6,'#8589aa');p(61,29,9,16,'#636e90');
    p(22,43,5,25,'#a2a1b8');p(68,43,5,25,'#697491');
    p(26,71,46,25,'#354b63');p(38,70,20,26,'#526d7c');p(43,73,10,11,'#b3cac4');
    p(45,80,6,6,'#79d9ce');p(27,78,8,3,'#7997a5');p(62,78,8,3,'#7997a5');
    // Headset and boom microphone.
    p(16,38,9,24,'#2c5262');p(18,41,4,17,'#79d9ce');p(73,38,9,24,'#2c5262');p(76,41,4,17,'#79d9ce');
    p(76,60,3,9,'#79a8af');p(62,67,17,3,'#79a8af');p(59,65,6,5,'#1f3d50');
    // Blink and expression change independently of message duration.
    const blink=!this.motion.matches&&time%5.3>5.12;
    const happy=this.mood==='happy';const thinking=this.state==='thinking';
    const eyeY=44,look=thinking?Math.round(Math.sin(time*2)*2):0;
    p(32,40,11,2,'#69617a');p(52,40,11,2,'#69617a');
    if(this.mood==='concerned'){p(34,38,7,2,'#69617a');p(54,38,7,2,'#69617a');}
    if(blink||happy){p(33,47,9,2,'#37505c');p(54,47,9,2,'#37505c');if(happy){p(34,45,7,2,'#37505c');p(55,45,7,2,'#37505c');}}
    else for(const x of [33,54]){p(x,eyeY,9,8,'#e9d6cb');p(x+3+look,eyeY,4,7,'#376f79');p(x+4+look,eyeY+1,2,5,'#18364a');p(x+3+look,eyeY,2,2,'#c1ebe0');}
    p(47,51,2,3,'#b88f90');p(31,54,8,2,'#d39ba0');p(58,54,8,2,'#d39ba0');
    const speaking=this.state==='speaking'&&!this.motion.matches;
    if(speaking&&Math.sin(time*15)>.1){p(44,58,10,5,'#73515e');p(46,59,6,2,'#efd0c4');}
    else{p(45,59,8,2,'#9b6776');if(happy)p(47,61,4,1,'#9b6776');}
    c.restore();
    // Signal pixels represent an active request or a current reply, never fake audio.
    for(let i=0;i<7;i++){const height=this.state==='idle'?2:2+Math.round((Math.sin(time*6+i)*.5+.5)*7);p(9+i*4,87-height,2,height,this.state==='thinking'?'#e8b47e':'#79b9b6');}
    p(84,9,3,3,this.online?'#79d9ce':'#e8b47e');
  }
}
