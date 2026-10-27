import * as THREE from 'three';
import { t, initLanguage, setLanguage, getLanguage, applyI18nToDOM, buildLangSwitcherHTML, LANGUAGES } from './data/i18n.js';
import { SaveManager } from './data/saveManager.js';
import { CHARACTERS, getCharacterById } from './data/characterDB.js';
import { WORLD_BOUNDS, clampToBounds, FLOORS } from './data/worldBounds.js';
import { AbyssWorld } from './three/AbyssWorld.js';
import { ArcadeMachine } from './three/ArcadeMachine.js';
import { AudioManager } from './three/AudioManager.js';
import { PlayerAvatar } from './three/PlayerAvatar.js';
import { FirstPersonCamera } from './three/FirstPersonCamera.js';
import { PropsManager } from './three/PropsManager.js';
import { HoloNPC } from './three/HoloNPC.js';
import { ExplorationSystem } from './three/ExplorationSystem.js';
import { ParticleBurst } from './three/ParticleBurst.js';
import { checkAchievements } from './data/achievements.js';
import { getDailyMissions, updateMissionProgress, claimMission } from './data/dailyMissions.js';
import { AvatarCosmetics } from './three/AvatarCosmetics.js';
import { getVideoManager } from './three/VideoManager.js';
import { GAME_REGISTRY } from './games/registry.js';
import { networkClient } from './data/NetworkClient.js';
import { loginPlayer, registerPlayer, isLoggedIn, isGuest, getDisplayName, getPlayerId, setGuestName, logoutPlayer } from './data/authService.js';
import { MessageSystem } from './three/MessageSystem.js';
import { CatManager } from './three/CatManager.js';
import { getCatDefs } from './three/Cat.js';
import { MESSAGE_CATEGORIES, getTemplatesByCategory } from './data/messageDB.js';
import { CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { init as initAINPC, trigger as rawEveTrigger, updateContext as eveUpdateContext, destroy as destroyAINPC, TRIGGER as EVE_TRIGGER } from './data/ainpc/AINPC.js';
import { MusicPlayer } from './ui/MusicPlayer.js';
import { TitleArtwork } from './ui/TitleArtwork.js';
import { FeedbackLayer } from './ui/FeedbackLayer.js';
import { getRenderViewport } from './three/RenderViewport.js';

window.__arcadeProgress = 0;

// Initialize i18n
initLanguage();
new TitleArtwork(document.getElementById('title-art-canvas'), document.getElementById('title-screen'));

const STATE = { TITLE: 'title', AUTH: 'auth', ROAMING: 'roaming', SITTING: 'sitting', PLAYING: 'playing' };
let currentState = STATE.TITLE;
let currentMachine = null;
let interactLock = false;

// Floor system — which vertical level the player is on
let currentFloorKey = 'SURFACE';  // 'SURFACE' | 'DEPTHS' | 'ROOFTOP' | 'SANCTUARY'
let floorTransitioning = false;
let observingSky = false;

// Sanctuary — 3D scene at Y=16, shelter iframe overlay
let shelterIframeActive = false;

const globalState = {
  player: { currentBuff: null, buffExpireTime: 0 },
  chatMessages: [],
  arcadeHighScores: { anomaly: { name: 'MINER_X', score: 99 }, 'cyber-hunder': { name: 'VOID_WALKER', score: 8500 } },
  interactPoint: new THREE.Vector2(0, 0)
};

const canvas = document.getElementById('game-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
// The final pass enlarges retro pixels; DPR supersampling adds no scene detail.
renderer.setPixelRatio(1);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
// Gemini V3: tone mapping disabled — ACES crushes the retro pixel color pipeline
// renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15;

// ==================== Low-Res Render Target (Gemini V3 Pixel Pipeline) ====================
let renderViewport = getRenderViewport(window.innerWidth, window.innerHeight);
const lowResTarget = new THREE.WebGLRenderTarget(renderViewport.width, renderViewport.height, {
  minFilter: THREE.NearestFilter,
  magFilter: THREE.NearestFilter,
  format: THREE.RGBAFormat
});

// ==================== Retro Dither Post-Processing Scene ====================
const postScene = new THREE.Scene();
const postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

const retroShader = new THREE.ShaderMaterial({
  uniforms: {
    tDiffuse: { value: lowResTarget.texture },
    uResolution: { value: new THREE.Vector2(renderViewport.width, renderViewport.height) },
    uColorDepth: { value: 32.0 }
  },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse;
    uniform vec2 uResolution;
    uniform float uColorDepth;
    varying vec2 vUv;

    float getBayerThreshold(vec2 pixelPos) {
      int x = int(mod(pixelPos.x, 4.0));
      int y = int(mod(pixelPos.y, 4.0));
      int index = x + y * 4;
      if (index == 0) return 0.0;  if (index == 1) return 8.0;  if (index == 2) return 2.0;  if (index == 3) return 10.0;
      if (index == 4) return 12.0; if (index == 5) return 4.0;  if (index == 6) return 14.0; if (index == 7) return 6.0;
      if (index == 8) return 3.0;  if (index == 9) return 11.0; if (index == 10) return 1.0; if (index == 11) return 9.0;
      if (index == 12) return 15.0; if (index == 13) return 7.0; if (index == 14) return 13.0;
      return 5.0;
    }

    vec3 brightSample(vec2 uv) {
      vec3 sampleColor = texture2D(tDiffuse, uv).rgb;
      float peak = max(sampleColor.r, max(sampleColor.g, sampleColor.b));
      return sampleColor * smoothstep(0.58, 1.0, peak);
    }

    void main() {
      vec4 texel = texture2D(tDiffuse, vUv);
      vec3 color = texel.rgb;

      // Gamma dark-area inverse compensation (prevents crushing blacks)
      color = pow(max(color, vec3(0.0)), vec3(1.0 / 1.9));
      color = mix(vec3(0.012, 0.018, 0.03), color, 0.97);
      vec2 px = 1.5 / uResolution;
      vec3 bloom = brightSample(vUv + vec2(px.x, 0.0)) + brightSample(vUv - vec2(px.x, 0.0));
      bloom += brightSample(vUv + vec2(0.0, px.y)) + brightSample(vUv - vec2(0.0, px.y));
      bloom += brightSample(vUv + px) + brightSample(vUv - px);
      bloom += brightSample(vUv + vec2(px.x, -px.y)) + brightSample(vUv + vec2(-px.x, px.y));
      color += bloom * 0.022;

      // Adaptive dither mask based on local luminance
      float luminance = dot(color, vec3(0.2126, 0.7152, 0.0722));
      float ditherMask = 4.0 * luminance * (1.0 - luminance);

      vec2 screenPixelPos = vUv * uResolution;
      float ditherValue = (getBayerThreshold(screenPixelPos) / 16.0) - 0.5;
      color += ditherValue * (0.8 / uColorDepth) * ditherMask;

      // Color quantization
      color = floor(color * uColorDepth + 0.5) / uColorDepth;

      // Preserve hue in shadows while giving practical lights a warmer highlight.
      float gray = dot(color, vec3(0.299, 0.587, 0.114));
      color = mix(vec3(gray), color, 1.08);
      float shadow = 1.0 - smoothstep(0.04, 0.42, luminance);
      float highlight = smoothstep(0.38, 0.9, luminance);
      color += vec3(0.012, 0.018, 0.03) * shadow;
      color += vec3(0.018, 0.008, -0.006) * highlight;
      float edge = 1.0 - smoothstep(0.28, 0.76, distance(vUv, vec2(0.5)));
      color *= mix(0.88, 1.0, edge);

      gl_FragColor = vec4(color, texel.a);
    }
  `
});

const postQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), retroShader);
postScene.add(postQuad);

const labelRenderer = new CSS2DRenderer();
labelRenderer.setSize(window.innerWidth, window.innerHeight);
labelRenderer.domElement.style.position = 'fixed';
labelRenderer.domElement.style.top = '0';
labelRenderer.domElement.style.left = '0';
labelRenderer.domElement.style.pointerEvents = 'none';
labelRenderer.domElement.style.zIndex = '6';
document.getElementById('app').appendChild(labelRenderer.domElement);

const scene = new THREE.Scene(); scene.background = new THREE.Color(0x182133);
const audioListener = new THREE.AudioListener();
const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.08, 60);
camera.add(audioListener); camera.position.set(0, 1.6, 0);
scene.add(camera); // needed so camera children (hands) render
const clock = new THREE.Clock();
const audioManager = new AudioManager(audioListener);
const feedback = new FeedbackLayer(audioManager, () => ParticleBurst.spawn(scene, {x:camera.position.x,y:camera.position.y-.8,z:camera.position.z}, {kind:'teleport',count:28,color:0xafa0e8,life:1.2,spread:1.3}));
const musicPlayer = new MusicPlayer(audioManager);

const exploration = new ExplorationSystem(scene);
window.__arcadeProgress = 15;
const abyssWorld = new AbyssWorld(scene, renderer, audioManager, globalState, exploration);
const catManager = new CatManager(scene);
const machines = abyssWorld.machines;
const propsManager = new PropsManager(scene);
const holoNPC = new HoloNPC(scene);
exploration.onAllShardsCollected = () => { spawnHiddenMachineInDepths(); updateTitleStats(); };
window.__arcadeProgress = 30;

const depthsMachines = [];

function syncEveContext() {
  const progress = SaveManager.load();
  const district = currentFloorKey === 'SURFACE' ? (camera.position.x < -5.5 ? 'tavern' : camera.position.x > 5.5 ? 'arcade' : 'plaza') : currentFloorKey.toLowerCase();
  const zone = currentFloorKey === 'DEPTHS' ? abyssWorld.depths.getCurrentZone(camera.position) : district;
  const prompt = document.getElementById('prompt');
  eveUpdateContext({charName:getDisplayName() || currentCharData.name,charTitle:currentCharData.title,stats:currentCharData.stats,coins:progress.coins || 0,globalScore:progress.globalScore || 0,currentState,floor:currentFloorKey,district:t(`art.${district}`),zone,zoneText:currentFloorKey==='DEPTHS'?abyssWorld.depths.getEveTextForZone(zone):'',shardsCollected:exploration.shardsCollected,hiddenMachineUnlocked:!!progress.hiddenMachineUnlocked,buff:globalState.player.currentBuff || '',recentChat:globalState.chatMessages.slice(-2),nearby:prompt && !prompt.classList.contains('hidden')?prompt.textContent:''});
}
function eveTrigger(eventType,payload) { syncEveContext(); rawEveTrigger(eventType,payload); }

function spawnHiddenMachineInDepths() {
  const hg = GAME_REGISTRY.find(g => g.status === 'locked'); if (!hg) return;
  const m = new ArcadeMachine({ ...hg, status: 'ready' }, 0, -5, Math.PI);
  // Add to depths group so it renders at Y=-5
  const depthsGroup = abyssWorld.depths?.group;
  if (depthsGroup) {
    m.addToScene(depthsGroup);
    // Override world position — machine constructor sets group.position,
    // but we need it relative to depths group which is already at Y=-5
    m.group.position.set(0, 0, -5);
  } else {
    m.addToScene(scene);
    m.group.position.set(0, -5, -5);
  }
  depthsMachines.push(m);
  save.hiddenMachineUnlocked = true;
  SaveManager.save(save);
  // Update altar
  if (abyssWorld.depths) abyssWorld.depths.updateAltar();
  showPrompt(t('prompt.altar_activated'));
  setTimeout(hidePrompt, 3500);
  ParticleBurst.spawn(scene, new THREE.Vector3(0, -3.5, -5), { count: 20, color: 0xcc44ff, life: 1.5, size: 0.06, spread: 1.5 });
}

let cosmetics = null;
let save = SaveManager.load();
catManager.loadSave(save);
let currentCharData = SaveManager.getCurrentChar();
const fpCamera = new FirstPersonCamera(camera);
let avatar = new PlayerAvatar(currentCharData);
scene.add(avatar.group);

MessageSystem.setScene(scene);
window.__arcadeProgress = 50;

const mouseInput = { dx: 0, dy: 0 };
function requestRoamingPointerLock() {
  // Delayed panel-close callbacks can outlive the panel that scheduled them.
  if (currentState !== STATE.ROAMING || escapeMenuOpen || shelterIframeActive || floorTransitioning || document.hidden) return;
  if (document.querySelector('#char-select-panel:not(.hidden), #bar-menu-panel:not(.hidden), #msg-create-panel:not(.hidden), #msg-vote-bar:not(.hidden), #chat-input-bar:not(.hidden), #chat-phone:not(.hidden), #eve-settings:not(.hidden)')) return;
  canvas.requestPointerLock()?.catch(() => {});
}
document.addEventListener('mousemove', (e) => { if (document.pointerLockElement === canvas && currentState === STATE.ROAMING) { mouseInput.dx += e.movementX; mouseInput.dy += e.movementY; } });
canvas.addEventListener('click', () => { if (currentState === STATE.ROAMING && document.pointerLockElement !== canvas) requestRoamingPointerLock(); });
document.addEventListener('click', (e) => { if (currentState === STATE.ROAMING && document.pointerLockElement !== canvas && !e.target.closest('#char-select-panel') && !e.target.closest('#game-container') && !e.target.closest('#chat-input-bar') && !e.target.closest('#msg-create-panel') && !e.target.closest('#msg-vote-bar') && !e.target.closest('#escape-menu') && !e.target.closest('#eve-phone') && !e.target.closest('#eve-settings') && !e.target.closest('#bar-menu-panel') && !e.target.closest('#fishing-ui') && !e.target.closest('button') && !e.target.closest('input') && !e.target.closest('textarea')) requestRoamingPointerLock(); });
document.addEventListener('pointerlockchange', () => { mouseInput.dx = 0; mouseInput.dy = 0; if (document.pointerLockElement === canvas) { document.body.classList.add('eve-pointer-locked'); } else { document.body.classList.remove('eve-pointer-locked'); } });

// ==================== Auth ====================
const authPanel = document.getElementById('auth-panel');
const authUsername = document.getElementById('auth-username');
const authPassword = document.getElementById('auth-password');
const authError = document.getElementById('auth-error');
const authStatus = document.getElementById('auth-status');
function sae(m) { authError.textContent = m; authError.classList.remove('hidden'); }
function hae() { authError.classList.add('hidden'); }

async function handleLogin() { hae(); authStatus.textContent = t('auth.logging_in'); try { await loginPlayer(authUsername.value, authPassword.value); onAuthSuccess(); } catch (e) { sae(e.message); authStatus.textContent = ''; } }
async function handleRegister() { hae(); authStatus.textContent = t('auth.registering'); try { await registerPlayer(authUsername.value, authPassword.value); onAuthSuccess(); } catch (e) { sae(e.message); authStatus.textContent = ''; } }

async function onAuthSuccess() {
  authPanel.classList.add('hidden');
  authStatus.textContent = '';
  document.getElementById('title-btn-char').classList.remove('hidden');
  document.getElementById('title-btn-logout').classList.remove('hidden');
  titleScreen.classList.remove('hidden', 'fade-out');
  document.getElementById('title-press-enter').textContent = t('title.syncing');
  SaveManager.setPlayerId(getPlayerId());
  const merged = await SaveManager.syncFromCloud();
  save = merged;
  currentCharData = SaveManager.getCurrentChar();
  updateHUD();
  updateTitleStats();
  document.getElementById('title-press-enter').textContent = t('title.logged_in', { name: getDisplayName() });
}

document.getElementById('auth-btn-login').addEventListener('click', handleLogin);
document.getElementById('auth-btn-register').addEventListener('click', handleRegister);
document.getElementById('auth-btn-skip').addEventListener('click', () => { setGuestName(); onAuthSuccess(); });
authPassword.addEventListener('keydown', (e) => { if (e.code === 'Enter') handleLogin(); });

// ==================== Vote Bar ====================
const voteBar = document.getElementById('msg-vote-bar');
const voteText = document.getElementById('msg-vote-text');
const voteAuthor = document.getElementById('msg-vote-author');
let voteBeaconId = null;

function showVoteBar() {
  const data = MessageSystem.getInteractData();
  if (!data) return;
  voteBeaconId = data.id;
  voteText.textContent = data.text;
  voteText.style.color = data.color;
  voteAuthor.textContent = '— ' + data.author + ' · 👍' + data.likes + ' 👎' + data.dislikes;
  voteBar.classList.remove('hidden');
  document.exitPointerLock();
}

function closeVoteBar() {
  voteBar.classList.add('hidden');
  voteBeaconId = null;
  if (currentState === STATE.ROAMING) setTimeout(() => requestRoamingPointerLock(), 100);
}

document.getElementById('msg-vote-like').addEventListener('click', () => {
  if (voteBeaconId == null) return;
  if (MessageSystem.tryVote(voteBeaconId, 1)) {
    showPrompt(t('msg.like'));
    setTimeout(hidePrompt, 1500);
  } else {
    showPrompt(t('msg.already_voted'));
    setTimeout(hidePrompt, 2000);
  }
  closeVoteBar();
});

document.getElementById('msg-vote-dislike').addEventListener('click', () => {
  if (voteBeaconId == null) return;
  if (MessageSystem.tryVote(voteBeaconId, -1)) {
    showPrompt(t('msg.dislike'));
    setTimeout(hidePrompt, 1500);
  } else {
    showPrompt(t('msg.already_voted'));
    setTimeout(hidePrompt, 2000);
  }
  closeVoteBar();
});

document.getElementById('msg-vote-close').addEventListener('click', closeVoteBar);

// ==================== Keyboard ====================
const keys = {};
const chatInputBar = document.getElementById('chat-input-bar');
const chatInputField = document.getElementById('chat-input-field');
let chatOpen = false;
let phoneChatOpen = false;
function openChat() { if (chatOpen) return; chatOpen = true; chatInputBar.classList.remove('hidden'); chatInputField.value = ''; chatInputField.focus(); document.exitPointerLock(); }
function closeChat() { if (!chatOpen) return; chatOpen = false; chatInputBar.classList.add('hidden'); chatInputField.value = ''; chatInputField.blur(); if (currentState === STATE.ROAMING) setTimeout(() => requestRoamingPointerLock(), 100); }
function sendChatMessage() { const t = chatInputField.value.trim(); if (!t) return; networkClient.sendChat({ author: getDisplayName() || currentCharData.name, text: t, color: '#00ffcc' }); chatInputField.value = ''; closeChat(); const s = SaveManager.load(); s._chatSent = (s._chatSent || 0) + 1; updateMissionProgress(s, '_dm_chat', 1); SaveManager.save(s); checkAndToast(); }
chatInputField.addEventListener('keydown', (e) => { if (e.code === 'Enter') { e.preventDefault(); sendChatMessage(); } if (e.code === 'Escape') { e.preventDefault(); closeChat(); } e.stopPropagation(); });

// ==================== Chat Phone (hold Tab) ====================
const phonePanel = document.getElementById('chat-phone');
const phoneMsgs = document.getElementById('chat-phone-msgs');
let lastPhoneHTML = '';
function openPhoneChat() {
  if (phoneChatOpen) return;
  phoneChatOpen = true;
  phonePanel.classList.remove('hidden');
  document.exitPointerLock();
  renderChatPhone();
}
function closePhoneChat() {
  if (!phoneChatOpen) return;
  phoneChatOpen = false;
  phonePanel.classList.add('hidden');
  if (currentState === STATE.ROAMING) setTimeout(() => requestRoamingPointerLock(), 100);
}
function renderChatPhone() {
  const s = SaveManager.load();
  const { missions } = getDailyMissions(s);
  if (!s._dmInitialized) { s._dmInitialized = true; SaveManager.save(s); }
  const msgs = globalState.chatMessages.slice(-30);

  // Build missions header — auto-claim on completion
  let missionsHTML = '<div style="border-bottom:1px solid rgba(0,255,224,0.2);padding-bottom:8px;margin-bottom:8px">';
  missionsHTML += '<div style="font-size:13px;font-weight:bold;color:var(--neon-green);margin-bottom:6px">📋 ' + t('chat.daily_mission_title') + '</div>';
  for (const m of missions) {
    // Auto-claim if done but not claimed
    if (m.done && !m.claimed) {
      m.claimed = true;
      s.coins = (s.coins || 0) + m.reward;
      SaveManager.save(s);
      currentCharData = SaveManager.getCurrentChar(); updateHUD();
    }
    const pct = m.done ? 100 : Math.round((m.progress / m.target) * 100);
    const barW = m.done ? 100 : Math.max(5, pct);
    missionsHTML += `<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;font-size:11px">
      <span>${m.icon}</span>
      <span style="flex:1;color:${m.done?'#88ff88':'#aacccc'}">${m.text} ${m.progress}/${m.target}</span>
      <span style="color:${m.claimed?'#888':'#ffcc44'}">${m.claimed ? '✓' : '+' + m.reward + '🪙'}</span>
    </div>`;
    missionsHTML += `<div style="background:rgba(0,255,224,0.1);height:3px;border-radius:2px;margin-bottom:6px"><div style="background:var(--neon-green);height:100%;width:${barW}%;border-radius:2px;transition:width 0.3s"></div></div>`;
  }
  missionsHTML += '</div>';

  const nextHTML = missionsHTML + msgs.map(m => {
    const time = new Date(m.time).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    return `<div class="chat-msg">
      <div class="chat-msg-meta">
        <span class="chat-msg-author" style="color:${m.color || '#00ffcc'}">${m.author}</span>
        <span class="chat-msg-time">${time}</span>
      </div>
      <div class="chat-msg-text">${m.text}</div>
    </div>`;
  }).join('');
  if (nextHTML !== lastPhoneHTML) {
    const followLatest = phoneMsgs.scrollHeight - phoneMsgs.scrollTop - phoneMsgs.clientHeight < 24;
    const scrollTop = phoneMsgs.scrollTop;
    phoneMsgs.innerHTML = nextHTML;
    lastPhoneHTML = nextHTML;
    phoneMsgs.scrollTop = followLatest ? phoneMsgs.scrollHeight : scrollTop;
  }
}

// ==================== Achievement System ====================
const achToast = document.getElementById('ach-toast');
const achIcon = document.getElementById('ach-toast-icon');
const achTitle = document.getElementById('ach-toast-title');
const achDesc = document.getElementById('ach-toast-desc');
let achTimeout = null;

function checkAndToast() {
  const s = SaveManager.load();
  const newly = checkAchievements(s, s.achievements || {});
  if (newly.length === 0) return;
  s.achievements = s.achievements || {};
  for (const a of newly) s.achievements[a.id] = true;
  SaveManager.save(s);
  // Show latest achievement
  const a = newly[newly.length - 1];
  achIcon.textContent = a.icon;
  achTitle.textContent = a.title;
  achDesc.textContent = a.desc;
  achToast.classList.remove('hidden');
  audioManager.playSFX('sfx_achievement');
  feedback.pulse(window.innerWidth / 2, window.innerHeight / 2, 'achievement');
  if (achTimeout) clearTimeout(achTimeout);
  achTimeout = setTimeout(() => achToast.classList.add('hidden'), 4000);
}

// Claim daily mission reward
window._claimMission = (idx) => {
  const s = SaveManager.load();
  const reward = claimMission(s, idx);
  if (reward > 0) {
    SaveManager.save(s);
    currentCharData = SaveManager.getCurrentChar(); updateHUD();
    showPrompt(t('prompt.claim_reward', { n: reward }));
    setTimeout(hidePrompt, 2000);
  }
};

document.addEventListener('keydown', (e) => {
  if (e.target.closest('input, textarea, [contenteditable="true"]')) return;
  if (escapeMenuOpen && e.code !== 'Escape') return;
  if (chatOpen && document.activeElement === chatInputField) return;
  if (phoneChatOpen && e.code === 'Tab') { e.preventDefault(); return; }
  keys[e.code] = true;
  switch (e.code) {
    case 'Tab': if (currentState === STATE.ROAMING) { e.preventDefault(); openPhoneChat(); } break;
    case 'KeyE': if (currentState === STATE.ROAMING) handleInteract(); break;
    case 'KeyC': if (currentState === STATE.ROAMING) openCharSelect(); break;
    case 'KeyT': if (currentState === STATE.ROAMING) openChat(); break;
    case 'KeyM': if (currentState === STATE.ROAMING) openMessagePanel(); break;
    case 'BracketLeft': if (currentState === STATE.ROAMING) abyssWorld.tavern?.prevTrack(); break;
    case 'BracketRight': if (currentState === STATE.ROAMING) abyssWorld.tavern?.nextTrack(); break;
    case 'Escape': if (shelterIframeActive || document.getElementById('shelter-overlay')) { closeShelterIframe(); return; } if (currentState === STATE.PLAYING) exitGame(); else if (fishingState !== FISHING_STATE.IDLE) { cancelFishing(); } else if (currentState === STATE.ROAMING) { toggleEscapeMenu(); } break;
  }
});
document.addEventListener('keyup', (e) => {
  keys[e.code] = false;
  if (e.code === 'Tab') closePhoneChat();
});


const velocity = new THREE.Vector3(); const BASE_MS = 6.5, A = 28, F = 11;
let footstepTimer = 0;
let shakeIntensity = 0;
function clearMovementInput() {
  for (const code of Object.keys(keys)) keys[code] = false;
  velocity.set(0, 0, 0);
  mouseInput.dx = 0; mouseInput.dy = 0; footstepTimer = 0;
  if (phoneChatOpen) { phoneChatOpen = false; phonePanel.classList.add('hidden'); }
}
window.addEventListener('blur', clearMovementInput);
document.addEventListener('visibilitychange', () => {
  clearMovementInput();
  // Discard time spent in another tab; never advance the simulation on return.
  clock.getDelta();
  renderInvalidated = true;
});

/** Get current max speed considering active buff */
function getMaxSpeed() {
  if (globalState.player.currentBuff === 'NetherBlend' && globalState.player.buffExpireTime > Date.now()) {
    return BASE_MS * 1.3;
  }
  return BASE_MS;
}
function triggerShake(intensity = 0.08) { if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) shakeIntensity = Math.max(shakeIntensity, intensity); }

// ==================== Camera Transition Tween ====================
const tweenData = { active: false, startPos: new THREE.Vector3(), endPos: new THREE.Vector3(), startYaw: 0, endYaw: 0, startPitch: 0, endPitch: 0, progress: 0, duration: 0.4, onDone: null };
function startTween(endPos, endYaw, endPitch, duration = 0.4, onDone = null) {
  tweenData.active = true; tweenData.progress = 0; tweenData.duration = duration;
  tweenData.startPos.copy(camera.position);
  tweenData.endPos.copy(endPos);
  tweenData.startYaw = fpCamera.yaw; tweenData.endYaw = endYaw;
  tweenData.startPitch = fpCamera.pitch; tweenData.endPitch = endPitch;
  tweenData.onDone = onDone;
}
function updateTween(dt) {
  if (!tweenData.active) return;
  tweenData.progress += dt / tweenData.duration;
  if (tweenData.progress >= 1) {
    tweenData.progress = 1; tweenData.active = false;
    camera.position.copy(tweenData.endPos);
    fpCamera.yaw = tweenData.endYaw; fpCamera.pitch = tweenData.endPitch;
    if (tweenData.onDone) { const cb = tweenData.onDone; tweenData.onDone = null; cb(); }
    return;
  }
  const t = tweenData.progress;
  const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; // easeInOutQuad
  camera.position.lerpVectors(tweenData.startPos, tweenData.endPos, ease);
  let yawDiff = tweenData.endYaw - tweenData.startYaw;
  while (yawDiff > Math.PI) yawDiff -= 2 * Math.PI;
  while (yawDiff < -Math.PI) yawDiff += 2 * Math.PI;
  fpCamera.yaw = tweenData.startYaw + yawDiff * ease;
  fpCamera.pitch = tweenData.startPitch + (tweenData.endPitch - tweenData.startPitch) * ease;
}
function updateMovement(dt) {
  if (currentState !== STATE.ROAMING || floorTransitioning) { velocity.set(0, 0, 0); footstepTimer = 0; return; }
  const fw = fpCamera.getForwardFlat(), rt = fpCamera.getRightFlat(), id = new THREE.Vector3();
  if (keys['KeyW']) id.add(fw); if (keys['KeyS']) id.sub(fw); if (keys['KeyA']) id.sub(rt); if (keys['KeyD']) id.add(rt);
  if (id.lengthSq() > 1) id.normalize();
  if(id.lengthSq()>0 || currentFloorKey!=='ROOFTOP')observingSky=false;
  const ms = getMaxSpeed();
  velocity.x += id.x * A * dt; velocity.z += id.z * A * dt; velocity.x -= velocity.x * F * dt; velocity.z -= velocity.z * F * dt;
  const sp = velocity.length(); if (sp > ms) velocity.multiplyScalar(ms / sp); if (sp < 0.01) velocity.set(0, 0, 0);
  camera.position.x += velocity.x * dt; camera.position.z += velocity.z * dt;

  // Floor-aware bounds clamping
  const floor = FLOORS[currentFloorKey] || FLOORS.SURFACE;
  if (currentFloorKey === 'DEPTHS') {
    camera.position.x = THREE.MathUtils.clamp(camera.position.x, -7.8, 7.8);
    camera.position.z = THREE.MathUtils.clamp(camera.position.z, -7.8, 7.8);
  } else if (currentFloorKey === 'ROOFTOP') {
    camera.position.x = THREE.MathUtils.clamp(camera.position.x, -4.8, 4.8);
    camera.position.z = THREE.MathUtils.clamp(camera.position.z, -4.8, 4.8);
  } else if (currentFloorKey === 'SANCTUARY') {
    camera.position.x = THREE.MathUtils.clamp(camera.position.x, -5.1, 5.1);
    camera.position.z = THREE.MathUtils.clamp(camera.position.z, -4.5, 5.1);
  } else {
    camera.position.x = THREE.MathUtils.clamp(camera.position.x, WORLD_BOUNDS.xMin, WORLD_BOUNDS.xMax);
    camera.position.z = THREE.MathUtils.clamp(camera.position.z, WORLD_BOUNDS.zMin, WORLD_BOUNDS.zMax);
  }

  const eyeY = floor.y + floor.eyeHeight;
  camera.position.y = eyeY; if (sp / ms > 0.05) camera.position.y = eyeY + Math.sin(Date.now() * 0.012) * 0.03 * (sp / ms);
  // Footstep SFX
  const moveRatio = sp / ms;
  if (moveRatio > 0.1) {
    footstepTimer -= dt;
    if (footstepTimer <= 0) {
      audioManager.playSFX('sfx_step', { surface: currentFloorKey === 'DEPTHS' ? 'depths' : camera.position.x < -5.5 ? 'tavern' : 'plaza' });
      footstepTimer = 0.45 - moveRatio * 0.15; // faster steps at higher speed
    }
  } else { footstepTimer = 0; }
}

function handleInteract() {
  if (interactLock) return; const pos = new THREE.Vector3(camera.position.x, 0, camera.position.z);
  fpCamera.gesture('reach');

  // Plaza pillar — descend into Memory Depths
  if (isNearPillarEntrance(camera.position)) { goToDepths(); return; }

  // Depths stairwell — return to surface
  if (isNearDepthsExit(camera.position)) { goToSurface(); return; }

  // Rooftop ladder — ascend to observation deck
  if (isNearRooftopEntrance(camera.position)) { goToRooftop(); return; }

  // Rooftop hatch — return to surface
  if (isNearRooftopExit(camera.position)) { goFromRooftop(); return; }

  // Sanctuary entrance — go to sanctuary floor
  if (isNearSanctuaryEntrance(camera.position)) { goToSanctuary(); return; }

  // Sanctuary exit
  if (isNearSanctuaryExit(camera.position)) { goFromSanctuary(); return; }

  if (currentFloorKey==='ROOFTOP' && Math.hypot(camera.position.x+1,camera.position.z+1.2)<1.7) {
    observingSky=true;clearMovementInput();startTween(camera.position.clone(),-.95,.68,.75);
    eveTrigger(EVE_TRIGGER.SKY_VIEWED);showPrompt(t('art.sky_view'));return;
  }

  // Sanctuary: open shelter iframe
  if (currentFloorKey === 'SANCTUARY' && abyssWorld.sanctuary) {
    const globe = abyssWorld.sanctuary.getGlobeForShelter(camera.position);
    if (globe) {
      openShelterIframe(globe);
      return;
    }
  }


  // --- Depths-specific interactions ---
  if (currentFloorKey === 'DEPTHS') {
    // Fishing pool
    if (abyssWorld.depths?.isNearFishingPool(camera.position)) {
      if (fishingState === FISHING_STATE.IDLE) { startFishing(); }
      else { reelIn(); }
      return;
    }
    // Altar interaction
    if (abyssWorld.depths?.isNearAltar(camera.position)) {
      const collected = exploration.shardsCollected;
      if (collected >= 3) {
        interactLock = true;
        audioManager.playSFX('sfx_shard');
        triggerShake(0.12);
        ParticleBurst.spawn(scene, new THREE.Vector3(0, -3.5, -2), { count: 16, color: 0xcc88ff, life: 1.2, size: 0.06, spread: 1.0 });
        spawnHiddenMachineInDepths();
        showPrompt(t('prompt.altar_resonance'));
        setTimeout(() => { hidePrompt(); interactLock = false; }, 4000);
        return;
      } else {
        showPrompt(t('prompt.need_shards', { n: collected }));
        setTimeout(hidePrompt, 2500);
        return;
      }
    }
    // Depths arcade machines
    let dcl = null, dcd = 3.0;
    for (const m of depthsMachines) {
      const d = m.getDistance(new THREE.Vector3(camera.position.x, -5, camera.position.z));
      if (d < dcd) { dcd = d; dcl = m; }
    }
    if (dcl) {
      if (dcl.config.status !== 'ready') { showPrompt('🔒 ' + dcl.config.name); setTimeout(hidePrompt, 2500); return; }
      interactLock = true; audioManager.playSFX('sfx_coin'); sitDown(dcl); return;
    }
  }

  // Bar counter — open drink menu (surface only)
  if (currentFloorKey === 'SURFACE' && isNearBarCounter(camera.position)) { openBarMenu(); return; }

  // Arcade machines — surface only
  if (currentFloorKey === 'SURFACE') {
    let cl = null, cd = 3.0;
    for (const m of machines) { const d = m.getDistance(pos); if (d < cd) { cd = d; cl = m; } }
    if (cl) { if (cl.config.status !== 'ready') { showPrompt('🔒 ' + cl.config.name); setTimeout(hidePrompt, 2500); return; } interactLock = true; audioManager.playSFX('sfx_coin'); sitDown(cl); return; }
  }
  const sh = exploration.getNearbyShard(pos, 2.5);
  if (sh) { interactLock = true; const c = exploration.collectShard(sh); audioManager.playSFX('sfx_shard'); triggerShake(0.06); ParticleBurst.spawn(scene, new THREE.Vector3(camera.position.x, 1.2, camera.position.z), { count: 14, color: 0xcc44ff, life: 1.0, size: 0.05 }); showPrompt(t('prompt.shard_collected', { n: c, total: '3' })); const sSh = SaveManager.load(); updateMissionProgress(sSh, '_dm_shard', 1); SaveManager.save(sSh); checkAndToast(); eveTrigger(EVE_TRIGGER.SHARD_COLLECTED, { collected: c, total: 3 }); setTimeout(() => { hidePrompt(); interactLock = false; }, 3000); if (c >= 3) setTimeout(() => { showPrompt('🔮 碎片集齐'); triggerShake(0.15); checkAndToast(); setTimeout(hidePrompt, 4000); }, 3200); return; }
  const cup = getNearbyCup(camera.position);
  if (cup) { openBarMenu(); return; }
  const lo = exploration.getNearbyLore(camera.position); if (lo) { interactLock = true; showPrompt('📜 ' + lo.title); setTimeout(() => { hidePrompt(); interactLock = false; }, 6000); return; }
  // Anomaly — depths only
  if (currentFloorKey === 'DEPTHS' && abyssWorld.depths) {
    const anomaly = abyssWorld.depths.getNearbyAnomaly(camera.position, 2.5);
    if (anomaly) {
      interactLock = true;
      showPrompt('⚠ ' + anomaly.detail);
      eveUpdateContext({ anomalyLabel: anomaly.label });
      eveTrigger(EVE_TRIGGER.CHAT_MESSAGE, { author: 'E.V.E.', text: anomaly.detail });
      setTimeout(() => { hidePrompt(); interactLock = false; }, 6000);
      return;
    }
  }
  // Data pillar — depths only
  if (currentFloorKey === 'DEPTHS' && abyssWorld.depths) {
    const pillar = abyssWorld.depths.getNearbyPillar(camera.position, 2.5);
    if (pillar) {
      interactLock = true;
      showPrompt('📊 ' + pillar.label + ' — ' + pillar.detail);
      eveUpdateContext({ analyzingPillar: pillar.label });
      setTimeout(() => { hidePrompt(); interactLock = false; }, 6000);
      return;
    }
  }
  // Cats — pet nearby cat
  {
    const nearbyCat = catManager.getNearbyCat(camera.position, 2.5, currentFloorKey);
    if (nearbyCat) {
      const result = catManager.petCat(nearbyCat, camera.position);
      if (result) {
        fpCamera.gesture('pet');
        audioManager.playSFX('sfx_cat');
        ParticleBurst.spawn(scene, {x:nearbyCat.group.position.x,y:nearbyCat.group.position.y+.65,z:nearbyCat.group.position.z}, {kind:'affection',color:0xe9a0b2,count:12,life:1.3,size:.025,spread:.3,speed:.4});
        // Show response
        showPrompt(result.emoji + ' ' + result.name + ': 「' + result.message + '」');
        setTimeout(hidePrompt, 3000);

        // Save stats
        const s = SaveManager.load();
        catManager.saveTo(s);
        SaveManager.save(s);

        // EVE trigger
        eveTrigger(EVE_TRIGGER.CAT_PET, {
          name: result.name,
          breed: result.breed,
          personality: nearbyCat.def.personality,
        });

        // Achievement check
        checkAndToast();

        // Broadcast to chat only on specific milestones
        const dn = getDisplayName() || currentCharData.name;
        if (catManager.stats.totalPets === 20) {
          networkClient.sendChat({
            author: '🏆', text: t('chat.cat_achievement_20', { name: dn }),
            color: '#ffcc00'
          });
        }
        if (catManager.stats.uniqueCats === 4 && result.petCount === 1) {
          networkClient.sendChat({
            author: '🏆', text: t('chat.cat_achievement_all', { name: dn }),
            color: '#ffcc00'
          });
        }
      }
      interactLock = true;
      setTimeout(() => { interactLock = false; }, 500);
      return;
    }
  }

  // Ground message — open vote panel
  if (MessageSystem.getInteractData()) { showVoteBar(); }
}
// ==================== Bar Menu System ====================
function getDrinkMenu() {
  return [
    { id: 'VoidBeer',       name: t('drink.void_beer.name'),   desc: t('drink.void_beer.desc'), buffDesc: t('drink.void_beer.buff'),   icon: '🍺', color: '#00ffcc', price: 3 },
    { id: 'RedstoneLiquor', name: t('drink.redstone_liquor.name'),   desc: t('drink.redstone_liquor.desc'),       buffDesc: t('drink.redstone_liquor.buff'),     icon: '🥃', color: '#ff2200', price: 3 },
    { id: 'NetherBlend',    name: t('drink.nether_blend.name'),   desc: t('drink.nether_blend.desc'), buffDesc: t('drink.nether_blend.buff'),    icon: '🍸', color: '#cc44ff', price: 3 },
  ];
}
const DRINK_MENU = getDrinkMenu();

const barMenuPanel = document.getElementById('bar-menu-panel');
const barMenuDrinks = document.getElementById('bar-menu-drinks');
const barMenuBalance = document.getElementById('bar-menu-balance');
const barMenuClose = document.getElementById('bar-menu-close');

function openBarMenu() {
  const s = SaveManager.load();
  barMenuBalance.textContent = s.coins || 0;
  barMenuDrinks.innerHTML = '';
  for (const d of DRINK_MENU) {
    const card = document.createElement('div');
    card.className = 'drink-card';
    card.innerHTML = `
      <div class="drink-card-icon" style="background:${d.color}22;border-color:${d.color}44">${d.icon}</div>
      <div class="drink-card-info">
        <div class="drink-card-name">${d.name}</div>
        <div class="drink-card-desc">${d.desc}</div>
        <div class="drink-card-buff" style="color:${d.color}">${d.buffDesc}</div>
      </div>
      <div class="drink-card-price">🪙 ${d.price}</div>
    `;
    card.addEventListener('click', () => buyDrink(d));
    barMenuDrinks.appendChild(card);
  }
  barMenuPanel.classList.remove('hidden');
  document.exitPointerLock();
}

function closeBarMenu() {
  barMenuPanel.classList.add('hidden');
  if (currentState === STATE.ROAMING) setTimeout(() => requestRoamingPointerLock(), 100);
}

barMenuClose.addEventListener('click', closeBarMenu);

function buyDrink(drink) {
  const s = SaveManager.load();
  if ((s.coins || 0) < drink.price) {
    showPrompt(t('bar.insufficient', { n: drink.price }));
    setTimeout(hidePrompt, 2000);
    return;
  }
  s.coins -= drink.price;
  s._drinksBought = (s._drinksBought || 0) + 1;
  updateMissionProgress(s, '_dm_drink', 1);
  SaveManager.save(s);
  currentCharData = SaveManager.getCurrentChar(); updateHUD();
  checkAndToast();
  globalState.player.currentBuff = drink.id;
  globalState.player.buffExpireTime = Date.now() + 30000;
  // Update buff HUD
  const buffEl = document.getElementById('hud-buff');
  buffEl.textContent = drink.icon + ' ' + drink.name + ' ' + drink.buffDesc.split(' ')[0];
  buffEl.classList.remove('hidden');
  audioManager.playSFX('sfx_drink');
  fpCamera.gesture('drink');
  triggerShake(0.04);
  ParticleBurst.spawn(scene, new THREE.Vector3(camera.position.x, camera.position.y - 0.4, camera.position.z), { kind: 'drink', count: 18, color: parseInt(drink.color.replace('#', '0x')), life: 1.1, size: 0.04, spread: 0.4 });
  showPrompt(drink.icon + ' ' + drink.name + ' — ' + drink.buffDesc);
  setTimeout(hidePrompt, 2500);
  eveTrigger(EVE_TRIGGER.DRINK_BOUGHT, { drink: drink.id });
  closeBarMenu();
}

/** Check if player is near the bar counter area */
function isNearBarCounter(pos) {
  // Bar counter spans X: [-13, -7.5], Z front edge at ~3.1
  const barCenterX = -10.25, barCenterZ = 3.1;
  const dx = Math.abs(pos.x - barCenterX);
  const dz = Math.abs(pos.z - barCenterZ);
  return dx < 3.0 && dz < 1.8;
}

// Keep old cup interaction for backward compat
function getNearbyCup(pp) { const tg = abyssWorld.tavern?.group; if (!tg) return null; let c = null, cd = 2.2; tg.traverse((ch) => { if (ch.userData?.isDrink) { const wp = new THREE.Vector3(); ch.getWorldPosition(wp); const d = pp.distanceTo(wp); if (d < cd) { cd = d; c = ch; } } }); return c; }

// ==================== Floor Transition ====================

/** Check if player is near the plaza center pillar (depths entrance) */
function isNearPillarEntrance(pos) {
  const dx = Math.abs(pos.x);
  const dz = Math.abs(pos.z);
  return dx < 1.8 && dz < 1.8 && currentFloorKey === 'SURFACE';
}

/** Check if player is near the depths stairwell (return to surface) */
function isNearDepthsExit(pos) {
  return pos.z > 7.0 && Math.abs(pos.x) < 1.5 && currentFloorKey === 'DEPTHS';
}

/** Check if player is near the rooftop access ladder (tavern → rooftop) */
function isNearRooftopEntrance(pos) {
  // Ladder on tavern north wall, X≈-10, Z≈-4.5
  const dx = Math.abs(pos.x + 10);
  const dz = Math.abs(pos.z + 4.5);
  return dx < 1.5 && dz < 1.5 && currentFloorKey === 'SURFACE';
}

/** Check if player is near the rooftop hatch (rooftop → surface) */
function isNearRooftopExit(pos) {
  // Hatch at center-north of rooftop platform: X=0, Z≈-4.3
  const dx = Math.abs(pos.x);
  const dz = Math.abs(pos.z + 4.3);
  return dx < 1.5 && dz < 1.5 && currentFloorKey === 'ROOFTOP';
}

/** Transition to the Memory Depths */
function goToDepths() {
  if (floorTransitioning) return;
  floorTransitioning = true;
  interactLock = true;
  document.exitPointerLock();

  // Fade via deep blue-purple overlay (bridges warm surface → cold depths)
  const overlay = document.createElement('div');
  overlay.id = 'floor-fade';
  overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:#050510;z-index:200;pointer-events:all;transition:opacity 0.4s;opacity:0';
  document.body.appendChild(overlay);

  requestAnimationFrame(() => { overlay.style.opacity = '1'; });

  setTimeout(() => {
    currentFloorKey = 'DEPTHS';
    const floor = FLOORS.DEPTHS;
    camera.position.set(0, floor.y + floor.eyeHeight, 6);
    fpCamera.yaw = Math.PI;  // face north (into the room)
    fpCamera.pitch = 0;
    velocity.set(0, 0, 0);

    // Switch fog to depths
    if (abyssWorld._depthsFog) scene.fog = abyssWorld._depthsFog;

    // Update ambience — notify audio manager of zone change
    abyssWorld.tavern?.stopMusic?.();
    try { audioManager.playSFX('sfx_shard'); } catch (e) {}
    eveTrigger(EVE_TRIGGER.DEPTHS_ENTERED);

    requestAnimationFrame(() => { overlay.style.opacity = '0'; });
    setTimeout(() => {
      overlay.remove();
      floorTransitioning = false;
      interactLock = false;
      requestRoamingPointerLock();
      showPrompt(t('prompt.depths_enter'));
      setTimeout(hidePrompt, 3000);
    }, 700);
  }, 600);
}

/** Transition back to the surface */
function goToSurface() {
  if (floorTransitioning) return;
  floorTransitioning = true;
  interactLock = true;
  document.exitPointerLock();

  // Fade via warm amber overlay (bridges cold depths → warm surface)
  const overlay = document.createElement('div');
  overlay.id = 'floor-fade';
  overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:#1a1008;z-index:200;pointer-events:all;transition:opacity 0.4s;opacity:0';
  document.body.appendChild(overlay);

  requestAnimationFrame(() => { overlay.style.opacity = '1'; });

  setTimeout(() => {
    currentFloorKey = 'SURFACE';
    const floor = FLOORS.SURFACE;
    camera.position.set(0, floor.y + floor.eyeHeight, 0.8);  // just south of pillar
    fpCamera.yaw = 0;
    fpCamera.pitch = 0;
    velocity.set(0, 0, 0);

    // Restore surface fog
    if (abyssWorld._surfaceFog) scene.fog = abyssWorld._surfaceFog;

    eveTrigger(EVE_TRIGGER.DEPTHS_EXITED);

    requestAnimationFrame(() => { overlay.style.opacity = '0'; });
    setTimeout(() => {
      overlay.remove();
      floorTransitioning = false;
      interactLock = false;
      requestRoamingPointerLock();
      showPrompt(t('prompt.surface_return'));
      setTimeout(hidePrompt, 2000);
    }, 700);
  }, 600);
}

/** Transition up to the Rooftop observation deck */
function goToRooftop() {
  if (floorTransitioning) return;
  floorTransitioning = true;
  interactLock = true;
  document.exitPointerLock();

  // Fade via deep indigo overlay (bridges warm surface → cool night sky)
  const overlay = document.createElement('div');
  overlay.id = 'floor-fade';
  overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:#040412;z-index:200;pointer-events:all;transition:opacity 0.4s;opacity:0';
  document.body.appendChild(overlay);

  requestAnimationFrame(() => { overlay.style.opacity = '1'; });

  setTimeout(() => {
    currentFloorKey = 'ROOFTOP';
    const floor = FLOORS.ROOFTOP;
    camera.position.set(0, floor.y + floor.eyeHeight, -3.5);
    fpCamera.yaw = 0;
    fpCamera.pitch = 0;
    velocity.set(0, 0, 0);

    // Switch fog to rooftop
    if (abyssWorld._rooftopFog) scene.fog = abyssWorld._rooftopFog;

    // CRITICAL: Set background BEFORE showing starry sky
    scene.background = new THREE.Color(0x040412);

    // CRITICAL: Show rooftop group (includes starry sky)
    if (abyssWorld.rooftop) {
      abyssWorld.rooftop.group.visible = true;
    }

    // Show rooftop cats, hide surface cats
    catManager.setFloorVisible('ROOFTOP', true);
    catManager.setFloorVisible('SURFACE', false);
    eveTrigger(EVE_TRIGGER.ROOFTOP_ENTERED);

    // Stop tavern/plaza music
    abyssWorld.tavern?.stopMusic?.();

    requestAnimationFrame(() => { overlay.style.opacity = '0'; });
    setTimeout(() => {
      overlay.remove();
      floorTransitioning = false;
      interactLock = false;
      requestRoamingPointerLock();
      showPrompt(t('prompt.rooftop_enter'));
      setTimeout(hidePrompt, 4000);
    }, 700);
  }, 600);
}

/** Transition back down from Rooftop to Surface */
function goFromRooftop() {
  if (floorTransitioning) return;
  floorTransitioning = true;
  interactLock = true;
  document.exitPointerLock();

  // Fade via warm amber overlay
  const overlay = document.createElement('div');
  overlay.id = 'floor-fade';
  overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:#1a1008;z-index:200;pointer-events:all;transition:opacity 0.4s;opacity:0';
  document.body.appendChild(overlay);

  requestAnimationFrame(() => { overlay.style.opacity = '1'; });

  setTimeout(() => {
    // CRITICAL: Hide rooftop group BEFORE restoring surface background
    if (abyssWorld.rooftop) {
      abyssWorld.rooftop.group.visible = false;
    }

    // Show surface cats, hide rooftop cats
    catManager.setFloorVisible('SURFACE', true);
    catManager.setFloorVisible('ROOFTOP', false);

    // CRITICAL: Restore surface background AFTER hiding rooftop
    scene.background = new THREE.Color(0x332a22);

    currentFloorKey = 'SURFACE';
    const floor = FLOORS.SURFACE;
    camera.position.set(-10, floor.y + floor.eyeHeight, -4);
    fpCamera.yaw = 0;
    fpCamera.pitch = 0;
    velocity.set(0, 0, 0);

    // Restore surface fog
    if (abyssWorld._surfaceFog) scene.fog = abyssWorld._surfaceFog;

    requestAnimationFrame(() => { overlay.style.opacity = '0'; });
    setTimeout(() => {
      overlay.remove();
      floorTransitioning = false;
      interactLock = false;
      requestRoamingPointerLock();
      showPrompt(t('prompt.rooftop_return'));
      setTimeout(hidePrompt, 2000);
    }, 700);
  }, 600);
}

// ==================== Sanctuary Entrance & Exits ====================

/** Check if player is near the sanctuary entrance (Plaza south wall at Z=4.8) */
function isNearSanctuaryEntrance(pos) {
  // Entrance at the Plaza south wall center: X=0, Z≈4.8
  const dx = Math.abs(pos.x);
  const dz = Math.abs(pos.z - 4.5);
  return dx < 1.5 && dz < 1.5 && currentFloorKey === 'SURFACE';
}

/** Check if player is near the sanctuary exit hatch */
function isNearSanctuaryExit(pos) {
  if (currentFloorKey !== 'SANCTUARY') return false;
  return abyssWorld.sanctuary?.isNearExit(pos) || false;
}

/** Transition up to the WorldSanctuary */
function goToSanctuary() {
  if (floorTransitioning) return;
  floorTransitioning = true;
  interactLock = true;
  document.exitPointerLock();

  // Fade via deep purple overlay
  const overlay = document.createElement('div');
  overlay.id = 'floor-fade';
  overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:#0a0a1e;z-index:200;pointer-events:all;transition:opacity 0.4s;opacity:0';
  document.body.appendChild(overlay);

  requestAnimationFrame(() => { overlay.style.opacity = '1'; });

  setTimeout(() => {
    currentFloorKey = 'SANCTUARY';
    const floor = FLOORS.SANCTUARY;

    // Show sanctuary group
    if (abyssWorld.sanctuary) {
      abyssWorld.sanctuary.group.visible = true;
    }

    // Hide other floor groups
    if (abyssWorld.rooftop) abyssWorld.rooftop.group.visible = false;
    catManager.setFloorVisible('SURFACE', false);

    camera.position.set(0, floor.y + floor.eyeHeight, 1.5);  // center-south, facing globes
    fpCamera.yaw = Math.PI; // face north
    fpCamera.pitch = 0;
    velocity.set(0, 0, 0);

    // Switch fog to sanctuary
    if (abyssWorld._sanctuaryFog) scene.fog = abyssWorld._sanctuaryFog;

    eveTrigger(EVE_TRIGGER.SANCTUARY_ENTERED);

    requestAnimationFrame(() => { overlay.style.opacity = '0'; });
    setTimeout(() => {
      overlay.remove();
      floorTransitioning = false;
      interactLock = false;
      requestRoamingPointerLock();
      showPrompt(t('prompt.sanctuary_arrive'));
      setTimeout(hidePrompt, 4000);
    }, 700);
  }, 600);
}

/** Transition from Sanctuary back to Plaza (Surface) */
function goFromSanctuary() {
  if (floorTransitioning) return;
  floorTransitioning = true;
  interactLock = true;
  document.exitPointerLock();

  const overlay = document.createElement('div');
  overlay.id = 'floor-fade';
  overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:#1a1008;z-index:200;pointer-events:all;transition:opacity 0.4s;opacity:0';
  document.body.appendChild(overlay);

  requestAnimationFrame(() => { overlay.style.opacity = '1'; });

  setTimeout(() => {
    if (abyssWorld.sanctuary) {
      abyssWorld.sanctuary.group.visible = false;
    }

    catManager.setFloorVisible('SURFACE', true);

    currentFloorKey = 'SURFACE';
    const floor = FLOORS.SURFACE;
    camera.position.set(0, floor.y + floor.eyeHeight, 3.0);
    fpCamera.yaw = Math.PI;
    fpCamera.pitch = 0;
    velocity.set(0, 0, 0);

    // Restore surface fog
    if (abyssWorld._surfaceFog) scene.fog = abyssWorld._surfaceFog;

    requestAnimationFrame(() => { overlay.style.opacity = '0'; });
    setTimeout(() => {
      overlay.remove();
      floorTransitioning = false;
      interactLock = false;
      requestRoamingPointerLock();
      showPrompt(t('prompt.leave_sanctuary'));
      setTimeout(hidePrompt, 2000);
    }, 700);
  }, 600);
}

// ==================== Sanctuary Iframe ====================

let _shelterEscHandler = null;

function openShelterIframe(globe) {
  if (shelterIframeActive) return;
  shelterIframeActive = true;
  interactLock = true;
  document.exitPointerLock();

  eveTrigger(EVE_TRIGGER.GLOBE_VIEWING, { globe: globe.country.title });

  const overlay = document.createElement('div');
  overlay.id = 'shelter-overlay';
  overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:300;background:#000;';
  document.body.appendChild(overlay);

  const iframe = document.createElement('iframe');
  iframe.src = 'shelters/' + globe.country.file;
  iframe.style.cssText = 'width:100%;height:100%;border:none;display:block;';
  overlay.appendChild(iframe);

  // Window-level ESC handler — catches events even from within the iframe
  _shelterEscHandler = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      closeShelterIframe();
    }
  };
  window.addEventListener('keydown', _shelterEscHandler, true);
}

function closeShelterIframe() {
  if (!shelterIframeActive) return;
  shelterIframeActive = false;
  interactLock = false;

  if (_shelterEscHandler) {
    window.removeEventListener('keydown', _shelterEscHandler, true);
    _shelterEscHandler = null;
  }

  const overlay = document.getElementById('shelter-overlay');
  if (overlay) overlay.remove();

  setTimeout(() => {
    if (currentState === STATE.ROAMING) requestRoamingPointerLock();
  }, 150);
}

// ==================== Void Fishing (Enhanced) ====================
const FISHING_STATE = { IDLE: 'idle', CASTING: 'casting', WAITING: 'waiting', NIBBLE: 'nibble', BITE: 'bite', TENSION: 'tension', REELING: 'reeling' };
let fishingState = FISHING_STATE.IDLE;
let fishingTimer = 0;
let fishingBiteWindow = 0;
let fishingCatch = null;
let fishingStreak = 0;        // consecutive catches
let fishingTensionMeter = 0;  // 0..1, oscillates during TENSION
let fishingTensionDir = 1;    // +1 or -1
let fishingTensionSpeed = 2.5;

const FISHING_LOOT = [
  { i18nKey: 'loot.data_shard',    icon: '💾', coins: 1,  weight: 35, rarity: 'common' },
  { i18nKey: 'loot.pixel_fish',    icon: '🐟', coins: 2,  weight: 25, rarity: 'common' },
  { i18nKey: 'loot.glow_squid',    icon: '🦑', coins: 5,  weight: 15, rarity: 'uncommon' },
  { i18nKey: 'loot.abyss_relic',   icon: '🏺', coins: 10, weight: 10, rarity: 'uncommon' },
  { i18nKey: 'loot.void_jelly',    icon: '🪼', coins: 8,  weight: 8,  rarity: 'rare' },
  { i18nKey: 'loot.old_core',      icon: '💎', coins: 30, weight: 4,  rarity: 'rare' },
  { i18nKey: 'loot.lost_ai_log',   icon: '📜', coins: 50, weight: 2,  rarity: 'legendary' },
  { i18nKey: 'loot.primal_shard',  icon: '🔮', coins: 100,weight: 1,  rarity: 'legendary' },
];

function getRandomLoot() {
  // Streak bonus: better odds at 5+ streak
  const adjusted = FISHING_LOOT.map(l => ({
    ...l,
    weight: l.rarity === 'legendary' ? l.weight + fishingStreak * 0.3
           : l.rarity === 'rare' ? l.weight + fishingStreak * 0.5
           : l.weight
  }));
  const total = adjusted.reduce((s, l) => s + l.weight, 0);
  let r = Math.random() * total;
  for (const loot of adjusted) { r -= loot.weight; if (r <= 0) return loot; }
  return adjusted[0];
}

const fishingUI = document.getElementById('fishing-ui');
const fishingStatus = document.getElementById('fishing-status');
const fishingBite = document.getElementById('fishing-bite');
const fishingResult = document.getElementById('fishing-result');
const fishingTimerEl = document.getElementById('fishing-timer');

function startFishing() {
  if (fishingState !== FISHING_STATE.IDLE) return;
  fishingState = FISHING_STATE.CASTING;
  fishingUI.classList.remove('hidden');
  fishingStatus.textContent = t('fishing.casting');
  fishingBite.classList.add('hidden');
  fishingResult.classList.add('hidden');
  fishingTimerEl.textContent = '';
  fishingTimer = 0;
  document.exitPointerLock();

  setTimeout(() => {
    if (fishingState !== FISHING_STATE.CASTING) return;
    fishingState = FISHING_STATE.WAITING;
    fishingStatus.textContent = fishingStreak > 0 ? t('fishing.streak', { n: fishingStreak }) : t('fishing.waiting');
    fishingTimer = 1.5 + Math.random() * 5;
    fishingBiteWindow = 0;
  }, 800);
}

function updateFishing(dt) {
  if (fishingState === FISHING_STATE.IDLE) return;

  if (fishingState === FISHING_STATE.WAITING) {
    fishingTimer -= dt;
    // Show countdown or dots animation
    const dots = '.'.repeat(Math.floor((Date.now() / 400) % 4));
    fishingTimerEl.textContent = dots || '...';

    // Random nibble (false alarm) — 20% chance in last 2 seconds
    if (fishingTimer < 2 && fishingTimer > 0.3 && Math.random() < dt * 0.15) {
      fishingState = FISHING_STATE.NIBBLE;
      fishingStatus.textContent = t('fishing.nibble');
      fishingNibbleTimer = 0.6 + Math.random() * 0.8;
      try { audioManager.playSFX('sfx_shard'); } catch (e) {}
    }
    if (fishingTimer <= 0) {
      fishingState = FISHING_STATE.BITE;
      fishingTimerEl.textContent = t('fishing.bite_short');
      fishingBite.classList.remove('hidden');
      fishingBiteWindow = 2.5;
      try { audioManager.playSFX('sfx_shard'); } catch (e) {}
      // Bite particles
      ParticleBurst.spawn(scene, new THREE.Vector3(camera.position.x, 1.0, camera.position.z),
        { count: 8, color: 0x4488ff, life: 0.5, size: 0.03, spread: 0.5 });
    }
  }

  // Nibble false alarm — fades back to waiting
  if (fishingState === FISHING_STATE.NIBBLE) {
    fishingNibbleTimer -= dt;
    if (fishingNibbleTimer <= 0) {
      fishingState = FISHING_STATE.WAITING;
      fishingStatus.textContent = t('fishing.false_alarm');
      fishingTimer = Math.max(fishingTimer, 0.5); // resume timer
    }
  }

  // Bite window — press E to enter tension minigame
  if (fishingState === FISHING_STATE.BITE) {
    fishingBiteWindow -= dt;
    fishingBite.textContent = t('fishing.bite', { t: Math.ceil(fishingBiteWindow) });
    if (fishingBiteWindow <= 0) {
      fishingStatus.textContent = t('fishing.missed');
      fishingBite.classList.add('hidden');
      fishingTimerEl.textContent = '';
      fishingStreak = 0;
      setTimeout(resetFishing, 2000);
    }
  }

  // Tension minigame — oscillating meter, press E to stop
  if (fishingState === FISHING_STATE.TENSION) {
    fishingBiteWindow -= dt;
    if (fishingBiteWindow <= 0) {
      fishingStatus.textContent = t('fishing.snapped');
      fishingTimerEl.textContent = '';
      fishingStreak = 0;
      eveTrigger(EVE_TRIGGER.FISH_MISSED);
      setTimeout(resetFishing, 2000);
    }
    fishingTensionMeter += dt * fishingTensionSpeed * fishingTensionDir;
    if (fishingTensionMeter >= 1) { fishingTensionMeter = 1; fishingTensionDir = -1; }
    if (fishingTensionMeter <= 0) { fishingTensionMeter = 0; fishingTensionDir = 1; }
    // Render tension bar via text
    const barW = 16;
    const pos = Math.floor(fishingTensionMeter * barW);
    let bar = '';
    for (let i = 0; i < barW; i++) {
      if (i >= 5 && i <= 10) bar += i === pos ? '⬆' : '─'; // sweet spot
      else bar += i === pos ? '|' : '·';
    }
    fishingTimerEl.innerHTML = `<span style="color:#44ff44">[${bar}]</span> <span style="font-size:10px">${t('fishing.tension_bar_hint')} (${Math.ceil(fishingBiteWindow)}s)</span>`;
  }
}

let fishingNibbleTimer = 0;

function reelIn() {
  if (fishingState === FISHING_STATE.BITE) {
    // Enter tension minigame
    fishingState = FISHING_STATE.TENSION;
    fishingBite.classList.add('hidden');
    fishingStatus.textContent = t('fishing.tension');
    fishingTensionMeter = Math.random(); // random start
    fishingTensionDir = Math.random() > 0.5 ? 1 : -1;
    fishingTensionSpeed = 1.8 + fishingStreak * 0.15; // faster with streak
    fishingBiteWindow = 3.5; // max time for minigame
  } else if (fishingState === FISHING_STATE.TENSION) {
    // Stop the meter — check position
    const inSweetSpot = fishingTensionMeter >= 0.31 && fishingTensionMeter <= 0.63;
    const inYellow = (fishingTensionMeter >= 0.2 && fishingTensionMeter < 0.31)
                  || (fishingTensionMeter > 0.63 && fishingTensionMeter <= 0.75);

    if (inSweetSpot || inYellow) {
      fishingCatch = getRandomLoot();
      const coinBonus = inSweetSpot ? 1 : 0.5;
      const earnedCoins = Math.floor(fishingCatch.coins * coinBonus) || 1;
      fishingStreak++;

      const lootName = t(fishingCatch.i18nKey);
      fishingState = FISHING_STATE.REELING;
      fishingResult.textContent = fishingCatch.icon + ' ' + lootName + '！ 🪙+' + earnedCoins
        + (fishingStreak > 1 ? ` 🔥${fishingStreak}` + t('fishing.streak_suffix') : '');
      fishingResult.classList.remove('hidden');
      fishingStatus.textContent = inSweetSpot ? t('fishing.perfect') : t('fishing.got_it');
      fishingTimerEl.textContent = '';

      const s = SaveManager.load();
      s.coins = (s.coins || 0) + earnedCoins;
      s._fishCaught = (s._fishCaught || 0) + 1;
      s._fishStreak = Math.max(s._fishStreak || 0, fishingStreak);
      updateMissionProgress(s, '_dm_fish', 1);
      SaveManager.save(s);
      currentCharData = SaveManager.getCurrentChar(); updateHUD();
      checkAndToast();
      eveTrigger(EVE_TRIGGER.FISH_CAUGHT, { loot: lootName });

      try { audioManager.playSFX('sfx_coin'); } catch (e) {}
      const pColor = inSweetSpot ? 0x44ff88 : 0x4488ff;
      ParticleBurst.spawn(scene, new THREE.Vector3(camera.position.x, 1.2, camera.position.z),
        { count: inSweetSpot ? 12 : 6, color: pColor, life: 0.7, size: 0.05, spread: 0.4 });

      if (fishingCatch.coins >= 5) {
        const dn = getDisplayName() || currentCharData.name;
        const rarity = fishingCatch.coins >= 50 ? t('fishing.rarity_legendary') : fishingCatch.coins >= 20 ? t('fishing.rarity_rare') : '';
        const streakText = fishingStreak >= 5 ? ` 🔥${fishingStreak}` + t('fishing.streak_chat') : '';
        networkClient.sendChat({ author: '🎣', text: t('chat.fishing_catch', { name: dn, rarity, icon: fishingCatch.icon, loot: lootName, streak: streakText }), color: '#aa88ff' });
      }

      setTimeout(resetFishing, 3000);
    } else {
      // Missed the zone
      fishingStatus.textContent = t('fishing.miss_zone');
      fishingTimerEl.textContent = '';
      fishingStreak = 0;
      eveTrigger(EVE_TRIGGER.FISH_MISSED);
      try { audioManager.playSFX('sfx_shard'); } catch (e) {}
      setTimeout(resetFishing, 2000);
    }
  } else if (fishingState === FISHING_STATE.IDLE) {
    startFishing();
  }
}

function resetFishing() {
  fishingState = FISHING_STATE.IDLE;
  fishingUI.classList.add('hidden');
  fishingBite.classList.add('hidden');
  fishingResult.classList.add('hidden');
  fishingTimerEl.textContent = '';
  if (currentState === STATE.ROAMING) setTimeout(() => requestRoamingPointerLock(), 100);
}

function cancelFishing() {
  if (fishingState !== FISHING_STATE.IDLE) {
    if (fishingStreak > 0) fishingStreak = 0;
    resetFishing();
    eveTrigger(EVE_TRIGGER.FISH_MISSED);
    showPrompt(t('fishing.stopped'));
    setTimeout(hidePrompt, 1500);
  }
}

function sitDown(machine) {
  clearMovementInput();
  currentState = STATE.SITTING; currentMachine = machine;
  document.exitPointerLock();
  avatar.sit(machine.seatPosition);
  if (cosmetics) cosmetics.hide();
  cosmetics = new AvatarCosmetics(avatar.group); cosmetics.show();
  // Smooth camera transition: move to seat, face the screen
  const camPos = machine.firstPersonCamPos.clone();
  const lookAt = machine.firstPersonLookAt.clone();
  const dirToScreen = new THREE.Vector3().subVectors(camPos, lookAt).normalize();
  const targetYaw = Math.atan2(dirToScreen.x, dirToScreen.z);
  const targetPitch = -Math.asin(Math.max(-1, Math.min(1, dirToScreen.y)));
  startTween(camPos, targetYaw, targetPitch, 0.5, () => {
    fpCamera.sitAt(camPos, lookAt, 0);
    currentState = STATE.PLAYING; loadGame(machine.config);
  });
}
function exitGame() {
  clearMovementInput();
  // Hide container first, then destroy & recreate the iframe.
  // ANOMALY runs its own WebGL context + rAF loop; merely clearing
  // src is not enough to stop its engine. Replacing the element
  // kills the document and all its timers/contexts immediately.
  document.getElementById('game-container').classList.add('hidden');
  const oldFrame = document.getElementById('game-frame');
  const newFrame = document.createElement('iframe');
  newFrame.id = 'game-frame';
  newFrame.setAttribute('allow', 'autoplay; fullscreen');
  newFrame.style.cssText = oldFrame.style.cssText;
  if (oldFrame.parentNode) {
    oldFrame.parentNode.replaceChild(newFrame, oldFrame);
  }
  document.exitPointerLock();
  avatar.stand(); fpCamera.stand();

  const floor = FLOORS[currentFloorKey] || FLOORS.SURFACE;
  const eyeY = floor.y + floor.eyeHeight;

  // Snap back behind seat — instant, no tween
  const sp = currentMachine
    ? currentMachine.seatPosition.clone().add(new THREE.Vector3(0, 0, 2))
    : new THREE.Vector3(camera.position.x, eyeY, camera.position.z + 2);
  sp.y = eyeY;
  camera.position.copy(sp);
  fpCamera.yaw = 0; fpCamera.pitch = 0;
  currentState = STATE.ROAMING; currentMachine = null; interactLock = false;
  setTimeout(() => { if (currentState === STATE.ROAMING) requestRoamingPointerLock(); }, 200);
}
function loadGame(config) { const gf = document.getElementById('game-frame'), gc = document.getElementById('game-container'); document.getElementById('game-title').textContent = config.name + ' — ' + config.subtitle; gf.src = config.path + '?' + new URLSearchParams({ charId: currentCharData.id, atk: currentCharData.stats.atk || 10, def: currentCharData.stats.def || 10, spd: currentCharData.stats.spd || 10, crt: currentCharData.stats.crt || 5, luck: currentCharData.stats.luck || 10, lang: getLanguage() }); gc.classList.remove('hidden'); gf.onload = () => { try { gf.contentWindow.postMessage({ type: 'ARCADE_INIT', character: { id: currentCharData.id, name: currentCharData.name, title: currentCharData.title, stats: currentCharData.stats, exp: currentCharData.exp }, lang: getLanguage() }, '*'); } catch (e) {} }; }

window.addEventListener('message', (e) => {
  if (!e.data?.type) return; const src = e.source;
  switch (e.data.type) {
    case 'GAME_OVER': {
      const { score = 0, statGrowth, newUnlocks, gameId } = e.data.payload || {};
      const sc = score || 0;
      let coinsEarned = Math.max(1, Math.floor(sc / 10));

      // --- Apply drink buff multipliers ---
      const buffActive = globalState.player.currentBuff && globalState.player.buffExpireTime > Date.now();
      let buffLabel = '';
      if (buffActive) {
        if (globalState.player.currentBuff === 'VoidBeer') {
          // Score ×1.5 — apply to both the score used for save and displayed
          const boostedSc = Math.floor(sc * 1.5);
          buffLabel = ' [' + t('drink.void_beer.name') + ' ×1.5]';
          // We need to apply the boosted score to save
          SaveManager.applyGameResult(currentCharData.id, { score: boostedSc, statGrowth: statGrowth || {}, newUnlocks: newUnlocks || [], gameId: gameId || currentMachine?.config?.id });
          const sAfter = SaveManager.load();
          sAfter._lastScore = boostedSc;
          sAfter.coins = (sAfter.coins || 0) + coinsEarned;
          const dmr = updateMissionProgress(sAfter, '_dm_play', 1);
          updateMissionProgress(sAfter, '_dm_score', boostedSc);
          updateMissionProgress(sAfter, '_dm_coins', coinsEarned);
          SaveManager.save(sAfter); checkAndToast();
          if (dmr.completed.length) showPrompt(t('prompt.daily_complete', { list: dmr.completed.map(c => c.icon + c.text).join(', ') }));
          if (currentMachine) SaveManager.clearSession(currentMachine.config.id, currentCharData.id);
          const fr = SaveManager.getCurrentChar(); currentCharData = fr; avatar.data = fr; updateHUD(); updateTitleStats();
          showPrompt(t('prompt.game_score', { score: boostedSc, coins: coinsEarned, buff: buffLabel })); setTimeout(hidePrompt, 3500);
          if (newUnlocks?.length) setTimeout(() => { showPrompt(t('prompt.char_unlock', { names: newUnlocks.map(id => getCharacterById(id)?.name || id).join(', ') })); setTimeout(hidePrompt, 3500); }, 3600);
          const gId = gameId || currentMachine?.config?.id; const dn = getDisplayName() || currentCharData.name;
          if (gId && boostedSc > (globalState.arcadeHighScores[gId]?.score || 0)) globalState.arcadeHighScores[gId] = { name: dn, score: boostedSc };
          if (gId && boostedSc > 0) networkClient.sendScore(gId, dn, boostedSc);
          networkClient.sendChat({ author: dn, text: t('chat.game_score', { name: dn, game: currentMachine?.config?.name || t('game.default_name'), score: boostedSc, buff: buffLabel }), color: '#ffcc00' });
          break;
        }
        if (globalState.player.currentBuff === 'RedstoneLiquor') {
          coinsEarned = Math.max(2, Math.floor(sc / 10) * 2);
          buffLabel = ' [' + t('drink.redstone_liquor.name') + ' ×2]';
        }
      }

      const sBefore = SaveManager.load();
      if (!buffActive || globalState.player.currentBuff !== 'VoidBeer') {
        SaveManager.applyGameResult(currentCharData.id, { score: sc, statGrowth: statGrowth || {}, newUnlocks: newUnlocks || [], gameId: gameId || currentMachine?.config?.id });
      }
      // Track score + award coins + check achievements
      const sAfter = SaveManager.load();
      if (!buffActive || globalState.player.currentBuff !== 'VoidBeer') sAfter._lastScore = sc;
      sAfter.coins = (sAfter.coins || 0) + coinsEarned;
      // Daily mission tracking
      if (!buffActive || globalState.player.currentBuff !== 'VoidBeer') {
        const dmr = updateMissionProgress(sAfter, '_dm_play', 1);
        updateMissionProgress(sAfter, '_dm_score', sc);
        updateMissionProgress(sAfter, '_dm_coins', coinsEarned);
        SaveManager.save(sAfter); checkAndToast();
        if (dmr.completed.length) showPrompt(t('prompt.daily_complete', { list: dmr.completed.map(c => c.icon + c.text).join(', ') }));
      }
      if (currentMachine) SaveManager.clearSession(currentMachine.config.id, currentCharData.id);
      const fr = SaveManager.getCurrentChar(); currentCharData = fr; avatar.data = fr; updateHUD(); updateTitleStats();
      showPrompt(t('prompt.game_score', { score: sc, coins: coinsEarned, buff: buffLabel })); setTimeout(hidePrompt, 3500);
      if (newUnlocks?.length) setTimeout(() => { showPrompt(t('prompt.char_unlock', { names: newUnlocks.map(id => getCharacterById(id)?.name || id).join(', ') })); setTimeout(hidePrompt, 3500); }, 3600);
      const gId = gameId || currentMachine?.config?.id; const dn = getDisplayName() || currentCharData.name;
      if (gId && score > (globalState.arcadeHighScores[gId]?.score || 0)) globalState.arcadeHighScores[gId] = { name: dn, score };
      if (gId && score > 0) networkClient.sendScore(gId, dn, score);
      networkClient.sendChat({ author: dn, text: t('chat.game_score', { name: dn, game: currentMachine?.config?.name || t('game.default_name'), score: score || 0, buff: buffLabel }), color: '#ffcc00' });
      // E.V.E. trigger
      const gid = gameId || currentMachine?.config?.id;
      const isRecord = gid && score > (globalState.arcadeHighScores[gid]?.score || 0);
      eveTrigger(EVE_TRIGGER.GAME_OVER, { gameId: gid, score, coins: coinsEarned, statGrowth, isRecord });
      break;
    }
    case 'EXIT_GAME': exitGame(); break;
    case 'GAME_STARTED': {
      eveTrigger(EVE_TRIGGER.GAME_STARTED, { gameId: e.data.payload?.gameId || currentMachine?.config?.id });
      break;
    }
    case 'REQUEST_CHAR_DATA': if (src?.postMessage) src.postMessage({ type: 'CHAR_DATA', character: { id: currentCharData.id, name: currentCharData.name, title: currentCharData.title, stats: currentCharData.stats, exp: currentCharData.exp } }, '*'); break;
    case 'ARCADE_SAVE_SESSION': if (e.data.payload && currentMachine) SaveManager.saveSession(currentMachine.config.id, currentCharData.id, e.data.payload); break;
    case 'ARCADE_RESTORE_SESSION': if (src?.postMessage && currentMachine) src.postMessage({ type: 'ARCADE_RESTORE_SESSION', session: SaveManager.loadSession(currentMachine.config.id, currentCharData.id) }, '*'); break;
  }
});

function openCharSelect() {
  if (!isLoggedIn()) { showPrompt(t('auth.please_login')); setTimeout(hidePrompt, 2000); return; }
  const p = document.getElementById('char-select-panel'), l = document.getElementById('char-select-list'), cb = document.getElementById('char-select-close');
  const ch = SaveManager.getUnlockedCharacters(); l.innerHTML = '';
  for (const c of ch) { const o = document.createElement('div'); o.className = 'char-option' + (c.unlocked ? '' : ' locked') + (c.id === currentCharData.id ? ' selected' : ''); o.innerHTML = '<div class="char-option-avatar"><img src="' + c.avatar + '" alt="' + c.name + '" /></div><div class="char-option-info"><div class="char-option-name">' + c.name + '</div><div class="char-option-title">' + c.title + '</div><div class="char-option-flavor">' + (c.unlocked ? c.flavor : t('char.locked')) + '</div></div>'; if (c.unlocked) o.addEventListener('click', () => selectChar(c.id)); l.appendChild(o); }
  cb.onclick = closeCharSelect; p.classList.remove('hidden'); document.exitPointerLock();
}
let csc = false;
function closeCharSelect() { if (csc) return; csc = true; document.getElementById('char-select-panel').classList.add('hidden'); if (currentState === STATE.ROAMING) setTimeout(() => requestRoamingPointerLock(), 100); setTimeout(() => { csc = false; }, 150); }
function selectChar(id) {
  const oldCharId = currentCharData.id;
  if (!SaveManager.setCurrentChar(id)) return;
  const fr = SaveManager.getCurrentChar();
  currentCharData = fr;
  const wasSitting = avatar.isSitting;
  const savedPos = avatar.group.position.clone();
  avatar.stand();
  scene.remove(avatar.group);
  avatar = new PlayerAvatar(fr);
  scene.add(avatar.group);
  avatar.data = fr;
  if (wasSitting) avatar.sit(savedPos);
  updateHUD();
  eveTrigger(EVE_TRIGGER.CHARACTER_SWITCH, { from: oldCharId, to: id });
  setTimeout(closeCharSelect, 0);
}

// ==================== Message Panel ====================
const msgPanel = document.getElementById('msg-create-panel');
const msgCatEl = document.getElementById('msg-create-categories');
const msgTplEl = document.getElementById('msg-create-templates');
const msgErrorEl = document.getElementById('msg-create-error');
let msgSelectedCategory = null;
let msgSelectedTemplate = null;

function openMessagePanel() {
  if (!isLoggedIn()) { showPrompt(t('auth.please_login_short')); setTimeout(hidePrompt, 2000); return; }
  msgSelectedCategory = null; msgSelectedTemplate = null;
  msgErrorEl.classList.add('hidden');
  msgCatEl.innerHTML = '';
  for (const [key, cat] of Object.entries(MESSAGE_CATEGORIES)) {
    const btn = document.createElement('button');
    btn.className = 'msg-cat-btn'; btn.textContent = cat.label;
    btn.addEventListener('click', () => selectMsgCategory(key));
    msgCatEl.appendChild(btn);
  }
  msgTplEl.innerHTML = '<div style="color:#666;font-size:13px;padding:12px">' + t('msg.pick_category') + '</div>';
  msgPanel.classList.remove('hidden'); document.exitPointerLock();
}
function selectMsgCategory(catKey) {
  msgSelectedCategory = catKey; msgSelectedTemplate = null;
  for (const b of msgCatEl.querySelectorAll('.msg-cat-btn')) b.classList.remove('active');
  msgCatEl.querySelectorAll('.msg-cat-btn')[Object.keys(MESSAGE_CATEGORIES).indexOf(catKey)]?.classList.add('active');
  const groups = getTemplatesByCategory(); const tpls = groups[catKey] || [];
  msgTplEl.innerHTML = '';
  for (const tpl of tpls) {
    const btn = document.createElement('button');
    btn.className = 'msg-tpl-btn'; btn.textContent = tpl.text;
    btn.addEventListener('click', () => selectMsgTemplate(tpl.id, btn));
    msgTplEl.appendChild(btn);
  }
}
function selectMsgTemplate(tplId, btnEl) { msgSelectedTemplate = tplId; for (const b of msgTplEl.querySelectorAll('.msg-tpl-btn')) b.classList.remove('selected'); btnEl.classList.add('selected'); }
function closeMessagePanel() { msgPanel.classList.add('hidden'); if (currentState === STATE.ROAMING) setTimeout(() => requestRoamingPointerLock(), 100); }
document.getElementById('msg-btn-cancel').addEventListener('click', closeMessagePanel);
document.getElementById('msg-btn-place').addEventListener('click', async () => {
  if (!msgSelectedTemplate) { msgErrorEl.textContent = t('msg.pick_template'); msgErrorEl.classList.remove('hidden'); return; }
  msgErrorEl.classList.add('hidden');
  const dn = getDisplayName() || currentCharData.name;
  const result = await MessageSystem.placeMessage(msgSelectedTemplate, dn);
  if (!result.success) { msgErrorEl.textContent = result.error; msgErrorEl.classList.remove('hidden'); }
  else { closeMessagePanel(); showPrompt(t('msg.placed')); setTimeout(hidePrompt, 2000); }
});

function updateHUD() { document.getElementById('hud-avatar').src = currentCharData.avatar; document.getElementById('hud-char-name').textContent = getDisplayName() || currentCharData.name; document.getElementById('hud-char-title').textContent = currentCharData.title; const s = currentCharData.stats; document.getElementById('stat-atk').textContent = s.atk; document.getElementById('stat-def').textContent = s.def; document.getElementById('stat-spd').textContent = s.spd; document.getElementById('stat-crt').textContent = s.crt; document.getElementById('stat-luck').textContent = s.luck; document.getElementById('hud-global-score').textContent = currentCharData.save.globalScore; document.getElementById('hud-coins').textContent = currentCharData.save.coins || 0; }
let pt = null; const pEl = document.getElementById('prompt');
function showPrompt(t) { pEl.textContent = t; pEl.classList.remove('hidden'); if (pt) clearTimeout(pt); pt = setTimeout(hidePrompt, 3000); fpCamera.showHands(); }
const bEl = document.getElementById('hud-buff');
let lastBuffText = null;
function updateBuffHUD() {
  const b = globalState.player.currentBuff;
  let text = '';
  if (b && Date.now() < globalState.player.buffExpireTime) {
    const remaining = Math.ceil((globalState.player.buffExpireTime - Date.now()) / 1000);
    text = '🍺 ' + b + ' ' + remaining + 's';
  }
  if (text === lastBuffText) return;
  lastBuffText = text;
  bEl.textContent = text;
  bEl.classList.toggle('hidden', !text);
}
function hidePrompt() { pEl.classList.add('hidden'); if (pt) { clearTimeout(pt); pt = null; } fpCamera.hideHands(); }
function checkProximity() {
  if (currentState !== STATE.ROAMING) return;
  const pos = new THREE.Vector3(camera.position.x, 0, camera.position.z);

  // Priority 0: floor transitions
  if (isNearPillarEntrance(camera.position)) {
    showPrompt(t('prompt.enter_depths'));
    return;
  }
  if (isNearDepthsExit(camera.position)) {
    showPrompt(t('prompt.exit_depths'));
    return;
  }
  if (isNearRooftopEntrance(camera.position)) {
    showPrompt(t('prompt.enter_rooftop'));
    return;
  }
  if (isNearRooftopExit(camera.position)) {
    showPrompt(t('prompt.exit_rooftop'));
    return;
  }
  if (currentFloorKey==='ROOFTOP' && Math.hypot(camera.position.x+1,camera.position.z+1.2)<1.7) { showPrompt(t(observingSky?'art.sky_view':'art.sky_prompt'));if(observingSky)fpCamera.hideHands();return; }
  if (isNearSanctuaryEntrance(camera.position)) {
    showPrompt(t('prompt.enter_sanctuary'));
    return;
  }
  if (isNearSanctuaryExit(camera.position)) {
    showPrompt(t('prompt.leave_sanctuary'));
    return;
  }
  // Sanctuary: nearby snow globe
  if (currentFloorKey === 'SANCTUARY' && abyssWorld.sanctuary) {
    const globe = abyssWorld.sanctuary.getNearestGlobe(camera.position);
    if (globe) {
      showPrompt('[E] ' + globe.country.title);
      fpCamera.showHands();
      return;
    }
  }
  // Priority 0.4: fishing pool
  if (currentFloorKey === 'DEPTHS' && abyssWorld.depths?.isNearFishingPool(camera.position)) {
    showPrompt(fishingState === FISHING_STATE.IDLE ? t('fishing.reel_prompt') : t('fishing.reel_in'));
    return;
  }

  // Priority 0.5: depths altar
  if (currentFloorKey === 'DEPTHS' && abyssWorld.depths?.isNearAltar(camera.position)) {
    showPrompt(abyssWorld.depths.getAltarPrompt());
    return;
  }

  // Priority 1: depths machines
  if (currentFloorKey === 'DEPTHS') {
    let dn = null, dnd = 3.0;
    for (const m of depthsMachines) {
      const d = m.getDistance(new THREE.Vector3(camera.position.x, -5, camera.position.z));
      if (d < dnd) { dnd = d; dn = m; }
    }
    if (dn) {
      showPrompt(dn.config.status === 'ready' ? '[E] ' + dn.config.name : '[🔒] ' + dn.config.name);
      return;
    }
  }

  // Priority 1: nearby arcade machine (surface only)
  if (currentFloorKey === 'SURFACE') {
    let n = null, nd = 3.0;
    for (const m of machines) {
      const d = m.getDistance(pos);
      if (d < nd) { nd = d; n = m; } }
    if (n) {
      showPrompt(n.config.status === 'ready' ? '[E] ' + n.config.name : '[🔒] ' + n.config.name);
      return;
    }
  }

  // Priority 2: nearby memory shard
  const sh = exploration.getNearbyShard(new THREE.Vector3(camera.position.x, camera.position.y, camera.position.z), 2.5);
  if (sh) {
    showPrompt(t('prompt.memory_shard'));
    return;
  }

  // Priority 3: nearby drink
  const cup = getNearbyCup(camera.position);
  if (cup) {
    showPrompt('[E] 🍺 ' + cup.userData.drinkType);
    return;
  }

  // Priority 4: nearby message beacon
  if (MessageSystem.getInteractData()) {
    const msg = MessageSystem.getInteractData();
    showPrompt(t('prompt.read_message', { author: msg.author }));
    return;
  }

  // Priority 4.5: nearby cat
  {
    const nearbyCat = catManager.getNearbyCat(camera.position, 2.5, currentFloorKey);
    if (nearbyCat) {
      const freshDef = getCatDefs()[nearbyCat.breed];
      showPrompt(t('prompt.pet_cat', { name: freshDef.name, personality: freshDef.personality }));
      return;
    }
  }

  // Priority 5: anomaly element (depths only)
  if (currentFloorKey === 'DEPTHS' && abyssWorld.depths) {
    const anomaly = abyssWorld.depths.getNearbyAnomaly(camera.position, 2.5);
    if (anomaly) {
      showPrompt('[E] ' + anomaly.label);
      return;
    }
  }

  // Priority 6: data pillar (depths only)
  if (currentFloorKey === 'DEPTHS' && abyssWorld.depths) {
    const pillar = abyssWorld.depths.getNearbyPillar(camera.position, 2.5);
    if (pillar) {
      showPrompt(t('prompt.analyze_pillar') + ' — ' + pillar.label);
      // Pulse hover
      const pillarObj = abyssWorld.depths.pillars.find(p => p.data.id === pillar.id);
      if (pillarObj) pillarObj.mesh.userData._hovered = true;
    } else {
      // Clear all hover states
      for (const p of abyssWorld.depths.pillars) p.mesh.userData._hovered = false;
    }
    return;
  }

  hidePrompt();
}
window.addEventListener('resize', () => {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h);
  labelRenderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  // Update low-res render target and dither shader
  renderViewport = getRenderViewport(w, h);
  lowResTarget.setSize(renderViewport.width, renderViewport.height);
  retroShader.uniforms.uResolution.value.set(renderViewport.width, renderViewport.height);
  renderInvalidated = true;
});
const ch2 = document.createElement('div'); ch2.id = 'controls-hint'; ch2.textContent = t('title.controls_hint'); document.getElementById('app').appendChild(ch2);
const districtName = document.getElementById('district-name');
const districtCode = document.querySelector('.district-code');
let lastDistrict = '';
function updateDistrictHUD() {
  const zone = currentFloorKey === 'SURFACE' ? (camera.position.x < -5.5 ? 'tavern' : camera.position.x > 5.5 ? 'arcade' : 'plaza') : currentFloorKey.toLowerCase();
  const key = `${zone}:${getLanguage()}`;
  if (key === lastDistrict) return;
  lastDistrict = key;
  syncEveContext();
  districtName.textContent = t(`art.${zone}`);
  districtCode.textContent = ({ plaza: '01 / SURFACE', tavern: '02 / SURFACE', arcade: '03 / SURFACE', depths: 'B1 / ARCHIVE', rooftop: 'RF / OBSERVATORY', sanctuary: '04 / SANCTUARY' })[zone];
  window.dispatchEvent(new CustomEvent('arcade:district', { detail: { name: districtName.textContent, code: districtCode.textContent } }));
  districtName.animate([{ opacity: 0, transform: 'translateY(4px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 300 });
}

let tt = 0, pct = 0, tws = false;
let renderInvalidated = true;
let wasRenderSuspended = false;
let phoneRefreshTimer = 0;
let eveContextTimer = 0;
function animate() {
  _animFrameId = requestAnimationFrame(animate);

  // Title / Auth screen — no game logic, no 3D rendering. The HTML overlay
  // handles all visuals; we just keep the rAF loop alive for re-entry.
  if (currentState === STATE.TITLE) return;

  const elapsed = clock.getDelta();
  if (document.hidden) return;
  const suspended = escapeMenuOpen || shelterIframeActive || currentState === STATE.PLAYING;
  const dt = wasRenderSuspended ? 0 : Math.min(elapsed, 0.1); tt += dt;
  wasRenderSuspended = suspended;
  if (suspended && !renderInvalidated) return;
  renderInvalidated = false;

  // Pause all game logic while escape menu is open
  if (!suspended) {
    if (currentFloorKey === 'SURFACE') for (const m of machines) m.update(dt, camera.position);
    if (currentFloorKey === 'DEPTHS') for (const m of depthsMachines) m.update(dt, camera.position);
    abyssWorld.update(dt, camera.position, currentFloorKey);
    if (currentFloorKey === 'DEPTHS' && abyssWorld.depths) { globalState._depthsTime = (globalState._depthsTime || 0) + dt; abyssWorld.depths.update(dt); abyssWorld.depths.updateAltar(); }
    // E.V.E. zone-aware context (every ~2s while roaming depths)
    if (currentFloorKey === 'DEPTHS' && abyssWorld.depths && currentState === STATE.ROAMING) {
      globalState._eveZoneTimer = (globalState._eveZoneTimer || 0) + dt;
      if (globalState._eveZoneTimer > 2.0) {
        globalState._eveZoneTimer = 0;
        const zone = abyssWorld.depths.getCurrentZone(camera.position);
        if (abyssWorld.depths._currentZone !== zone) {
          abyssWorld.depths._currentZone = zone;
          const text = abyssWorld.depths.getEveTextForZone(zone);
          eveUpdateContext({ zone, zoneText: text });
        }
      }
    }
    if (currentState === STATE.ROAMING) fpCamera.rotate(mouseInput.dx, mouseInput.dy);
    fpCamera.update(dt);
    const moveRatio = velocity.length() / getMaxSpeed();
    fpCamera._updateHands(dt, moveRatio > 0.1);
    updateMovement(dt); updateTween(dt); avatar.update(dt, camera, (FLOORS[currentFloorKey] || FLOORS.SURFACE).y);
    if (currentState === STATE.ROAMING && currentFloorKey === 'SURFACE') holoNPC.update(dt, camera.position);
    exploration.update(dt); if (cosmetics) cosmetics.update(dt);
    if (currentState === STATE.ROAMING) MessageSystem.update(dt, camera.position.x, camera.position.z);
    if (globalState.player.currentBuff && Date.now() > globalState.player.buffExpireTime) { globalState.player.currentBuff = null; globalState.player.buffExpireTime = 0; }
    updateBuffHUD();
    phoneRefreshTimer += dt;
    if (phoneChatOpen && phoneRefreshTimer >= 0.25) { phoneRefreshTimer = 0; renderChatPhone(); }
    ParticleBurst.update(dt);
    catManager.update(dt, camera.position, currentFloorKey);
    musicPlayer.update(dt);
    updateDistrictHUD();
    eveContextTimer += dt;
    if(eveContextTimer >= 1) { eveContextTimer = 0; syncEveContext(); }
    updateFishing(dt);
    pct += dt; if (pct > 0.4) { pct = 0; checkProximity(); }
    // Camera shake decay
    if (shakeIntensity > 0.001) {
      fpCamera.pitch += (Math.random() - 0.5) * shakeIntensity;
      fpCamera.yaw   += (Math.random() - 0.5) * shakeIntensity;
      shakeIntensity *= Math.pow(0.02, dt);
    } else { shakeIntensity = 0; }
  }

  mouseInput.dx = 0; mouseInput.dy = 0;
  // Gemini V3 two-pass: low-res render → retro dither post-process
  renderer.setRenderTarget(lowResTarget);
  renderer.render(scene, camera);
  renderer.setRenderTarget(null);
  renderer.render(postScene, postCamera);
  labelRenderer.render(scene, camera);
}

updateHUD();
function updateTitleStats() { const s = SaveManager.load(); document.getElementById('ts-games-unlocked').textContent = machines.filter(m => m.config.status === 'ready').length; document.getElementById('ts-games-total').textContent = machines.length || 3; document.getElementById('ts-score').textContent = s.globalScore || 0; document.getElementById('ts-shards').textContent = s.shardsCollected || 0; }
updateTitleStats();

// Restore hidden machine if already unlocked in previous session
if (save.hiddenMachineUnlocked) spawnHiddenMachineInDepths();

networkClient.connect();
networkClient.onChat((msg) => { globalState.chatMessages.push(msg); if (globalState.chatMessages.length > 50) globalState.chatMessages = globalState.chatMessages.slice(-50); eveTrigger(EVE_TRIGGER.CHAT_MESSAGE, { author: msg.author, text: msg.text }); });
networkClient.fetchChatHistory(50).then(h => { if (h.length > 0) { globalState.chatMessages = h; } else { globalState.chatMessages.push({ author: 'SYSTEM', text: t('seed.system'), color: '#ffcc00', time: Date.now() }); } });
networkClient.fetchLeaderboard('anomaly').then(e => { if (e.length > 0) globalState.arcadeHighScores.anomaly = { name: e[0].name, score: e[0].score }; });
networkClient.fetchLeaderboard('cyber-hunder').then(e => { if (e.length > 0) globalState.arcadeHighScores['cyber-hunder'] = { name: e[0].name, score: e[0].score }; });

MessageSystem.connect();
MessageSystem.loadAll().catch(e => console.warn('[main] MessageSystem.loadAll failed:', e));

function handleLogout() {
  if (!confirm(t('logout.confirm'))) return;
  if (currentState === STATE.PLAYING) exitGame();
  destroyAINPC();clearMovementInput();
  // Pause jukebox music
  getVideoManager().togglePlay();
  hudEl.classList.add('hidden'); document.getElementById('hud-buff').classList.add('hidden');
  document.exitPointerLock();
  logoutPlayer(); SaveManager.setPlayerId(null);
  // Switch to title scene — stop 3D rendering, hide game canvas, show title
  currentState = STATE.TITLE;
  stopRenderLoop();
  document.getElementById('app').style.display = 'none';
  // Reset inline display set by exitTitleScreen() — classList can't override inline styles
  titleScreen.style.display = '';
  titleScreen.classList.remove('hidden', 'fade-out');
  titleDissolve.classList.remove('active'); titleDissolve.classList.add('hidden');
  // Always reset login-dependent UI to safe defaults
  const charBtn = document.getElementById('title-btn-char');
  const logoutBtn = document.getElementById('title-btn-logout');
  if (!isLoggedIn()) {
    charBtn.classList.add('hidden');
    logoutBtn.classList.add('hidden');
  }
  document.getElementById('title-press-enter').textContent = t('title.press_enter');
  updateTitleStats();
  console.log('👋 Logged out');
}

// ==================== Escape Menu ====================
const escapeMenu = document.getElementById('escape-menu');
let escapeMenuOpen = false;

function openEscapeMenu() {
  if (escapeMenuOpen) return;
  escapeMenuOpen = true;
  clearMovementInput();
  document.exitPointerLock();
  // Close any open sub-panels
  closeCharSelect(); closeMessagePanel(); closeVoteBar(); closeBarMenu();
  escapeMenu.classList.remove('hidden');
}

function closeEscapeMenu() {
  if (!escapeMenuOpen) return;
  escapeMenuOpen = false;
  escapeMenu.classList.add('hidden');
  if (currentState === STATE.ROAMING) setTimeout(() => requestRoamingPointerLock(), 100);
}

function toggleEscapeMenu() {
  if (escapeMenuOpen) closeEscapeMenu(); else openEscapeMenu();
}

document.getElementById('escape-btn-resume').addEventListener('click', closeEscapeMenu);
document.getElementById('escape-btn-logout').addEventListener('click', () => {
  closeEscapeMenu();
  setTimeout(() => handleLogout(), 150);
});
document.getElementById('escape-btn-quit').addEventListener('click', () => {
  // Electron IPC quit — graceful fallback to window.close() for browser dev
  if (window.electronAPI && typeof window.electronAPI.quitApp === 'function') {
    window.electronAPI.quitApp();
  } else {
    window.close();
  }
});

const titleScreen = document.getElementById('title-screen'), titleDissolve = document.getElementById('title-dissolve'), hudEl = document.getElementById('hud');
let rs = false;
let _animFrameId = null;
function startRenderLoop() { if (rs) return; rs = true; clock.getDelta(); renderInvalidated = true; animate(); }
function stopRenderLoop() {
  rs = false;
  if (_animFrameId) { cancelAnimationFrame(_animFrameId); _animFrameId = null; }
}

function requestEnterGame() {
  if (isLoggedIn()) { exitTitleScreen(); return; }
  titleScreen.classList.remove('hidden'); titleScreen.classList.add('fade-out'); authPanel.classList.remove('hidden'); authUsername.focus();
}

function exitTitleScreen() {
  titleDissolve.classList.add('active');
  // Show the 3D game scene (hidden during title/auth screens)
  document.getElementById('app').style.display = '';
  audioManager.preloadAll().then(() => {
    if (!tws) {
      abyssWorld.startTavernMusic();
      abyssWorld.startPlazaMusic();
      abyssWorld.startArcadeMusic();
      tws = true;
    }
  }).catch(() => {});
  // Reset player to spawn point on fresh entry
  camera.position.set(-3.6, FLOORS.SURFACE.y + FLOORS.SURFACE.eyeHeight, 3.2);
  fpCamera.yaw = -1.16; fpCamera.pitch = -0.035;
  velocity.set(0, 0, 0);
  currentFloorKey = 'SURFACE';
  setTimeout(() => { currentState = STATE.ROAMING; titleScreen.style.display = 'none'; hudEl.classList.remove('hidden'); updateHUD(); startRenderLoop(); requestRoamingPointerLock(); initAINPC(); eveTrigger(EVE_TRIGGER.LOGIN, { name: getDisplayName() || currentCharData.name }); eveUpdateContext({ charName: currentCharData.name, charTitle: currentCharData.title, stats: currentCharData.stats, coins: save.coins, globalScore: save.globalScore, currentState: 'roaming', floor: currentFloorKey, buff: globalState.player.currentBuff || '无' }); getVideoManager().initAll(); getVideoManager().startJukebox(); setTimeout(() => { titleDissolve.classList.remove('active'); setTimeout(() => titleDissolve.classList.add('hidden'), 600); }, 100); }, 600);
}

document.getElementById('title-btn-enter').addEventListener('click', requestEnterGame);
document.getElementById('title-btn-char').addEventListener('click', () => openCharSelect());
document.getElementById('title-btn-logout').addEventListener('click', handleLogout);
document.getElementById('hud-btn-logout').addEventListener('click', handleLogout);
document.addEventListener('keydown', (e) => { if (e.code === 'Enter' && currentState === STATE.TITLE && !chatOpen) requestEnterGame(); });

function finishLoading() {
  const ls = document.getElementById('loading-screen');
  if (!ls || ls.classList.contains('hidden')) return;

  // Precompile all Three.js shaders to avoid first-frame stutter
  window.__arcadeProgress = 75;
  try {
    renderer.compile(scene, camera);
    // Also compile post-processing scene
    renderer.compile(postScene, postCamera);
  } catch (e) { console.warn('Shader precompile failed:', e); }

  // Start audio preloading in background (async, non-blocking)
  window.__arcadeProgress = 90;
  audioManager.preloadAll().catch(() => {});

  ls.classList.add('fade-out');

  // Signal boot animation that game is ready
  window.__arcadeProgress = 100;
  if (window.__signalArcadeReady) window.__signalArcadeReady();

  setTimeout(() => {
    ls.classList.add('hidden');
    const ts = document.getElementById('title-screen');
    ts.classList.remove('hidden');
    // Setup language switcher
    setupLangSwitcher();
    // Keep the authored title visible; identification opens on Enter Game.
  }, 600);
}

// ==================== Language Switcher ====================
function handleLangSwitch() {
  const newLang = getLanguage() === 'zh' ? 'en' : 'zh';
  setLanguage(newLang);
  const container = document.getElementById('lang-switcher-container');
  if (container) container.innerHTML = buildLangSwitcherHTML();
  // Notify currently loaded game about language change
  if (currentState === STATE.PLAYING) {
    try {
      const gf = document.getElementById('game-frame');
      if (gf && gf.contentWindow) {
        gf.contentWindow.postMessage({ type: 'LANG_SWITCH', lang: newLang }, '*');
      }
    } catch (e) {}
  }
  applyI18nToDOM();
  feedback.updateVolume();
  // Rebuild dynamic content that might be open
  const hintEl = document.getElementById('controls-hint');
  if (hintEl) hintEl.textContent = t('title.controls_hint');
  const enterEl = document.getElementById('title-press-enter');
  if (enterEl) enterEl.textContent = isLoggedIn()
    ? t('title.logged_in', { name: getDisplayName() })
    : t('title.press_enter');
  // Re-bind lang switcher click
  setupLangSwitcher();
}

function setupLangSwitcher() {
  const container = document.getElementById('lang-switcher-container');
  if (!container) return;
  container.innerHTML = buildLangSwitcherHTML();
  applyI18nToDOM();
  const btn = document.getElementById('lang-switcher');
  if (btn) btn.addEventListener('click', handleLangSwitch);
}

if (isLoggedIn()) {
  SaveManager.setPlayerId(getPlayerId());
  SaveManager.syncFromCloud().then((merged) => {
    save = merged; currentCharData = SaveManager.getCurrentChar();
    updateHUD(); updateTitleStats();
    document.getElementById('title-btn-char').classList.remove('hidden');
    document.getElementById('title-btn-logout').classList.remove('hidden');
    document.getElementById('title-press-enter').textContent = t('title.logged_in', { name: getDisplayName() });
    finishLoading();
  });
} else {
  document.getElementById('title-press-enter').textContent = t('title.press_enter');
  // Not logged in — show loading briefly then reveal auth
  setTimeout(finishLoading, 800);
}

console.log('🏪 AI Arcade · 已登录: ' + (isLoggedIn() ? getDisplayName() : '否'));
