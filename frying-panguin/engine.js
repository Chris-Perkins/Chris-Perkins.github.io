(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.FryingPanguin = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const ENEMY_MOTION_MAX_DT = .05;
  const RUN_SECONDS = 180;
  const ENCOUNTER_RAMP_SECONDS = 90;
  const DAMAGE_FEEDBACK = Object.freeze({ flashSeconds: .22, graceSeconds: .85 });
  const SPEED = 92;
  const SWING_SECONDS = (0.32 / 1.5) / 0.67;
  const SWING_COOLDOWN = (0.40 / 1.5) / 0.67;
  // World/logical pixel lengths; halfAngle is radians. Contact radii are unscaled.
  const PAN_GEOMETRY = Object.freeze({ reach: 37, enemyReach: 55, enemyDot: .1, chestDot: .22, contactSlack: 3, headRadius: 6, frenzyRadius: 8, halfAngle: Math.acos(.1) });
  function panTargetHit(player, target, kind) {
    const dx = target.x - player.x, dy = target.y - player.y, d = Math.hypot(dx, dy);
    if (kind === 'enemy' && d <= player.radius + target.radius + PAN_GEOMETRY.contactSlack) return true;
    const reach = ((kind === 'enemy' ? PAN_GEOMETRY.enemyReach : PAN_GEOMETRY.reach) + (kind === 'chest' ? 0 : target.radius * (kind === 'enemy' ? .75 : .5))) * player.reachScale;
    const dot = (dx * player.facingX + dy * player.facingY) / (d || 1);
    return d <= reach && (d === 0 && kind !== 'obstacle' || dot >= (kind === 'chest' ? PAN_GEOMETRY.chestDot : PAN_GEOMETRY.enemyDot));
  }
  const PICKUP_RADIUS = 44;
  const COIN_CONTACT_RADIUS = 7;
  const SLAPSTICK_DEFS = Object.freeze({ duration: .38, speed: 160, damage: 1, maxDepth: 2, maxHits: 3, crashStun: .7 });
  const SAVE_KEY = 'frying-panguin.gold.v1';
  const UPGRADE_SAVE_KEY = 'frying-panguin.upgrades.v1';
  const MARKET_SAVE_KEY = 'frying-panguin.market.v1';
  const STATE_SAVE_KEY = 'frying-panguin.state.v2';
  const SHOP_INTERACTION_RANGE = 30;
  const DROP_RATES = Object.freeze({ chest: .08, party: .35, enemy: .04, rock: .03, jelly: .08 });
  const TOY_DEFS = Object.freeze({ peelEvery: 2, peelLife: 3, peelMax: 3, peelsPerBuff: 4, bananaCooldown: .40 / .67, snowballLife: .45, snowballSpeed: 180, snowballHits: 2, investigate: 1.2, greedyRadius: 80, greedyAwareness: 520, awareness: 340, bondSeconds: 45, bondReward: 100, bounceSpeed: .6, goldenReach: 1.12, goldenSpeed: 1.1 });
  const ENCOUNTER_DEFS = Object.freeze({ cap: 70, hazardCap: 26, nearWarnings: 3, waveBase: 6.4, waveLate: 3.2, waveEarlyRate: .7, wavePeakRate: 2.25, wavePeakSeconds: 150, waveStepSeconds: 30, waveCountBase: 6, waveCountLate: 9, flockEvery: 2, minSpawnDistance: 160, spawnRadiusMin: 180, spawnRadiusMax: 260, spawnSectorAttempts: 100, spawnAttempts: 150, stompRadius: 42, ringRadius: 100, ringWidth: 8, ringDelay: .22, ringLife: .75, ringDamage: 1, stompRecovery: 1.05, slideRecovery: .55, chargeHitPadding: 5 });
  const SUMMARY_LOCK = .5;
  // Seconds; rendering and fixtures share the authored death sequence.
  const DEATH_FLOURISH = Object.freeze({ duration: 1.05, flashEnd: .12, extendEnd: .70, fadeStart: .85, frameCap: .05, rays: 12, gap: 14, reach: .65 });
  const VICTORY_FLOURISH = Object.freeze({ duration: 1.5, outwardEnd: .45, frameCap: .05, rays: 10 });
  const POWERUP_FEEDBACK = Object.freeze({ onsetLife: 1, endedLife: .4, finalWindow: 1, maxOnsets: 4, maxExpiries: 4, glyphSize: 36, maxMarks: 12, compositionWidth: 112, compositionHeight: 80 });
  const BURROWER_DEFS = Object.freeze({ preparation: .75, recovery: .3, projectileSpeed: 360, projectileRadius: 4, projectileLife: .94, projectileOriginOffset: 12, projectileDamage: 1, spacing: 42, aimScatter: 6 });
  const SNOWBIRD_DEFS = Object.freeze({ groupMin: 3, groupMax: 5, orbitRadius: 66, diveRadius: 26, orbitAngularSpeed: 1.35, spacing: 22, minSpawnDistance: 160, cycle: 3, diveWindow: 1, stagger: .45 });
  const LEGACY_UPGRADE_DEFS = Object.freeze({ pan: Object.freeze({ max: 3, prices: Object.freeze([200, 520, 900]), outingGates: Object.freeze([0, 2, 4]) }) });
  const UPGRADE_EFFECTS = Object.freeze({ heart: Object.freeze([3, 4, 5, 6]), walk: Object.freeze([1, 1.33, 1.66, 2]), swing: Object.freeze([1, 1.5, 2, 2.5]) });
  const UPGRADE_DEFS = Object.freeze({
    heart: Object.freeze({ label: 'Lives', prices: Object.freeze([250, 500, 1000]), outingGates: Object.freeze([0, 0, 0]), max: 3 }),
    walk: Object.freeze({ label: 'Walk Speed', prices: Object.freeze([150, 400, 1250]), outingGates: Object.freeze([0, 0, 0]), max: 3 }),
    swing: Object.freeze({ label: 'Swing Speed', prices: Object.freeze([100, 500, 1500]), outingGates: Object.freeze([0, 0, 0]), max: 3 })
  });
  const POWERUP_DEFS = Object.freeze({
    speed: { label: 'ILLEGAL SOCKS', duration: 8, multiplier: 1.75 },
    frenzy: { label: 'PANCAKE FRENZY', duration: 8, damageScale: 2, cooldownScale: .4 },
    jelly: { label: 'RUBBER LUNCH', duration: 8, bowlDurationScale: 4 }
  });
  const LEGACY_ITEMS = Object.freeze({
    heart: { label: 'SOUP HUGS', vendor: 'soup', kind: 'tier', description: 'Another warm heart.' },
    pan: { label: 'PANDEMONIUM', vendor: 'pan', kind: 'tier', description: 'A heavier bonk.' },
    banana: { label: 'BANANA REPUBLIC', vendor: 'soup', kind: 'gadget', cost: 450, completedOutings: 1, description: 'Socks leave slippery peels. Slower swings while speedy.' },
    rocky: { label: 'ROCKY ROAD SUNDAE', vendor: 'pan', kind: 'gadget', cost: 480, completedOutings: 1, description: 'Broken rocks shoot snowballs. The noise attracts nosy enemies.' },
    greedy: { label: 'HONK IF GREEDY', vendor: 'pan', kind: 'gadget', cost: 420, lifetimeGold: 150, description: 'Coins fly from farther away. The honking attracts a crowd.' },
    bond: { label: 'BEAR MARKET BOND', vendor: 'soup', kind: 'ticket', cost: 40, completedOutings: 1, description: 'Three bear chests. Forty-five seconds. Collect stamps for 100 gold.' },
    golden: { label: 'GOLDEN PAN', vendor: 'pan', kind: 'golden', cost: 1800, completedOutings: 4, lifetimeGold: 1000, description: 'Golden reach and faster friendly bowling.' },
    'snack-speed': { label: 'POCKET SOCKS', vendor: 'supplies', kind: 'supply', powerup: 'speed', cost: 40, description: `${POWERUP_DEFS.speed.multiplier}× waddle for ${POWERUP_DEFS.speed.duration}s. Pop with Q.` },
    'snack-frenzy': { label: 'POCKET PANCAKES', vendor: 'supplies', kind: 'supply', powerup: 'frenzy', cost: 60, description: 'Five times the bonking power for eight seconds. Pop with Q.' },
    'snack-jelly': { label: 'POCKET JELLY', vendor: 'supplies', kind: 'supply', powerup: 'jelly', cost: 100, completedOutings: 2, description: 'Four times the bowling reach + one rebound. Eight seconds; Q.' }
  });
  const SHOP_ITEMS = Object.freeze({
    heart: Object.freeze({ label: 'Lives', kind: 'tier', description: 'Maximum hearts: 3 → 4 → 5 → 6. Restore health on return.' }),
    walk: Object.freeze({ label: 'Walk Speed', kind: 'tier', description: 'Walking gains: Base speed → +33% speed → +66% speed → +100% speed.' }),
    swing: Object.freeze({ label: 'Swing Speed', kind: 'tier', description: 'Swing speed gains: +50%, +100%, +150%. Faster motion and recovery; same damage.' })
  });
  const ENEMY_DEFS = Object.freeze({
    chick: { hp: 2, speed: 82, damage: 1, radius: 5, telegraph: .36, gold: 2, attackRange: 18, attack: 'peck' },
    penguin: { hp: 3, speed: 70, damage: 1, radius: 7, telegraph: .62, gold: 3, attackRange: 132, chargeSpeed: 230, chargeDuration: .86, predictionLead: .42, aimScatter: 8, attack: 'slide' },
    bear: { hp: 7, speed: 62, damage: 2, radius: 13, telegraph: .8, gold: 6, attackRange: 68, attackRadius: ENCOUNTER_DEFS.stompRadius, chargeSpeed: 170, chargeDuration: .46, attack: 'stomp' },
    burrower: { hp: 1, speed: 0, damage: 1, radius: 7, telegraph: .75, gold: 4, attackRange: 300, attack: 'snowball' },
    snowbird: { hp: 2, speed: 114, damage: 1, radius: 6, telegraph: .5, gold: 2, attackRange: 54, chargeSpeed: 262.5, chargeDuration: .38, recoveryDuration: .7, attack: 'swoop' }
  });
  const WORLD = Object.freeze({ width: 960, height: 720 });
  const SHOP = Object.freeze({ x: 390, y: 100, width: 180, height: 116, doorLeft: 454, doorRight: 506, exitY: 224, spawnX: 480, spawnY: 184 });
  const SHOP_DISPLAYS = Object.freeze(['heart', 'walk', 'swing'].map((id, i) => Object.freeze({ id, x: 426 + i * 54, y: 170, labelY: 112, counter: Object.freeze({ x: 404 + i * 54, y: 136, w: 44, h: 26 }) })));
  const SHORE = Object.freeze([[85, 42], [270, 24], [712, 24], [850, 54], [920, 138], [944, 300], [928, 564], [840, 668], [610, 696], [354, 696], [140, 650], [46, 550], [22, 308], [44, 132]]);
  const POND = Object.freeze({ x: 729, y: 453, rx: 65, ry: 37 });
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
  function waveInterval(elapsed) {
    const steps = ENCOUNTER_DEFS.wavePeakSeconds / ENCOUNTER_DEFS.waveStepSeconds;
    const stage = clamp(Math.floor((elapsed + 1e-9) / ENCOUNTER_DEFS.waveStepSeconds), 0, steps);
    const openingRate = ENCOUNTER_DEFS.waveEarlyRate / ENCOUNTER_DEFS.waveBase;
    const peakRate = ENCOUNTER_DEFS.wavePeakRate / ENCOUNTER_DEFS.waveLate;
    // Equal increases in waves per second at each 30-second milestone.
    return 1 / (openingRate + (peakRate - openingRate) * stage / steps);
  }
  const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  function segmentDistance(point, start, end) {
    const dx = end.x - start.x, dy = end.y - start.y;
    const t = clamp(((point.x - start.x) * dx + (point.y - start.y) * dy) / (dx * dx + dy * dy || 1), 0, 1);
    return Math.hypot(point.x - start.x - dx * t, point.y - start.y - dy * t);
  }

  function seededRandom(seed) {
    return function () {
      seed |= 0;
      seed = seed + 0x6D2B79F5 | 0;
      let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t ^= t + Math.imul(t ^ t >>> 7, 61 | t);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  function inPolygon(x, y, polygon) {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const [xi, yi] = polygon[i], [xj, yj] = polygon[j];
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  }

  function inShop(x, y, padding = 0) {
    return x > SHOP.x - padding && x < SHOP.x + SHOP.width + padding && y > SHOP.y - padding && y < SHOP.y + SHOP.height + padding;
  }

  function landContains(x, y, radius = 0, shore = SHORE) {
    return [[0, 0], [radius, 0], [-radius, 0], [0, radius], [0, -radius]].every(([dx, dy]) => inPolygon(x + dx, y + dy, shore));
  }

  function ellipseContains(x, y, ellipse, padding = 0) {
    return ((x - ellipse.x) / (ellipse.rx + padding)) ** 2 + ((y - ellipse.y) / (ellipse.ry + padding)) ** 2 < 1;
  }

  function makeScenery(shore = SHORE, pond = POND, random = seededRandom(68127)) {
    const trees = [], rocks = [];
    for (let i = 0; i < 350; i++) {
      const x = 55 + random() * 850, y = 70 + random() * 580;
      if (!landContains(x, y, 26, shore) || inShop(x, y, 42) || ellipseContains(x, y, pond, 35)) continue;
      if (Math.abs(x - 480) < 50 || Math.abs(y - 350) < 32) continue;
      if (trees.some(t => Math.hypot(t.x - x, t.y - y) < 34)) continue;
      trees.push({ x: Math.round(x), y: Math.round(y), radius: 8, kind: 'ice', solid: false, variant: Math.floor(random() * 3) });
      if (trees.length === 72) break;
    }
    for (let i = 0; i < 1200 && rocks.length < 18; i++) {
      const x = 85 + random() * 790, y = 290 + random() * 330;
      if (!landContains(x, y, 25, shore) || ellipseContains(x, y, pond, 25) || Math.abs(x - 480) < 55 || Math.abs(y - 350) < 32) continue;
      if (rocks.some(t => Math.hypot(t.x - x, t.y - y) < 38)) continue;
      const ore = rocks.length < 3;
      rocks.push({ x: Math.round(x), y: Math.round(y), radius: 8, kind: 'rock', solid: true, ore, gold: ore ? 6 + Math.floor(random() * 3) : 2 });
    }
    const banks = [];
    for (let i = 0; i < 150 && banks.length < 10; i++) {
      const x = 80 + random() * 800, y = 275 + random() * 360;
      if (!landContains(x, y, 35, shore) || ellipseContains(x, y, pond, 35) || Math.abs(x - 480) < 55 || Math.abs(y - 350) < 33) continue;
      if ([...rocks, ...banks].some(s => Math.hypot(s.x - x, s.y - y) < s.radius + 38)) continue;
      banks.push({ x: Math.round(x), y: Math.round(y), radius: 13, kind: 'snowbank', solid: true, breakable: true });
    }
    return Object.freeze([...trees, ...rocks, ...banks]);
  }
  const SCENERY = makeScenery();

  function makeLayout(id, seed, revision) {
    const random = seededRandom(seed);
    const shore = SHORE.map(([x, y], index) => Object.freeze([Math.round(clamp(x + (random() - .5) * 16 + (id === 1 && index > 9 ? 13 : id === 2 && index > 3 && index < 9 ? -12 : 0), 18, 944)), Math.round(clamp(y + (random() - .5) * 12, 20, 700))]));
    const templates = [POND, { x: 255, y: 488, rx: 71, ry: 43 }, { x: 688, y: 564, rx: 83, ry: 43 }];
    const p = templates[id];
    const pond = Object.freeze({ x: p.x + Math.round((random() - .5) * 18), y: p.y + Math.round((random() - .5) * 14), rx: p.rx, ry: p.ry });
    return Object.freeze({ id, revision, seed, shore: Object.freeze(shore), pond });
  }

  function circleHitsRect(x, y, radius, rect) {
    const nx = clamp(x, rect.x, rect.x + rect.w), ny = clamp(y, rect.y, rect.y + rect.h);
    return (x - nx) ** 2 + (y - ny) ** 2 < radius ** 2;
  }

  const SHOP_COLLIDERS = [
    { x: SHOP.x, y: SHOP.y, w: SHOP.width, h: 34 },
    { x: SHOP.x, y: SHOP.y, w: 10, h: SHOP.height },
    { x: SHOP.x + SHOP.width - 10, y: SHOP.y, w: 10, h: SHOP.height },
    { x: SHOP.x, y: SHOP.y + SHOP.height - 10, w: SHOP.doorLeft - SHOP.x, h: 10 },
    { x: SHOP.doorRight, y: SHOP.y + SHOP.height - 10, w: SHOP.x + SHOP.width - SHOP.doorRight, h: 10 },
    ...SHOP_DISPLAYS.map(display => display.counter)
  ];

  class Game {
    constructor(options = {}) {
      this.random = options.random || Math.random;
      this.terrainRandom = seededRandom(Number.isFinite(options.terrainSeed) ? options.terrainSeed : Math.floor(this.random() * 4294967296));
      this.terrainStart = Math.floor(this.terrainRandom() * 3);
      this.terrainRevision = 0;
      this.storage = options.storage || null;
      this.saved = Boolean(this.storage);
      this.storageFailed = false;
      this.shopGeneration = 0;
      this.shopTarget = null;
      this.interactHeld = false;
      const state = this.readState();
      this.gold = state.gold; this.upgrades = state.upgrades; this.market = state.market;
      if (this.storage && state.migrated) this.saveState();
      this.events = [];
      this.runNumber = 0;
      this.elapsed = 0;
      this.reset('initial');
      this.events.length = 0;
    }

    readGold() {
      try {
        const raw = this.storage?.getItem(SAVE_KEY);
        if (raw === null || raw === undefined || typeof raw !== 'string' || !/^\d+$/.test(raw)) return 0;
        const n = Number(raw); return Number.isSafeInteger(n) && n >= 0 ? n : 0;
      } catch { this.saved = false; return 0; }
    }

    sanitizeUpgrades(value, legacy = false) {
      const result = {};
      for (const id of ['heart', 'walk', 'swing', 'pan']) {
        const n = value && Object.hasOwn(value, id) ? value[id] : 0;
        result[id] = !(legacy && (id === 'walk' || id === 'swing')) && Number.isInteger(n) && n >= 0 && n <= 3 ? n : 0;
      }
      return result;
    }

    readUpgrades() {
      try { return this.sanitizeUpgrades(JSON.parse(this.storage?.getItem(UPGRADE_SAVE_KEY) || '{}'), true); }
      catch { return this.sanitizeUpgrades(null); }
    }

    sanitizeMarket(value) {
      const empty = { owned: { banana: false, rocky: false, greedy: false }, equipped: null, golden: false, ticket: false, supply: null, progress: { completedOutings: 0, survivedOutings: 0, lifetimeGold: 0 } };
      const own = (o, id) => o && typeof o === 'object' && Object.hasOwn(o, id) ? o[id] : undefined;
      for (const id of Object.keys(empty.owned)) empty.owned[id] = own(own(value, 'owned'), id) === true;
      const equipped = own(value, 'equipped');
      empty.equipped = typeof equipped === 'string' && Object.hasOwn(empty.owned, equipped) && empty.owned[equipped] ? equipped : null;
      empty.golden = own(value, 'golden') === true; empty.ticket = own(value, 'ticket') === true;
      const supply = own(value, 'supply');
      empty.supply = typeof supply === 'string' && Object.hasOwn(POWERUP_DEFS, supply) ? supply : null;
      for (const id of Object.keys(empty.progress)) { const n = own(own(value, 'progress'), id); empty.progress[id] = Number.isSafeInteger(n) && n >= 0 ? n : 0; }
      return empty;
    }

    readMarket() {
      try { return this.sanitizeMarket(JSON.parse(this.storage?.getItem(MARKET_SAVE_KEY) || '{}')); }
      catch { return this.sanitizeMarket(null); }
    }

    readState() {
      try {
        const raw = this.storage?.getItem(STATE_SAVE_KEY);
        // Presence, including corrupt data, permanently wins over legacy keys.
        // Falling back could resurrect spent gold or consumed stock.
        if (raw !== null && raw !== undefined) {
          let value; try { value = JSON.parse(raw); } catch { value = null; }
          if (value?.version !== 2) value = null;
          return { gold: Number.isSafeInteger(value?.gold) && value.gold >= 0 ? value.gold : 0, upgrades: this.sanitizeUpgrades(value?.upgrades), market: this.sanitizeMarket(value?.market), migrated: value?.market?.supply === 'cocoa' };
        }
        return { gold: this.readGold(), upgrades: this.readUpgrades(), market: this.readMarket(), migrated: true };
      } catch {
        this.saved = false; this.storage = null;
        return { gold: 0, upgrades: this.sanitizeUpgrades(null), market: this.sanitizeMarket(null), migrated: false };
      }
    }

    stateRecord() { const market = JSON.parse(JSON.stringify(this.market)); market.supply = typeof market.supply === 'string' && Object.hasOwn(POWERUP_DEFS, market.supply) ? market.supply : null; return { version: 2, gold: this.gold, upgrades: { ...this.upgrades }, market }; }

    saveState() {
      if (!this.storage) { this.saved = false; return !this.storageFailed; }
      try { this.storage.setItem(STATE_SAVE_KEY, JSON.stringify(this.stateRecord())); this.saved = this.storage.pendingWrites === undefined || this.storage.pendingWrites === 0; return true; }
      catch { this.saved = false; this.storageFailed = true; return false; }
    }

    saveGold() { return this.saveState(); }
    saveMarket() { return this.saveState(); }

    syncShopEquipment() {
      if (this.phase !== 'shop' || !this.player) return;
      this.player.gadget = this.market.equipped;
      this.player.golden = this.market.golden;
      // The final swing tier earns the gold finish; legacy reach/bowling stays separate.
      this.player.panFinish = this.market.golden || this.upgrades.swing >= UPGRADE_DEFS.swing.max ? 'gold' : 'steel';
      this.player.reachScale = this.player.golden ? TOY_DEFS.goldenReach : 1;
    }

    shopOffer(id) {
      if (typeof id !== 'string' || !Object.hasOwn(SHOP_ITEMS, id)) return null;
      const def = UPGRADE_DEFS[id], display = SHOP_DISPLAYS.find(d => d.id === id), level = this.upgrades[id];
      const maxed = level >= def.max, cost = maxed ? 0 : def.prices[level];
      const required = maxed ? 0 : def.outingGates[level], value = this.market.progress.completedOutings;
      const locked = value < required, affordable = !maxed && !locked && this.gold >= cost;
      const benefit = tier => id === 'heart' ? `${UPGRADE_EFFECTS.heart[tier]} hearts` : id === 'walk' ? tier === 0 ? 'Base speed' : `+${Math.round((UPGRADE_EFFECTS.walk[tier] - 1) * 100)}% speed` : tier === 0 ? 'Base swing speed' : `+${Math.round((UPGRADE_EFFECTS.swing[tier] - 1) * 100)}% swing speed`;
      return { id, ...SHOP_ITEMS[id], ...def, x: display.x, y: display.y, display, level, cost, maxed, locked, affordable, currentBenefit: benefit(level), nextBenefit: maxed ? 'MAXIMUM' : benefit(level + 1), benefit: benefit(maxed ? level : level + 1), action: maxed ? 'maxed' : 'buy', unlockRequirements: required ? [{ id: 'completedOutings', value, required }] : [] };
    }

    shopDisplays() { return SHOP_DISPLAYS.map(display => this.shopOffer(display.id)); }

    syncSavedProgress() {
      if (!this.storage || this.storageFailed) return;
      const state = this.readState();
      this.gold = state.gold; this.upgrades = state.upgrades; this.market = state.market;
      // Canonical account reconciliation continues after defeat, but the ended
      // outing's player stays frozen until reset constructs the healed player.
      if (this.player && this.phase !== 'dying' && this.phase !== 'winning' && this.phase !== 'summary') {
        const maxHp = this.maxHealth(), delta = maxHp - this.player.maxHp;
        this.player.maxHp = maxHp;
        this.player.hp = this.player.alive ? clamp(this.player.hp + Math.max(0, delta), 1, maxHp) : 0;
      }
      this.syncShopEquipment();
    }

    shopReachable(display) {
      const p = this.player, samples = Math.max(1, Math.ceil(distance(p, display) / 2));
      for (let i = 0; i <= samples; i++) if (this.isBlocked(p.x + (display.x - p.x) * i / samples, p.y + (display.y - p.y) * i / samples, p.radius)) return false;
      return true;
    }

    nearbyShop() {
      if (this.phase !== 'shop' || !inShop(this.player.x, this.player.y)) return null;
      return this.shopDisplays().filter(offer => distance(offer, this.player) <= SHOP_INTERACTION_RANGE && this.shopReachable(offer)).sort((a, b) => distance(a, this.player) - distance(b, this.player) || SHOP_DISPLAYS.findIndex(d => d.id === a.id) - SHOP_DISPLAYS.findIndex(d => d.id === b.id))[0] || null;
    }

    updateShopTarget() {
      const id = this.nearbyShop()?.id || null;
      if (id !== this.shopTarget) { this.shopTarget = id; this.shopGeneration++; }
    }

    invalidateShopIntent() { this.shopGeneration++; }

    purchaseIntent() {
      this.updateShopTarget();
      const offer = this.nearbyShop();
      return offer ? { id: offer.id, generation: this.shopGeneration, level: offer.level, cost: offer.cost } : null;
    }

    buyUpgrade(id, intent = null) {
      this.syncSavedProgress(); this.updateShopTarget();
      const offer = this.shopOffer(id), nearby = this.nearbyShop();
      if (!offer || this.phase !== 'shop' || nearby?.id !== id || this.storageFailed || intent && (intent.id !== id || intent.generation !== this.shopGeneration || intent.level !== offer.level || intent.cost !== offer.cost)) return false;
      if (offer.maxed || offer.locked || !offer.affordable) {
        this.events.push({ type: 'purchaseFailed', reason: offer.maxed ? 'maxed' : offer.locked ? 'locked' : 'gold', offer }); return false;
      }
      const before = this.stateRecord();
      this.gold -= offer.cost; this.upgrades[id]++;
      if (!this.saveState()) { this.gold = before.gold; this.upgrades = before.upgrades; this.market = before.market; this.events.push({ type: 'purchaseFailed', reason: 'storage', offer }); return false; }
      if (id === 'heart') { const maximum = this.maxHealth(), delta = maximum - this.player.maxHp; this.player.maxHp = maximum; this.player.hp = clamp(this.player.hp + delta, 1, maximum); }
      this.syncShopEquipment();
      this.events.push({ type: 'purchase', offer, level: this.upgrades[id] });
      return true;
    }

    maxHealth() { return UPGRADE_EFFECTS.heart[this.upgrades.heart]; }
    baseMovementSpeed() { return SPEED * UPGRADE_EFFECTS.walk[this.upgrades.walk]; }
    movementSpeed() { return this.baseMovementSpeed() * (this.player.buffs.speed > 0 ? POWERUP_DEFS.speed.multiplier : 1); }
    swingTiming() {
      const scale = 1 / UPGRADE_EFFECTS.swing[this.upgrades.swing], p = this.player;
      const cooldown = (p.gadget === 'banana' && p.buffs.speed > 0 ? TOY_DEFS.bananaCooldown : SWING_COOLDOWN) * scale * (p.buffs.frenzy > 0 ? POWERUP_DEFS.frenzy.cooldownScale : 1);
      return { duration: SWING_SECONDS * scale, cooldown };
    }

    useSupply() {
      if (this.phase !== 'run' || !this.player.alive) return false;
      this.syncSavedProgress();
      const kind = this.market.supply;
      if (typeof kind !== 'string' || !Object.hasOwn(POWERUP_DEFS, kind)) return false;
      // Persist stock consumption first, so an older tab cannot use it again.
      this.market.supply = null;
      if (!this.saveMarket()) { this.market.supply = kind; return false; }
      if (!this.collectPowerup({ kind })) return false;
      this.events.push({ type: 'supplyUsed', kind });
      return true;
    }

    reset(reason = 'timeout') {
      // Only deliberate, admitted Summary continuation can prepare a new outing.
      if (this.phase === 'dying' || this.phase === 'winning' || this.phase === 'summary') return;
      if ((reason === 'death' || reason === 'timeout') && this.phase === 'run') { this.finishOuting(reason); return; }
      this.prepareShop(reason);
    }

    prepareShop(reason) {
      this.phase = 'shop'; this.shopGeneration++; this.shopTarget = null;
      this.attackTickets = new Map(); this.attackTicketSerial = 0;
      this.panStrike = null;
      this.remaining = RUN_SECONDS;
      this.scaleRemaining = ENCOUNTER_RAMP_SECONDS; this.encounterPressure = 0; this.difficulty = 0;
      this.runGold = 0;
      const maxHp = this.maxHealth();
      this.player = { x: SHOP.spawnX, y: SHOP.spawnY, radius: 6, velocityX: 0, velocityY: 0, facingX: 0, facingY: 1, moving: false, walk: 0, swing: 0, swingFacingX: null, swingFacingY: null, swingCadence: 0, cooldown: 0, alive: true, hp: maxHp, maxHp, invulnerable: 0, hurtFlash: 0, buffs: { speed: 0, frenzy: 0, jelly: 0 }, gadget: this.market.equipped, golden: this.market.golden, panFinish: this.market.golden || this.upgrades.swing >= UPGRADE_DEFS.swing.max ? 'gold' : 'steel', reachScale: this.market.golden ? TOY_DEFS.goldenReach : 1, honk: 0, activation: null, activations: [], expiries: [] };
      this.enemies = [];
      this.waveIn = waveInterval(0);
      this.kills = 0;
      this.difficulty = 0;
      this.chestsOpened = 0;
      this.waveNumber = 0;
      this.deathFreeze = 0; this.deathAge = 0; this.deathHurtFlash = 0; this.victoryAge = 0; this.victoryFreeze = 0; this.settledOuting = null;
      this.coins = [];
      this.particles = [];
      this.popups = [];
      this.goofs = [];
      this.impacts = [];
      this.powerups = [];
      this.peels = [];
      this.snowballs = [];
      this.hazards = [];
      this.hostileSnowballs = [];
      this.aftermathTime = 0;
      this.summaryAge = 0; this.continueHeld = false;
      this.contract = null;
      this.peelMoving = 0;
      this.peelsMade = 0;
      this.honkIn = 0;
      this.flockNumber = 0;
      const revision = ++this.terrainRevision;
      const terrainSeed = Math.floor(this.terrainRandom() * 4294967296);
      this.layout = makeLayout((this.terrainStart + revision - 1) % 3, terrainSeed, revision);
      this.shore = this.layout.shore; this.pond = this.layout.pond;
      this.obstacles = makeScenery(this.shore, this.pond, seededRandom(terrainSeed ^ 0x51f10e)).map(s => ({ ...s, broken: false, hp: s.kind === 'rock' || s.breakable ? 2 : Infinity, maxHp: s.kind === 'rock' || s.breakable ? 2 : Infinity }));
      this.chests = this.spawnChests();
      this.runNumber++;
      this.summary = null; this.summaryRevealed = false;
      this.events.push({ type: 'reset', reason });
    }

    settleOuting(reason) {
      if (this.settledOuting) return this.settledOuting;
      this.attackTickets.clear();
      this.panStrike = null;
      // Latch before any storage callback. Arrivals, KOs and time belong to this
      // outing; later canonical reconciliation must never rewrite this record.
      this.settledOuting = this.summary = Object.freeze({ reason, enemiesConquered: this.kills, goldGained: this.runGold, timeSurvived: clamp(RUN_SECONDS - this.remaining, 0, RUN_SECONDS) });
      this.syncSavedProgress();
      this.market.progress.completedOutings = Math.min(Number.MAX_SAFE_INTEGER, this.market.progress.completedOutings + 1);
      if (reason === 'timeout' && this.player.alive) this.market.progress.survivedOutings = Math.min(Number.MAX_SAFE_INTEGER, this.market.progress.survivedOutings + 1);
      // Browser persistence enqueues this delta; it does not claim sync durability.
      this.saveMarket();
      return this.settledOuting;
    }

    clearOutingRewards() {
      this.player.velocityX = 0; this.player.velocityY = 0; this.player.moving = false;
      this.player.buffs = { speed: 0, frenzy: 0, jelly: 0 }; this.player.activation = null; this.player.activations = []; this.player.expiries = [];
      this.coins = []; this.powerups = []; this.peels = []; this.snowballs = []; this.goofs = [];
      this.contract = null; this.particles = []; this.popups = []; this.impacts = [];
    }

    finishOuting(reason) {
      if (this.settledOuting || this.phase !== 'run') return;
      if (reason === 'death') { this.die(); return; }
      this.phase = 'winning';
      this.victoryAge = 0; this.victoryFreeze = VICTORY_FLOURISH.duration;
      this.settleOuting(reason);
      this.events.push({ type: 'victory' });
    }

    revealSummary() {
      if (!this.settledOuting || this.summaryRevealed || (this.phase === 'dying' && this.deathFreeze > 1e-9) || (this.phase === 'winning' && this.victoryFreeze > 1e-9)) return;
      if (this.phase === 'winning') this.clearOutingRewards();
      this.summaryRevealed = true;
      this.phase = 'summary'; this.summaryAge = 0;
      for (const enemy of this.enemies) { enemy.bowled = 0; enemy.stun = 0; enemy.cooldown = .1; }
      // Carry over committed warnings, remaining ability/recovery seconds and
      // actor identity. Retained hostile effects become explicitly cosmetic.
      for (const effect of [...this.hazards, ...this.hostileSnowballs]) effect.cosmetic = true;
      this.events.push({ type: 'reset', reason: this.summary.reason });
      this.events.push({ type: 'summary', summary: this.summary });
    }

    continueSummary() {
      if (this.phase !== 'summary' || !this.summary || this.summaryAge + 1e-9 < SUMMARY_LOCK) return false;
      const reason = this.summary.reason;
      this.syncSavedProgress();
      this.prepareShop('return');
      this.events.push({ type: 'summaryContinue', reason });
      return true;
    }

    die() {
      if (this.settledOuting || this.phase !== 'run') return;
      this.player.alive = false; this.player.hp = 0;
      this.phase = 'dying';
      this.deathAge = 0; this.deathFreeze = DEATH_FLOURISH.duration;
      this.clearOutingRewards();
      this.settleOuting('death');
      this.events.push({ type: 'critical' });
    }

    blockerAt(x, y, radius = this.player.radius, ignoreChests = false, ignorePond = false) {
      if (!this.landContains(x, y, radius + 7) || (!ignorePond && ellipseContains(x, y, this.pond, radius + 4)) ||
        (this.phase === 'run' && inShop(x, y, radius)) || SHOP_COLLIDERS.some(rect => circleHitsRect(x, y, radius, rect))) return { kind: 'terrain' };
      const obstacle = (this.obstacles || SCENERY).find(s => s.solid !== false && !s.broken && Math.hypot(x - s.x, y - s.y) < radius + s.radius);
      if (obstacle) return { kind: obstacle.kind === 'rock' ? 'rock' : obstacle.breakable ? 'scenery' : 'terrain', object: obstacle };
      const chest = !ignoreChests && this.chests?.find(c => !c.open && Math.abs(x - c.x) < radius + 9 && Math.abs(y - c.y) < radius + 6);
      return chest ? { kind: 'chest', object: chest } : null;
    }

    isBlocked(x, y, radius = this.player.radius, ignoreChests = false, ignorePond = false) {
      return Boolean(this.blockerAt(x, y, radius, ignoreChests, ignorePond));
    }

    landContains(x, y, radius = 0) { return landContains(x, y, radius, this.shore); }

    spawnChests() {
      const chests = [];
      for (let attempt = 0; attempt < 2400 && chests.length < 36; attempt++) {
        const x = Math.round(75 + this.random() * 810), y = Math.round(276 + this.random() * 370);
        if (this.isBlocked(x, y, 16, true) || inShop(x, y, 40)) continue;
        if (Math.abs(x - 480) < 20 && y < 300) continue;
        if (chests.some(c => Math.hypot(x - c.x, y - c.y) < 46)) continue;
        chests.push({ id: chests.length, x, y, open: false, variant: Math.floor(this.random() * 3) });
      }
      return chests;
    }

    startRun() {
      if (this.phase !== 'shop') return;
      this.syncSavedProgress();
      this.syncShopEquipment();
      this.phase = 'run'; this.shopGeneration++; this.shopTarget = null;
      this.panStrike = null; // A shop swing cannot become a live attack on departure.
      this.remaining = RUN_SECONDS;
      this.scaleRemaining = ENCOUNTER_RAMP_SECONDS; this.encounterPressure = 0; this.difficulty = 0;
      this.events.push({ type: 'depart' });
      if (this.market.ticket) {
        this.market.ticket = false;
        if (this.saveMarket()) this.startContract();
        else this.market.ticket = true;
      }
      this.waveIn = waveInterval(0);
      this.spawnEnemies(4, ['burrower', 'penguin', 'bear', 'chick']);
      this.spawnSnowbirdGroup(SNOWBIRD_DEFS.groupMin);
      this.spawnEnemies(2, ['burrower', 'burrower']);
      // A blocked opening sector may reject a slot despite room elsewhere.
      // Retry only its missing roster quota using the same bounded legal sampler.
      for (const [kind, wanted] of [['burrower', 3], ['chick', 1], ['penguin', 1], ['bear', 1]]) {
        const missing = wanted - this.enemies.filter(e => e.kind === kind && e.hp > 0).length;
        if (missing > 0) this.spawnEnemies(missing, Array(missing).fill(kind), { aroundPlayer: true });
      }
    }

    makeEnemy(kind, x, y) {
      const def = ENEMY_DEFS[kind];
      const flankSide = kind === 'bear' ? 0 : this.random() < .5 ? -1 : 1;
      // Preserve the legacy creation draw so unrelated actors keep their seeded
      // identities/positions; the human no longer has a random buried wait.
      if (kind === 'burrower') this.random();
      return { anchorX: x, anchorY: y, underground: false, exposed: true, burrowWait: 0, exposedFor: 0, id: this.elapsed + this.random(), kind, x, y, ...def, maxHp: def.hp, facingX: 0, facingY: 1, windup: 0, windupMax: def.telegraph, charge: 0, recovery: 0, stomp: 0, attackX: x, attackY: y, aimX: x, aimY: y, chargeFor: 0, aimScatterX: 0, aimScatterY: 0, flankSide, avoidSide: this.random() < .5 ? -1 : 1, spin: 0, bowled: 0, crash: 0, cooldown: .6, stun: 0, investigate: 0, age: this.random() * 10 };
    }

    startContract() {
      if (this.phase === 'winning') return;
      const candidates = this.chests.filter(c => !c.open && distance(c, this.player) >= 170).map(chest => ({ chest, order: this.random() })).sort((a, b) => a.order - b.order);
      const ids = [];
      for (const { chest } of candidates) {
        let guard = null;
        for (let i = 0; i < 80; i++) {
          const a = this.random() * Math.PI * 2, gap = 34 + this.random() * 38;
          const x = chest.x + Math.cos(a) * gap, y = chest.y + Math.sin(a) * gap;
          if (this.isBlocked(x, y, ENEMY_DEFS.bear.radius + 3) || distance({ x, y }, this.player) < 160 || this.enemies.some(e => e.hp > 0 && distance(e, { x, y }) < Math.max(e.kind === 'burrower' ? BURROWER_DEFS.spacing : 30, ENEMY_DEFS.bear.radius + e.radius + 5))) continue;
          guard = this.makeEnemy('bear', x, y); break;
        }
        if (!guard) continue;
        guard.guardChestId = chest.id;
        this.enemies.push(guard); chest.stamped = true; ids.push(chest.id);
        if (ids.length === 3) break;
      }
      this.contract = { active: true, remaining: TOY_DEFS.bondSeconds, ids, stamps: [], status: 'active' };
      this.events.push({ type: 'contract', ids: [...ids] });
    }

    expireContract() {
      if (this.phase === 'winning') return;
      if (!this.contract?.active) return;
      this.contract.active = false; this.contract.status = 'expired'; this.contract.remaining = 0;
      for (const chest of this.chests) chest.stamped = false;
      this.events.push({ type: 'contractExpired' });
    }

    stampContract(coin) {
      if (this.phase === 'winning') return;
      const contract = this.contract;
      if (!contract?.active || contract.remaining <= 0 || !contract.ids.includes(coin.originChestId) || contract.stamps.includes(coin.originChestId)) return;
      contract.stamps.push(coin.originChestId);
      const chest = this.chests.find(c => c.id === coin.originChestId);
      if (chest) chest.stamped = false;
      this.events.push({ type: 'contractStamp', count: contract.stamps.length, id: coin.originChestId });
      if (contract.stamps.length !== 3) return;
      contract.active = false; contract.status = 'won';
      for (const chest of this.chests) chest.stamped = false;
      this.dropCoins(this.player.x, this.player.y, 10, { value: TOY_DEFS.bondReward / 10, bonus: true });
      this.impact(this.player.x, this.player.y, 'jackpot');
      this.events.push({ type: 'contractWon', value: TOY_DEFS.bondReward });
    }

    spawnEnemies(count, kinds, options = {}) {
      if (this.phase === 'winning') return;
      const rotation = this.random() * Math.PI * 2;
      // Knockouts remain in the array until updateEnemies; only living actors
      // reserve capacity and spacing, matching complete-flock spawning.
      let liveCount = this.enemies.filter(e => e.hp > 0).length;
      for (let i = 0; i < count && liveCount < ENCOUNTER_DEFS.cap; i++) {
        const kind = kinds?.[i] || ['chick', 'penguin', 'chick', 'bear'][Math.floor(this.random() * 4)];
        const def = ENEMY_DEFS[kind];
        for (let attempt = 0; attempt < ENCOUNTER_DEFS.spawnAttempts; attempt++) {
          const relative = options.aroundPlayer && attempt < ENCOUNTER_DEFS.spawnSectorAttempts;
          const angle = options.aroundPlayer && !relative ? this.random() * Math.PI * 2 : rotation + (i + this.random() * .65) / count * Math.PI * 2;
          const radius = relative ? ENCOUNTER_DEFS.spawnRadiusMin + this.random() * (ENCOUNTER_DEFS.spawnRadiusMax - ENCOUNTER_DEFS.spawnRadiusMin) : 0;
          const x = Math.round((relative ? this.player.x : 480) + Math.cos(angle) * (relative ? radius : 230 + this.random() * 150));
          const y = Math.round((relative ? this.player.y : 450) + Math.sin(angle) * (relative ? radius : 125 + this.random() * 75));
          if (this.isBlocked(x, y, def.radius + 5) || distance({ x, y }, this.player) < ENCOUNTER_DEFS.minSpawnDistance || this.enemies.some(e => e.hp > 0 && distance(e, { x, y }) < Math.max(kind === 'burrower' || e.kind === 'burrower' ? BURROWER_DEFS.spacing : 30, kind === 'bear' || e.kind === 'bear' ? def.radius + e.radius + 5 : 0))) continue;
          const enemy = this.makeEnemy(kind, x, y); enemy.spawnSector = i;
          if (kind !== 'bear') enemy.flankSide = (i + this.waveNumber) % 2 ? -1 : 1;
          this.enemies.push(enemy);
          liveCount++;
          break;
        }
      }
    }

    spawnSnowbirdGroup(requestedCount, options = {}) {
      if (this.phase === 'winning') return;
      const room = ENCOUNTER_DEFS.cap - this.enemies.filter(e => e.hp > 0).length;
      if (room < SNOWBIRD_DEFS.groupMin) return [];
      const wanted = Number.isFinite(requestedCount) ? Math.floor(requestedCount) : SNOWBIRD_DEFS.groupMin + Math.floor(this.random() * (SNOWBIRD_DEFS.groupMax - SNOWBIRD_DEFS.groupMin + 1));
      const count = Math.min(room, clamp(wanted, SNOWBIRD_DEFS.groupMin, SNOWBIRD_DEFS.groupMax));
      for (let attempt = 0; attempt < ENCOUNTER_DEFS.spawnAttempts; attempt++) {
        const relative = options.aroundPlayer && attempt < ENCOUNTER_DEFS.spawnSectorAttempts;
        const angle = relative ? this.random() * Math.PI * 2 : 0;
        const radius = relative ? ENCOUNTER_DEFS.spawnRadiusMin + this.random() * (ENCOUNTER_DEFS.spawnRadiusMax - ENCOUNTER_DEFS.spawnRadiusMin) : 0;
        const x = relative ? this.player.x + Math.cos(angle) * radius : 95 + this.random() * 770;
        const y = relative ? this.player.y + Math.sin(angle) * radius : 294 + this.random() * 330;
        if (this.isBlocked(x, y, 28) || distance({ x, y }, this.player) < SNOWBIRD_DEFS.minSpawnDistance + (relative ? 0 : 32)) continue;
        const phase = this.random() * Math.PI * 2;
        const points = [];
        for (let i = 0; i < count; i++) {
          const a = phase + i / count * Math.PI * 2, r = SNOWBIRD_DEFS.spacing + this.random() * 8;
          const point = { x: x + Math.cos(a) * r, y: y + Math.sin(a) * r };
          if (this.isBlocked(point.x, point.y, ENEMY_DEFS.snowbird.radius + 3) || distance(point, this.player) < SNOWBIRD_DEFS.minSpawnDistance || [...points, ...this.enemies.filter(e => e.hp > 0)].some(other => distance(point, other) < Math.max(SNOWBIRD_DEFS.spacing, other.kind === 'bear' ? ENEMY_DEFS.snowbird.radius + other.radius + 5 : 0))) break;
          points.push(point);
        }
        if (points.length !== count) continue;
        const groupId = this.runNumber * 1000 + ++this.flockNumber;
        const birds = points.map((point, i) => {
          const bird = this.makeEnemy('snowbird', point.x, point.y);
          Object.assign(bird, { groupId, flockIndex: i, flockX: x, flockY: y, orbitPhase: phase + i / count * Math.PI * 2, circleSide: groupId % 2 ? 1 : -1, flockAge: 0, cooldown: .9 + i * SNOWBIRD_DEFS.stagger });
          return bird;
        });
        this.enemies.push(...birds);
        this.events.push({ type: 'flock', kind: 'snowbird', count, groupId, x, y });
        return birds;
      }
      return [];
    }

    damagePlayer(amount, source = {}) {
      const p = this.player;
      if (this.phase !== 'run' || !p.alive || !Number.isFinite(p.hp) || p.hp <= 0 || !Number.isFinite(amount) || amount <= 0 || p.invulnerable > 0) return false;
      const nextHp = Math.max(0, p.hp - amount), healthLost = p.hp - nextHp;
      if (!(healthLost > 0)) return false;
      p.hp = nextHp;
      p.invulnerable = DAMAGE_FEEDBACK.graceSeconds;
      p.hurtFlash = DAMAGE_FEEDBACK.flashSeconds;
      if (p.hp === 0) this.deathHurtFlash = p.hurtFlash;
      const provenance = {};
      if (typeof source.kind === 'string' && Object.hasOwn(ENEMY_DEFS, source.kind)) provenance.kind = source.kind;
      if (['peck', 'slide', 'stomp', 'swoop', 'snow-ring', 'charge', 'snowball'].includes(source.attack)) provenance.attack = source.attack;
      this.events.push({ type: 'hurt', damage: amount, healthLost, lethal: p.hp === 0, ...provenance });
      this.popups.push({ x: p.x, y: p.y - 17, life: .45, text: '!' });
      if (p.hp === 0) this.die();
      return true;
    }

    lineUnblocked(a, b, radius = 1) {
      const steps = Math.max(1, Math.ceil(distance(a, b) / 4));
      for (let i = 1; i < steps; i++) {
        if (this.isBlocked(a.x + (b.x - a.x) * i / steps, a.y + (b.y - a.y) * i / steps, radius)) return false;
      }
      return true;
    }

    resolveStomp(enemy) {
      if (this.phase === 'winning') return;
      const x = enemy.attackX ?? enemy.x, y = enemy.attackY ?? enemy.y;
      const radius = enemy.attackRadius || ENCOUNTER_DEFS.stompRadius;
      enemy.stomp = .25; enemy.recovery = ENCOUNTER_DEFS.stompRecovery;
      this.impact(x, y, 'stomp');
      this.events.push({ type: 'stomp', x, y, radius, kind: enemy.kind });
      this.hazards.push({ kind: 'snow-ring', ownerId: enemy.id, x, y, radius, previousRadius: radius, startRadius: radius, maxRadius: ENCOUNTER_DEFS.ringRadius, width: ENCOUNTER_DEFS.ringWidth, delay: ENCOUNTER_DEFS.ringDelay, life: ENCOUNTER_DEFS.ringLife, maxLife: ENCOUNTER_DEFS.ringLife, released: false, damage: ENCOUNTER_DEFS.ringDamage });
      if (distance({ x, y }, this.player) <= radius + this.player.radius && this.lineUnblocked({ x, y }, this.player)) this.damagePlayer(enemy.damage, { kind: enemy.kind, attack: 'stomp' });
    }

    updateHazards(dt) {
      this.hazards = this.hazards.filter(hazard => {
        if (this.phase !== 'run') return true;
        if (hazard.delay > 0) { hazard.delay = Math.max(0, hazard.delay - dt); return true; }
        // First genuine live expansion only; pending-delay expiry still returns.
        if (!hazard.cosmetic && !hazard.released && dt > 0 && hazard.life > 0 && hazard.maxRadius > hazard.radius) {
          hazard.released = true;
          this.events.push({ type: 'shockwaveRelease', kind: 'bear', ownerId: hazard.ownerId, x: hazard.x, y: hazard.y, radius: hazard.radius });
        }
        hazard.previousRadius = hazard.radius;
        hazard.life = Math.max(0, hazard.life - dt);
        hazard.startRadius ??= hazard.radius;
        hazard.radius = hazard.startRadius + (hazard.maxRadius - hazard.startRadius) * (1 - hazard.life / hazard.maxLife);
        const gap = distance(hazard, this.player);
        const padding = hazard.width / 2 + this.player.radius;
        if (!hazard.hitPlayer && gap >= hazard.previousRadius - padding && gap <= hazard.radius + padding && this.lineUnblocked(hazard, this.player)) {
          if (this.damagePlayer(hazard.damage, { kind: 'bear', attack: 'snow-ring' })) hazard.hitPlayer = true;
        }
        return hazard.life > 0;
      });
    }

    avoidObstacles(enemy, mx, my, pace) {
      const look = Math.max(18, pace * .3), aim = { x: enemy.x + mx * look, y: enemy.y + my * look };
      if (this.lineUnblocked(enemy, aim, enemy.radius) && !this.isBlocked(aim.x, aim.y, enemy.radius)) return { x: mx, y: my };
      const angle = Math.atan2(my, mx), side = enemy.avoidSide || 1;
      let best = null, score = -Infinity;
      // Eight bounded local probes; warnings and charges never enter this code.
      for (const turn of [side * .65, -side * .65, side * 1.2, -side * 1.2, side * 1.65, -side * 1.65, side * 2.2, Math.PI]) {
        const x = Math.cos(angle + turn), y = Math.sin(angle + turn);
        const target = { x: enemy.x + x * look, y: enemy.y + y * look };
        if (this.isBlocked(target.x, target.y, enemy.radius) || !this.lineUnblocked(enemy, target, enemy.radius)) continue;
        const candidate = x * mx + y * my + (Math.sign(turn) === side ? .06 : 0);
        if (candidate > score) { best = { x, y }; score = candidate; }
      }
      return best || { x: 0, y: 0 };
    }

    prepareCharge(enemy) {
      if (this.phase === 'winning') return;
      const p = this.player, lead = enemy.predictionLead || 0;
      let scatterX = 0, scatterY = 0;
      if (enemy.aimScatter > 0) {
        const angle = this.random() * Math.PI * 2, radius = Math.sqrt(this.random()) * enemy.aimScatter;
        scatterX = Math.cos(angle) * radius; scatterY = Math.sin(angle) * radius;
      }
      const targetX = p.x + (p.velocityX || 0) * lead + scatterX;
      const targetY = p.y + (p.velocityY || 0) * lead + scatterY;
      let dx = targetX - enemy.x, dy = targetY - enemy.y, gap = Math.hypot(dx, dy);
      if (!gap) { dx = enemy.facingX || 0; dy = enemy.facingY || 1; gap = Math.hypot(dx, dy); }
      enemy.facingX = dx / gap; enemy.facingY = dy / gap;
      enemy.chargeFor = clamp(gap / enemy.chargeSpeed, .12, enemy.chargeDuration);
      const travel = enemy.chargeFor * enemy.chargeSpeed;
      enemy.aimX = enemy.x + enemy.facingX * travel;
      enemy.aimY = enemy.y + enemy.facingY * travel;
      enemy.aimScatterX = scatterX; enemy.aimScatterY = scatterY;
    }

    committedThreatNear(enemy, point) {
      if (distance(enemy, point) < 160) return true;
      return (enemy.windup > 0 || enemy.charge > 0) && (enemy.chargeFor > 0 || enemy.attack === 'snowball') && segmentDistance(point, { x: enemy.attackX, y: enemy.attackY }, { x: enemy.aimX, y: enemy.aimY }) < 160;
    }

    warningOwnersNear(point, except) {
      // Count owners once through warning AND projectile/ring lifetime,
      // including a defeated owner whose already-thrown snowball remains.
      const owners = new Set();
      for (const e of this.enemies) if (e !== except && e.hp > 0 && (e.windup > 0 || e.charge > 0) && this.committedThreatNear(e, point)) owners.add(e.id);
      for (const h of this.hazards) if (h.ownerId !== except?.id && h.life > 0 && distance(h, point) < h.maxRadius + 90) owners.add(h.ownerId);
      for (const ball of this.hostileSnowballs) if (ball.ownerId !== except?.id && ball.life > 0 && segmentDistance(point, ball, { x: ball.x + ball.vx * ball.life, y: ball.y + ball.vy * ball.life }) < 100) owners.add(ball.ownerId);
      return owners.size;
    }

    readyToAttack(e, dt = 0) {
      if (this.phase !== 'run' || e.hp <= 0 || e.windup > 0 || e.charge > 0 || e.stun > dt || e.recovery > dt) return false;
      const gap = distance(e, this.player);
      if (e.kind === 'burrower') return gap <= e.attackRange && !this.hostileSnowballs.some(ball => ball.ownerId === e.id && ball.life > 0);
      return e.bowled <= 0 && e.cooldown <= dt && gap < e.attackRange && this.lineUnblocked(e, this.player);
    }

    prepareAttackCandidates(dt) {
      // Project timers once for every contender, independently of physical order.
      // Existing windups/charges still finish through their usual ordered paths.
      const ready = this.enemies.filter(e => this.readyToAttack(e, dt));
      const waiting = new Set(ready);
      for (const e of this.attackTickets.keys()) if (!waiting.has(e)) this.attackTickets.delete(e);
      for (const e of ready) if (!this.attackTickets.has(e)) this.attackTickets.set(e, ++this.attackTicketSerial);
      return ready.sort((a, b) => this.attackTickets.get(a) - this.attackTickets.get(b));
    }

    hasAttackTurn(e, candidates, dt) {
      if (!this.readyToAttack(e) || this.warningOwnersNear(this.player, e) >= ENCOUNTER_DEFS.nearWarnings) return false;
      for (const waiter of candidates) {
        if (!this.attackTickets.has(waiter)) continue;
        if (!this.readyToAttack(waiter, waiter === e ? 0 : dt)) { this.attackTickets.delete(waiter); continue; }
        // Tickets give priority, not reserved threat slots. Recheck live owners.
        if (this.warningOwnersNear(this.player, waiter) < ENCOUNTER_DEFS.nearWarnings) return waiter === e;
      }
      return false;
    }

    snowballAimAngle(e) {
      const p = this.player, def = BURROWER_DEFS;
      const vx = Number.isFinite(p.velocityX) ? p.velocityX : 0, vy = Number.isFinite(p.velocityY) ? p.velocityY : 0;
      const scatterAngle = this.random() * Math.PI * 2, scatterRadius = Math.sqrt(this.random()) * def.aimScatter;
      const x = p.x - e.x + vx * def.preparation + Math.cos(scatterAngle) * scatterRadius;
      const y = p.y - e.y + vy * def.preparation + Math.sin(scatterAngle) * scatterRadius;
      // After preparation, intercept the moving target from the offset muzzle.
      // Bound prediction by the ball's life; unreachable targets can outrun it.
      const a = vx * vx + vy * vy - def.projectileSpeed ** 2;
      const b = 2 * (x * vx + y * vy - def.projectileOriginOffset * def.projectileSpeed);
      const c = x * x + y * y - def.projectileOriginOffset ** 2;
      let flight = def.projectileLife;
      if (c <= 0) flight = 0;
      else if (Math.abs(a) < 1e-8) {
        const root = -c / b;
        if (Number.isFinite(root) && root >= 0) flight = Math.min(flight, root);
      } else {
        const discriminant = b * b - 4 * a * c;
        if (discriminant >= 0) {
          const roots = [(-b - Math.sqrt(discriminant)) / (2 * a), (-b + Math.sqrt(discriminant)) / (2 * a)];
          for (const root of roots) if (Number.isFinite(root) && root >= 0) flight = Math.min(flight, root);
        }
      }
      const dx = x + vx * flight, dy = y + vy * flight;
      if (Math.hypot(dx, dy) > 0) return Math.atan2(dy, dx);
      return Math.atan2(Number.isFinite(e.facingY) ? e.facingY : 1, Number.isFinite(e.facingX) ? e.facingX : 0);
    }

    updateBurrower(e, dt, cosmetic = false, candidates = null) {
      if (this.phase === 'winning') return;
      e.x = e.anchorX; e.y = e.anchorY;
      e.exposed = true; e.underground = false;
      if (e.stun > 0) { e.windup = 0; e.recovery = BURROWER_DEFS.recovery; return; }
      if (e.windup > 0) {
        e.windup = Math.max(0, e.windup - dt);
        if (e.windup === 0) {
          const speed = BURROWER_DEFS.projectileSpeed;
          if (this.hostileSnowballs.length < ENCOUNTER_DEFS.hazardCap && !this.hostileSnowballs.some(ball => ball.ownerId === e.id && ball.life > 0)) {
            this.hostileSnowballs.push({ kind: 'hostile-snowball', ownerId: e.id, x: e.attackX, y: e.attackY, vx: e.facingX * speed, vy: e.facingY * speed, radius: BURROWER_DEFS.projectileRadius, life: BURROWER_DEFS.projectileLife, maxLife: BURROWER_DEFS.projectileLife, cosmetic });
            if (!cosmetic) this.events.push({ type: 'throw', kind: e.kind, x: e.x, y: e.y });
          }
          e.recovery = BURROWER_DEFS.recovery;
        }
        return;
      }
      if (e.recovery > 0 || !cosmetic && !this.hasAttackTurn(e, candidates || this.prepareAttackCandidates(dt), dt)) return;
      const angle = cosmetic ? e.age * .7 + e.id : this.snowballAimAngle(e);
      e.facingX = Math.cos(angle); e.facingY = Math.sin(angle);
      e.attackX = e.x + e.facingX * BURROWER_DEFS.projectileOriginOffset;
      e.attackY = e.y + e.facingY * BURROWER_DEFS.projectileOriginOffset;
      e.aimX = e.attackX + e.facingX * BURROWER_DEFS.projectileSpeed * BURROWER_DEFS.projectileLife;
      e.aimY = e.attackY + e.facingY * BURROWER_DEFS.projectileSpeed * BURROWER_DEFS.projectileLife;
      e.windup = BURROWER_DEFS.preparation; e.windupMax = e.windup;
      if (!cosmetic) this.attackTickets.delete(e);
    }

    updateHostileSnowballs(dt) {
      if (this.phase === 'winning') return;
      this.hostileSnowballs = this.hostileSnowballs.filter(ball => {
        if (this.phase === 'dying') return true;
        const motion = Math.min(dt, ball.life), steps = Math.max(1, Math.ceil(Math.hypot(ball.vx, ball.vy) * motion / 2));
        ball.life = Math.max(0, ball.life - dt);
        for (let i = 0; i < steps; i++) {
          const x = ball.x + ball.vx * motion / steps, y = ball.y + ball.vy * motion / steps;
          if (this.isBlocked(x, y, ball.radius, false, true)) return false;
          ball.x = x; ball.y = y;
          if (this.phase === 'run' && !ball.cosmetic && distance(ball, this.player) <= ball.radius + this.player.radius) {
            this.damagePlayer(BURROWER_DEFS.projectileDamage, { kind: 'burrower', attack: 'snowball' }); return false;
          }
        }
        return ball.life > 0;
      });
    }

    updateAftermath(dt) {
      if (this.phase === 'winning') return;
      // Presentation-only aftermath: no combat/reward/settlement methods run.
      this.aftermathTime = (this.aftermathTime || 0) + dt;
      for (const e of this.enemies) {
        if (e.hp <= 0) continue;
        e.age += dt;
        // These fields are remaining seconds, including the chick's peck spin.
        for (const timer of ['spin', 'hurt', 'flash', 'crash', 'recovery', 'stomp']) e[timer] = Math.max(0, (e[timer] || 0) - dt);
        if (e.kind === 'burrower') { e.stun = 0; this.updateBurrower(e, dt, true); continue; }
        e.frenzyClock = (e.frenzyClock || 0) + dt;
        if (e.windup > 0) {
          e.windup = Math.max(0, e.windup - dt);
          if (e.windup === 0) {
            if (e.kind === 'bear') {
              e.stomp = .3; e.recovery = .7;
              if (this.hazards.length < ENCOUNTER_DEFS.hazardCap) this.hazards.push({ kind: 'snow-ring', ownerId: e.id, x: e.x, y: e.y, radius: ENCOUNTER_DEFS.stompRadius, startRadius: ENCOUNTER_DEFS.stompRadius, maxRadius: ENCOUNTER_DEFS.ringRadius, width: ENCOUNTER_DEFS.ringWidth, delay: ENCOUNTER_DEFS.ringDelay, life: ENCOUNTER_DEFS.ringLife, maxLife: ENCOUNTER_DEFS.ringLife, cosmetic: true });
            } else if (e.chargeSpeed) e.charge = e.chargeFor > 0 ? e.chargeFor : e.chargeDuration;
            else { e.spin = .2; e.recovery = .25; }
          }
          continue;
        }
        if (e.charge > 0) {
          const motion = Math.min(dt, e.charge);
          e.charge = Math.max(0, e.charge - dt);
          this.moveEnemy(e, e.facingX * e.chargeSpeed * motion, e.facingY * e.chargeSpeed * motion, true);
          if (e.charge === 0) e.recovery = e.recoveryDuration || ENCOUNTER_DEFS.slideRecovery;
          continue;
        }
        if (e.recovery > 0) continue;
        const angle = e.age * (e.kind === 'snowbird' ? 2 : .8) + e.id * 8;
        const v = this.avoidObstacles(e, Math.cos(angle), Math.sin(angle), e.speed);
        e.facingX = v.x; e.facingY = v.y;
        this.moveEnemy(e, v.x * e.speed * dt, v.y * e.speed * dt, true);
        if (e.frenzyClock > 1.3 + (e.id % 1)) {
          e.frenzyClock = 0; e.windup = e.telegraph; e.windupMax = e.windup;
          e.attackX = e.x; e.attackY = e.y;
          e.chargeFor = e.chargeDuration || 0;
          e.aimX = e.x + e.facingX * (e.chargeSpeed || 60) * (e.chargeDuration || .3);
          e.aimY = e.y + e.facingY * (e.chargeSpeed || 60) * (e.chargeDuration || .3);
        }
      }
      this.updateHostileSnowballs(dt);
      this.hazards = this.hazards.filter(h => {
        h.delay = Math.max(0, h.delay - dt);
        if (h.delay === 0) { h.life = Math.max(0, h.life - dt); h.radius = h.startRadius + (h.maxRadius - h.startRadius) * (1 - h.life / h.maxLife); }
        return h.life > 0;
      });
    }

    updateEnemies(dt) {
      if (this.phase === 'winning') return;
      const p = this.player;
      const awareness = this.enemyAwarenessRadius();
      const attackCandidates = this.prepareAttackCandidates(dt);
      for (const e of this.enemies) {
        if (e.hp <= 0) continue;
        e.age += dt;
        e.cooldown = Math.max(0, e.cooldown - dt);
        e.stun = Math.max(0, e.stun - dt);
        e.spin = Math.max(0, (e.spin || 0) - dt);
        e.crash = Math.max(0, (e.crash || 0) - dt);
        e.investigate = Math.max(0, (e.investigate || 0) - dt);
        if (e.kind === 'snowbird') e.flockAge = (e.flockAge || 0) + dt;
        e.recovery = Math.max(0, (e.recovery || 0) - dt);
        e.stomp = Math.max(0, (e.stomp || 0) - dt);
        if (e.kind === 'burrower') { this.updateBurrower(e, dt, false, attackCandidates); continue; }
        this.tripPeel(e);
        if (e.stun > 0 || e.bowled > 0) continue;
        const dx = p.x - e.x, dy = p.y - e.y, d = Math.hypot(dx, dy);
        if (e.charge > 0) {
          const chargeBefore = e.charge;
          e.charge = Math.max(0, e.charge - dt);
          const stopped = this.moveCharge(e, e.facingX * e.chargeSpeed * Math.min(dt, chargeBefore), e.facingY * e.chargeSpeed * Math.min(dt, chargeBefore));
          if (this.phase !== 'run') return;
          if (stopped) continue;
          if (e.charge === 0) e.recovery = e.recoveryDuration || ENCOUNTER_DEFS.slideRecovery;
          continue;
        }
        if (e.windup > 0) {
          e.windup = Math.max(0, e.windup - dt);
          if (e.windup === 0) {
            e.cooldown = (e.kind === 'chick' ? .7 : 1.2) * (1 - this.encounterPressure * .3);
            if (e.attack === 'stomp') {
              this.resolveStomp(e);
              if (this.phase !== 'run') return;
            } else if (!e.chargeSpeed && d < p.radius + e.radius + 12 && this.lineUnblocked(e, p)) {
              if (this.damagePlayer(e.damage, { kind: e.kind, attack: e.attack || 'peck' }) && this.phase !== 'run') return;
            }
            if (e.chargeSpeed && e.attack !== 'stomp') { e.charge = e.chargeFor > 0 ? e.chargeFor : e.chargeDuration; this.events.push({ type: 'charge', kind: e.kind }); }
          }
          continue;
        }
        if (e.recovery > 0) continue;
        if (this.hasAttackTurn(e, attackCandidates, dt)) {
          e.facingX = dx / (d || 1); e.facingY = dy / (d || 1);
          e.attackX = e.x; e.attackY = e.y;
          if (e.chargeSpeed && e.attack !== 'stomp') this.prepareCharge(e);
          e.windup = e.kind === 'snowbird' ? e.telegraph : e.telegraph * (1 - this.encounterPressure * .15); e.windupMax = e.windup;
          this.attackTickets.delete(e);
          continue;
        }
        const investigating = e.investigate > 0;
        const ix = (e.investigateX || 0) - e.x, iy = (e.investigateY || 0) - e.y, id = Math.hypot(ix, iy) || 1;
        let mx = investigating ? ix / id : d < awareness ? dx / (d || 1) : Math.cos(e.age * .3 + e.id);
        let my = investigating ? iy / id : d < awareness ? dy / (d || 1) : Math.sin(e.age * .3 + e.id);
        if (!investigating && e.kind === 'snowbird' && d < awareness) {
          const cycle = (e.flockAge + (e.flockIndex || 0) * SNOWBIRD_DEFS.stagger) % SNOWBIRD_DEFS.cycle;
          const radius = cycle < SNOWBIRD_DEFS.diveWindow ? SNOWBIRD_DEFS.diveRadius : SNOWBIRD_DEFS.orbitRadius;
          const angle = (e.orbitPhase || 0) + e.flockAge * SNOWBIRD_DEFS.orbitAngularSpeed * (e.circleSide || 1);
          mx = p.x + Math.cos(angle) * radius - e.x; my = p.y + Math.sin(angle) * radius - e.y;
          const length = Math.hypot(mx, my) || 1; mx /= length; my /= length;
        }
        if (!investigating && e.kind !== 'snowbird' && d < awareness && d > e.attackRange * 1.3 && e.flankSide) {
          const flank = e.flankSide * (e.kind === 'penguin' ? .65 : .45);
          mx += -dy / (d || 1) * flank; my += dx / (d || 1) * flank;
        }
        // A small separation force keeps the silly mob from stacking into one hitbox.
        for (const other of this.enemies) {
          const gap = distance(e, other);
          if (other !== e && gap > 0 && gap < e.radius + other.radius + 5) { mx += (e.x - other.x) / gap * .8; my += (e.y - other.y) / gap * .8; }
        }
        const magnitude = Math.hypot(mx, my) || 1; mx /= magnitude; my /= magnitude;
        const pace = e.speed * (1 + this.encounterPressure * .22);
        const vector = this.avoidObstacles(e, mx, my, pace);
        e.facingX = vector.x; e.facingY = vector.y;
        this.moveEnemy(e, vector.x * pace * dt, vector.y * pace * dt);
      }
      this.enemies = this.enemies.filter(e => e.hp > 0);
      const living = new Set(this.enemies);
      for (const e of this.attackTickets.keys()) if (!living.has(e) || !this.readyToAttack(e)) this.attackTickets.delete(e);
    }

    moveEnemy(e, mx, my, cosmetic = false) {
      if (this.phase === 'winning') return;
      if (e.kind === 'burrower' && e.hp > 0) return;
      const steps = Math.max(1, Math.ceil(Math.max(Math.abs(mx), Math.abs(my)) / 2));
      for (let i = 0; i < steps; i++) {
        if (!this.isBlocked(e.x + mx / steps, e.y, e.radius)) e.x += mx / steps;
        if (!this.isBlocked(e.x, e.y + my / steps, e.radius)) e.y += my / steps;
        if (!cosmetic && this.tripPeel(e)) break;
      }
    }

    impact(x, y, kind, chain = 0) {
      if (this.phase === 'winning') return;
      this.impacts.push({ x, y, kind, chain, life: .4, maxLife: .4 });
    }

    moveCharge(e, mx, my) {
      if (this.phase === 'winning') return;
      const steps = Math.max(1, Math.ceil(Math.hypot(mx, my) / 2));
      for (let i = 0; i < steps; i++) {
        const x = e.x + mx / steps, y = e.y + my / steps;
        const hit = this.blockerAt(x, y, e.radius);
        if (hit) {
          if (hit.kind === 'chest') this.breakChest(hit.object, 'charge');
          if (hit.kind === 'rock') this.hitRock(hit.object, 1, 'charge', mx, my);
          if (hit.kind === 'scenery') this.hitScenery(hit.object, 1, 'charge');
          e.charge = 0; e.windup = 0;
          e.stun = SLAPSTICK_DEFS.crashStun; e.crash = .65; e.spin = .42;
          e.cooldown = Math.max(e.cooldown, 1);
          this.impact(x, y, 'crash');
          this.events.push({ type: 'crash', kind: e.kind, target: hit.kind, x, y });
          return true;
        }
        e.x = x; e.y = y;
        if (this.tripPeel(e)) return true;
        if (distance(e, this.player) < this.player.radius + e.radius + ENCOUNTER_DEFS.chargeHitPadding) {
          const attack = e.kind === 'snowbird' ? 'swoop' : e.kind === 'penguin' ? 'slide' : 'charge';
          if (this.damagePlayer(e.damage, { kind: e.kind, attack }) && this.phase !== 'run') return true;
        }
      }
      return false;
    }

    hitEnemy(enemy, damage, dx, dy, source = 'pan', depth = 0, hits) {
      if (this.phase === 'summary' || this.phase === 'winning' || this.phase === 'dying') return false;
      if (enemy.hp <= 0) return false;
      const length = Math.hypot(dx, dy) || 1;
      const ux = dx / length || (!dy ? this.player.facingX : 0), uy = dy / length || (!dx ? this.player.facingY : 0);
      enemy.hp -= damage;
      enemy.stun = .46; enemy.windup = 0; enemy.charge = 0; enemy.spin = .42; enemy.crash = 0;
      enemy.recovery = 0; enemy.stomp = 0;
      this.hazards = this.hazards.filter(hazard => hazard.ownerId !== enemy.id);
      if (source === 'pan') this.moveEnemy(enemy, ux * 10, uy * 10);
      const launching = depth <= SLAPSTICK_DEFS.maxDepth;
      enemy.bowled = launching && (enemy.kind !== 'burrower' || enemy.hp <= 0) ? SLAPSTICK_DEFS.duration * (this.player.buffs.jelly > 0 ? POWERUP_DEFS.jelly.bowlDurationScale : 1) : 0;
      const speed = SLAPSTICK_DEFS.speed * (this.player.golden ? TOY_DEFS.goldenSpeed : 1);
      enemy.bowlVx = ux * speed; enemy.bowlVy = uy * speed;
      enemy.bowlDepth = depth; enemy.bowlHitCount = 0;
      enemy.bounceReady = this.player.buffs.jelly > 0; enemy.bounceUsed = false;
      // The chain shares object identities, preventing a receiver from bonking
      // its own launcher back. Fixture IDs need not be unique.
      enemy.bowlHits = hits || new Set(); enemy.bowlHits.add(enemy);
      this.events.push({ type: 'bonk', kind: enemy.kind, source, x: enemy.x, y: enemy.y });
      if (enemy.bowled > 0) this.events.push({ type: 'launch', kind: enemy.kind, x: enemy.x, y: enemy.y, depth, lethal: enemy.hp <= 0 });
      if (enemy.hp <= 0) {
        this.kills++;
        this.dropCoins(enemy.x, enemy.y, enemy.gold);
        if (this.random() < DROP_RATES.enemy) this.spawnPowerup(enemy.x, enemy.y);
        const goof = { kind: enemy.kind, radius: enemy.radius, x: enemy.x, y: enemy.y, vx: launching ? 0 : ux * 45, vy: launching ? 0 : uy * 45, life: Math.max(.65, enemy.bowled + .27), maxLife: Math.max(.65, enemy.bowled + .27), spin: Math.atan2(uy, ux), bowled: enemy.bowled, bowlVx: enemy.bowlVx, bowlVy: enemy.bowlVy, bowlDepth: depth, bowlHitCount: 0, bowlHits: enemy.bowlHits, bounceReady: enemy.bounceReady, bounceUsed: false };
        goof.bowlHits.add(goof); this.goofs.push(goof); enemy.bowled = 0;
        this.events.push({ type: 'knockout', kind: enemy.kind, source });
        this.popups.push({ x: enemy.x, y: enemy.y - 15, life: .6, text: '!' });
      }
      return true;
    }

    stopBowler(body) {
      if (this.phase === 'winning') return;
      body.bowled = 0; body.bowlVx = 0; body.bowlVy = 0;
      if (body.maxLife) { body.vx = 0; body.vy = 0; }
    }

    bounceBowler(body, x, y) {
      if (this.phase === 'winning') return;
      if (!body.bounceReady || body.bounceUsed) return false;
      const axisX = this.blockerAt(x, body.y, body.radius, false, body.kind === 'snowball');
      const axisY = this.blockerAt(body.x, y, body.radius, false, body.kind === 'snowball');
      let flipX = axisX?.kind === 'terrain', flipY = axisY?.kind === 'terrain';
      if (!flipX && !flipY) flipX = flipY = true;
      body.bowlVx *= (flipX ? -1 : 1) * TOY_DEFS.bounceSpeed;
      body.bowlVy *= (flipY ? -1 : 1) * TOY_DEFS.bounceSpeed;
      body.bounceReady = false; body.bounceUsed = true;
      this.impact(body.x, body.y, 'bounce', body.bowlDepth);
      this.events.push({ type: 'bounce', kind: body.kind, x: body.x, y: body.y });
      return true;
    }

    updateBowls(dt) {
      if (this.phase === 'winning') return;
      const bodies = [...this.enemies.filter(e => e.hp > 0), ...this.goofs, ...this.snowballs];
      for (const body of bodies) {
        if (!(body.bowled > 0)) continue;
        const motion = Math.min(dt, body.bowled);
        const remaining = Math.max(0, body.bowled - dt);
        const maxHits = body.kind === 'snowball' ? TOY_DEFS.snowballHits : SLAPSTICK_DEFS.maxHits;
        const source = body.kind === 'snowball' ? 'snowball' : 'bowl';
        const steps = Math.max(1, Math.ceil(Math.hypot(body.bowlVx, body.bowlVy) * motion / 2));
        for (let i = 0; i < steps; i++) {
          const vx = body.bowlVx, vy = body.bowlVy;
          const x = body.x + vx * motion / steps, y = body.y + vy * motion / steps;
          const hit = this.blockerAt(x, y, body.radius, false, body.kind === 'snowball');
          if (hit && hit.kind !== 'terrain' && !body.bowlHits.has(hit.object)) {
            body.bowlHits.add(hit.object); body.bowlHitCount++;
            if (hit.kind === 'chest') this.breakChest(hit.object, source);
            else if (hit.kind === 'rock') this.hitRock(hit.object, SLAPSTICK_DEFS.damage, source, vx, vy, body.bowlHits.snowballOrigin);
            else if (hit.kind === 'scenery') this.hitScenery(hit.object, SLAPSTICK_DEFS.damage, source);
            this.events.push({ type: 'bowl', kind: body.kind, target: hit.kind, x, y, depth: body.bowlDepth });
            this.impact(x, y, 'bowl', body.bowlDepth);
          }
          if (hit?.kind === 'terrain' && this.bounceBowler(body, x, y)) continue;
          if (this.isBlocked(x, y, body.radius, false, body.kind === 'snowball') || body.bowlHitCount >= maxHits) {
            this.impact(body.x, body.y, 'crash', body.bowlDepth); this.stopBowler(body); break;
          }
          body.x = x; body.y = y;
          for (const other of this.enemies) {
            if (other === body || other.hp <= 0 || body.bowlHits.has(other) || distance(body, other) > body.radius + other.radius + 1) continue;
            body.bowlHits.add(other); body.bowlHitCount++;
            this.hitEnemy(other, SLAPSTICK_DEFS.damage, vx, vy, source, body.bowlDepth + 1, body.bowlHits);
            this.events.push({ type: 'bowl', kind: body.kind, target: 'enemy', x: other.x, y: other.y, depth: body.bowlDepth });
            this.impact(other.x, other.y, 'bowl', body.bowlDepth);
            if (body.bowlHitCount >= maxHits) { this.stopBowler(body); break; }
          }
          if (!(body.bowled > 0)) break;
        }
        if (body.bowled > 0) body.bowled = remaining;
        if (!(body.bowled > 0)) this.stopBowler(body);
      }
    }

    move(dx, dy, dt) {
      if (this.phase === 'summary' || this.phase === 'winning' || this.phase === 'dying') return;
      const p = this.player;
      p.velocityX = 0; p.velocityY = 0;
      if (!Number.isFinite(dt) || dt <= 0) return;
      const beforeX = p.x, beforeY = p.y;
      const length = Math.hypot(dx, dy);
      p.moving = length > 0;
      if (!length) return;
      dx /= length; dy /= length;
      p.facingX = dx; p.facingY = dy;
      p.walk += dt * 10;
      const speed = this.movementSpeed() * Math.min(length, 1);
      const steps = Math.max(1, Math.ceil(speed * dt / 3));
      for (let i = 0; i < steps; i++) {
        const mx = dx * speed * dt / steps, my = dy * speed * dt / steps;
        if (!this.isBlocked(p.x + mx, p.y)) p.x += mx;
        if (!this.isBlocked(p.x, p.y + my)) p.y += my;
        if (this.phase === 'shop' && p.y >= SHOP.exitY && p.x > SHOP.doorLeft && p.x < SHOP.doorRight) this.startRun();
      }
      p.velocityX = (p.x - beforeX) / dt; p.velocityY = (p.y - beforeY) / dt;
    }

    updatePeels(dt, moved, movingDt = dt) {
      this.peels = this.peels.filter(peel => { peel.life -= dt; return peel.life > 0; });
      if (this.phase !== 'run' || this.player.gadget !== 'banana' || this.player.buffs.speed <= 0 || !moved || this.peelsMade >= TOY_DEFS.peelsPerBuff) return;
      this.peelMoving += movingDt;
      if (this.peelMoving < TOY_DEFS.peelEvery || this.peels.length >= TOY_DEFS.peelMax) return;
      this.peelMoving -= TOY_DEFS.peelEvery;
      this.peelsMade++;
      this.peels.push({ x: this.player.x, y: this.player.y, life: TOY_DEFS.peelLife, maxLife: TOY_DEFS.peelLife, radius: 6 });
      this.events.push({ type: 'peel', x: this.player.x, y: this.player.y });
    }

    tripPeel(enemy) {
      if (this.phase === 'winning') return;
      if (enemy.hp <= 0 || enemy.stun > 0 || enemy.bowled > 0) return false;
      const index = this.peels.findIndex(peel => distance(peel, enemy) <= enemy.radius + peel.radius);
      if (index < 0) return false;
      this.peels.splice(index, 1);
      this.hitEnemy(enemy, 0, enemy.facingX, enemy.facingY, 'peel');
      this.impact(enemy.x, enemy.y, 'slip');
      this.events.push({ type: 'slip', kind: enemy.kind, x: enemy.x, y: enemy.y });
      return true;
    }

    coinAttractionRadius() { return this.player.gadget === 'greedy' ? TOY_DEFS.greedyRadius : PICKUP_RADIUS; }

    enemyAwarenessRadius() { return this.player.gadget === 'greedy' && this.coins.some(coin => coin.pulling) ? TOY_DEFS.greedyAwareness : TOY_DEFS.awareness; }

    contactPanEnemies() {
      const p = this.player, strike = this.panStrike;
      if (this.phase !== 'run' || !p.alive || p.swing <= 0 || !strike || strike.serial !== p.swingSerial) return;
      // Active contact follows movement-facing; keep the existing art heading aligned.
      const finiteFacing = Number.isFinite(p.facingX) && Number.isFinite(p.facingY) && Math.hypot(p.facingX, p.facingY) > 0;
      p.swingFacingX = finiteFacing ? p.facingX : null; p.swingFacingY = finiteFacing ? p.facingY : null;
      for (const enemy of this.enemies) {
        if (enemy.hp <= 0 || strike.hits.has(enemy) || !panTargetHit(p, enemy, 'enemy')) continue;
        strike.hits.add(enemy); // Own the hit before damage/launch/reward callbacks.
        this.hitEnemy(enemy, strike.damage, enemy.x - p.x, enemy.y - p.y);
      }
    }

    swing(stepSeconds = 0) {
      if (this.phase === 'summary' || this.phase === 'winning' || this.phase === 'dying') return false;
      const p = this.player;
      if (p.cooldown > 0) return false;
      const timing = this.swingTiming();
      p.swing = timing.duration; p.swingDuration = timing.duration;
      p.cooldown = Math.max(0, timing.cooldown + Math.min(0, p.cooldown));
      p.swingRecovery = p.cooldown; p.swingStepSeconds = stepSeconds;
      // Initial art heading; live active contact refreshes it after movement.
      const finiteFacing = Number.isFinite(p.facingX) && Number.isFinite(p.facingY) && Math.hypot(p.facingX, p.facingY) > 0;
      p.swingFacingX = finiteFacing ? p.facingX : null; p.swingFacingY = finiteFacing ? p.facingY : null;
      p.swingSerial = (p.swingSerial || 0) + 1;
      p.swingCadence = timing.cooldown; // Presentation-only cadence captured at strike.
      this.events.push({ type: 'swing' });
      this.panStrike = this.phase === 'run' ? { serial: p.swingSerial, hits: new Set(), damage: (1 + this.upgrades.pan) * (p.buffs.frenzy > 0 ? POWERUP_DEFS.frenzy.damageScale : 1) } : null;
      if (this.phase !== 'run') return true;
      for (const chest of this.chests) {
        if (chest.open) continue;
        const dx = chest.x - p.x, dy = chest.y - p.y, d = Math.hypot(dx, dy);
        if (!panTargetHit(p, chest, 'chest')) continue;
        this.breakChest(chest);
      }
      this.contactPanEnemies();
      for (const rock of this.obstacles) {
        if ((rock.kind !== 'rock' && !rock.breakable) || rock.broken) continue;
        const dx = rock.x - p.x, dy = rock.y - p.y, d = Math.hypot(dx, dy);
        if (!panTargetHit(p, rock, 'obstacle')) continue;
        const damage = (1 + this.upgrades.pan) * (p.buffs.frenzy > 0 ? POWERUP_DEFS.frenzy.damageScale : 1);
        if (rock.kind === 'rock') this.hitRock(rock, damage, 'pan', dx, dy);
        else this.hitScenery(rock, damage, 'pan');
      }
      return true;
    }

    hitRock(rock, damage, source, dx = this.player.facingX, dy = this.player.facingY, suppressSnowball = false) {
      if (rock.kind !== 'rock') return this.hitScenery(rock, damage, source);
      if (this.phase === 'summary' || this.phase === 'winning' || this.phase === 'dying' || rock.broken) return;
      rock.hp -= damage;
      this.events.push({ type: 'rockHit', x: rock.x, y: rock.y, source });
      if (rock.hp > 0) return;
      rock.broken = true;
      this.dropCoins(rock.x, rock.y, rock.gold || 2);
      if (this.random() < DROP_RATES.rock) this.spawnPowerup(rock.x, rock.y);
      if (this.player.gadget === 'rocky' && source !== 'snowball' && !suppressSnowball) {
        const length = Math.hypot(dx, dy) || 1;
        const ux = dx / length, uy = dy / length;
        const speed = TOY_DEFS.snowballSpeed * (this.player.golden ? TOY_DEFS.goldenSpeed : 1);
        const hits = new Set([rock]); hits.snowballOrigin = true;
        const snowball = { kind: 'snowball', x: rock.x, y: rock.y, radius: 4, life: TOY_DEFS.snowballLife, maxLife: TOY_DEFS.snowballLife, bowled: TOY_DEFS.snowballLife, bowlVx: ux * speed, bowlVy: uy * speed, bowlDepth: 0, bowlHits: hits, bowlHitCount: 0, bounceReady: this.player.buffs.jelly > 0, bounceUsed: false, vx: 0, vy: 0 };
        this.snowballs.push(snowball);
        for (const enemy of this.enemies) {
          if (enemy.hp <= 0 || enemy.windup > 0 || enemy.charge > 0 || distance(enemy, rock) > 180) continue;
          enemy.investigate = TOY_DEFS.investigate; enemy.investigateX = rock.x; enemy.investigateY = rock.y;
        }
        this.events.push({ type: 'snowball', x: rock.x, y: rock.y });
        this.impact(rock.x, rock.y, 'snowball');
      }
      this.events.push({ type: 'rock', x: rock.x, y: rock.y, source });
      for (let i = 0; i < 12; i++) this.particles.push({ x: rock.x, y: rock.y, vx: (this.random() - .5) * 90, vy: (this.random() - .5) * 90, life: .45, color: i % 2 ? '#b5cdd4' : '#819cab', size: 2 });
    }

    hitScenery(scenery, damage, source = 'pan') {
      if (this.phase === 'dying' || this.phase === 'winning' || this.phase === 'summary') return false;
      if (!scenery.breakable || scenery.broken || scenery.solid === false) return false;
      scenery.hp -= damage;
      this.events.push({ type: 'sceneryHit', material: scenery.kind, x: scenery.x, y: scenery.y, source });
      if (scenery.hp > 0) return true;
      scenery.broken = true;
      this.events.push({ type: 'scenery', material: scenery.kind, x: scenery.x, y: scenery.y, source });
      this.impact(scenery.x, scenery.y, 'snow');
      for (let i = 0; i < 10; i++) this.particles.push({ x: scenery.x, y: scenery.y, vx: (this.random() - .5) * 90, vy: (this.random() - .5) * 90, life: .45, color: i % 2 ? '#ffffff' : '#bce5e9', size: 2 });
      return true;
    }

    dropCoins(x, y, count, metadata = {}) {
      if (this.phase === 'dying' || this.phase === 'winning' || this.phase === 'summary') return;
      for (let i = 0; i < count; i++) {
        const angle = i / count * Math.PI * 2 + this.random() * .4;
        const offset = 9 + this.random() * 8;
        let cx = x + Math.cos(angle) * offset, cy = y + Math.sin(angle) * offset;
        if (this.isBlocked(cx, cy, 4, true)) { cx = x; cy = y; }
        this.coins.push({ x: cx, y: cy, age: 0, delay: .12 + i * .012, value: metadata.value || 1, originChestId: metadata.originChestId, bonus: Boolean(metadata.bonus), phase: this.random() * Math.PI * 2, pulling: false, pullAge: 0, pullVx: 0, pullVy: 0 });
      }
    }

    spawnPowerup(x, y, kind) {
      if (this.phase === 'dying' || this.phase === 'winning' || this.phase === 'summary') return null;
      if (this.powerups.length >= 5) return null;
      if (kind === undefined) kind = this.market.progress.completedOutings >= 2 && this.random() < DROP_RATES.jelly ? 'jelly' : this.random() < .5 ? 'speed' : 'frenzy';
      if (typeof kind !== 'string' || !Object.hasOwn(POWERUP_DEFS, kind)) return null;
      const item = { x, y, kind, age: 0, delay: .2 };
      this.powerups.push(item);
      return item;
    }

    collectPowerup(item) {
      if (this.phase !== 'run' || typeof item?.kind !== 'string' || !Object.hasOwn(POWERUP_DEFS, item.kind)) return false;
      const p = this.player, def = POWERUP_DEFS[item.kind];
      const wasActive = p.buffs[item.kind] > 0;
      p.buffs[item.kind] = def.duration;
      if (item.kind === 'frenzy' && !wasActive) {
        p.cooldown *= def.cooldownScale;
        // A fresh frenzy can end the current swing before its old cosmetic
        // deadline. Follow the shortened recovery without changing motion life.
        if (p.swing > 0 && p.swingDuration > 0) {
          const age = Math.max(0, p.swingDuration - p.swing);
          p.swingRecovery = Math.min(p.swingRecovery ?? p.swingCadence ?? p.swingDuration, age + Math.max(0, p.cooldown));
        }
      }
      p.activation = { kind: item.kind, life: POWERUP_FEEDBACK.onsetLife, maxLife: POWERUP_FEEDBACK.onsetLife };
      p.activations = [...(p.activations || []).filter(record => record.kind !== item.kind), p.activation].slice(-POWERUP_FEEDBACK.maxOnsets);
      p.expiries = (p.expiries || []).filter(record => record.kind !== item.kind);
      if (item.kind === 'speed' && !wasActive) { this.peelMoving = 0; this.peelsMade = 0; }
      this.events.push({ type: 'powerup', kind: item.kind, label: def.label });
      this.popups.push({ kind: 'powerup', powerupKind: item.kind, x: p.x, y: p.y - 20, life: 1, text: item.kind === 'speed' ? `${def.multiplier}X!` : item.kind === 'frenzy' ? '5X!' : '4X!' });
      return true;
    }

    breakChest(chest, source = 'pan') {
      if (this.phase === 'summary' || this.phase === 'winning' || this.phase === 'dying' || chest.open) return;
      chest.open = true;
      this.chestsOpened++;
      this.events.push({ type: 'chest', x: chest.x, y: chest.y, source });
      const count = (chest.variant === 2 ? 8 : 4) + Math.floor(this.random() * 3);
      this.dropCoins(chest.x, chest.y, count, { originChestId: chest.id });
      if (this.chestsOpened === 1 || this.random() < (chest.variant === 2 ? DROP_RATES.party : DROP_RATES.chest)) this.spawnPowerup(chest.x, chest.y, this.chestsOpened === 1 ? 'speed' : undefined);
      for (let i = 0; i < 15; i++) {
        const angle = this.random() * Math.PI * 2, speed = 18 + this.random() * 65;
        this.particles.push({ x: chest.x, y: chest.y - 7, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 25, life: 0.35 + this.random() * 0.25, maxLife: 0.6, color: i % 3 === 0 ? '#f7df99' : i % 2 === 0 ? '#b58062' : '#725340', size: i % 3 === 0 ? 2 : 3 });
      }
    }

    collectCoin(coin) {
      if (this.phase === 'summary' || this.phase === 'winning' || this.phase === 'dying') return;
      // Saved balance may be lower after another tab purchased an upgrade.
      this.syncSavedProgress();
      this.gold = Math.min(Number.MAX_SAFE_INTEGER, this.gold + coin.value);
      this.runGold += coin.value;
      this.market.progress.lifetimeGold = Math.min(Number.MAX_SAFE_INTEGER, this.market.progress.lifetimeGold + coin.value);
      this.saveState();
      this.popups.push({ x: coin.x, y: coin.y - 12, life: 0.8, text: '+' + coin.value });
      this.events.push({ type: 'coin', value: coin.value });
      this.stampContract(coin);
    }

    updateCoins(dt) {
      if (this.phase === 'dying' || this.phase === 'winning' || this.phase === 'summary') return;
      // A completed contract may add bonus coins during arrivals. Detach this
      // batch so those physical rewards survive and start flying next step.
      const coins = this.coins;
      this.coins = [];
      const survivors = coins.filter(coin => {
        coin.age += dt;
        if (coin.age < coin.delay) return true;
        let gap = distance(coin, this.player);
        if (!coin.pulling && gap <= this.coinAttractionRadius()) { coin.pulling = true; coin.pullAge = 0; }
        if (!coin.pulling) return true;
        // Latch once in range. Gold flies over scenery and can catch even a
        // sock-buffed penguin, but earnings are saved only at actual arrival.
        coin.pullAge = (coin.pullAge || 0) + dt;
        if (gap <= COIN_CONTACT_RADIUS) { this.collectCoin(coin); return false; }
        const speed = 24 + 156 * Math.min(1, coin.pullAge / .45);
        coin.pullVx = (this.player.x - coin.x) / gap * speed;
        coin.pullVy = (this.player.y - coin.y) / gap * speed;
        const travel = Math.min(speed * dt, gap);
        coin.x += coin.pullVx / speed * travel; coin.y += coin.pullVy / speed * travel;
        if (distance(coin, this.player) <= COIN_CONTACT_RADIUS) { this.collectCoin(coin); return false; }
        return true;
      });
      this.coins = survivors.concat(this.coins);
    }

    step(dt, input = {}) {
      if (!Number.isFinite(dt) || dt <= 0) return;
      const freshInteract = input.interact === true && !this.interactHeld;
      this.interactHeld = input.interact === true;
      if (this.phase === 'summary') {
        const ready = this.summaryAge + 1e-9 >= SUMMARY_LOCK;
        const fresh = input.continue === true && !this.continueHeld;
        this.continueHeld = input.continue === true;
        this.summaryAge += dt;
        if (ready && fresh) { this.continueSummary(); return; }
        if (this.summary.reason === 'death') this.updateAftermath(Math.min(dt, ENEMY_MOTION_MAX_DT));
        return;
      }
      if (this.phase === 'winning') {
        this.continueHeld = input.continue === true;
        this.victoryAge = Math.min(VICTORY_FLOURISH.duration, this.victoryAge + dt);
        this.victoryFreeze = Math.max(0, VICTORY_FLOURISH.duration - this.victoryAge);
        if (this.victoryFreeze <= 1e-9) this.revealSummary();
        return;
      }
      if (this.phase === 'dying') {
        this.continueHeld = input.continue === true;
        this.deathAge = Math.min(DEATH_FLOURISH.duration, this.deathAge + dt);
        this.deathFreeze = Math.max(0, DEATH_FLOURISH.duration - this.deathAge);
        if (this.deathFreeze <= 1e-9) this.revealSummary();
        return;
      }
      this.continueHeld = input.continue === true;
      this.elapsed += dt;
      if (!this.player.alive) { this.die(); return; }
      if (this.phase === 'run') {
        const previousWaveInterval = waveInterval(RUN_SECONDS - this.remaining);
        this.remaining = Math.max(0, this.remaining - dt);
        // Preserve progress toward the next wave when a milestone speeds it up.
        this.waveIn *= waveInterval(RUN_SECONDS - this.remaining) / previousWaveInterval;
        this.scaleRemaining -= dt;
        if (this.remaining <= 1e-9) {
          this.remaining = 0; this.scaleRemaining = ENCOUNTER_RAMP_SECONDS - RUN_SECONDS;
          this.encounterPressure = RUN_SECONDS / ENCOUNTER_RAMP_SECONDS; this.difficulty = 1;
          this.reset('timeout'); return;
        }
        this.encounterPressure = clamp(1 - this.scaleRemaining / ENCOUNTER_RAMP_SECONDS, 0, RUN_SECONDS / ENCOUNTER_RAMP_SECONDS);
        this.difficulty = Math.min(1, this.encounterPressure);
        if (this.contract?.active) {
          this.contract.remaining = Math.max(0, this.contract.remaining - dt);
          if (this.contract.remaining === 0) this.expireContract();
        }
      }
      // Time advances in full; movement is capped after background-tab suspension.
      const motionDt = Math.min(dt, ENEMY_MOTION_MAX_DT);
      const p = this.player;
      p.swing = Math.max(0, p.swing - dt);
      if (p.swing === 0) this.panStrike = null;
      p.cooldown = Math.max(this.upgrades.swing > 0 ? -Math.min(dt, .05) : 0, p.cooldown - dt);
      p.invulnerable = Math.max(0, p.invulnerable - dt);
      p.hurtFlash = Math.max(0, p.hurtFlash - dt);
      const previousEffects = { ...p.buffs };
      p.activations = (p.activations || (p.activation ? [p.activation] : [])).filter(record => { record.life = Math.max(0, record.life - dt); return record.life > 0; });
      p.activation = p.activations.at(-1) || null;
      p.expiries = (p.expiries || []).filter(record => { record.life = Math.max(0, record.life - dt); return record.life > 0; });
      p.honk = Math.max(0, (p.honk || 0) - dt);
      for (const id of ['speed', 'frenzy', 'jelly']) p.buffs[id] = Math.max(0, (p.buffs[id] || 0) - dt);
      if (this.phase === 'run') for (const kind of ['speed', 'frenzy', 'jelly']) {
        const remaining = p.buffs[kind];
        if (previousEffects[kind] > 0 && remaining === 0) {
          p.expiries = [...p.expiries.filter(record => record.kind !== kind), { kind, life: POWERUP_FEEDBACK.endedLife, maxLife: POWERUP_FEEDBACK.endedLife }].slice(-POWERUP_FEEDBACK.maxExpiries);
          this.events.push({ type: 'powerupExpired', kind, label: POWERUP_DEFS[kind].label });
        }
      }
      if (input.useSupply) this.useSupply();
      const before = { x: p.x, y: p.y };
      this.move(clamp(input.x || 0, -1, 1), clamp(input.y || 0, -1, 1), motionDt);
      this.updatePeels(dt, distance(before, p) > .001, motionDt);
      // The pan handles the bonking; keyboard and joypad are only for movement.
      this.swing(dt);
      this.contactPanEnemies();
      this.updateShopTarget();
      if (freshInteract) { const offer = this.nearbyShop(); if (offer) this.buyUpgrade(offer.id); }
      if (this.phase === 'run') {
        this.updateBowls(motionDt);
        this.updateHazards(motionDt);
        if (this.phase !== 'run') return;
        this.waveIn -= dt;
        if (this.waveIn <= 0) {
          this.waveNumber++;
          const kind = ['chick', 'penguin', 'bear'][this.waveNumber % 3];
          const spawnPressure = Math.min(1, this.encounterPressure);
          const count = ENCOUNTER_DEFS.waveCountBase + Math.round(spawnPressure * (ENCOUNTER_DEFS.waveCountLate - ENCOUNTER_DEFS.waveCountBase));
          const before = this.enemies.filter(e => e.hp > 0).length;
          const flockSize = clamp(SNOWBIRD_DEFS.groupMin + Math.round(this.encounterPressure * (SNOWBIRD_DEFS.groupMax - SNOWBIRD_DEFS.groupMin)), SNOWBIRD_DEFS.groupMin, SNOWBIRD_DEFS.groupMax);
          const flockRoom = ENCOUNTER_DEFS.cap - before - 3;
          const flock = this.waveNumber % ENCOUNTER_DEFS.flockEvery === 0 && flockRoom >= SNOWBIRD_DEFS.groupMin ? this.spawnSnowbirdGroup(Math.min(flockSize, count - 3, flockRoom), { aroundPlayer: true }) : [];
          this.spawnEnemies(count - flock.length, Array.from({ length: count }, (_, i) => i % 3 === 0 ? 'burrower' : ['chick', 'penguin', 'bear'][(i - Math.floor(i / 3) - 1 + this.waveNumber) % 3]), { aroundPlayer: true });
          this.waveIn = waveInterval(RUN_SECONDS - this.remaining);
          this.events.push({ type: 'wave', kind: flock.length ? 'snowbird' : kind, count, spawned: this.enemies.filter(e => e.hp > 0).length - before, flockCount: flock.length, label: flock.length ? 'SNOWBIRD SNACK RAID!' : kind === 'chick' ? 'DAYCARE ESCAPE!' : kind === 'penguin' ? 'PENGUIN UNION BREAK!' : 'BEAR PAJAMA PARTY!' });
        }
        this.updateHostileSnowballs(motionDt);
        if (this.phase !== 'run') return;
        this.updateEnemies(motionDt);
        if (this.phase !== 'run') return;
        this.contactPanEnemies();
      }
      this.updateCoins(motionDt);
      const honking = this.player.gadget === 'greedy' && this.coins.some(coin => coin.pulling);
      this.player.greedyActive = honking;
      this.honkIn = honking ? Math.max(0, this.honkIn - dt) : 0;
      if (honking && this.honkIn === 0) {
        this.honkIn = .8; p.honk = .35;
        this.events.push({ type: 'honk', x: p.x, y: p.y });
      }
      this.powerups = this.powerups.filter(item => {
        item.age += motionDt;
        if (item.age >= item.delay && distance(item, p) <= PICKUP_RADIUS && this.collectPowerup(item)) return false;
        return true;
      });
      this.particles = this.particles.filter(particle => {
        particle.life -= motionDt;
        particle.x += particle.vx * motionDt;
        particle.y += particle.vy * motionDt;
        particle.vy += 120 * motionDt;
        return particle.life > 0;
      });
      this.popups = this.popups.filter(popup => { popup.life -= motionDt; popup.y -= 12 * motionDt; return popup.life > 0; });
      this.goofs = this.goofs.filter(goof => { goof.life -= motionDt; goof.x += goof.vx * motionDt; goof.y += goof.vy * motionDt; goof.spin += motionDt * 18; return goof.life > 0; });
      this.snowballs = this.snowballs.filter(body => { body.life -= motionDt; return body.life > 0 && body.bowled > 0; });
      this.impacts = this.impacts.filter(impact => { impact.life -= motionDt; return impact.life > 0; });
    }

    drainEvents() {
      return this.events.splice(0);
    }
  }

  return { Game, PAN_GEOMETRY, panTargetHit, DAMAGE_FEEDBACK, ENEMY_MOTION_MAX_DT, SUMMARY_LOCK, DEATH_FLOURISH, VICTORY_FLOURISH, POWERUP_FEEDBACK, BURROWER_DEFS, WORLD, SHOP, SHORE, POND, SCENERY, RUN_SECONDS, ENCOUNTER_RAMP_SECONDS, SPEED, SWING_SECONDS, SWING_COOLDOWN, PICKUP_RADIUS, COIN_CONTACT_RADIUS, SLAPSTICK_DEFS, SAVE_KEY, UPGRADE_SAVE_KEY, MARKET_SAVE_KEY, STATE_SAVE_KEY, SHOP_INTERACTION_RANGE, SHOP_DISPLAYS, SHOP_COLLIDERS, UPGRADE_EFFECTS, UPGRADE_DEFS, LEGACY_UPGRADE_DEFS, SHOP_ITEMS, LEGACY_ITEMS, DROP_RATES, TOY_DEFS, ENCOUNTER_DEFS, SNOWBIRD_DEFS, ENEMY_DEFS, POWERUP_DEFS, seededRandom, inShop, landContains };
});
