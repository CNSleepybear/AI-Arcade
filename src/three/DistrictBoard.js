/** A bounded canvas layout: names and messages never spill into adjacent panels. */
export function drawDistrictBoard(plaza, dt) {
  const c=plaza.screenCtx,w=plaza.screenCanvas.width,h=plaza.screenCanvas.height;
  plaza._scrollOffset+=dt*42;
  const time=plaza._scrollOffset/42;
  c.fillStyle='#101d2d';c.fillRect(0,0,w,h);
  c.fillStyle='#182a3d';for(let y=0;y<h;y+=24)c.fillRect(0,y,w,1);
  c.fillStyle='#7ed4c9';c.fillRect(28,28,5,5);
  c.font='12px monospace';c.fillText('ABYSS BROADCAST / DISTRICT 01',44,36);
  c.fillStyle='#849bad';c.textAlign='right';c.fillText('NIGHTSHIFT / STAY A WHILE',w-28,36);c.textAlign='left';
  const panel=(x,width,title,label)=>{
    c.fillStyle='#17283a';c.fillRect(x,60,width,306);
    c.strokeStyle='#385064';c.strokeRect(x,60,width,306);
    c.fillStyle='#e8ddc9';c.font='bold 24px monospace';c.fillText(title,x+18,98);
    c.fillStyle='#7e9baf';c.font='11px monospace';c.fillText(label,x+18,120);
  };
  panel(28,452,'HIGH SCORES','THE HIVE / HALL OF FAME');
  panel(500,496,'WORLD FREQUENCY','VOICES FROM THE OTHER SIDE');
  c.save();c.beginPath();c.rect(42,136,425,216);c.clip();
  const names={anomaly:'ANOMALY','cyber-hunder':'CYBER HUNDER','dark-water-stealth':'DARK WATER','leave-at-6pm-evolved':'LEAVE AT 6PM'};
  Object.entries(plaza.globalState?.arcadeHighScores??{}).slice(0,3).forEach(([game,data],i)=>{
    const y=155+i*68;c.fillStyle='#2e4356';c.fillRect(44,y+42,420,1);
    c.fillStyle='#e8b47e';c.font='bold 17px monospace';c.fillText(names[game]??game.slice(0,20),48,y);
    c.fillStyle='#a4bdc9';c.font='15px monospace';c.fillText(`#01  ${String(data.name).slice(0,18)}`,48,y+25);
    c.textAlign='right';c.fillStyle='#e7e6d6';c.font='bold 21px monospace';c.fillText(String(data.score),456,y+25);c.textAlign='left';
  });c.restore();
  c.save();c.beginPath();c.rect(516,136,464,216);c.clip();
  (plaza.globalState?.chatMessages??[]).slice(-4).forEach((message,i)=>{
    const y=152+i*50;c.fillStyle='#79d9ce';c.font='bold 12px monospace';c.fillText(String(message.author).slice(0,18),520,y);
    c.fillStyle='#8099ab';c.textAlign='right';c.font='11px monospace';c.fillText(new Date(message.time).toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'}),976,y);c.textAlign='left';
    c.font='14px monospace';c.fillStyle='#c8d5dd';
    let text=String(message.text);while(c.measureText(text).width>450&&text.length)text=text.slice(0,-1);
    if(text.length<String(message.text).length)text=text.slice(0,-1)+'…';
    c.fillText(text,520,y+22);
  });c.restore();
  // A slow signal trace and blueprint give the lower half a visual anchor.
  c.fillStyle='#87a8b7';c.font='11px monospace';c.fillText('SIGNAL / DREAM FREQUENCY',30,401);
  c.strokeStyle='#79d9ce';c.lineWidth=2;c.beginPath();
  for(let x=30;x<480;x+=3){const y=477+Math.sin(x*.037+time*.7)*Math.sin(x*.013-time*.3)*27;(x===30?c.moveTo(x,y):c.lineTo(x,y));}c.stroke();
  c.strokeStyle='#37556b';c.lineWidth=1;c.beginPath();c.moveTo(30,520);c.lineTo(478,520);c.stroke();
  c.fillStyle='#7b95aa';c.font='10px monospace';c.fillText('NO SIGNAL IS EVER TRULY LOST.',30,550);
  const rooms=[{x:520,w:120,title:'ANCHOR',color:'#e8b47e'},{x:686,w:120,title:'PLAZA',color:'#afa0e8'},{x:852,w:120,title:'HIVE',color:'#79d9ce'}];
  c.fillStyle='#7c9bad';c.font='11px monospace';c.fillText('YOU ARE HERE / SURFACE',520,401);
  rooms.forEach((room,i)=>{c.strokeStyle=room.color;c.strokeRect(room.x,432,room.w,85);c.fillStyle=room.color;c.font='bold 14px monospace';c.fillText(room.title,room.x+14,481);if(i<2){c.fillStyle='#54788d';c.fillRect(room.x+room.w,470,46,2);}});
  c.fillStyle='#d9c59d';c.fillRect(741,531,5,5);c.font='10px monospace';c.fillText('YOUR NEXT STORY IS A DOOR AWAY.',520,558);
  const ticker='AFTER HOURS / INDIE GAMES · LOST STORIES · A STRAY CAT / COLLECT THREE MEMORY SHARDS / ';
  c.fillStyle='#22374a';c.fillRect(0,h-61,w,1);c.fillStyle='#0c1725';c.fillRect(0,h-60,w,60);
  c.font='15px monospace';c.fillStyle='#a9c7ca';const width=c.measureText(ticker).width,offset=plaza._scrollOffset%width;
  c.fillText(ticker,-offset,h-25);c.fillText(ticker,-offset+width,h-25);
  plaza.screenTexture.needsUpdate=true;
}
