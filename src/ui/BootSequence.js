// This module runs before main.js; readiness comes from the real scene initializer.
const boot=document.getElementById('system-boot');
const fill=document.getElementById('progressFill');
const percent=document.getElementById('progressPercent');
const status=document.getElementById('statusText');
const output=document.getElementById('terminalOutput');
const stages=[
  [0,'01','CONNECTING THE DREAM','唤醒午夜信号'],
  [15,'02','BUILDING THE DISTRICTS','拼合体素街区'],
  [30,'03','TUNING THE NEON','点亮霓虹与星空'],
  [75,'04','WARMING THE SHADERS','校准光影与像素'],
  [90,'05','SETTING THE FREQUENCY','调谐声音与记忆'],
];
let zh=true;try{zh=localStorage.getItem('ai_arcade_lang')!=='en';}catch{}
output.innerHTML=stages.map((stage)=>`<div class="boot-stage" data-at="${stage[0]}"><span class="boot-stage-index">${stage[1]}</span><span>${zh?stage[3]:stage[2]}</span><i></i></div>`).join('');
const started=performance.now();let ready=false,skipped=false,displayed=0,finishing=false,frame=0;
const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
boot.classList.remove('hidden');
document.getElementById('bootCursor').style.display='none';
const rows=[...output.children];
function finish() {
  if(finishing)return;finishing=true;cancelAnimationFrame(frame);
  percent.textContent='100%';fill.style.width='100%';status.textContent=zh?'梦境已就绪':'READY TO WANDER';
  rows.forEach(row=>row.classList.add('complete'));
  window.dispatchEvent(new Event('arcade:boot-ready'));
  setTimeout(()=>{boot.classList.add('nightshift-boot-exit');setTimeout(()=>boot.classList.add('hidden'),reduced.matches?0:500);},skipped?0:250);
}
window.__signalArcadeReady=()=>{ready=true;window.__arcadeProgress=100;if(skipped)finish();};
function tick(now) {
  if(finishing)return;
  const target=ready?100:Math.max(0,Math.min(99,window.__arcadeProgress||0));
  // The meter follows measured scene stages; it never invents loading progress.
  displayed=Math.min(target,displayed+Math.max(.2,(target-displayed)*.1));
  const value=Math.floor(displayed);fill.style.width=`${value}%`;percent.textContent=`${value}%`;boot.style.setProperty('--boot-progress',String(value/100));
  let current=0;stages.forEach((stage,i)=>{if(value>=stage[0])current=i;});
  rows.forEach((row,i)=>{row.classList.toggle('active',i===current);row.classList.toggle('complete',i<current);});
  status.textContent=ready?(zh?'灯火已亮，等你入场':'THE LIGHTS ARE ON'):(zh?stages[current][3]:stages[current][2]);
  if(ready&&displayed>99&&now-started>(reduced.matches?0:1400)){finish();return;}
  frame=requestAnimationFrame(tick);
}
document.getElementById('skipBootBtn').addEventListener('click',()=>{
  skipped=true;if(ready){finish();return;}
  // Skipping the cinematic does not bypass scene readiness or hide loading.
  boot.classList.add('hidden');cancelAnimationFrame(frame);
});
frame=requestAnimationFrame(tick);
