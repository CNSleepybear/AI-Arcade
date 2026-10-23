/* Region interaction and E.V.E. protocol regression; all services are local mocks. */
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
fs.mkdirSync('artifacts/nightshift',{recursive:true});
(async()=>{
  const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist']});
  try {
    const page=await browser.newPage({viewport:{width:1440,height:900}}),modules={},errors=[],requests=[];
    let fail=false;
    page.on('request',request=>{const url=new URL(request.url());if(url.pathname.endsWith('.js'))modules[url.pathname]=request.url();});
    page.on('pageerror',error=>errors.push(error.message));
    await page.route('http://127.0.0.1:54321/**',route=>route.fulfill({contentType:'application/json',body:'[]'}));
    await page.routeWebSocket('ws://127.0.0.1:54321/**',()=>{});
    await page.route('http://127.0.0.1:65432/**',route=>{
      requests.push(route.request().postDataJSON());
      return route.fulfill({status:fail?503:200,contentType:'application/json',body:JSON.stringify({choices:[{message:{content:'E.V.E.：蓝色旋涡停在夜空里。你可以慢慢看，我会记住我们今晚的这一站。'}}]})});
    });
    await page.goto(process.env.ARCADE_URL||'http://127.0.0.1:3001/');
    await page.waitForSelector('#system-boot.hidden',{state:'attached'});
    await page.evaluate(async modules=>{
      const THREE=await import(modules['/node_modules/.vite/deps/three.js']);
      const original=THREE.Scene.prototype.onBeforeRender;
      THREE.Scene.prototype.onBeforeRender=function(renderer,scene,camera,target){if(camera.isPerspectiveCamera)window.__view={renderer,scene,camera,target};return original.call(this,renderer,scene,camera,target);};
      const {AbyssWorld}=await import(modules['/src/three/AbyssWorld.js']);
      const update=AbyssWorld.prototype.update;
      AbyssWorld.prototype.update=function(...args){window.__world=this;return update.apply(this,args);};
    },modules);
    await page.locator('#title-btn-enter').click();await page.locator('#auth-btn-skip').click();
    await page.waitForFunction(()=>!document.getElementById('auth-panel').offsetWidth);
    await page.locator('#title-btn-enter').click();await page.waitForFunction(()=>window.__world);
    const models=await page.evaluate(()=>window.__world.sanctuary.globes.map(globe=>({id:globe.country.id,parts:globe.inner.userData.modelParts,batches:globe.inner.children.length,particles:globe.particleMesh.count,lightGrouped:globe.spot.parent===window.__world.sanctuary.group})));
    assert.equal(models.length,7);assert.ok(models.every(model=>model.parts>5&&model.lightGrouped&&model.particles>=20));
    await page.evaluate(()=>window.__view.camera.position.set(-10,1.6,-4.4));await page.keyboard.press('e');
    await page.waitForSelector('#floor-fade');await page.waitForSelector('#floor-fade',{state:'detached'});
    assert.equal(await page.locator('#district-name').textContent(),'午夜观星台');
    await page.evaluate(()=>window.__view.camera.position.set(-1,13.6,-1.2));await page.keyboard.press('e');await page.waitForTimeout(900);
    const sky=await page.evaluate(async modules=>{
      const THREE=await import(modules['/node_modules/.vite/deps/three.js']);const world=window.__world;
      return {up:window.__view.camera.getWorldDirection(new THREE.Vector3()).y,width:world.rooftop._skyUniforms.uPaint.value.image.width,hidden:!world.depths.group.visible&&!world.plaza.group.visible};
    },modules);
    assert.ok(sky.up>.4&&sky.width===2048&&sky.hidden);
    await page.screenshot({path:'artifacts/nightshift/observatory-live.jpg',type:'jpeg',quality:90});
    await page.evaluate(()=>document.exitPointerLock());
    await page.locator('#eve-chat-input').fill('这片星空是什么？');await page.locator('#eve-chat-form button').click();
    await page.waitForFunction(()=>document.getElementById('eve-bubble').textContent.includes('旋涡'));
    await page.locator('#eve-chat-input').focus();
    const before=await page.evaluate(()=>window.__view.camera.position.toArray());await page.keyboard.type('wasd');await page.waitForTimeout(100);
    assert.deepEqual(await page.evaluate(()=>window.__view.camera.position.toArray()),before,'Typing to E.V.E. must not move the player');
    await page.locator('#eve-settings-gear').click();await page.locator('#eve-setting-online').check();
    await page.locator('#eve-setting-url').fill('http://127.0.0.1:65432/v1/chat/completions');
    await page.locator('#eve-setting-key').fill('isolated-test-key');await page.locator('#eve-setting-model').fill('test-model');await page.locator('#eve-setting-save').click();
    await page.locator('#eve-chat-input').fill('记住我们现在在哪。');await page.locator('#eve-chat-form button').click();
    await page.waitForFunction(()=>document.getElementById('eve-phone').dataset.replySource==='online');
    assert.equal(JSON.parse(requests.at(-1).messages.at(-1).content).location.floor,'ROOFTOP');
    assert.ok(requests.at(-1).max_tokens>=200);
    assert.ok(!await page.locator('#eve-bubble').textContent().then(text=>text.startsWith('E.V.E.')));
    await page.locator('#eve-chat-input').fill('再说一句。');await page.locator('#eve-chat-form button').click();
    await page.waitForFunction(()=>document.getElementById('eve-phone').dataset.state!=='thinking').catch(async error=>{console.log({requests,phone:await page.locator('#eve-phone').evaluate(el=>({...el.dataset})),errors});throw error;});
    assert.ok(requests.at(-1).messages.some(message=>message.role==='assistant'),'Conversation must retain earlier replies');
    fail=true;
    await page.locator('#eve-chat-input').fill('展览馆怎么去？');await page.locator('#eve-chat-form button').click();
    await page.waitForFunction(()=>document.getElementById('eve-phone').dataset.replySource==='local'&&document.getElementById('eve-bubble').textContent.includes('广场南侧'));
    await page.screenshot({path:'artifacts/nightshift/eve-fallback.png'});
    // Clear in-flight requests and prove that a late reply cannot be shown.
    const cancellation=await page.evaluate(async modules=>{
      const client=await import(modules['/src/data/ainpc/onlineClient.js']);client.clearHistory();
      const original=window.fetch;window.fetch=(_url,options)=>new Promise((_resolve,reject)=>options.signal.addEventListener('abort',()=>reject(new DOMException('Aborted','AbortError')),{once:true}));
      try {const pending=client.queryOnline({userQuestion:'cancel'});client.clearHistory();return await pending;}finally{window.fetch=original;}
    },modules);
    assert.equal(cancellation,null);
    // Museum via its real entrance; verify approach freezes a model for inspection.
    await page.evaluate(()=>{document.activeElement.blur();window.__view.camera.position.set(0,13.6,-4.3);});await page.keyboard.press('e');
    await page.waitForSelector('#floor-fade');await page.waitForSelector('#floor-fade',{state:'detached'});
    await page.evaluate(()=>window.__view.camera.position.set(0,1.6,4.5));await page.keyboard.press('e');
    await page.waitForSelector('#floor-fade');await page.waitForSelector('#floor-fade',{state:'detached'});
    assert.equal(await page.locator('#district-name').textContent(),'万国微缩馆');
    await page.evaluate(()=>window.__view.camera.position.set(-3.4,17.6,1.7));await page.waitForTimeout(100);
    const rotation=await page.evaluate(()=>window.__world.sanctuary.globes[0].inner.rotation.y);await page.waitForTimeout(200);
    assert.equal(await page.evaluate(()=>window.__world.sanctuary.globes[0].inner.rotation.y),rotation);
    await page.emulateMedia({reducedMotion:'reduce'});
    const frozen=await page.evaluate(()=>window.__world.sanctuary.globes[0].particleMesh.instanceMatrix.version);await page.waitForTimeout(100);
    assert.equal(await page.evaluate(()=>window.__world.sanctuary.globes[0].particleMesh.instanceMatrix.version),frozen);
    assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,models,sky,requests:requests.length,cancellation,errors},null,2));
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
