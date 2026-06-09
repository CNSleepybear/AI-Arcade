# AI Arcade — 最终美术风格评审与优化方案

> 评审日期：2026-06-02
> 评审范围：Gemini V3 像素管线、五大场景、街机柜、UI/HUD、粒子系统、角色、灯光

---

## 一、总体评分：79/100（B+）

| 维度 | 满分 | 得分 | 评级 |
|------|------|------|------|
| 风格统一性 | 20 | 17 | A |
| 像素管线执行 | 20 | 18 | A- |
| 环境场景质量 | 20 | 16 | B+ |
| 灯光与氛围 | 15 | 11 | B |
| UI/HUD 匹配度 | 10 | 7 | B- |
| 动效与粒子系统 | 10 | 7 | B- |
| 角色与 NPC 设计 | 5 | 3 | C+ |

---

## 二、逐项评审

### 2.1 风格统一性 — 17/20（A）

**亮点：**
- "Gemini V3" 像素复古风贯穿全局，各场景（酒馆/广场/街机厅/深渊/屋顶）共享同一套 `PixelTextureGenerator` 纹理体系
- 所有纹理统一使用 `NearestFilter`，保证了像素锐利一致
- 色彩温度把控精准：表面层（酒馆/广场/街机厅）统一暖色调 `#332a22` 背景雾色；深渊层切换为冷蓝紫 `#0a0a14`；屋顶层深靛蓝 `#040412`
- 场景过渡使用不同色彩的 overlay 淡入淡出（#050510→#1a1008→#040412→#0a0a1e），色相衔接自然

**扣分项（-3）：**
- 酒馆的发光杯 (`VoxelTavern._buildGlowingCups`) 使用 `PointLight` + `MeshBasicMaterial` 的现代发光风格，与像素纹理的 "粗糙木质感" 略有冲突
- Sanctuary 万国馆的 FlatShading 玻璃球 (`flatShading: true`) 与全局 voxel 风格不完全一致

---

### 2.2 像素管线执行 — 18/20（A-）

**亮点：**
- 独创的 "Gemini V3 两遍渲染管线"：低分辨率 RenderTarget (800×H, NearestFilter) → 后处理 Bayer Dither + 色彩量化，实现了像素复古效果
- `retroShader` 中实现了 gamma 暗区补偿 (`pow(color, 1/1.5)`)、自适应抖动掩码 (基于局部亮度)、色彩量化 (14 级深度)、轻微去饱和
- 关闭 ACES 色调映射的决策正确——保留了像素色谱不被压碎
- `PixelTextureGenerator` 的三代核心生成器（`geminiPixel` / `geminiStriped` / `geminiSpeckled`）设计精良，64×64 画布 + 噪声块

**扣分项（-2）：**
- 后处理 shader 中的 Bayer 阈值查找使用 `if/else` 链而非数组/纹理查表，效率可优化但影响极小
- 色彩量化深度 `uColorDepth = 14.0` 偏低——在低亮度区域可能出现 banding，建议提升至 18-20 并微调 gamma 补偿

---

### 2.3 环境场景质量 — 16/20（B+）

**VoxelTavern (酒馆) — 18/20：**
- 吧台细节丰富：像素木板、黄铜脚蹬、踢脚板、方块凳子
- Skeleton Band 骷髅乐队动画出色：idle/playing 状态机、草帽、像素吉他、头部点头
- 发光杯 + PointLight 营造吧台氛围
- 酒瓶架 7 瓶渐变色
- 屋顶梯子 (Rooftop Ladder) 蓝色光柱 + 标牌

**VoxelPlaza (广场) — 16/20：**
- Cyber Screen 设计精巧：1024×682 Canvas 动态绘制排行榜/世界聊天/滚动 ticker
- 黑曜石北墙堆叠方块 + 像素纹理
- 中央石柱 (深渊入口) 紫色裂纹 + 脉冲环 + 地板箭头
- 缺少更多装饰物体（仅有屏幕和柱子），略显空旷

**VoxelArcade (街机厅) — 17/20：**
- 红石灯带 (Redstone Strips) 带闪烁动画
- "蜂巢" 天花板牌匾
- 像素地毯 (arcadeCarpet) 带暗色基底 + 彩色斑点
- 缺少：墙面海报、霓虹装饰条

**VoxelDepths (深渊) — 19/20：**
- ★ 最佳场景！AI Core (Icosahedron + 双环旋转 + 光晕)、8 根数据柱（不同高度 4/6/8，发光像素方块 + 悬浮环）、记忆祭坛、钓鱼池
- 80 颗 InstancedMesh 尘埃粒子 + 地板数据流线条 (CanvasTexture offset 流动)
- 异常元素：破损街机柜 (屏幕闪烁)、幽灵 Avatar (漂浮旋转)
- 黑猫 (角落，眼睛发光，尾巴摆动)
- 钓鱼池细节：冰晶边框、青色符文浮动、冰冻雾气粒子 (AdditiveBlending)

**VoxelRooftop (屋顶) — 14/20：**
- 星空球体 Custom Shader 是亮点（Van Gogh 风格漩涡、FBM 星云、三层星星密度、蓝色行星、twinkle）
- 望远镜模型细节丰富（底座 3×2×3、镜筒、遮光罩、目镜）
- 控制台带闪烁指示灯
- 出口舱口设计完善
- 问题：场景空旷——屋顶 10×10 区域仅有望远镜和控制台，缺少更多视觉锚点

**WorldSanctuary (万国馆) — 15/20：**
- 7 个国家雪景球，每个有独特微缩模型和粒子系统 (fall/fly/rain/wind/snow/leaf/sparkle)
- 呼吸式射灯
- 深色博物馆氛围
- 问题：微缩模型使用纯色 `MeshStandardMaterial` 缺少像素纹理，与整体风格脱节

---

### 2.4 灯光与氛围 — 11/15（B）

**亮点：**
- AbyssWorld 全局灯光体系完善：暖色 AmbientLight (0xfff5ea, 1.2)、HemisphereLight、DirectionalLight (月光模拟)、Fog
- 各子场景独立补光：酒馆暖灯笼、广场琥珀屏幕光、街机厅暖色填充、深渊冷色核心光
- 走廊灯笼柱 (每隔 5m) 提供引导性照明

**扣分项（-4）：**
- **主要问题：全域 AmbientLight 强度 1.2 偏高**，导致暗部不够暗，像素复古的 "暗角氛围" 被冲淡。建议降至 0.6-0.8
- 深渊照明完全依赖 2 个 PointLight（严格限制），但核心光 `intensity: 2.0` 对 0.4 的 ambient 来说偏弱
- Rooftop 没有独立照明——完全依赖星空球体反射，地面物体在夜间不可见
- 缺少动态灯光变化（如闪烁蜡烛、屏幕反光投射）

---

### 2.5 UI/HUD 匹配度 — 7/10（B-）

**亮点：**
- HUD 使用像素风格边框 (`border: 1px solid rgba(255,170,68,0.3)`) 和等宽字体 (`Courier New`)
- 手机面板 (Chat Phone) 有刘海屏、霓虹边框、扫光效果，设计精美
- 成就弹窗有入场动画 (`achSlideIn`) 和发光呼吸 (`achGlow`)
- 钓鱼 UI 有张力条动画
- CSS 使用了 `backdrop-filter: blur` 毛玻璃效果

**扣分项（-3）：**
- CSS 中大量使用现代属性（`backdrop-filter`, `border-radius: 14px`, `box-shadow` 辉光），与像素管线 "粗糙边缘" 不一致
- 面板圆角 (`border-radius: 14px`) 属于现代 UI 语言，像素风格应使用直角或 2-4px 小圆角
- HUD 角色头像使用 `border-radius: 50%` 圆形裁剪，与 voxel 方块头风格冲突——建议改为方形头像
- 部分 CSS 使用了 `transition: all 0.2s`，与像素 "硬切" 风格不一致

---

### 2.6 动效与粒子系统 — 7/10（B-）

**亮点：**
- ArcadeMachine 动画完整：霓虹灯管闪烁 (`emissiveIntensity` 正弦波 + buzz 噪音)、Marquee 呼吸、CRT 边缘火花粒子 (`PlaneGeometry` + `AdditiveBlending`)
- Skeleton Band 状态机动画 (idle/playing 两种姿态)
- 深渊 AI Core 双环旋转（顺时针/逆时针）+ 垂直浮动
- 尘埃粒子向核心漂移
- 钓鱼池：符文浮动、冰晶浮动、冻雾粒子上升
- 地板数据线 CanvasTexture.offset 流动

**扣分项（-3）：**
- 粒子系统缺乏统一管理器——每个场景各自实现，代码分散
- ParticleBurst（通用粒子爆发）使用 `THREE.SphereGeometry` 而非像素方块，与 voxel 风格不一致
- 缺少：表面层（酒馆/广场/街机厅）的粒子氛围（如灰尘光束、壁炉火星、烟囱烟雾）
- 街机柜火花粒子的 `PlaneGeometry` 使用 `AdditiveBlending`，在像素管线中可能产生不必要的平滑发光

---

### 2.7 角色与 NPC 设计 — 3/5（C+）

**亮点：**
- PlayerAvatar 使用 Minecraft 风格方块身体 (BoxGeometry)，与 voxel 世界一致
- Sprite 面部 (NearestFilter 纹理) + 名字标签
- 坐下/站立姿态切换
- HoloNPC (酒保幽灵) 有像素精灵图 (Canvas 绘制)、对话气泡、呼吸脉冲

**扣分项（-2）：**
- 角色精灵面部使用 `textureLoader.load(this.data.avatar)` 加载外部 PNG，可能与像素纹理体系不完全匹配（取决于角色图片的绘制风格）
- HoloNPC 仅有一个 NPC 实例，其他场景缺少 NPC 点缀
- Sanctuary 雪景球内的微缩模型完全无动画（除粒子外），显得静态
- 角色阴影盘 (`_buildShadowDisc`) 使用径向渐变 Canvas，与像素方块阴影风格冲突

---

## 三、优化方案（按优先级排序）

### 🔴 P0 — 高优先级（立即修复）

#### 1. 降低全局 AmbientLight 强度
**文件：** [`AbyssWorld.js`](src/three/AbyssWorld.js:252)
```js
// 当前：const ambient = new THREE.AmbientLight(0xfff5ea, 1.2);
// 优化：
const ambient = new THREE.AmbientLight(0xfff5ea, 0.65);
```
影响：全局暗部加深，像素风格的 "暗角氛围" 恢复，让灯光更突出。

#### 2. 修复 UI 面板圆角与像素风格冲突
**文件：** [`style.css`](src/style.css)
将所有 UI 面板 `border-radius` 从 14px/12px/10px 改为 2-4px（像素硬边风格）：
```css
/* 统一替换 */
border-radius: 4px;
/* HUD 头像从圆形改为方形 */
#hud-char-portrait { border-radius: 2px; }
```
手机面板保留圆角（模拟真实手机），但减少圆角半径 (32px → 16px)。

#### 3. PixelTextureGenerator 应用于 Sanctuary 微缩模型
**文件：** [`WorldSanctuary.js`](src/three/WorldSanctuary.js:29-31)
将 `std()` 辅助函数中的纯色 material 改为引用 `PixelTextureGenerator` 的对应纹理：
```js
function std(c, r = 0.4, mt = 0) {
  return new THREE.MeshStandardMaterial({
    map: PixelTextureGenerator.geminiPixel(c, 8, 2),
    roughness: r, metalness: mt
  });
}
```

---

### 🟡 P1 — 中优先级（近期优化）

#### 4. 提升色彩量化深度
**文件：** [`main.js`](src/main.js:79)
```js
// 当前：uColorDepth: { value: 14.0 }
// 优化：
uColorDepth: { value: 20.0 }
```
配合调整抖动强度 `1.8 / uColorDepth` 自动适配，减少低亮度 banding。

#### 5. Rooftop 增加辅助照明
**文件：** [`VoxelRooftop.js`](src/three/VoxelRooftop.js)
在 `_buildFloor()` 或新增 `_buildLighting()` 方法中，添加微弱的暖色点光源：
```js
_buildLighting() {
  // Console screen glow
  const consoleGlow = new THREE.PointLight(0x224466, 2, 3, 2);
  consoleGlow.position.set(2, 0.6, -4);
  this.group.add(consoleGlow);
  // Warm hatch glow
  const hatchGlow = new THREE.PointLight(0xffaa44, 1.5, 2.5, 2);
  hatchGlow.position.set(0, 0.3, -4.3);
  this.group.add(hatchGlow);
}
```

#### 6. Plaza 增加墙面装饰
**文件：** [`VoxelPlaza.js`](src/three/VoxelPlaza.js)
利用 `PixelTextureGenerator` 创建像素海报/告示牌贴到 Plaza 东西墙上：
```js
_buildWallPosters() {
  const posterCanvas = document.createElement('canvas');
  // ... 绘制像素风格告示
  const posterTex = new THREE.CanvasTexture(posterCanvas);
  posterTex.magFilter = THREE.NearestFilter;
  // 贴到东/西墙上
}
```

#### 7. ParticleBurst 像素化
**文件：** [`ParticleBurst.js`](src/three/ParticleBurst.js)
将粒子几何体从 `SphereGeometry(0.03, 4, 4)` 改为 `BoxGeometry(0.04, 0.04, 0.04)`，匹配 voxel 方块风格。

#### 8. CSS transitions 改为像素风格
**文件：** [`style.css`](src/style.css)
将面板的 `transition: all 0.2s` 等平滑过渡改为无过渡或以 `steps()` 实现像素化：
```css
/* 按钮 hover */
transition: none;
/* 或像素步进 */
transition: background-color 0.1s steps(2);
```

---

### 🟢 P2 — 低优先级（可选增强）

#### 9. 统一粒子管理器
**文件：** 新建 `src/three/ParticleManager.js`
将 VoxelDepths 的尘埃、钓鱼池雾气、ArcadeMachine 的火花统一管理，支持全局暂停/恢复。

#### 10. 增加表面层粒子氛围
为酒馆/广场/街机厅添加：
- 酒馆：壁炉火星（上升粒子 + 暖色光）
- 广场：天窗灰尘光束（God rays 模拟）
- 街机厅：CRT 屏幕静电微粒

#### 11. 角色 HUD 头像方形化
**文件：** [`style.css`](src/style.css) + [`PlayerAvatar.js`](src/three/PlayerAvatar.js)
将圆形头像裁剪改为方形像素框，面部 sprite 也使用 blocky 而非 smooth。

#### 12. 增加场景 NPC 点缀
在广场/街机厅各添加 1-2 个静态 voxel 角色（使用 PlayerAvatar 同款方块身体），增强世界 "有人味"。

#### 13. Rooftop 增加视觉锚点
- 添加卫星天线/雷达 dish
- 添加散落的工具/笔记
- 围栏上挂灯笼/风铃

---

## 四、各场景改进优先级矩阵

| 场景 | P0 | P1 | P2 | 总计 |
|------|-----|-----|-----|------|
| 全局 (main.js) | 1 (色彩量化) | - | - | 1 |
| 全局 (AbyssWorld) | 1 (Ambient) | - | - | 1 |
| 全局 (style.css) | 1 (圆角) | 1 (transition) | 1 (头像) | 3 |
| VoxelTavern | - | - | 1 (粒子) | 1 |
| VoxelPlaza | - | 1 (海报) | 1 (NPC) | 2 |
| VoxelArcade | - | - | 2 (粒子+NPC) | 2 |
| VoxelDepths | - | - | - | 0 |
| VoxelRooftop | - | 1 (灯光) | 1 (锚点) | 2 |
| WorldSanctuary | 1 (纹理) | - | - | 1 |
| ParticleBurst | - | 1 (方块化) | - | 1 |
| PlayerAvatar | - | - | 1 (头像) | 1 |

---

## 五、总结

AI Arcade 的美术风格在 **像素复古 (Pixel Retro)** 方向上已经建立了清晰的语言体系——Gemini V3 两遍渲染管线是项目的核心视觉资产，`PixelTextureGenerator` 三代生成器提供了坚实的环境纹理基础。

当前最大问题在于 **"风格纯度"**：
- UI 层使用了过多现代 CSS 属性（圆角、blur、平滑过渡），与硬核像素管线形成视觉摩擦
- 全局灯光过于平坦，未能发挥像素风格的暗部魅力
- 部分场景（Rooftop、Sanctuary）未完全接入像素纹理管线

优化后预估总分可达 **87-90/100 (A-)**，核心改动仅涉及 5-8 个文件的参数调整。
