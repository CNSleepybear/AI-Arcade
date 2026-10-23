import { t } from '../data/i18n.js';

/** Screen feedback stays outside the low-res pass, so controls remain legible. */
export class FeedbackLayer {
  constructor(audio, onArrival) {
    this.audio = audio;
    this.reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.layer = document.createElement('div'); this.layer.id='feedback-layer';this.layer.setAttribute('aria-hidden','true');document.body.appendChild(this.layer);
    const toggle=document.createElement('button');toggle.id='sfx-toggle';document.body.appendChild(toggle);
    this.toggle=toggle;this.updateVolume();
    toggle.addEventListener('click',()=>{audio.sfx.setVolume(audio.sfx.volume>0?0:0.65);this.updateVolume();});
    document.getElementById('sfx-volume')?.addEventListener('input',(event)=>{audio.sfx.setVolume(Number(event.target.value)/100);this.updateVolume();});
    document.addEventListener('pointerover',(event)=>{
      const button=event.target.closest('button');
      if(button&&!button.disabled&&!button.contains(event.relatedTarget)) audio.playSFX('sfx_hover');
    },{passive:true});
    document.addEventListener('click',(event)=>{
      const button=event.target.closest('button');if(!button||button.disabled||button===toggle)return;
      audio.playSFX('sfx_confirm');
      if(!this.reduced.matches){const rect=button.getBoundingClientRect();this.pulse(event.detail ? event.clientX : rect.x+rect.width/2,event.detail ? event.clientY : rect.y+rect.height/2,'tap');}
    },{passive:true});
    window.addEventListener('arcade:boot-ready',()=>audio.playSFX('sfx_boot'));
    window.addEventListener('arcade:eve-message',()=>audio.playSFX('sfx_eve'));
    this.observer=new MutationObserver((records)=>{
      for(const record of records) {
        for(const node of record.addedNodes) if(node.id==='floor-fade') {
          node.dataset.label=t('art.travelling');node.classList.add('nightshift-transit');audio.playSFX('sfx_portal');
        }
        for(const node of record.removedNodes) if(node.id==='floor-fade') {audio.playSFX('sfx_arrive');onArrival?.();}
      }
    });
    this.observer.observe(document.body,{childList:true});
  }

  updateVolume() {
    const muted=this.audio.sfx.volume===0;
    this.toggle.textContent=muted?'♪ OFF':'♪ ON';this.toggle.setAttribute('aria-label',t('art.sound'));this.toggle.setAttribute('aria-pressed',String(!muted));this.toggle.title=t('art.sound');
    const range=document.getElementById('sfx-volume');if(range)range.value=String(Math.round(this.audio.sfx.volume*100));
  }

  pulse(x=innerWidth/2,y=innerHeight/2,kind='collect') {
    if(this.reduced.matches)return;
    const el=document.createElement('div');el.className=`feedback-pulse feedback-${kind}`;el.style.left=`${x}px`;el.style.top=`${y}px`;this.layer.appendChild(el);
    el.addEventListener('animationend',()=>el.remove(),{once:true});
    // Hard cap concurrent DOM effects during rapid input.
    while(this.layer.childElementCount>10)this.layer.firstElementChild.remove();
  }
}
