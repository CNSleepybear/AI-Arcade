# Electron 防破解分层方案

> AI Arcade — 从源码暴露到网络劫持的完整攻防分析

---

## 攻击面分析

Electron 应用本质是 Chromium + Node.js，所有前端代码（JS/HTML/CSS）以明文形式存放在 `app.asar` 中。

```
攻击者能做什么：
  ┌─────────────────────────────────────────────────────┐
  │ 1. 解包 asar  →  读取所有源码、Supabase anon key    │
  │ 2. F12 DevTools →  断点调试、改 localStorage         │
  │ 3. 抓包 (Charles/mitmproxy) →  劫持 HTTPS API 请求   │
  │ 4. 改内存 (Cheat Engine) →  改分数/金币             │
  │ 5. 改存档 (localStorage) →  无限金币/解锁角色        │
  │ 6. 重打包篡改版 →  去掉验证逻辑后分发                │
  └─────────────────────────────────────────────────────┘
```

---

## 四层防御体系

### L0 — 基础加固（零成本，立即可做）

| 措施 | 对抗 | 实施 |
|------|------|------|
| 禁用 DevTools | F12 调试 | `mainWindow.webContents.on('devtools-opened', () => mainWindow.webContents.closeDevTools())` |
| 移除菜单栏 | 菜单→开发者工具 | 已有 `autoHideMenuBar: true` + `setMenuBarVisibility(false)` |
| 禁止远程调试 | `--inspect` 端口 | 启动参数 `--remote-debugging-port=0` |
| Vite 生产压缩 | 源码可读性 | 已有 `vite build` 自动 minify + tree-shake |

**效果：** 阻止 80% 普通玩家的好奇探索，但对技术用户无效。

---

### L1 — 代码混淆（低-中成本）

| 措施 | 对抗 | 实施方式 |
|------|------|----------|
| **Vite 插件混淆** | 解包后直接读源码 | `vite-plugin-javascript-obfuscator`：字符串加密、控制流平坦化、死代码注入 |
| **asar 加密** | 直接解包 asar | electron-builder `asar: { encryption: { algorithm: 'aes-256-cbc' } }`，密钥嵌入 native addon |
| **Supabase key 拆分** | 源码中明文 anon key | 将 key 拆成多段，运行时拼接；或通过 API 动态获取 |

**代码混淆示例（vite-plugin-javascript-obfuscator）：**

```js
// vite.config.js
import obfuscator from 'vite-plugin-javascript-obfuscator';

export default defineConfig({
  plugins: [
    obfuscator({
      options: {
        compact: true,
        controlFlowFlattening: true,
        controlFlowFlatteningThreshold: 0.75,
        deadCodeInjection: true,
        deadCodeInjectionThreshold: 0.4,
        stringArray: true,
        stringArrayEncoding: ['base64'],
        stringArrayThreshold: 0.75,
        transformObjectKeys: true,
      }
    })
  ]
});
```

**asar 加密配置（package.json）：**

```json
"build": {
  "asar": {
    "smartUnpack": false
  },
  "win": {
    "target": "portable"
  }
}
```

**Supabase key 拆分示例：**

```js
// 不要这样写：
const SUPABASE_URL = 'https://xxx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOi...';

// 改为：
const _k = ['eyJh','bGci','OiJI','UzI1']; // 拆分
const SUPABASE_ANON_KEY = _k.join('') + atob('...'); // 运行时拼接
```

**效果：** 解包后源码不可直接阅读，需要逆向工具。asar 加密增加解包门槛。

**副作用：** 混淆后体积增大 30-50%，构建时间增加。

---

### L2 — 运行时保护（中成本）

| 措施 | 对抗 | 实施方式 |
|------|------|----------|
| **V8 字节码编译** | 反混淆/反编译 | `bytenode` 将 `.js` 编译为 `.jsc`（V8 内部字节码），不可逆 |
| **反调试检测** | DevTools 绕过 | 检测 `debugger` 语句是否被跳过、`console.log` 是否被重写 |
| **完整性校验** | 篡改后重打包 | 主进程启动时对 `app.asar` 做 hash 校验 |
| **内存保护** | Cheat Engine 改值 | 关键数值（分数、金币）双重存储 + 校验和 + 服务端验证 |

**V8 字节码编译（bytenode）：**

```bash
# 1. 安装
npm install bytenode

# 2. 编译 JS → JSC
npx bytenode -c src/data/authService.js    # → authService.jsc
npx bytenode -c src/data/NetworkClient.js  # → NetworkClient.jsc

# 3. 在代码中加载 .jsc 而非 .js
require('bytenode');
require('./authService.jsc');
```

> ⚠️ bytenode 与 Electron + Vite 的 ESM 模块系统集成较复杂，建议只对关键模块（auth、network、save validation）使用。

**完整性校验（electron-main.js）：**

```js
import crypto from 'crypto';
import fs from 'fs';

function verifyIntegrity() {
  const asarPath = path.join(process.resourcesPath, 'app.asar');
  const actual = crypto.createHash('sha256').update(fs.readFileSync(asarPath)).digest('hex');
  const expected = 'KNOWN_HASH_VALUE'; // 构建时注入
  if (actual !== expected) {
    dialog.showErrorBox('错误', '应用已被篡改，请重新下载');
    app.quit();
  }
}
```

**效果：** 大幅提高逆向门槛。V8 字节码无法还原为可读 JS。完整性校验阻止二次打包。

---

### L3 — 服务端权威验证（高成本，最有效）

| 措施 | 对抗 | 实施方式 |
|------|------|----------|
| **分数服务端验证** | 伪造 GAME_OVER 消息 | 已有 Supabase RPC `upsert_score`，但客户端仍可伪造输入 |
| **游戏逻辑上云** | 客户端改值 | 关键计算（伤害公式、掉落概率）放到 Edge Function |
| **存档服务端存储** | 改 localStorage | 已有 `saveManager.syncFromCloud()`，但离线时可篡改 |
| **反作弊签名** | 伪造 API 请求 | 每次分数上报附带 HMAC 签名，服务端校验 |
| **行为分析** | 异常数据 | Supabase 触发器检测异常分数（远超理论最大值则拒绝） |

**分数上报签名示例：**

```js
// 客户端：用 session token 对分数做 HMAC
import { createHmac } from 'crypto'; // 或 Web Crypto API

function signScore(score, gameId) {
  const payload = `${gameId}:${score}:${Date.now()}`;
  const sig = createHmac('sha256', SUPABASE_ANON_KEY).update(payload).digest('hex');
  return { score, gameId, sig, ts: Date.now() };
}

// 服务端 (Supabase RPC)：验证签名 + 时间窗口（5分钟内有效）
// 拒绝签名不匹配或过期的请求
```

**理论最大分数校验（Supabase RPC）：**

```sql
-- 每个游戏设定理论最大分，超过直接拒绝
CREATE OR REPLACE FUNCTION upsert_score(
  p_game_id TEXT, p_name TEXT, p_score INT, p_sig TEXT, p_ts BIGINT
) RETURNS void AS $$
DECLARE
  max_scores JSONB := '{"roshambo": 9999, "abyss-angler": 99999, "anomaly": 500000}';
  max_score INT;
BEGIN
  max_score := (max_scores ->> p_game_id)::INT;
  IF p_score > max_score THEN
    RAISE EXCEPTION 'Score exceeds theoretical maximum';
  END IF;
  -- ... insert/update logic
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**效果：** 即使客户端完全被破解，攻击者也无法伪造有效分数。这是**唯一真正有效**的防作弊手段。

---

## 实施优先级建议

```
紧急（立即做）          重要（本周）             增强（按需）
─────────────────    ─────────────────    ─────────────────
L0: 禁用 DevTools     L1: 代码混淆         L2: V8 字节码
L0: 远程调试端口      L1: Key 拆分         L2: 完整性校验
                      L1: asar 加密       L3: 分数签名
                                          L3: 理论最大分校验
```

## 成本收益矩阵

| 层级 | 实施耗时 | 维护成本 | 防护效果 | 对玩家体验影响 |
|------|----------|----------|----------|----------------|
| L0 基础加固 | 10 min | 零 | ★★☆☆☆ | 无 |
| L1 代码混淆 | 1 h | 低（构建脚本自动化） | ★★★☆☆ | 体积+50%，启动+0.3s |
| L1 asar 加密 | 30 min | 低 | ★★☆☆☆ | 无 |
| L2 V8 字节码 | 3 h | 中（新模块需编译） | ★★★★☆ | 无 |
| L2 完整性校验 | 1 h | 低 | ★★★☆☆ | 启动+0.1s |
| L3 分数签名 | 2 h | 中（前后端同步） | ★★★★★ | 需网络 |
| L3 理论最大分 | 30 min | 低（DB 维护） | ★★★★☆ | 无 |

## 结论

- **对普通玩家：** L0 + L1 足够挡住 95% 的人
- **对技术用户：** 需要 L2（V8 字节码 + 完整性校验）才有意义
- **对专业逆向：** 只有 L3（服务端权威验证）才能真正防住——客户端的一切都可以被篡改

**推荐路线：** 先做 L0 + L1（本周），后续根据实际攻击情况逐步上 L2/L3。

> 扩展阅读：[Electron Security Checklist](https://www.electronjs.org/docs/latest/tutorial/security)、[OWASP Mobile Top 10](https://owasp.org/www-project-mobile-top-10/)（桌面端可类比）
