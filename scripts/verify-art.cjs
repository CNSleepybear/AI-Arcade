/* Run with Playwright available on NODE_PATH; uses an isolated browser profile.
 * ARCADE_URL=http://127.0.0.1:3001 node scripts/verify-art.cjs
 * The optional local backend at :54321 is mocked; no live account is touched.
 */
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const output = path.resolve('artifacts/nightshift');
fs.mkdirSync(output, { recursive: true });

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome', args: ['--enable-webgl', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
  const errors = [];
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
    const page = await context.newPage();
    let threeURL;
    page.on('request', request => { if (/\/\.vite\/deps\/three\.js\?/.test(request.url())) threeURL = request.url(); });
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error' && /THREE|Shader|WebGL|GLSL/.test(message.text())) errors.push(message.text()); });
    await page.route('http://127.0.0.1:54321/**', route => route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
    await page.routeWebSocket('ws://127.0.0.1:54321/**', () => {});
    await page.goto(process.env.ARCADE_URL || 'http://127.0.0.1:3001/', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#system-boot.hidden', { state: 'attached', timeout: 30000 });
    assert.equal(await page.evaluate(() => window.__arcadeProgress), 100);
    assert.equal(await page.locator('#auth-panel').isVisible(), false);
    assert.equal(await page.locator('#title-btn-char').isVisible(), false);
    const shot = name => page.screenshot({ path: path.join(output, `${name}.jpg`), type: 'jpeg', quality: 90 });
    await shot('title');
    await page.locator('#lang-switcher').click();
    assert.match(await page.locator('.title-description').textContent(), /When the city sleeps/);
    await page.locator('#lang-switcher').click();
    await page.locator('#sfx-toggle').click();
    assert.equal(await page.evaluate(() => localStorage.getItem('arcade_sfx_volume')), '0');
    await page.locator('#sfx-toggle').click();
    await page.setViewportSize({ width: 390, height: 844 });
    await shot('title-mobile');
    const overflow = await page.locator('#title-screen').evaluate(el => el.scrollWidth > el.clientWidth);
    assert.equal(overflow, false, 'Mobile title must not overflow horizontally');
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.locator('#title-btn-enter').click();
    await shot('auth');
    await page.locator('#auth-btn-skip').click();
    await page.waitForFunction(() => !document.getElementById('auth-panel').offsetWidth);
    await page.locator('#title-btn-enter').click();
    await page.waitForSelector('#hud:not(.hidden)');
    await page.waitForTimeout(1200);
    await shot('plaza');
    await page.keyboard.press('Escape');
    await page.waitForSelector('#escape-menu:not(.hidden)');
    await page.locator('#sfx-volume').fill('35');
    assert.equal(await page.evaluate(() => localStorage.getItem('arcade_sfx_volume')), '0.35');
    await shot('pause');
    await page.locator('#escape-btn-resume').click();
    // Capture the actual game render passes without adding debug hooks to production.
    assert.ok(threeURL, 'Three.js module must have loaded');
    await page.evaluate(async url => {
      const { Scene } = await import(url);
      const original = Scene.prototype.onBeforeRender;
      Scene.prototype.onBeforeRender = function (renderer, scene, camera, target) {
        if (camera.isPerspectiveCamera) window.__artScene = { renderer, scene, camera, target };
        else window.__artPost = { scene, camera };
        return original.call(this, renderer, scene, camera, target);
      };
    }, threeURL);
    await page.waitForFunction(() => window.__artScene && window.__artPost);
    // Exercise real floor transitions through E, including arrival particles.
    await page.evaluate(() => window.__artScene.camera.position.set(.9, 1.6, 1.1));
    await page.keyboard.press('e');
    await page.waitForSelector('#floor-fade');
    await page.waitForTimeout(450);
    await shot('transition');
    await page.waitForSelector('#floor-fade', { state: 'detached' });
    assert.equal(await page.locator('#district-name').textContent(), '记忆深渊');
    await page.evaluate(() => window.__artScene.camera.position.set(0, -3.4, 7.5));
    await page.keyboard.press('e');
    await page.waitForSelector('#floor-fade');
    await page.waitForSelector('#floor-fade', { state: 'detached' });
    await page.evaluate(() => { window.requestAnimationFrame = () => 0; });
    await page.waitForTimeout(200);
    const scenes = [
      ['arcade', [7, 1.65, 1.5], [10.7, 1.6, -3.5], '蜂巢游戏厅'],
      ['tavern', [-7.2, 1.65, -1.5], [-11, 1.65, 3.3], '铁锚酒馆'],
      ['band', [-11.5, 1.9, .9], [-11.6, 1.45, -3.1], '铁锚酒馆 · 骷髅乐队'],
      ['depths', [0, -3.35, 6], [0, -3.0, -2], '记忆深渊'],
      ['rooftop', [-3.7, 13.65, 2.8], [0, 14.1, -8], '午夜观星台'],
      ['starry-sky', [0, 13.65, 1], [-20, 36, -20], '笔触星空 · 夜间观测'],
      ['sanctuary', [0, 17.65, 3], [0, 17.8, -3], '万国微缩馆'],
    ];
    for (const [zone, position, target, label] of scenes) {
      await page.evaluate(async ({ zone, position, target, label, threeURL }) => {
        const THREE = await import(threeURL);
        const { renderer, scene, camera, target: lowRes } = window.__artScene;
        const surface = ['arcade', 'tavern', 'band'].includes(zone);
        ['VoxelArcade', 'VoxelTavern', 'VoxelPlaza'].forEach(name => { scene.getObjectByName(name).visible = surface; });
        scene.getObjectByName('VoxelDepths').visible = zone === 'depths';
        scene.getObjectByName('VoxelRooftop').visible = zone === 'rooftop' || zone === 'starry-sky';
        scene.getObjectByName('WorldSanctuary').visible = zone === 'sanctuary';
        scene.getObjectByName('SurfaceMoonlight').castShadow=surface;
        scene.background = new THREE.Color(zone === 'rooftop' ? 0x040412 : 0x182133);
        scene.fog = new THREE.Fog(zone === 'rooftop' ? 0x040412 : zone === 'depths' ? 0x0a0a1f : 0x182133, zone === 'rooftop' ? 18 : 10, zone === 'rooftop' ? 65 : 34);
        camera.position.set(...position); camera.lookAt(...target);
        document.getElementById('district-name').textContent = label;
        document.querySelector('.district-code').textContent = zone.toUpperCase();
        renderer.setRenderTarget(lowRes); renderer.render(scene, camera);
        renderer.setRenderTarget(null); renderer.render(window.__artPost.scene, window.__artPost.camera);
      }, { zone, position, target, label, threeURL });
      await shot(zone);
    }
    const cats = await page.evaluate(async threeURL => {
      const THREE = await import(threeURL);
      const { Cat } = await import('/src/three/Cat.js');
      const { renderer, target: lowRes } = window.__artScene;
      const scene = new THREE.Scene();scene.background = new THREE.Color(0x172231);
      scene.add(new THREE.HemisphereLight(0xbad9e9, 0x485462, 2));
      const key = new THREE.DirectionalLight(0xffdbac, 2.5);key.position.set(-2, 4, 4);scene.add(key);
      const breeds = ['orange', 'ragdoll', 'russian_blue', 'blue_white'];
      const result = breeds.map((breed,i) => {
        const cat = new Cat(breed, new THREE.Vector3((i-1.5)*.9, 0, 0), {xMin:-4,xMax:4,zMin:-4,zMax:4});
        cat._isSitting = i === 1;cat._idleTimer = 10;cat._wanderTimer = 10;
        const player = new THREE.Vector3(cat.group.position.x, 1.6, 2);
        cat.group.rotation.y = Math.PI;
        if(i===0)cat.pet(player);
        cat.update(.2,player);scene.add(cat.group);
        const model={breed,eyes:!!cat.group.getObjectByName('eyes'),height:cat.group.position.y};
        if(i===0){cat.update(2,player);model.landed=cat.group.position.y===0;cat._petAnimation=1.3;cat.update(.05,player);}
        return model;
      });
      const camera = new THREE.PerspectiveCamera(38, 1440/900, .1, 30);camera.position.set(0, 1.25, 4.9);camera.lookAt(0,.38,0);
      renderer.setRenderTarget(lowRes);renderer.render(scene,camera);renderer.setRenderTarget(null);renderer.render(window.__artPost.scene,window.__artPost.camera);
      return result;
    }, threeURL);
    assert.ok(cats.every(cat => cat.eyes));assert.equal(cats[0].landed, true);
    await shot('cats');
    const hands = await page.evaluate(async threeURL => {
      const THREE = await import(threeURL);
      const { FirstPersonCamera } = await import('/src/three/FirstPersonCamera.js');
      const {renderer,target:lowRes}=window.__artScene;
      const scene=new THREE.Scene();scene.background=new THREE.Color(0x172231);
      scene.add(new THREE.HemisphereLight(0xc1dce9,0x4b5d74,2));
      const camera=new THREE.PerspectiveCamera(55,1440/900,.08,30);scene.add(camera);
      const controller=new FirstPersonCamera(camera);controller.showHands();controller._updateHands(.3,false);
      const jointed=controller._handRigs.every(rig=>rig.fingers.length===4&&rig.fingers.every(finger=>!!finger.tip)&&!!rig.thumbTip);
      controller.gesture('drink');controller._updateHands(.3,false);
      const holding=controller._handRigs[1].glass.visible;
      renderer.setRenderTarget(lowRes);renderer.render(scene,camera);renderer.setRenderTarget(null);renderer.render(window.__artPost.scene,window.__artPost.camera);
      controller.setHandsVisible(false);controller._updateHands(.1,false);
      return {jointed,holding,hidden:!controller._lHand.visible&&!controller._rHand.visible};
    },threeURL);
    assert.deepEqual(hands,{jointed:true,holding:true,hidden:true});await shot('hands');
    await page.emulateMedia({reducedMotion:'reduce'});
    const eve=await page.evaluate(async()=>{
      const {EveCompanionView}=await import('/src/ui/EveCompanionView.js');
      const view=new EveCompanionView();view.syncMode(false);view.thinking();
      const thinking=document.getElementById('eve-phone').dataset.state==='thinking';
      view.react('cat_pet');view.speak('今晚有你在，信号似乎稳定了一些。',2);
      const speaking=document.getElementById('eve-phone').dataset.state==='speaking';
      view.draw(2);window.__artEve=view;
      return {thinking,speaking,portrait:view.canvas.width,previousEnabled:!document.getElementById('eve-previous').disabled};
    });
    assert.deepEqual(eve,{thinking:true,speaking:true,portrait:96,previousEnabled:true});
    await page.locator('#eve-phone-frame').screenshot({path:path.join(output,'eve.png')});
    await page.emulateMedia({reducedMotion:'no-preference'});
    const effects = await page.evaluate(async () => {
      const { ParticleBurst } = await import('/src/three/ParticleBurst.js');
      const { scene } = window.__artScene;
      const before = scene.children.length;
      for (let i = 0; i < 20; i++) ParticleBurst.spawn(scene, { x: 0, y: 1, z: 0 }, { count: 100, kind: 'teleport' });
      const bounded = ParticleBurst.activeCount;
      ParticleBurst.update(3);
      return { bounded, active: ParticleBurst.activeCount, before, after: scene.children.length };
    });
    assert.equal(effects.bounded, 12); assert.equal(effects.active, 0); assert.equal(effects.after, effects.before);
    // Render every sound into an offline audio graph to catch invalid envelopes,
    // clipped samples, silent cues and nodes that fail to retire.
    const sounds = await page.evaluate(async () => {
      const { SoundDesign } = await import('/src/three/SoundDesign.js');
      const ids = ['sfx_hover', 'sfx_confirm', 'sfx_coin', 'sfx_shard', 'sfx_drink', 'sfx_step', 'sfx_portal', 'sfx_arrive', 'sfx_achievement', 'sfx_boot', 'sfx_cat', 'sfx_eve'];
      const result = [];
      for (const id of ids) {
        const context = new OfflineAudioContext(1, 48000, 48000);
        const sound = new SoundDesign(context, context.destination);
        sound._schedule(id, .55, { surface: 'tavern' });
        const buffer = await context.startRendering();
        const samples = buffer.getChannelData(0);
        let peak = 0, energy = 0;
        for (const sample of samples) { peak = Math.max(peak, Math.abs(sample)); energy += sample * sample; }
        result.push({ id, peak, rms: Math.sqrt(energy / samples.length), voices: sound.voices });
      }
      return result;
    });
    for (const sound of sounds) { assert.ok(sound.peak > .0001 && sound.peak < 1, `${sound.id} must be audible and unclipped`); assert.equal(sound.voices, 0); }
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ passed: true, scenes: scenes.length + 1, cats, hands, eve, effects, sounds, screenshots: output }, null, 2));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
