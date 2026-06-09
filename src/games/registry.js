import { t } from '../data/i18n.js';

export function getGameRegistry() {
  return [
    {
      id: 'anomaly',
      name: t('game.anomaly.name'),
      subtitle: t('game.anomaly.subtitle'),
      path: 'games/ANOMALY-Survive-the-Meta/index.html',
      cabinetTexture: '/textures/cabinet_neon.png',
      marqueeTexture: null,
      attractColor: '#00ff44',
      panelTexture: null,
      status: 'ready',
      description: t('game.anomaly.desc'),
    },
    {
      id: 'cyber-hunder',
      name: t('game.cyber_hunder.name'),
      subtitle: t('game.cyber_hunder.subtitle'),
      path: 'games/CYBER-HUNDER/index.html',
      cabinetTexture: '/textures/cabinet_neon.png',
      marqueeTexture: null,
      attractColor: '#00ccff',
      panelTexture: null,
      status: 'ready',
      description: t('game.cyber_hunder.desc'),
    },
    {
      id: 'dark-water-stealth',
      name: t('game.dark_water_stealth.name'),
      subtitle: t('game.dark_water_stealth.subtitle'),
      path: 'games/Dark-Water-Stealth/dist/index.html',
      cabinetTexture: '/textures/cabinet_dark.png',
      marqueeTexture: null,
      attractColor: '#0088cc',
      panelTexture: null,
      status: 'ready',
      description: t('game.dark_water_stealth.desc'),
    },
    {
      id: 'leave-at-6pm-evolved',
      name: t('game.leave_at_6pm.name'),
      subtitle: t('game.leave_at_6pm.subtitle'),
      path: 'games/Leave-at-6PM-Evolved/index.html',
      cabinetTexture: '/textures/cabinet_wood.png',
      marqueeTexture: null,
      attractColor: '#ffd700',
      panelTexture: null,
      status: 'ready',
      description: t('game.leave_at_6pm.desc'),
    },
  ];
}

export const GAME_REGISTRY = getGameRegistry();

export function getGameById(id) {
  return GAME_REGISTRY.find(g => g.id === id) || null;
}

export function getReadyGames() {
  return GAME_REGISTRY.filter(g => g.status === 'ready');
}
