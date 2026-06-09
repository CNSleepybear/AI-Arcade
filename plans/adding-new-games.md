# 新游戏接入指南

> AI Arcade 街机厅 — 如何快速接入新游戏
> 最后更新: 2025-05-31

---

## 当前游戏列表

| # | 游戏 | ID | 类型 | 备注 |
|---|------|-----|------|------|
| 1 | ANOMALY: Survive the Meta | `anomaly` | Canvas 2D 射击 Roguelike | 规则崩坏，矩阵雨 |
| 2 | CYBER HUNDER (海克斯战机) | `cyber-hunder` | Three.js 3D 战机 Roguelike | 海克斯强化 x 机甲 x Boss |
| 3 | Dark Water Stealth (暗水潜行) | `dark-water-stealth` | React/TS 路亚钓鱼 | 需 npm run build 构建 |
| 4 | Leave at 6PM (六点必须走) | `leave-at-6pm-evolved` | Canvas 2D 社畜 Roguelike | 广州 CBD 穿越 |

---

## 概览

将一个新 HTML 游戏接入 AI Arcade 街机厅，需要修改 **3 个文件**、新增 **1 个桥接脚本**、准备 **1 个游戏目录**。整个过程约 10 分钟。

---

## 步骤概览

| 步骤 | 动作 | 文件 |
|------|------|------|
| 1 | 放置游戏文件 | `public/games/[game-name]/index.html` |
| 2 | 注册游戏元数据 | [`src/games/registry.js`](src/games/registry.js) |
| 3 | 编写吸引画面渲染器 | [`src/three/AttractModes.js`](src/three/AttractModes.js) |
| 4 | 创建街机桥接脚本 | `public/games/[game-name]/js/arcade_bridge.js` |
| 5 | 接入 SDK + 桥接 | `public/games/[game-name]/index.html` (追加 script 标签) |
| 6 | 注册 i18n 翻译 | [`src/data/i18n.js`](src/data/i18n.js) |

---

## 步骤 1：放置游戏文件

将游戏整个目录（或单文件）放入 `public/games/` 下：

```
public/games/[game-name]/
  index.html          # 必需：游戏入口页面
  js/                 # 可选：游戏 js
  css/                # 可选：游戏样式
  assets/             # 可选：游戏资源
```

**要求**：
- 入口文件必须是 `index.html`
- 游戏应该在 iframe 中正常渲染，不依赖 `window.top` 之类的父窗口引用
- 建议 canvas 尺寸自适应，使用 `width:100%; height:100%` 或 CSS `object-fit`

---

## 步骤 2：注册游戏元数据

编辑 [`src/games/registry.js`](src/games/registry.js)，在 `GAME_REGISTRY` 数组中追加一个条目：

```js
{
  id: 'my-game',                              // 唯一 ID（slug，全小写，连字符分隔）
  name: 'My Game',                            // 显示名称
  subtitle: '我的游戏',                         // 副标题（中文）
  path: 'games/my-game/index.html',           // ⚠️ 相对路径，不要前导 / ！
  cabinetTexture: '/textures/cabinet_neon.png', // 机柜贴图（3 选 1 见下文，仅元数据）
  marqueeTexture: null,                       // 灯箱贴图（通常 null，自动生成）
  attractColor: '#ff8800',                    // 吸引模式主色调（hex）
  panelTexture: null,                         // 控制面板贴图（通常 null）
  status: 'ready',                            // 'ready' 可玩 | 'locked' 锁定
  description: '一句话描述游戏玩法'               // 悬停提示
}
```

### 机柜贴图选项

| 贴图 | 路径 | 风格 |
|------|------|------|
| 木纹 | `/textures/cabinet_wood.png` | 经典复古 |
| 霓虹黑 | `/textures/cabinet_neon.png` | 赛博霓虹 |
| 暗黑 | `/textures/cabinet_dark.png` | 深渊暗黑 |

---

## 步骤 3：编写吸引画面渲染器

编辑 [`src/three/AttractModes.js`](src/three/AttractModes.js)，添加一个 **导出函数** 和 **调度表条目**：

### 3a. 编写渲染函数

```js
// [game-id]: 描述游戏主题
export function drawMyGameAttract(ctx, w, h, time, color) {
  // 1. 清背景
  ctx.fillStyle = '#050508';
  ctx.fillRect(0, 0, w, h);

  const cx = w / 2, cy = h / 2;

  // 2. 画游戏主题动画（几何图形、粒子、glitch 等任意 Canvas 2D）
  // ... 你的动画代码 ...

  // 3. 画标题
  ctx.fillStyle = color || '#0ff';
  ctx.font = 'bold 40px monospace';
  ctx.textAlign = 'center';
  ctx.shadowColor = color;
  ctx.shadowBlur = 20;
  ctx.fillText('MY GAME', cx, h * 0.78);
  ctx.shadowBlur = 0;

  // 4. 画副标题
  ctx.fillStyle = '#aaa';
  ctx.font = '16px monospace';
  ctx.fillText('我的游戏', cx, h * 0.87);
}
```

**可用的参数**：
- `ctx: CanvasRenderingContext2D` — 512×384 Canvas 上下文
- `w: number` — 512
- `h: number` — 384
- `time: number` — 累计时间（秒），用于驱动动画
- `color: string` — 你在 registry 中设定的 `attractColor`

**参考已有渲染器**：
- [`drawRoshamboAttract`](src/three/AttractModes.js:10) — 几何闪烁 + glitch 线条
- [`drawAbyssAnglerAttract`](src/three/AttractModes.js:76) — 呼吸光晕 + 粒子旋涡
- [`drawPaperRitualAttract`](src/three/AttractModes.js:129) — 符纸晃动 + 灰烬粒子
- [`drawAnomalyAttract`](src/three/AttractModes.js:193) — 矩阵雨 + 腐败光环 + glitch 块

### 3b. 注册到调度表

在 `ATTRACT_RENDERERS` 对象中添加：

```js
export const ATTRACT_RENDERERS = {
  'anomaly': drawAnomalyAttract,
  // ... 已有条目 ...
  'my-game': drawMyGameAttract,     // ← 新增
};
```

---

## 步骤 4：创建街机桥接脚本

在游戏目录下创建 `js/arcade_bridge.js`，包含三个核心功能：

### 4a. 游戏启动检测 + 分数上报

```js
(function () {
  'use strict';

  var _gameStarted = false;
  var _reported = false;

  // ==================== 游戏启动检测 ====================
  var startObserver = new MutationObserver(function () {
    var startScreen = document.getElementById('start-screen');
    if (startScreen && getComputedStyle(startScreen).display === 'none' && !_gameStarted) {
      _gameStarted = true;
      // ★ 应用排队中的语言（见 4b）
      if (_pendingLang) { /* apply language */ }
      // 通知大厅游戏已开始
      if (window.ArcadeSDK) window.ArcadeSDK.reportGameStarted();
    }
    if (startScreen && getComputedStyle(startScreen).display !== 'none') {
      _gameStarted = false;
      _reported = false;
    }
  });
  var ss = document.getElementById('start-screen');
  if (ss) startObserver.observe(ss, { attributes: true, attributeFilter: ['style', 'class'] });

  // ==================== 游戏结束检测 ====================
  function reportGameOver() {
    if (_reported) return;
    _reported = true;

    // ★ 从 DOM 读取分数
    var scoreEl = document.getElementById('finalScore');
    var score = scoreEl ? parseInt(scoreEl.textContent) || 0 : 0;

    // ★ 计算属性成长
    var statGrowth = {};
    if (score > 500) statGrowth.atk = 1;

    if (window.ArcadeSDK) {
      window.ArcadeSDK.reportGameOver({
        score: score,
        statGrowth: statGrowth,
        newUnlocks: [],
        gameId: 'my-game',
      });
    }
  }

  // 监听游戏结束面板出现
  function startObserving() {
    var goScreen = document.getElementById('gameOverScreen');
    if (goScreen) {
      var observer = new MutationObserver(function () {
        if (getComputedStyle(goScreen).display !== 'none' && !_reported) {
          setTimeout(reportGameOver, 200);
        }
        if (getComputedStyle(goScreen).display === 'none') _reported = false;
      });
      observer.observe(goScreen, { attributes: true, attributeFilter: ['style', 'class'] });
    } else { setTimeout(startObserving, 500); }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(startObserving, 1000); });
  } else { setTimeout(startObserving, 1000); }

  // ==================== 语言同步 (4b) ====================
  var _pendingLang = null;

  function _applyLanguage(lang) {
    // ★ 调用游戏的 i18n setter，根据游戏调整 ★
    if (typeof setLang === 'function') {
      try { setLang(lang); return true; } catch (e) { return false; }
    }
    return false;
  }

  if (window.ArcadeSDK) {
    // 注册语言变更回调（首次立即触发）
    window.ArcadeSDK.onLangChange(function (lang) {
      _pendingLang = lang;
      if (_gameStarted) {
        _applyLanguage(lang);
      }
      // 否则排队，等游戏启动时应用
    });
  }

  // ==================== 角色属性注入 ====================
  if (window.ArcadeSDK) {
    window.ArcadeSDK.onReady(function (ctx) {
      console.log('[ArcadeBridge] Character:', ctx.charName, ctx.stats);
      // ★ 将 ctx.stats.atk/def/spd/crt/luck 注入到游戏 ★
    });
  }

  // ==================== 隐藏游戏内语言切换按钮 ====================
  // SDK 的 CSS 注入会处理大部分情况，这里做 JS 兜底
  function hideLangToggles() {
    var toggles = document.querySelectorAll(
      '[id*="lang-btn"], [id*="lang-toggle"], [id*="lang-switch"], .lang-toggle-btn'
    );
    for (var i = 0; i < toggles.length; i++) toggles[i].style.display = 'none';
  }
  hideLangToggles();
  setTimeout(hideLangToggles, 500);
  setTimeout(hideLangToggles, 2000);

  console.log('[ArcadeBridge] Initialized');
})();
```

### 4b. 语言同步要点

- 街机厅通过 URL 参数 `?lang=zh` 传递当前语言
- `ArcadeSDK.onLangChange(cb)` 首次立即触发 + 后续 `LANG_SWITCH` 消息时触发
- **关键**：语言必须在游戏启动后才应用（`setLang` 通常会调用 `game.updateUI()`，启动前调用会崩溃）
- 桥梁存储 `_pendingLang`，在检测到 `_gameStarted = true` 时延迟 100ms 后应用
- 游戏需暴露全局 i18n setter（如 `window.__setLang` 或 `setLang`），桥梁通过 try-catch + 重试调用

**关键定制点**（标了 ★）：
1. **分数 DOM 选择器** — 改为游戏实际展示分数的元素
2. **属性成长计算** — 根据游戏实际表现（分数、波次、击杀等）计算
3. **Game Over 检测方式** — 可以是 `classList.contains('active')` 或 `style.display !== 'none'` 或 `getComputedStyle`
4. **gameId** — 必须与 registry 中的 `id` 一致
5. **属性注入** — 将 `ctx.stats` 写入游戏的全局变量或数值

---

## 步骤 5：接入 SDK + 桥接到 index.html

编辑游戏的 `index.html`，在 `<body>` 底部、所有游戏脚本之前添加 SDK：

```html
<!-- Arcade SDK: 处理 ESC 退出 + 属性注入 + 分数上报 + 存读档 -->
<script src="../shared/arcade-game-sdk.js"></script>

<!-- 以下是游戏自身的脚本 -->
<script src="js/game.js"></script>

<!-- Arcade Bridge: 自动检测游戏结束并上报分数 -->
<script src="js/arcade_bridge.js"></script>
```

**重要**：`arcade-game-sdk.js` 必须在所有其他脚本之前加载，它会自动：
- 监听 ESC → 发送 `EXIT_GAME` postMessage
- 从 URL 参数读取角色属性 `?atk=10&def=10&spd=10&crt=5&luck=10`
- 通过 `ArcadeSDK.reportGameOver()` 上报分数
- 通过 `ArcadeSDK.saveSession()` / `ArcadeSDK.getSession()` 存读档

---

## 检查清单

- [ ] 游戏目录放在 `public/games/[game-name]/` 下
- [ ] 入口文件为 `index.html`
- [ ] 在 `src/games/registry.js` 注册元数据，`status: 'ready'`
- [ ] 在 `src/three/AttractModes.js` 添加 attract 渲染器 + 调度表条目
- [ ] 游戏 `index.html` 加载了 `../shared/arcade-game-sdk.js`
- [ ] 创建了 `js/arcade_bridge.js` 并加载
- [ ] 桥接脚本正确读取 Game Over 后的分数
- [ ] `gameId` 与 registry 中的 `id` 一致
- [ ] 机台 "按 E 坐下" 交互正常
- [ ] ESC 能正常退出回街机厅
- [ ] 分数能正常上报到街机厅
- [ ] 游戏在 iframe 中 UI 正常（无 `window.top` 依赖）

---

## 常见问题

### Q: 游戏放在 iframe 里尺寸不对？

确保游戏根容器使用相对尺寸：`width: 100%; height: 100vh` 或 `position: fixed; inset: 0`。

### Q: 游戏内部也有 ESC 菜单冲突？

`arcade-game-sdk.js` 的 ESC 处理在 capture 阶段，且不会在 INPUT 聚焦时触发。如果你的游戏有自定义 ESC 行为（如设置面板），SDK 会正常放行——不会双重触发。

### Q: 如何让游戏支持存读档？

在桥接脚本中调用 `ArcadeSDK.saveSession({ /* 游戏状态 */ })` 定期保存，在 `ArcadeSDK.onReady()` 中通过 `ArcadeSDK.getSession()` 恢复。

### Q: attractColor 选什么？

建议选取与游戏主题色一致、高饱和度的颜色，在暗色背景上要有足够对比度。例如：
- 赛博朋克：`#00ff44`（绿）、`#ff00cc`（品红）、`#00ccff`（青）
- 暗黑奇幻：`#ff4444`（红）、`#aa44ff`（紫）
- 像素复古：`#ffcc00`（金）、`#ff8844`（橙）

---

## 打包为 Windows .exe

### 前置条件

一次性的环境准备（首次打包才需要）：

```bash
npm install
```

这会安装 Electron + electron-builder（已在 `package.json` devDependencies 中声明）。

### 一键打包

```bash
npm run electron:build
```

等价于执行：
1. `vite build` — 把项目构建到 `dist/`
2. `electron-builder --win portable` — 把 `dist/` + Electron 运行时打包成单个 `.exe`

输出文件：`release/AI-Arcade-{version}.exe`（约 100 MB，免安装便携版）。

### 打包产物目录结构

```
release/
  AI-Arcade-1.0.0.exe          ← 分发给用户的免安装 exe
  win-unpacked/                 ← 解包后的调试目录（可直接运行 AI Arcade.exe）
  builder-debug.yml             ← 构建日志
```

### 路径铁律：禁止绝对路径

**所有运行时引用的资源路径必须用相对路径，不能以 `/` 开头。**

原因：Electron 用 `file://` 协议加载 `dist/index.html`。绝对路径 `/games/xxx` 会被解析为 `file:///games/xxx`（磁盘根目录），而不是 `dist/games/xxx`。

| 位置 | ❌ 错误 | ✅ 正确 |
|------|---------|---------|
| [`registry.js`](src/games/registry.js) `path` | `'/games/my-game/index.html'` | `'games/my-game/index.html'` |
| [`characterDB.js`](src/data/characterDB.js) `avatar` | `'/characters/char_01.png'` | `'characters/char_01.png'` |
| 游戏 HTML 内引用的资源 | `src="/assets/logo.png"` | `src="assets/logo.png"` |

> **注意**：`cabinetTexture` 字段（如 `/textures/cabinet_neon.png`）仅作元数据，实际机柜贴图由 [`PixelTextureGenerator`](src/three/PixelTextureGenerator.js) 程序化生成，不受此限制。

### 已知问题与对策

#### 1. 退出游戏后卡死

**现象**：玩完一局游戏按 ESC 退出后画面冻结。

**原因**：复杂游戏（如 ANOMALY）有自己的 WebGL 上下文 + rAF 渲染循环。仅清空 iframe `src` 无法终止这些底层资源，它们会与父页面的 Three.js 渲染循环争抢 GPU。

**对策**：`exitGame()` 中直接 **替换整个 `<iframe>` DOM 元素**，销毁旧文档及所有关联的 WebGL 上下文、定时器：

```js
// exitGame() — src/main.js
const oldFrame = document.getElementById('game-frame');
const newFrame = document.createElement('iframe');
newFrame.id = 'game-frame';
newFrame.setAttribute('allow', 'autoplay; fullscreen');
oldFrame.parentNode.replaceChild(newFrame, oldFrame);
```

新游戏接入时，如果也有自己的 WebGL/Canvas 渲染循环，无需额外处理——这个机制对所有游戏生效。

#### 2. ESC 键在 Electron 中的行为

ESC 在 Electron 中 **可以正常工作**（与浏览器行为一致）。之前误判为"Electron 吞噬 ESC"是因为退出卡死导致看起来 ESC 没反应。

**ESC 键完整链路**：
```
用户按 ESC
  ├─ 在街机厅漫游中 → 释放鼠标 + 关闭所有面板
  ├─ 在游戏 iframe 中 → arcade-game-sdk.js 拦截
  │     └─ postMessage('EXIT_GAME') → 父页面 exitGame()
  └─ 在聊天输入框中 → 关闭聊天框
```

#### 3. 文件协议下的 Pointer Lock

`canvas.requestPointerLock()` 在 `file://` 协议下需要用户手势（click 事件）。代码中已通过 `canvas.addEventListener('click', ...)` 触发，正常可用。

### 新增游戏后的打包检查清单

- [ ] `registry.js` 中 `path` 使用**相对路径**（无前导 `/`）
- [ ] 游戏 `index.html` 内所有资源引用为相对路径
- [ ] 游戏已加载 `../shared/arcade-game-sdk.js`
- [ ] `npm run electron:build` 构建成功
- [ ] 运行 exe，进入游戏 → 游玩 → ESC 退出，无卡死
- [ ] 再次进入同一游戏，正常加载
- [ ] `release/` 目录已加入 `.gitignore`

### 技术架构速览

```
┌─────────────────────────────────────────┐
│  electron-main.js (Node 主进程)          │
│  └─ BrowserWindow                       │
│      └─ loadFile('dist/index.html')     │
│          └─ Vite 构建产物 (file://)      │
│              ├─ Three.js 3D 街机厅      │
│              ├─ src/main.js (游戏逻辑)   │
│              └─ <iframe> 内嵌游戏        │
│                  ├─ arcade-game-sdk.js   │
│                  └─ 游戏自身代码         │
└─────────────────────────────────────────┘
```

### 版本升级

修改 `package.json` 中的 `version` 字段（如 `"1.0.0"` → `"1.1.0"`），打包后的 exe 文件名会自动更新为 `AI-Arcade-1.1.0.exe`。
