import { supabase } from '../data/supabase.js';
import { getZoneFromX, getTemplateText, getTemplateColor } from '../data/messageDB.js';
import { MessageBeacon } from './MessageBeacon.js';
import { t } from '../data/i18n.js';

const MAX_MSG_PER_PLAYER = 2;
const MSG_COOLDOWN_MS = 60000;
const MAX_PER_ZONE = 6;
const PROXIMITY_RADIUS = 2.5;

class MessageSystemClass {
  constructor() {
    this._beacons = new Map();
    this._playerPos = null;
    this._nearest = null;
    this._lastPlaced = 0;
    this._connected = false;
    this._votedId = null;
  }

  connect() {
    if (this._connected) return;
    this._connected = true;
    this._channel = supabase
      .channel('ground-messages')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages_ground' },
        (payload) => { this._onRemoteInsert(payload.new); }
      )
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages_ground' },
        (payload) => { this._onRemoteUpdate(payload.new); }
      )
      .on('postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'messages_ground' },
        (payload) => { this._onRemoteDelete(payload.old); }
      )
      .subscribe();
    console.log('[MessageSystem] connected');
  }

  disconnect() {
    this._connected = false;
    if (this._channel) { supabase.removeChannel(this._channel); this._channel = null; }
  }

  async loadZoneMessages(zone) {
    const { data, error } = await supabase
      .from('messages_ground')
      .select('*')
      .eq('zone', zone)
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(MAX_PER_ZONE);
    if (error) { console.warn('[MessageSystem] loadZoneMessages error:', error.message); return; }
    for (const row of (data || [])) { this._spawnBeacon(row); }
  }

  async loadAll() {
    await Promise.all(['plaza', 'tavern', 'arcade'].map(z => this.loadZoneMessages(z)));
    supabase.rpc('cleanup_expired_messages').catch(() => {});
  }

  async placeMessage(templateId, authorName) {
    if (Date.now() - this._lastPlaced < MSG_COOLDOWN_MS) {
      const remaining = Math.ceil((MSG_COOLDOWN_MS - (Date.now() - this._lastPlaced)) / 1000);
      return { success: false, error: t('msg.error.cooldown', { n: remaining }) };
    }
    let playerCount = 0;
    for (const b of this._beacons.values()) { if (b.data.author === authorName) playerCount++; }
    if (playerCount >= MAX_MSG_PER_PLAYER) {
      return { success: false, error: t('msg.error.too_many', { n: MAX_MSG_PER_PLAYER }) };
    }
    if (!this._playerPos) return { success: false, error: t('msg.error.no_position') };
    const x = this._playerPos.x, z = this._playerPos.z;
    const zone = getZoneFromX(x);
    let zoneCount = 0;
    for (const b of this._beacons.values()) { if (b.data.zone === zone) zoneCount++; }
    if (zoneCount >= MAX_PER_ZONE) return { success: false, error: t('msg.error.zone_full') };

    const { data, error } = await supabase.from('messages_ground').insert({
      zone, x, z, template_id: templateId, author: authorName,
    }).select('*').single();
    if (error) {
      console.warn('[MessageSystem] placeMessage error:', error.message);
      return { success: false, error: t('msg.error.place_failed') };
    }
    this._lastPlaced = Date.now();
    this._spawnBeacon(data);
    return { success: true };
  }

  // ==================== Voting (optimistic) ====================

  async voteMessage(beaconId, delta) {
    const beacon = this._beacons.get(beaconId);
    if (beacon) {
      if (delta > 0) beacon.data.likes = (beacon.data.likes || 0) + 1;
      else beacon.data.dislikes = (beacon.data.dislikes || 0) + 1;
      beacon.updateVotes(beacon.data.likes, beacon.data.dislikes);
    }
    const { error } = await supabase.rpc('vote_message', { p_id: beaconId, p_delta: delta });
    if (error) console.warn('[MessageSystem] voteMessage error:', error.message);
  }

  // ==================== Interact data ====================

  /** @returns {{ id:number, text:string, author:string, likes:number, dislikes:number, color:string, zone:string } | null} */
  getInteractData() {
    const b = this._nearest;
    if (!b) return null;
    return {
      id: b.id,
      text: getTemplateText(b.data.template_id),
      author: b.data.author,
      likes: b.data.likes || 0,
      dislikes: b.data.dislikes || 0,
      color: getTemplateColor(b.data.template_id),
      zone: b.data.zone,
    };
  }

  /** @returns {boolean} false if already voted this beacon this session */
  tryVote(beaconId, delta) {
    if (this._votedId === beaconId) return false;
    this._votedId = beaconId;
    this.voteMessage(beaconId, delta);
    return true;
  }

  clearVoteState() { this._votedId = null; }

  // ==================== Proximity ====================

  update(dt, x, z) {
    this._playerPos = { x, z };
    for (const b of this._beacons.values()) b.update(dt);
    let nearest = null, nearestDist = PROXIMITY_RADIUS;
    for (const b of this._beacons.values()) {
      const dx = b.data.x - x, dz = b.data.z - z;
      const d = Math.sqrt(dx * dx + dz * dz);
      if (d < nearestDist) { nearestDist = d; nearest = b; }
    }
    if (this._nearest && this._nearest !== nearest) {
      this._nearest.hideLabel();
      this._votedId = null; // Reset vote lock when switching away
    }
    if (nearest) {
      nearest.showLabel();
    }
    this._nearest = nearest;
  }

  getNearestBeacon() { return this._nearest; }
  canPlace() { return Date.now() - this._lastPlaced >= MSG_COOLDOWN_MS; }
  getCooldownRemaining() {
    return Math.max(0, Math.ceil((MSG_COOLDOWN_MS - (Date.now() - this._lastPlaced)) / 1000));
  }

  _spawnBeacon(row) {
    if (this._beacons.has(row.id)) return;
    this._beacons.set(row.id, new MessageBeacon(this._scene, row));
  }
  _onRemoteInsert(row) { this._spawnBeacon(row); }
  _onRemoteUpdate(row) {
    const b = this._beacons.get(row.id);
    if (b) b.updateVotes(row.likes, row.dislikes);
  }
  _onRemoteDelete(row) {
    const b = this._beacons.get(row.id);
    if (b) { b.dispose(); this._beacons.delete(row.id); if (this._nearest === b) this._nearest = null; }
  }
  setScene(scene) { this._scene = scene; }
}

export const MessageSystem = new MessageSystemClass();
export default MessageSystem;
