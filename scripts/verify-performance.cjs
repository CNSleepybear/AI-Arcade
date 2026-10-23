/* ARCADE_URL=http://127.0.0.1:3001 node scripts/verify-performance.cjs
 * Uses the same isolated local backend as verify-art.cjs.
 */
const { chromium } = require('playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-webgl', '--ignore-gpu-blocklist'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
    const errors = [];
    const modules = {};
    page.on('request', request => {
      const url = new URL(request.url());
      if (url.pathname.endsWith('.js')) modules[url.pathname] = request.url();
    });
    page.on('pageerror', error => errors.push(error.message));
    await page.route('http://127.0.0.1:54321/**', route => route.fulfill({ contentType: 'application/json', body: '[]' }));
    await page.routeWebSocket('ws://127.0.0.1:54321/**', () => {});
    await page.route(url => url.pathname.startsWith('/games/'), route => route.fulfill({ contentType: 'text/html', body: '<button id="exit">EXIT</button><script>document.getElementById("exit").onclick=()=>parent.postMessage({type:"EXIT_GAME"},"*")</script>' }));
    await page.goto(process.env.ARCADE_URL || 'http://127.0.0.1:3001/');
    await page.waitForSelector('#system-boot.hidden', { state: 'attached' });
    await page.evaluate(async modules => {
      const THREE = await import(modules['/node_modules/.vite/deps/three.js']);
      window.__perf = { renders: 0, depths: 0, rooftop: 0, sanctuary: 0 };
      const original = THREE.Scene.prototype.onBeforeRender;
      THREE.Scene.prototype.onBeforeRender = function (renderer, scene, camera, target) {
        if (camera.isPerspectiveCamera) {
          window.__perf.renders++;
          window.__render = { renderer, camera, target };
        }
        return original.call(this, renderer, scene, camera, target);
      };
      for (const name of ['VoxelDepths', 'VoxelRooftop', 'WorldSanctuary']) {
        const module = await import(modules[`/src/three/${name}.js`]);
        const update = module[name].prototype.update;
        const key = { VoxelDepths: 'depths', VoxelRooftop: 'rooftop', WorldSanctuary: 'sanctuary' }[name];
        module[name].prototype.update = function (...args) { window.__perf[key]++; return update.apply(this, args); };
      }
      const { ArcadeMachine } = await import(modules['/src/three/ArcadeMachine.js']);
      const update = ArcadeMachine.prototype.update;
      window.__machines = [];
      ArcadeMachine.prototype.update = function (...args) {
        if (!window.__machines.includes(this)) window.__machines.push(this);
        return update.apply(this, args);
      };
    }, modules);
    await page.locator('#title-btn-enter').click();
    await page.locator('#auth-btn-skip').click();
    await page.waitForFunction(() => !document.getElementById('auth-panel').offsetWidth);
    await page.locator('#title-btn-enter').click();
    await page.waitForFunction(() => window.__render);
    await page.waitForTimeout(350);
    const active = await page.evaluate(() => ({ ...window.__perf }));
    assert.ok(active.renders > 1);
    assert.equal(active.depths + active.rooftop + active.sanctuary, 0, 'Inactive floors must not update');
    await page.keyboard.down('w');
    await page.waitForTimeout(120);
    await page.evaluate(() => window.dispatchEvent(new Event('blur')));
    const stopped = await page.evaluate(() => { const p = window.__render.camera.position; return [p.x, p.z]; });
    await page.waitForTimeout(200);
    assert.deepEqual(await page.evaluate(() => { const p = window.__render.camera.position; return [p.x, p.z]; }), stopped, 'Blur must clear held movement');
    await page.keyboard.up('w');
    await page.keyboard.press('Escape');
    await page.waitForSelector('#escape-menu:not(.hidden)');
    await page.waitForTimeout(100);
    assert.equal(await page.evaluate(() => !!document.pointerLockElement), false, 'Panel-close timers must not recapture the cursor during pause');
    const paused = await page.evaluate(() => window.__perf.renders);
    await page.waitForTimeout(300);
    assert.equal(await page.evaluate(() => window.__perf.renders), paused, 'Paused hall must reuse its last frame');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(200);
    const portrait = await page.evaluate(() => ({ width: window.__render.target.width, height: window.__render.target.height, dpr: window.__render.renderer.getPixelRatio(), renders: window.__perf.renders }));
    assert.ok(portrait.width <= 390 && portrait.height <= 720);
    assert.equal(portrait.dpr, 1);
    assert.ok(portrait.renders > paused, 'Resizing a paused hall must redraw');
    await page.screenshot({ path: 'artifacts/nightshift/pause-mobile.png' });
    await page.locator('#escape-btn-resume').click();
    await page.waitForFunction(count => window.__perf.renders > count, portrait.renders);
    const resources = await page.evaluate(async modules => {
      const { getVideoManager } = await import(modules['/src/three/VideoManager.js']);
      const vm = getVideoManager();
      const before = document.querySelectorAll('video').length;
      vm.initAll(); vm.initAll();
      const after = document.querySelectorAll('video').length;
      const { ArcadeMachine } = await import('/src/three/ArcadeMachine.js');
      const machine = new ArcadeMachine({ id: 'test', name: 'TEST', status: 'ready' }, 0, 0);
      machine.update(0);
      const screen = machine.screenTexture.version, marquee = machine._marqueeMesh.material.map.version;
      for (let i = 0; i < 120; i++) machine.update(1 / 120);
      return { before, after, screenUploads: machine.screenTexture.version - screen, marqueeUploads: machine._marqueeMesh.material.map.version - marquee };
    }, modules);
    assert.equal(resources.after, resources.before, 'Re-entry must not duplicate video decoders');
    assert.ok(resources.screenUploads >= 23 && resources.screenUploads <= 25);
    assert.ok(resources.marqueeUploads >= 9 && resources.marqueeUploads <= 11);
    // Enter and exit through the real cabinet/iframe bridge. Only the independent
    // child game's contents are replaced with a local fixture.
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.evaluate(() => {
      const machine = window.__machines.filter(m => m.config.status === 'ready')[0];
      window.__render.camera.position.set(machine.group.position.x, 1.6, machine.group.position.z + 1.2);
    });
    await page.keyboard.press('e');
    await page.waitForSelector('#game-container:not(.hidden)');
    await page.waitForTimeout(100);
    const playing = await page.evaluate(() => window.__perf.renders);
    await page.waitForTimeout(300);
    assert.equal(await page.evaluate(() => window.__perf.renders), playing, 'Child games must own the GPU while playing');
    await page.frameLocator('#game-frame').locator('#exit').click();
    await page.waitForSelector('#game-container.hidden', { state: 'attached' });
    await page.waitForFunction(count => window.__perf.renders > count, playing);
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ active, paused, portrait, resources, playing, errors }, null, 2));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
