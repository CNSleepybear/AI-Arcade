// Stats: SIGNAL(信号) FIREWALL(防火墙) BANDWIDTH(带宽) GLITCH(故障) RESONANCE(共鸣)
// Internal keys kept as atk/def/spd/crt/luck for save & game iframe compatibility.

import { t } from './i18n.js';

export function getCharacters() {
  return [
    {
      id: 'null',
      name: t('char.null.name'),
      title: t('char.null.title'),
      avatar: 'characters/char_01_null_cipher.png',
      unlockCondition: 'default',
      baseStats: { atk: 12, def: 8, spd: 14, crt: 10, luck: 8 },
      flavor: t('char.null.flavor'),
    },
    {
      id: 'chrome',
      name: t('char.chrome.name'),
      title: t('char.chrome.title'),
      avatar: 'characters/char_02_chrome_sable.png',
      unlockCondition: { type: 'score', threshold: 500 },
      baseStats: { atk: 14, def: 14, spd: 6, crt: 5, luck: 10 },
      flavor: t('char.chrome.flavor'),
    },
    {
      id: 'phantom',
      name: t('char.phantom.name'),
      title: t('char.phantom.title'),
      avatar: 'characters/char_03_phantom_eve.png',
      unlockCondition: { type: 'game', gameId: 'leave-at-6pm-evolved' },
      baseStats: { atk: 6, def: 6, spd: 18, crt: 16, luck: 14 },
      flavor: t('char.phantom.flavor'),
    },
  ];
}

export const CHARACTERS = getCharacters();

export function getCharacterById(id) {
  return CHARACTERS.find(c => c.id === id) || null;
}

export function getDefaultCharacter() {
  return CHARACTERS.find(c => c.unlockCondition === 'default') || CHARACTERS[0];
}
