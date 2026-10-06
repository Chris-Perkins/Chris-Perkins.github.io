(() => {
  'use strict';
  const { Game, WORLD, SAVE_KEY, UPGRADE_SAVE_KEY, MARKET_SAVE_KEY, STATE_SAVE_KEY, SHOP, POWERUP_DEFS, DEATH_FLOURISH, VICTORY_FLOURISH } = window.FryingPanguin;
  const Art = window.PanguinArt;
  Art.prewarmPowerFeedback?.();
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d', { alpha: false });
  const viewport = document.getElementById('viewport');
  const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
  let reduceMotion = motionPreference.matches;
  let storage = null;
  try { storage = localStorage; } catch { /* Session play works without storage. */ }
  const game = new Game({ storage });
  let terrain = Art.createTerrain(window.FryingPanguin, game.layout);
  let terrainRevision = game.layout?.revision;
  const keys = new Set();
  // Physical identities survive logical movement resets and include non-game keys.
  const physicalKeys = new Set();
  const summaryHeldKeys = new Set();
  const heldPointers = new Set();
  let atmosphereTime = 0;
  let snowViewportWidth = 0, snowViewportHeight = 0, snowCount = 6;
  const snowGeometry = {};
  // Stable identities are analytic; resizing remaps their normalized layout.
  function snowFlake(id, time, out) {
    const u = ((id + .5) * .61803398875) % 1;
    const v = ((id + .5) * .41421356237) % 1;
    const amplitude = 4 + id % 5;
    const rate = .09 + (id % 4) * .01;
    const mean = (id % 2 ? -1 : 1) * (.25 + (id % 3) * .1);
    const phase = id * 2.39996322973;
    const drift = amplitude * (Math.sin(time * rate + phase) - Math.sin(phase)) + time * mean;
    out.id = id; out.u = u; out.v = v;
    out.size = id % 7 === 0 ? 2 : 1; out.speed = 3 + id % 4;
    out.amplitude = amplitude; out.rate = rate; out.mean = mean; out.phase = phase;
    out.x = ((u * canvas.width + drift) % canvas.width + canvas.width) % canvas.width;
    out.y = ((v * canvas.height + time * out.speed) % canvas.height + canvas.height) % canvas.height;
    return out;
  }
  function drawSnow() {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = .45;
    const time = reduceMotion ? 0 : atmosphereTime;
    for (let id = 0; id < snowCount; id++) {
      const flake = snowFlake(id, time, snowGeometry);
      Art.rect(ctx, flake.x, flake.y, flake.size, flake.size, '#f7ffff');
      if (flake.size === 2) Art.rect(ctx, flake.x + 1, flake.y - 1, 1, 1, '#f7ffff');
    }
    ctx.restore();
  }
  function snowState(details = false) {
    const time = reduceMotion ? 0 : atmosphereTime;
    const state = { time: atmosphereTime, effectiveTime: time, count: snowCount, reduced: reduceMotion,
      viewport: { width: snowViewportWidth, height: snowViewportHeight }, width: canvas.width, height: canvas.height };
    if (details) state.flakes = Array.from({ length: snowCount }, (_, id) => snowFlake(id, time, {}));
    return state;
  }
  const stick = { x: 0, y: 0, pointer: null };
  const camera = { x: 480, y: 185 };
  const testParams=new URLSearchParams(location.search),testMode=testParams.has('test');
  let previousTime = performance.now(), soundEnabled = !(testMode&&testParams.get('sound')==='off');
  const soundtrack = new window.PanguinAudio.Soundtrack();
  soundtrack.setEnabled(soundEnabled);
  soundtrack.setActive(!document.hidden && document.hasFocus());
  let toastUntil = 0, shake = 0, interactQueued = false, supplyQueued = false;
  // One visible-frame pulse; weak eligibility prevents stale rim replay after cleanup.
  let shockwavePulse=null, shockwaveEligible=new WeakSet();
  let resumeFramePending=document.hidden, deferredSupply=null, deferredTicket=null;
  function applyDeferredGameplayEffects(){
    const valid=effect=>game.phase==='run'&&game.runNumber===effect.outing&&game.player.alive;
    if(deferredSupply&&!valid(deferredSupply))deferredSupply=null;
    if(deferredTicket&&!valid(deferredTicket))deferredTicket=null;
    if(document.hidden)return;
    let supplyApplied=false;
    if(deferredSupply){const effect=deferredSupply;deferredSupply=null;supplyApplied=typeof effect.kind==='string'&&Object.hasOwn(POWERUP_DEFS,effect.kind)&&game.collectPowerup({kind:effect.kind});if(supplyApplied)game.events.push({type:'supplyUsed',kind:effect.kind});}
    if(deferredTicket){deferredTicket=null;if(!game.contract)game.startContract();}
    return supplyApplied;
  }

  function clearShockwavePresentation(){shockwavePulse=null;shockwaveEligible=new WeakSet();}
  function shockwaveForeground(){return game.phase==='run'&&!document.hidden&&document.hasFocus();}
  let previousHud = '', previousShop = '';
  let hudFeedback = null;
  let marketPending = false, marketFailure = '';
  const shopLabelNodes = new Map();
  let displayedBuyIntent=null;
  let shopProjection = { offsetX: 0, offsetY: 0 }; 
  let displayedSummary = null;
  let presentedSummary = null, summaryVisibleAt = null, summaryVisibleMs = 0;
  let presentedDeath = null, presentedVictory = null, victoryScene = null, lastLiveProjection = null;
  const finishOuting = game.finishOuting.bind(game);
  game.finishOuting = function(reason) {
    if(reason==='timeout'&&game.phase==='run'&&!game.settledOuting){
      const bitmap=document.createElement('canvas');bitmap.width=canvas.width;bitmap.height=canvas.height;
      bitmap.getContext('2d').drawImage(canvas,0,0);
      victoryScene={bitmap,point:lastLiveProjection||{x:canvas.width/2,y:canvas.height/2},run:game.runNumber};
    }
    return finishOuting(reason);
  };
  // Simulation admission is necessary; completed visible rendering starts the
  // presentation interval. Hidden time never matures an unseen Summary.
  function summaryReady() {
    return game.phase === 'summary' && presentedSummary === game.summary && !document.hidden &&
      game.summaryAge + 1e-9 >= window.FryingPanguin.SUMMARY_LOCK &&
      summaryVisibleMs + (summaryVisibleAt === null ? 0 : performance.now() - summaryVisibleAt) >= window.FryingPanguin.SUMMARY_LOCK * 1000;
  }
  function pauseSummaryPresentation() {
    if (summaryVisibleAt !== null) summaryVisibleMs += Math.max(0, performance.now() - summaryVisibleAt);
    summaryVisibleAt = null;
  }
  function completeSummaryPresentation() {
    if (game.phase !== 'summary') { presentedSummary = null; summaryVisibleAt = null; summaryVisibleMs = 0; return; }
    if (presentedSummary !== game.summary) { presentedSummary = game.summary; summaryVisibleAt = null; summaryVisibleMs = 0; }
    if (!document.hidden && summaryVisibleAt === null) summaryVisibleAt = performance.now();
  }
  let hudExclusionsDirty = true, hudOccupiedCSS = [], canvasCSS = null;
  document.getElementById('summary-enemy-icon').src = Art.iconDataURL('penguin');
  document.getElementById('summary-coin-icon').src = Art.iconDataURL('summary-coin');

  function resize() {
    hudExclusionsDirty = true;
    snowViewportWidth = viewport.clientWidth;
    snowViewportHeight = viewport.clientHeight;
    const normalCount = Math.min(32, Math.max(6, Math.round(snowViewportWidth * snowViewportHeight / 40625)));
    snowCount = reduceMotion ? Math.min(8, Math.max(3, Math.ceil(normalCount / 4))) : normalCount;
    const baseScale = viewport.clientWidth < 600 || viewport.clientHeight <= 420 ? 1.5 : 2.5;
    const scale = Math.max(baseScale, viewport.clientWidth / 720, viewport.clientHeight / 560);
    canvas.width = Math.ceil(viewport.clientWidth / scale);
    canvas.height = Math.ceil(viewport.clientHeight / scale);
    ctx.imageSmoothingEnabled = false;
  }
  new ResizeObserver(resize).observe(viewport);
  motionPreference.addEventListener('change', event => { reduceMotion = event.matches; clearShockwavePresentation(); resize(); });

  // Active temporary effects follow the rendered player. Equipment and stock
  // stay in the fixed HUD. These are presentation caches, never effect clocks.
  const playerBuffStrip = document.getElementById('player-buffs');
  const playerBuffOrder = ['speed', 'frenzy', 'jelly'];
  const playerBuffNodes = new Map();
  const playerBuffState = { player:null, values:{}, roster:'', width:0, height:0, rect:null, viewport:null };
  resize();
  const playerBuffName = kind => POWERUP_DEFS[kind].label;
  function updatePlayerBuffs() {
    const p=game.player,active=game.phase==='run'&&p.alive!==false;
    const rows=[];
    for(const kind of playerBuffOrder){
      const remaining=p.buffs?.[kind];
      if(active&&Number.isFinite(remaining)&&remaining>0)rows.push({kind,remaining,seconds:Math.ceil(remaining)});
    }
    if(playerBuffState.player!==p){playerBuffState.player=p;playerBuffState.values={};}
    const roster=rows.map(row=>row.kind).join('|');
    if(roster!==playerBuffState.roster){
      const nodes=rows.map(({kind})=>{
        if(!playerBuffNodes.has(kind)){
          const badge=document.createElement('div');badge.className='player-buff';badge.dataset.kind=kind;badge.setAttribute('role','img');
          const icon=document.createElement('img');icon.src=Art.iconDataURL(kind);icon.alt='';icon.setAttribute('aria-hidden','true');
          const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 28 28');svg.setAttribute('aria-hidden','true');svg.setAttribute('focusable','false');
          const circles=['buff-ring-track','buff-ring-progress'].map(name=>{const circle=document.createElementNS('http://www.w3.org/2000/svg','circle');circle.setAttribute('class',name);circle.setAttribute('cx','14');circle.setAttribute('cy','14');circle.setAttribute('r','12');return circle;});
          const progress=circles[1];progress.setAttribute('pathLength','1');progress.setAttribute('stroke-dasharray','1');progress.setAttribute('transform','rotate(-90 14 14)');svg.append(...circles);badge.append(icon,svg);
          playerBuffNodes.set(kind,{badge,progress,seconds:null,ratio:null});
        }
        return playerBuffNodes.get(kind).badge;
      });
      playerBuffStrip.replaceChildren(...nodes);playerBuffState.roster=roster;playerBuffState.width=nodes.length*28+Math.max(0,nodes.length-1)*4;playerBuffState.height=28;
    }
    for(const {kind,remaining,seconds} of rows){
      const node=playerBuffNodes.get(kind),duration=POWERUP_DEFS[kind].duration;
      const ratio=Math.max(0,Math.min(1,remaining/duration));
      if(node.seconds!==seconds){node.seconds=seconds;node.badge.setAttribute('aria-label',playerBuffName(kind)+': '+seconds+' seconds remaining');}
      if(node.ratio!==ratio){node.ratio=ratio;node.progress.setAttribute('stroke-dashoffset',String(1-ratio));}
    }
    playerBuffState.values=Object.fromEntries(rows.map(row=>[row.kind,row.remaining]));
    playerBuffStrip.hidden=rows.length===0;
    if(!rows.length){playerBuffState.rect=null;}
  }
  // CSS viewport resizing precedes ResizeObserver delivery; refresh projection
  // before that first resized render as well as after observer-driven sizing.
  window.addEventListener('resize',()=>{hudExclusionsDirty=true;});
  function measureHudExclusions() {
    if (!hudExclusionsDirty && canvasCSS) return;
    canvasCSS = canvas.getBoundingClientRect();
    playerBuffState.viewport=viewport.getBoundingClientRect();
    const selectors = '.health,.pan-power,.home-icon,.timer,#timer-state,.gold,#buffs .buff,#danger,#use-supply,#joystick';
    hudOccupiedCSS = [...document.querySelectorAll(selectors)].filter(element => {
      const style = getComputedStyle(element);
      return !element.hidden && style.display !== 'none' && style.visibility !== 'hidden';
    }).map(element => element.getBoundingClientRect()).filter(rect => rect.width > 0 && rect.height > 0);
    hudExclusionsDirty = false;
  }
  // Fixed absolute attachment. Selected pan reach plus its bounded frenzy
  // envelope remains below this bottom, including logical pixel rounding.
  const playerBuffGap=45;
  function positionPlayerBuffs(offsetX,offsetY) {
    if(playerBuffStrip.hidden)return;
    measureHudExclusions();
    const view=playerBuffState.viewport,sx=canvasCSS.width/canvas.width,sy=canvasCSS.height/canvas.height;
    const width=playerBuffState.width,height=playerBuffState.height,p=game.player;
    const px=canvasCSS.left+(Math.round(p.x)+offsetX)*sx,py=canvasCSS.top+(Math.round(p.y)+offsetY)*sy;
    const left=px-width/2,top=py-playerBuffGap*sy-height;
    playerBuffState.rect={left,top,right:left+width,bottom:top+height};
    // The row is part of the player projection, including at viewport edges.
    // HUD, warnings and changing buffs never move it independently.
    playerBuffStrip.style.transform='translate('+(left-view.left)+'px,'+(top-view.top)+'px)';
  }

  function powerFeedbackExclusions(offsetX, offsetY) {
    measureHudExclusions();
    const sx = canvas.width / canvasCSS.width, sy = canvas.height / canvasCSS.height;
    const occupied=playerBuffState.rect?[...hudOccupiedCSS,playerBuffState.rect]:hudOccupiedCSS;
    return occupied.map(rect => ({ left: (rect.left-canvasCSS.left)*sx-offsetX, top: (rect.top-canvasCSS.top)*sy-offsetY, right: (rect.right-canvasCSS.left)*sx-offsetX, bottom: (rect.bottom-canvasCSS.top)*sy-offsetY }));
  }
  function announcePlayerBuffChanges(events) {
    if(game.phase!=='run')return;
    const powers=events.filter(event=>event.type==='powerup');
    const active=new Map(powers.map(event=>[event.kind,event]));
    const expired=events.filter(event=>event.type==='powerupExpired'&&!active.has(event.kind));
    if(!powers.length&&!expired.length)return;
    const messages=[...active.keys()].map(kind=>playerBuffName(kind)+(playerBuffState.values[kind]>0?' refreshed':' activated'));
    messages.push(...expired.map(event=>playerBuffName(event.kind)+' ended'));
    if(!powers.length&&!events.some(event=>event.type==='critical'||event.type==='reset'))showToast(expired[0].kind,'·',400);
    document.getElementById('toast').setAttribute('aria-label',messages.join(', '));
  }

  function render(dt) {
    if(game.phase==='shop'){victoryScene=null;presentedVictory=null;}
    if(victoryScene&&(game.phase==='winning'||game.phase==='summary'&&game.summary?.reason==='timeout')){
      const w=canvas.width,h=canvas.height,b= victoryScene.bitmap,scale=Math.min(w/b.width,h/b.height);
      const width=Math.round(b.width*scale),height=Math.round(b.height*scale),left=Math.round((w-width)/2),top=Math.round((h-height)/2);
      ctx.fillStyle='#89b8c3';ctx.fillRect(0,0,w,h);ctx.imageSmoothingEnabled=false;ctx.drawImage(b,left,top,width,height);
      if(game.phase==='winning'){
        Art.drawVictoryFlourish(ctx,{x:left+victoryScene.point.x*width/b.width,y:top+victoryScene.point.y*height/b.height,width:w,height:h,age:game.victoryAge},{reduceMotion});
        if(!document.hidden)presentedVictory=game.summary;
      }
      completeSummaryPresentation();return;
    }
    if (game.layout?.revision !== terrainRevision) {
      terrain = Art.createTerrain(window.FryingPanguin, game.layout); terrainRevision = game.layout?.revision;
    }
    const w = canvas.width, h = canvas.height, time = game.elapsed + (game.phase === 'summary' ? game.aftermathTime || 0 : 0);
    const targetX = Math.max(w / 2, Math.min(WORLD.width - w / 2, game.phase === 'shop' ? SHOP.spawnX : game.player.x));
    const labelTop = viewport.clientHeight <= 420 ? 80 : viewport.clientWidth <= 600 ? 200 : 210;
    const targetY = game.phase === 'shop' ? h / 2 - (labelTop / (viewport.clientHeight / h) - 84) : Math.max(h / 2, Math.min(WORLD.height - h / 2, game.player.y));
    const blend = reduceMotion ? 1 : 1 - Math.exp(-dt * 10);
    if(game.phase==='shop'){camera.x=targetX;camera.y=targetY;}else if(game.phase!=='dying'){camera.x+=(targetX-camera.x)*blend;camera.y+=(targetY-camera.y)*blend;}
    shake = Math.max(0, shake - dt * 18);
    if(!shockwaveForeground())clearShockwavePresentation();
    const releaseAmplitude=shockwavePulse?1.5*Math.pow(Math.max(0,1-shockwavePulse.age/.14),2):0;
    const amplitude=Math.max(shake,releaseAmplitude),baseX=Math.round(w/2-camera.x),baseY=Math.round(h/2-camera.y);
    const offsetX=baseX+Math.max(-2,Math.min(2,Math.round(w/2-camera.x+(reduceMotion?0:Math.sin(time*90)*amplitude))-baseX));
    const offsetY=baseY+Math.max(-2,Math.min(2,Math.round(h/2-camera.y+(reduceMotion?0:Math.cos(time*70)*amplitude))-baseY));
    shopProjection = { offsetX, offsetY };
    positionShop();
    positionPlayerBuffs(offsetX,offsetY);
    Art.rect(ctx, 0, 0, w, h, '#89b8c3');
    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.drawImage(terrain, 0, 0);
    Art.drawWaterMotion?.(ctx, game, atmosphereTime, { reduceMotion });
    Art.drawFootprints?.(ctx, game, atmosphereTime);
    // Atmosphere is behind every semantic world cue and actor.
    drawSnow();
    Art.drawGate(ctx, game);
    const visible = (o, pad = 45) => o.x > -offsetX - pad && o.x < w - offsetX + pad && o.y > -offsetY - pad && o.y < h - offsetY + pad;
    // Spent objects are flat floor art, independent of the actor's ground Y.
    // Keep them below every body and danger cue when characters cross the debris.
    for (const chest of game.chests) if (chest.open && visible(chest)) Art.drawChest(ctx, chest, time, { reduceMotion });
    for (const obstacle of game.obstacles) if (obstacle.broken && visible(obstacle)) Art.drawScenery(ctx, obstacle);
    // Intact scenery and actors retain their ordinary depth order.
    // Floor sparks sit underneath bodies and hostile attack warnings.
    for (const hazard of game.hazards || []) if (visible(hazard, hazard.maxRadius || 110)) Art.drawHazard?.(ctx, hazard, time, { reduceMotion, releaseEmphasis: shockwaveForeground()&&shockwaveEligible.has(hazard) });
    for (const impact of game.impacts) if (visible(impact)) Art.drawImpact(ctx, impact, time, { reduceMotion });
    for (const peel of game.peels || []) if (visible(peel)) Art.drawPeel(ctx, peel, time, { reduceMotion });
    if (typeof Art.drawAttackForecast === 'function') for (const enemy of game.enemies) {
      if (enemy.hp > 0 && (visible(enemy, 220) || visible({ x: enemy.aimX, y: enemy.aimY }))) Art.drawAttackForecast(ctx, enemy, time, { reduceMotion });
    }
    const objects = [
      ...game.obstacles.filter(o => !o.broken && visible(o)).map(o => ({ y: o.y, draw: () => Art.drawScenery(ctx, o) })),
      ...game.chests.filter(o => !o.open && visible(o)).map(o => ({ y: o.y, draw: () => Art.drawChest(ctx, o, time, { reduceMotion }) })),
      ...game.coins.filter(o => visible(o)).map(o => ({ y: o.y, draw: () => Art.drawCoin(ctx, o, time, { reduceMotion }) })),
      ...game.powerups.filter(o => visible(o)).map(o => ({ y: o.y, draw: () => Art.drawPowerup(ctx, o, time, { reduceMotion }) })),
      ...(game.snowballs || []).concat(game.hostileSnowballs || []).filter(o => visible(o)).map(o => ({ y: o.y, draw: () => Art.drawSnowball(ctx, o, time, { reduceMotion }) })),
      ...game.enemies.filter(o => o.hp > 0 && visible(o)).map(o => ({ y: o.y, draw: () => Art.drawEnemy(ctx, o, time, { reduceMotion, forecast: false, phase: game.phase, generation: game.layout?.revision }) })),
      { y: game.player.y, draw: () => { if(game.phase!=='dying')Art.drawPlayer(ctx, game.player, time, { phase: game.phase, reduceMotion, hurt: game.phase==='run'&&game.player.hurtFlash>0, fallen: game.phase==='summary'&&game.summary?.reason==='death' }); Art.drawPowerActivation?.(ctx, game.player, time, { reduceMotion, viewport: { left: -offsetX, top: -offsetY, right: w-offsetX, bottom: h-offsetY }, exclusions: powerFeedbackExclusions(offsetX, offsetY) }); } }
    ];
    objects.sort((a, b) => a.y - b.y).forEach(o => o.draw());
    for (const goof of game.goofs) Art.drawGoof(ctx, goof, time, { reduceMotion });
    for (const p of game.particles) Art.rect(ctx, p.x, p.y, p.size, p.size, p.color);
    for (const p of game.popups) {
      // Distinct onset glyphs acknowledge mixed pickups without stacking value text.
      if (p.kind === 'powerup' && game.popups.some(other => other !== p && other.kind === 'powerup' && Math.abs(other.x - p.x) < 24 && Math.abs(other.y - p.y) < 10)) continue;
      ctx.globalAlpha = Math.min(1, p.life * 3);
      Art.pixelText(ctx, p.text, p.x, p.y, '#805d3b', 1, 'center');
    }
    ctx.globalAlpha = 1;
    ctx.restore();
    if(game.phase==='dying') {
      Art.drawDeathFlourish?.(ctx,{x:Math.round(game.player.x)+offsetX,y:Math.round(game.player.y)+offsetY,width:w,height:h,age:game.deathAge},{reduceMotion});
      // The real body, handle and pan stay clear even beyond the 14px ray gap.
      ctx.save();ctx.translate(offsetX,offsetY);
      Art.drawPlayer(ctx,game.player,time,{phase:game.phase,reduceMotion,hurt:game.deathHurtFlash-game.deathAge>1e-9});ctx.restore();
      if(!document.hidden)presentedDeath=game.summary;
    }else presentedDeath=null;
    if(game.phase==='run')lastLiveProjection={x:Math.round(game.player.x)+offsetX,y:Math.round(game.player.y)+offsetY};
    completeSummaryPresentation();
    // Advance after the first completed draw at age0; hidden/blurred state clears.
    if(shockwavePulse){shockwavePulse.age+=Math.min(.05,Math.max(0,dt));if(shockwavePulse.age>=.14)shockwavePulse=null;}
  }

  // Local bitmap counters retain real text for assistive technology.
  function pixelNumber(element, value, color) {
    element.setAttribute('aria-label', element.id === 'gold' ? game.gold.toLocaleString() + (game.saved?' saved gold':' gold') : value + ' remaining');
    const signature = value + '|' + color;
    if (element.dataset.pixelValue === signature) return;
    element.dataset.pixelValue = signature;
    const source = document.createElement('canvas');
    source.width = String(value).length * 6 + 6; source.height = 11;
    const brush = source.getContext('2d');
    const digits = [
      ['01110','10001','10011','10101','11001','10001','01110'],
      ['00100','01100','00100','00100','00100','00100','01110'],
      ['01110','10001','00001','00010','00100','01000','11111'],
      ['11110','00001','00001','01110','00001','00001','11110'],
      ['00010','00110','01010','10010','11111','00010','00010'],
      ['11111','10000','10000','11110','00001','00001','11110'],
      ['01110','10000','10000','11110','10001','10001','01110'],
      ['11111','00001','00010','00100','01000','01000','01000'],
      ['01110','10001','10001','01110','10001','10001','01110'],
      ['01110','10001','10001','01111','00001','00001','01110']
    ];
    const draw = (x, y, fill) => {
      for (const char of String(value).toUpperCase()) {
        const glyph = /[0-9]/.test(char) ? digits[Number(char)] : null;
        if (glyph) { brush.fillStyle = fill; glyph.forEach((row, j) => [...row].forEach((cell, i) => { if (cell === '1') brush.fillRect(x + i, y + j, 1, 1); })); }
        else Art.pixelText(brush, char, x, y, fill);
        x += '.:'.includes(char) ? 3 : 6;
      }
    };
    for (const [x, y] of [[1, 2], [3, 2], [2, 1], [2, 3], [2, 4]]) draw(x, y, '#f9faea');
    draw(2, 2, color);
    const pixels = brush.getImageData(0, 0, source.width, source.height).data;
    let edge = 0;
    for (let y = 0; y < source.height; y++) for (let x = 0; x < source.width; x++) if (pixels[(y * source.width + x) * 4 + 3]) edge = Math.max(edge, x);
    const image = document.createElement('canvas'); image.width = edge + 2; image.height = source.height;
    image.getContext('2d').drawImage(source, 0, 0);
    element.textContent = value;
    element.classList.add('pixel-number');
    element.setAttribute('role', 'img');
    element.style.width = image.width * 2 + 'px'; element.style.height = image.height * 2 + 'px';
    element.style.backgroundImage = 'url(' + image.toDataURL() + ')';
  }
  function hudPop(element) {
    if (reduceMotion || game.phase === 'summary') return;
    for (const animation of element.getAnimations()) animation.cancel();
    element.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-4px)', offset: .35 }, { transform: 'translateY(1px)', offset: .7 }, { transform: 'translateY(0)' }], { duration: 240, easing: 'steps(3, end)' });
  }

  function showToast(kind, count, duration = 1200) {
    const toast = document.getElementById('toast');
    const icon = document.createElement('img'); icon.src = Art.iconDataURL(kind); icon.alt = kind;
    toast.replaceChildren(icon);
    if (count !== undefined) { const number = document.createElement('span'); number.textContent = count; toast.append(number); }
    toast.removeAttribute('aria-label'); toast.classList.add('visible'); hudPop(icon); toastUntil = performance.now() + duration;
  }
  // Summary utilities preserve the immutable result and reserve their native gestures.
  const shareURLs=new WeakMap();
  let shareSummary=null,shareURL='',sharePending=false,shareOperation=0,shareKeyPermit=null,sharePointerPermit=null;
  function summaryUtility(target){return target instanceof Element&&!!target.closest('#summary-utilities');}
  function shareCurrent(summary,operation){return game.phase==='summary'&&game.summary===summary&&shareSummary===summary&&shareOperation===operation;}
  function shareStatus(text){document.getElementById('summary-share-status').textContent=text;}
  function syncShareResult(){
    const summary=game.phase==='summary'?game.summary:null;
    if(summary!==shareSummary){shareOperation++;sharePending=false;shareSummary=summary;shareKeyPermit=sharePointerPermit=null;shareURL='';document.getElementById('summary-copy').hidden=true;document.getElementById('summary-link-label').hidden=true;shareStatus('');
      if(summary&&Object.isFrozen(summary)&&window.PanguinShareConfig?.origin){try{shareURL=shareURLs.get(summary)||window.PanguinResult.resultURL(window.PanguinResult.project(summary),window.PanguinShareConfig.origin,window.PanguinShareConfig.basePath);shareURLs.set(summary,shareURL);}catch{shareStatus('Result link unavailable.');}}
      document.getElementById('summary-link').value=shareURL;
    }
    const disabled=!summary||!summaryReady()||sharePending||!shareURL;
    for(const id of ['summary-share','summary-copy'])document.getElementById(id).setAttribute('aria-disabled',String(disabled));
  }
  function offerShareCopy(text,manual=false){document.getElementById('summary-copy').hidden=!manual;document.getElementById('summary-link-label').hidden=!manual;shareStatus(text);}
  function activateShare(){
    if(game.phase!=='summary'||!summaryReady()||sharePending||!shareURL)return;
    const summary=shareSummary,operation=++shareOperation,url=shareURL;sharePending=true;syncShareResult();
    const finish=()=>{if(shareCurrent(summary,operation)){sharePending=false;syncShareResult();return true;}return false;};
    shareStatus('Copying link…');let promise;try{if(typeof navigator.clipboard?.writeText!=='function')throw Error('Clipboard unavailable');promise=navigator.clipboard.writeText(url);}catch(error){promise=Promise.reject(error);}Promise.resolve(promise).then(()=>{if(finish())offerShareCopy('Link copied.');},()=>{if(finish()){offerShareCopy('Select the URL and copy it manually.',true);const field=document.getElementById('summary-link');field.focus({preventScroll:true});field.select();}});
  }

  function updateHud() {
    syncShareResult();
    const summary = game.phase === 'summary' ? game.summary : null;
    const summaryScreen = document.getElementById('summary-screen');
    summaryScreen.hidden = !summary;
    summaryScreen.classList.toggle('decorations-paused', !!summary && document.hidden);
    viewport.classList.toggle('summarizing', !!summary);
    viewport.classList.toggle('winning', game.phase==='winning');
    const ready = !!summary && summaryReady();
    const continueButton = document.getElementById('summary-continue');
    continueButton.textContent = ready ? '➜' : '⌛';
    continueButton.setAttribute('aria-disabled', String(!ready));
    continueButton.setAttribute('aria-label', ready ? 'Return to shop with a fresh key press or tap' : 'Summary settling; please wait');
    summaryScreen.classList.toggle('ready', ready);
    if (summary && summary !== displayedSummary) {
      summaryScreen.dataset.outcome = summary.reason;
      document.getElementById('summary-result').textContent = summary.reason === 'timeout' ? 'STILL WADDLING!' : 'PAN DOWN!';
      const hero = document.getElementById('summary-hero'), heroCtx = hero.getContext('2d');
      heroCtx.clearRect(0, 0, hero.width, hero.height); heroCtx.imageSmoothingEnabled = false;
      if (summary.reason === 'death' && typeof Art.drawSummaryFallen === 'function') {
        Art.drawSummaryFallen(heroCtx, game.player);
      } else {
        heroCtx.save(); heroCtx.translate(56, 58); heroCtx.scale(2, 2);
        Art.drawPlayer(heroCtx, { ...game.player, x: 0, y: 0, facingX: 0, facingY: 1, moving: false, walk: 0, swing: 0, invulnerable: 0 }, 0, summary.reason === 'death' ? { phase: 'summary', reduceMotion: true, fallen: true, hurt: false } : { phase: 'summary', reduceMotion: true });
        heroCtx.restore();
      }
      document.getElementById('summary-enemies').textContent = summary.enemiesConquered.toLocaleString();
      document.getElementById('summary-gold').textContent = summary.goldGained.toLocaleString();
      const seconds = window.PanguinResult.displaySeconds(window.PanguinResult.project(summary));
      document.getElementById('summary-time').textContent = String(Math.floor(seconds / 60)).padStart(2, '0') + ':' + String(seconds % 60).padStart(2, '0');
      document.getElementById('summary-continue').focus({ preventScroll: true });
    }
    displayedSummary = summary;
    const p = game.player;
    updatePlayerBuffs();
    const contract = game.contract;
    const stampTarget = contract?.active && game.chests.filter(c => contract.ids.includes(c.id) && !contract.stamps.includes(c.id)).sort((a, b) => Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y))[0];
    const outsideView = stampTarget && (Math.abs(stampTarget.x-camera.x) > canvas.width/2-16 || Math.abs(stampTarget.y-camera.y) > canvas.height/2-16);
    const stampDirection = outsideView ? Math.round(Math.atan2(stampTarget.y-p.y,stampTarget.x-p.x)/(Math.PI/4))*45 : null;
    const state = [game.phase, Math.ceil(game.remaining), game.gold, game.saved, p.hp, p.maxHp, game.upgrades.pan, game.upgrades.heart, p.golden, p.panFinish, game.market.supply, contract?.status, contract?.stamps.length, Math.ceil(contract?.remaining || 0), stampDirection, Math.floor(game.difficulty * 3)].join('|');
    if (state !== previousHud) {
      previousHud = state;
      hudExclusionsDirty = true;
      const running = game.phase === 'run' || game.phase === 'dying' || game.phase === 'winning', seconds = Math.ceil(game.remaining);
      document.getElementById('location').textContent = running ? 'Brineglass Reach' : 'The frost shops';
      document.getElementById('home-icon').toggleAttribute('hidden', running);
      pixelNumber(document.getElementById('timer'), String(Math.floor(seconds / 60)).padStart(2, '0') + ':' + String(seconds % 60).padStart(2, '0'), running && seconds <= 20 ? '#a34d69' : '#405366');
      document.querySelector('.timer').style.setProperty('--time-left', Math.max(0, Math.min(100, game.remaining / window.FryingPanguin.RUN_SECONDS * 100)) + '%');
      document.getElementById('timer-state').textContent = running ? 'LEFT' : 'READY';
      document.querySelector('.timer').classList.toggle('urgent', running && seconds <= 20);
      viewport.classList.remove('critical'); // The canvas owns the single controlled flash.
      viewport.classList.toggle('shopping', game.phase === 'shop');
      pixelNumber(document.getElementById('gold'), game.gold < 10000 ? String(game.gold) : new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(game.gold), '#795b3b');
      document.querySelector('.gold').title = game.gold.toLocaleString() + (game.saved?' saved gold':' gold · not yet saved');
      const health = document.getElementById('health');
      health.replaceChildren(...Array.from({ length: p.maxHp }, (_, i) => {
        const heart = document.createElement('span'); heart.className = 'heart' + (i >= p.hp ? ' empty' : ''); return heart;
      }));
      health.setAttribute('aria-label', 'Health ' + p.hp + ' of ' + p.maxHp);
      const status = document.getElementById('save-status');
      status.classList.toggle('unavailable', !game.saved);
      status.title = game.saved ? 'Gold and upgrades saved' : 'Storage unavailable; progress kept for this session';
      status.replaceChildren(document.createElement('span'), document.createTextNode(game.saved ? 'GOLD & UPGRADES SAVED' : 'SAVED THIS SESSION ONLY'));
      document.getElementById('pan-level').replaceChildren(...Array.from({ length: 4 }, (_, i) => { const dot = document.createElement('span'); dot.className = 'power-dot' + (i > game.upgrades.pan ? ' empty' : ''); return dot; }));
      document.querySelector('.pan-power').classList.toggle('golden', !!p.golden || p.panFinish === 'gold');
      document.getElementById('danger').setAttribute('data-stage', running ? Math.min(2, Math.floor(game.difficulty * 3)) : -1);
      document.getElementById('danger').setAttribute('aria-label', game.phase === 'dying' ? 'Knocked out' : running ? 'Danger level ' + (1 + Math.min(2, Math.floor(game.difficulty * 3))) + ' of 3' : 'Safe in shops');
      document.getElementById('danger').classList.toggle('rising', running && game.difficulty >= .67);
      const buffs = [];
      if (contract?.active) {
        const badge = document.createElement('div'); badge.className = 'buff contract-badge'; badge.title = 'Bear Market: collect three chest stamps before the clock runs out';
        const icon = document.createElement('img'); icon.src = Art.iconDataURL('bond'); icon.alt = 'Bear Market Bond';
        const pips = document.createElement('span'); pips.className = 'stamp-pips';
        for (let i = 0; i < 3; i++) { const pip = document.createElement('i'); pip.className = i < contract.stamps.length ? 'stamped' : ''; pips.append(pip); }
        const timer = document.createElement('span'); timer.className = 'buff-timer'; timer.textContent = Math.ceil(contract.remaining);
        badge.append(icon, pips, timer);
        if (stampDirection !== null) {
          const pointer = document.createElement('span'); pointer.className = 'stamp-direction'; pointer.setAttribute('role', 'img'); pointer.setAttribute('aria-label', 'Direction of nearest uncollected bear chest');
          const arrow = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); arrow.setAttribute('viewBox', '0 0 16 16'); arrow.setAttribute('aria-hidden', 'true'); arrow.style.transform = 'rotate(' + stampDirection + 'deg)';
          const path = document.createElementNS('http://www.w3.org/2000/svg', 'path'); path.setAttribute('d', 'M1 6h7V2l6 6-6 6v-4H1z'); arrow.append(path); pointer.append(arrow); badge.append(pointer);
        }
        buffs.push(badge);
      } else if (game.phase === 'shop' && game.market?.ticket) {
        const badge = document.createElement('div'); badge.className = 'buff gadget-badge'; badge.title = 'Bear Market ticket ready for next outing';
        const icon = document.createElement('img'); icon.src = Art.iconDataURL('bond'); icon.alt = badge.title; badge.append(icon); buffs.push(badge);
      }
      const supply = typeof game.market.supply === 'string' && Object.hasOwn(POWERUP_DEFS, game.market.supply) ? game.market.supply : null;
      const supplyButton = document.getElementById('use-supply');
      supplyButton.hidden = game.phase !== 'run' || !supply;
      if (supply) {
        const name = window.FryingPanguin.POWERUP_DEFS[supply].label;
        document.getElementById('supply-icon').src = Art.iconDataURL(supply);
        supplyButton.setAttribute('aria-label', 'Use packed ' + name + ' (Q)'); supplyButton.title = name + ' · Q';
        supplyButton.disabled = false;
        if (game.phase === 'shop') {
          const badge = document.createElement('div'); badge.className = 'buff stock-badge'; badge.title = 'Packed ' + name;
          const icon = document.createElement('img'); icon.src = Art.iconDataURL(supply); icon.alt = badge.title; badge.append(icon); buffs.push(badge);
        }
      }
      document.getElementById('buffs').replaceChildren(...buffs);
      if (hudFeedback) {
        if (game.gold > hudFeedback.gold) hudPop(document.querySelector('.gold'));
        if (p.hp !== hudFeedback.hp) hudPop(health);
        buffs.forEach(badge => {
          const kind = badge.querySelector('img')?.alt;
          if (kind && !hudFeedback.buffs.includes(kind)) hudPop(badge);
        });
      }
      hudFeedback = { gold: game.gold, hp: p.hp, buffs: buffs.map(badge => badge.querySelector('img')?.alt) };
    }
    updateShop();
  }

  function showUpgradeReceipt(id,actualBenefit=null,level=null){
    const toast=document.getElementById('toast'),icon=document.createElement('canvas');icon.width=icon.height=32;icon.setAttribute('aria-hidden','true');
    Art.drawUpgradeIcon(icon.getContext('2d'),id,16,16,32);
    const offer=game.shopOffer(id),benefit=document.createElement('span');benefit.textContent=actualBenefit||offer.currentBenefit;
    toast.replaceChildren(icon,benefit);toast.classList.add('visible');toast.setAttribute('aria-label',`${offer.label} upgraded. ${actualBenefit||offer.currentBenefit}`);toastUntil=performance.now()+1300;
  }
  // IndexedDB is authoritative across browser agents. localStorage is only a
  // compatibility mirror; its cross-agent read visibility is not transactional.
  let marketInitialized=!storage, marketStore=null, mirrorFailed=false;
  const cloneRecord=value=>JSON.parse(JSON.stringify(value));
  const marketReadyPromise=storage?initializeMarket():Promise.resolve(true);
  function openMarketDB(){return new Promise((resolve,reject)=>{
    if(!window.indexedDB){reject(Error('Database unavailable'));return;}
    const request=indexedDB.open('frying-panguin.market.v2',1);
    request.onupgradeneeded=()=>request.result.createObjectStore('state');
    request.onerror=()=>reject(request.error||Error('Database unavailable'));
    request.onblocked=()=>reject(Error('Database blocked'));
    request.onsuccess=()=>resolve(request.result);
  });}
  function databaseTransaction(db,mutation){return new Promise((resolve,reject)=>{
    const transaction=db.transaction('state','readwrite'),store=transaction.objectStore('state');let result;
    const presence=store.getKey('canonical'),read=store.get('canonical');
    read.onsuccess=()=>{try{result=mutation(read.result,presence.result!==undefined);if(result?.record)store.put(cloneRecord(result.record),'canonical');}catch(error){transaction.abort();reject(error);}};
    transaction.oncomplete=()=>resolve(result);
    transaction.onabort=()=>reject(transaction.error||Error('Save transaction aborted'));
    transaction.onerror=()=>{};
  });}
  function stateDelta(before,after){
    const delta={gold:after.gold-before.gold,progress:{},upgrades:{},owned:{},market:{}};
    for(const key of Object.keys(after.market.progress))delta.progress[key]=after.market.progress[key]-before.market.progress[key];
    for(const key of Object.keys(after.upgrades))if(after.upgrades[key]!==before.upgrades[key])delta.upgrades[key]=after.upgrades[key];
    for(const key of Object.keys(after.market.owned))if(after.market.owned[key]!==before.market.owned[key])delta.owned[key]=after.market.owned[key];
    for(const key of ['equipped','golden','ticket','supply'])if(after.market[key]!==before.market[key])delta.market[key]=after.market[key];
    return delta;
  }
  function mergeDelta(record,delta){
    const next=cloneRecord(record),safe=n=>Math.max(0,Math.min(Number.MAX_SAFE_INTEGER,n));
    next.gold=safe(next.gold+delta.gold);
    for(const key of Object.keys(delta.progress))next.market.progress[key]=safe(next.market.progress[key]+delta.progress[key]);
    Object.assign(next.upgrades,delta.upgrades);Object.assign(next.market.owned,delta.owned);Object.assign(next.market,delta.market);next.market.supply=typeof next.market.supply==='string'&&Object.hasOwn(POWERUP_DEFS,next.market.supply)?next.market.supply:null;return next;
  }
  function installCanonical(record){
    marketStore.base=cloneRecord(record);let projected=cloneRecord(record);
    for(const delta of marketStore.pending)projected=mergeDelta(projected,delta);
    marketStore.cache=projected;
    try{storage.setItem(STATE_SAVE_KEY,JSON.stringify(record));mirrorFailed=false;}
    catch{mirrorFailed=true;} // A mirror failure never undoes a committed database record.
    game.syncSavedProgress();game.saved=marketStore.pending.length===0&&!game.storageFailed;
  }
  async function initializeMarket(){
    try{
      const db=await openMarketDB(),initial=game.stateRecord();
      const result=await databaseTransaction(db,(record,present)=>({record:present?normalizeRecord(record):initial}));
      marketStore={db,base:cloneRecord(result.record),cache:cloneRecord(result.record),pending:[],queue:Promise.resolve(),
        get pendingWrites(){return this.pending.length;},
        getItem(key){return key===STATE_SAVE_KEY?JSON.stringify(game.storageFailed?game.stateRecord():this.cache):null;},
        setItem(key,value){if(game.storageFailed)throw Error('Saving unavailable');if(key!==STATE_SAVE_KEY)return;const next=normalizeRecord(JSON.parse(value)),delta=stateDelta(this.cache,next);this.pending.push(delta);this.cache=next;game.saved=false;
          this.queue=this.queue.then(async()=>{
            if(game.storageFailed)throw Error('Saving unavailable');
            const committed=await databaseTransaction(db,current=>({record:mergeDelta(normalizeRecord(current),delta)}));
            const index=this.pending.indexOf(delta);if(index>=0)this.pending.splice(index,1);installCanonical(committed.record);
          }).catch(error=>{game.storageFailed=true;game.saved=false;marketFailure='Saving unavailable. Purchases paused.';});
        }
      };
      game.storage=marketStore;game.storageFailed=false;installCanonical(result.record);marketInitialized=true;return true;
    }catch{
      game.storageFailed=true;game.saved=false;marketFailure='Saving unavailable. Purchases paused.';
      // A failed authoritative store cannot fall back to spending its mirror.
      // Keep ordinary session income/input usable without consuming stock.
      if(!marketStore)game.storage={getItem:key=>key===STATE_SAVE_KEY?JSON.stringify(game.stateRecord()):null,setItem(){throw Error('Saving unavailable');}};
      marketInitialized=true;return false;
    }
  }
  function normalizeRecord(value){
    if(value?.version!==2)value=null;
    return{version:2,gold:Number.isSafeInteger(value?.gold)&&value.gold>=0?value.gold:0,upgrades:game.sanitizeUpgrades(value?.upgrades),market:game.sanitizeMarket(value?.market)};
  }
  async function flushMarket(){await marketReadyPromise;if(marketStore){let tail;do{tail=marketStore.queue;await tail;}while(tail!==marketStore.queue);}return !game.storageFailed;}
  async function persistentMutation(mutate){
    await marketReadyPromise;if(game.storageFailed||!marketStore)return null;
    const operation=marketStore.queue.then(async()=>{
      if(game.storageFailed)return null;
      const result=await databaseTransaction(marketStore.db,current=>{const record=normalizeRecord(current),changed=mutate(record);return changed?.record?changed:{...changed,readRecord:record};});
      if(result?.record||result?.readRecord)installCanonical(result.record||result.readRecord);return result;
    });
    marketStore.queue=operation.catch(error=>{game.storageFailed=true;game.saved=false;marketFailure='Saving unavailable. Purchases paused.';});
    return operation;
  }
  async function readPersistentState(){await flushMarket();if(!marketStore)return game.stateRecord();const result=await databaseTransaction(marketStore.db,record=>({readRecord:normalizeRecord(record)}));return result.readRecord;}
  function stageGame(record){
    const staged=Object.assign(Object.create(Object.getPrototypeOf(game)),game);
    staged.saveState=Game.prototype.saveState;staged.syncSavedProgress=Game.prototype.syncSavedProgress;staged.player=cloneRecord(game.player);staged.upgrades=cloneRecord(record.upgrades);staged.market=cloneRecord(record.market);staged.gold=record.gold;staged.events=[];staged.storageFailed=false;
    let state=cloneRecord(record);
    staged.storage={getItem:key=>key===STATE_SAVE_KEY?JSON.stringify(state):null,setItem:(key,value)=>{if(key===STATE_SAVE_KEY)state=JSON.parse(value);}};
    return{game:staged,record:()=>state};
  }
  let supplyPending=false;
  async function requestLegacySupply(){
    if(document.hidden||supplyPending||deferredSupply||!marketInitialized||game.storageFailed)return false;
    if(!storage)return game.useSupply();
    supplyPending=true;
    try{
      const outing=game.runNumber;
      const result=await persistentMutation(record=>{
        const kind=record.market.supply,p=game.player;
        if(game.phase!=='run'||game.runNumber!==outing||!p.alive||typeof kind!=='string'||!Object.hasOwn(POWERUP_DEFS,kind))return{accepted:false};
        record.market.supply=null;return{record,accepted:true,kind};
      });
      if(!result?.accepted)return false;
      // Durable consumption precedes the effect; an ended outing discards it.
      if(game.phase==='run'&&game.runNumber===outing&&game.player.alive){deferredSupply={outing,kind:result.kind};const applied=applyDeferredGameplayEffects();if(!document.hidden)return applied;}
      return true;
    }catch{game.storageFailed=true;game.saved=false;marketFailure='Saving unavailable. Supplies paused.';return false;}
    finally{supplyPending=false;}
  }
  const originalStartRun=game.startRun.bind(game);
  game.startRun=function(){
    if(document.hidden||!marketInitialized)return;
    if(!storage||!marketStore||game.storageFailed){originalStartRun();return;}
    const sync=game.syncSavedProgress;
    // The synchronous simulation cannot consume a browser record. Departure
    // snapshots equipment immediately; ticket effect awaits atomic consumption.
    game.syncSavedProgress=function(){sync.call(this);this.market.ticket=false;};
    try{originalStartRun();}finally{game.syncSavedProgress=sync;}
    if(game.phase!=='run')return;
    const outing=game.runNumber;
    persistentMutation(record=>{if(game.phase!=='run'||game.runNumber!==outing||!record.market.ticket)return{accepted:false};record.market.ticket=false;return{record,accepted:true};})
      .then(result=>{if(result?.accepted&&game.phase==='run'&&game.runNumber===outing&&game.player.alive&&!game.contract){deferredTicket={outing};applyDeferredGameplayEffects();}})
      .catch(()=>{game.storageFailed=true;game.saved=false;marketFailure='Saving unavailable. Ticket kept.';});
  };

  const itemIcon = id => id === 'heart' ? 'heart' : id === 'walk' ? 'speed' : id === 'swing' ? 'pan' : id;
  const locksSupported = () => typeof navigator.locks?.request === 'function';
  const marketAvailable = () => marketInitialized&&!game.storageFailed&&(!storage||locksSupported());
  const displayText = offer => offer.maxed ? '' : offer.locked ? `OUTINGS ${offer.unlockRequirements[0].value}/${offer.unlockRequirements[0].required}` : offer.affordable ? 'READY' : 'NEED GOLD';
  function updateShop() {
    const shopping=game.phase==='shop',offer=game.nearbyShop();
    const layer=document.getElementById('shop-displays');layer.hidden=!shopping;
    // Both Space and label activation carry the offer actually painted through
    // asynchronous persistence instead of asking for a newer nearby offer.
    displayedBuyIntent=shopping&&offer?game.purchaseIntent():null;
    if(shopping)for(const item of game.shopDisplays()) {
      let node=shopLabelNodes.get(item.id);
      if(!node){node=document.createElement('button');node.type='button';node.id='shop-'+item.id;node.className='shop-display';node.dataset.display=item.id;shopLabelNodes.set(item.id,node);layer.append(node);bindMarketButton(node,'buy',()=>node.purchaseIntent);}
      const selected=offer?.id===item.id,available=marketAvailable(),eligible=selected&&item.affordable&&available&&!marketPending;
      const needsGold=!item.maxed&&game.gold<item.cost,advertised=item.maxed?item.currentBenefit:item.nextBenefit;
      const state=selected&&(marketPending||!marketInitialized)?'Saving…':selected&&!available?'Unavailable':item.maxed?'':item.locked?displayText(item):selected?marketFailure:'';
      node.purchaseIntent=selected&&displayedBuyIntent?{...displayedBuyIntent}:null;
      node.disabled=!eligible;node.dataset.item=item.id;node.dataset.cost=item.cost;node.dataset.level=item.level;node.dataset.generation=game.shopGeneration;
      const key=[item.id,item.level,item.cost,advertised,state,eligible,selected,needsGold,available,mirrorFailed,marketFailure].join('|');
      if(node.dataset.key!==key){
        node.dataset.key=key;
        node.replaceChildren(...[item.label,advertised,item.maxed?'MAX':`${item.cost} gold`,state].map((text,i)=>{const line=document.createElement(i===0?'strong':'span');line.textContent=text;if(i===1)line.className='display-benefit';if(i===2)line.className='display-price';if(i===3)line.className='display-state';return line;}));
        node.setAttribute('aria-label',`${item.label}. ${advertised}. ${item.maxed?'Max.':item.cost+' gold.'} ${state}. ${needsGold?'Insufficient gold. ':''}${eligible?'Tap this label or press Space to buy.':!selected?'Approach this display to buy.':''} ${selected&&mirrorFailed?'Saved. Local mirror unavailable.':''} ${selected?marketFailure:''}`);
      }
      node.dataset.state=item.maxed?'max':item.locked?'locked':item.affordable?'affordable':'unaffordable';node.dataset.needsGold=String(needsGold);node.classList.toggle('selected',selected);
    }
    positionShop();
  }
  function positionShop() {
    if(game.phase!=='shop')return;
    const sx=viewport.clientWidth/canvas.width,sy=viewport.clientHeight/canvas.height;
    for(const item of game.shopDisplays()) {
      const node=shopLabelNodes.get(item.id);if(!node)continue;
      node.style.left=((item.x+shopProjection.offsetX)*sx-26*sx)+'px';node.style.top=((84+shopProjection.offsetY)*sy)+'px';node.style.width=(52*sx)+'px';
      node.style.fontSize=Math.max(9,Math.min(12,sx*6.1))+'px';
    }
  }
  async function requestMarketAction(kind='buy',shownIntent=displayedBuyIntent) {
    if(document.hidden||kind!=='buy'||marketPending||game.phase!=='shop'||!marketAvailable())return false;
    const intent=shownIntent?{...shownIntent}:null;
    if(!intent)return false;
    marketPending=true;marketFailure='';updateShop();
    const commit=()=>game.buyUpgrade(intent.id,intent);
    try {
      if(!storage)return commit();
      return await navigator.locks.request('frying-panguin.market.v2',async()=>{
        const result=await persistentMutation(record=>{
          const stage=stageGame(record),g=stage.game;
          const accepted=Game.prototype.buyUpgrade.call(g,intent.id,intent);
          return accepted?{record:stage.record(),accepted:true,events:g.events}:{accepted:false};
        });
        if(result?.accepted)game.events.push(...result.events);return !!result?.accepted;
      });
    } catch { marketFailure='Purchase unavailable. Release and try again.';return false; }
    finally {marketPending=false;updateShop();canvas.focus({preventScroll:true});}
  }

  function setSoundEnabled(value){soundEnabled=!!value;soundtrack.setEnabled(soundEnabled);if(soundEnabled)getAudio();return soundEnabled;}
  function getAudio() {
    if (soundEnabled && soundtrack.active && !document.hidden && (game.phase === 'shop' || game.phase === 'run')) soundtrack.unlock();
  }

  function processEvents() {
    const events = game.drainEvents();
    soundtrack.update(game);
    soundtrack.events(events, game);
    for (const event of events) {
      if (event.type === 'summary') { for (const key of physicalKeys) summaryHeldKeys.add(key); for(const id of heldPointers)blockPointerClick(id); clearInput(); shake = 0; }
      if (event.type === 'chest') shake = 1.2;
      if (event.type === 'bonk') shake = Math.max(shake, 1.5);
      if (event.type === 'bowl') shake = Math.max(shake, 1.3);
      if (event.type === 'crash') shake = Math.max(shake, 1.8);
      if (event.type === 'hurt') shake = 2;
      if (event.type === 'rock') shake = 1.7;
      if (event.type === 'critical' || event.type === 'victory') { for (const key of physicalKeys) summaryHeldKeys.add(key); for(const id of heldPointers)blockPointerClick(id); clearInput(); shake = 0; document.getElementById('toast').classList.remove('visible'); toastUntil=0; }
      if(event.type==='purchase')showUpgradeReceipt(event.offer.id,event.offer.nextBenefit,event.level);
      if (event.type === 'contractStamp') showToast('bond', event.count || game.contract?.stamps.length || '✓', 750);
      if (event.type === 'contractWon') showToast('bond', '+100', 1700);
      if (event.type === 'contractExpired') showToast('bond', '×', 1000);
      if (event.type === 'reset' && event.reason === 'return') {
        clearInput();
        showToast('heart', '♥', 1600);
      }
    }
    const ended=events.some(event=>['critical','victory','summary','reset','depart','summaryContinue'].includes(event.type));
    if(ended||!shockwaveForeground())clearShockwavePresentation();
    else for(const event of events)if(event.type==='shockwaveRelease'){
      for(const hazard of game.hazards)if(hazard.released&&!hazard.cosmetic&&hazard.ownerId===event.ownerId&&hazard.x===event.x&&hazard.y===event.y)shockwaveEligible.add(hazard);
      if(!reduceMotion&&!shockwavePulse)shockwavePulse={age:0};
    }
    announcePlayerBuffChanges(events);
  }
  function clearInput() {
    const captured=stick.pointer;stick.pointer=null;
    const joystick=document.getElementById('joystick');
    if(captured!==null&&joystick.hasPointerCapture(captured))joystick.releasePointerCapture(captured);
    game.invalidateShopIntent(); keys.clear(); stick.x = 0; stick.y = 0; interactQueued = false; supplyQueued = false;
    document.getElementById('joystick-thumb').style.transform = 'translate(-50%, -50%)';
    document.getElementById('joystick').classList.remove('active');
  }
  const gameKeys = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight', 'Space', 'KeyQ']);
  // Observe activation before gameplay's early returns; this bridge owns audio only.
  const summaryAudioPointers = new Map();
  let summaryAudioClick = false;
  const blockedPointerClicks=new Set();let blockedLegacyClick=false;
  function blockPointerClick(id) {
    blockedPointerClicks.add(id);blockedLegacyClick=true;
    if(blockedPointerClicks.size>32)blockedPointerClicks.delete(blockedPointerClicks.values().next().value);
  }
  const activationAudio = event => {
    if (!event.isTrusted) return;
    if (event.type === 'keydown' && (event.repeat || event.ctrlKey || event.metaKey || event.altKey || ['Escape', 'Shift', 'Control', 'Alt', 'Meta'].includes(event.key))) return;
    if (event.type === 'pointerup' && event.pointerType === 'mouse') return;
    if (event.type === 'click' && summaryAudioClick) { summaryAudioClick = false; return; }
    if (event.type === 'click' && event.target instanceof Element && event.target.closest('#summary-continue')) return;
    if (summaryAudioPointers.has(event.pointerId) && !summaryAudioPointers.get(event.pointerId)) return;
    getAudio();
  };
  for (const type of ['keydown', 'mousedown', 'pointerup', 'click']) window.addEventListener(type, activationAudio, { capture: true, passive: true });
  window.addEventListener('keydown', event => {
    if(document.hidden){event.preventDefault();return;}
    const fresh = !event.repeat && !physicalKeys.has(event.code);
    physicalKeys.add(event.code);
    // After focus cancellation, a still-held repeat must remain quarantined.
    if (event.repeat && !keys.has(event.code)) summaryHeldKeys.add(event.code);
    if (game.phase === 'dying' || game.phase === 'winning') { summaryHeldKeys.add(event.code); event.preventDefault(); return; }
    if (game.phase === 'summary') {
      if(['Tab','ShiftLeft','ShiftRight','ControlLeft','ControlRight','AltLeft','AltRight','MetaLeft','MetaRight'].includes(event.code))return;
      if(summaryUtility(event.target)){
        if(event.code==='Enter'||event.code==='Space'){
          const button=event.target.closest('button');
          if(!fresh||summaryHeldKeys.has(event.code)||!summaryReady()||!button){event.preventDefault();if(!fresh||!summaryReady())summaryHeldKeys.add(event.code);return;}
          shareKeyPermit={code:event.code,target:button,summary:game.summary};
        }
        return;
      }
      event.preventDefault();
      const eligible = fresh && !summaryHeldKeys.has(event.code);
      summaryHeldKeys.add(event.code);
      if (eligible && summaryReady() && game.continueSummary()) { clearInput(); canvas.focus({ preventScroll: true }); getAudio(); }
      return;
    }
    if (summaryHeldKeys.has(event.code)) { event.preventDefault(); return; }
    if (!gameKeys.has(event.code) || event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.target instanceof HTMLButtonElement || event.target instanceof HTMLInputElement) return;
    event.preventDefault(); if (!fresh) return; keys.add(event.code);
    if(fresh&&event.code==='Space')requestMarketAction('buy');
    if(event.code==='KeyQ'&&fresh)requestLegacySupply();
    if (soundEnabled) getAudio();
  });
  window.addEventListener('keyup', event => { physicalKeys.delete(event.code); summaryHeldKeys.delete(event.code); if (gameKeys.has(event.code)) { keys.delete(event.code); if (!(event.target instanceof HTMLButtonElement)) event.preventDefault(); } });
  const loseFocus = () => { clearShockwavePresentation(); physicalKeys.clear(); summaryHeldKeys.clear(); heldPointers.clear(); clearInput(); soundtrack.setActive(false); };
  window.addEventListener('blur', loseFocus);
  const restoreAudio = () => { soundtrack.setActive(!document.hidden && document.hasFocus()); getAudio(); };
  window.addEventListener('focus', restoreAudio);
  document.addEventListener('visibilitychange', () => {
    previousTime=performance.now();resumeFramePending=true;
    document.getElementById?.('summary-screen')?.classList[game.phase==='summary' && document.hidden ? 'add' : 'remove']('decorations-paused');
    if (document.hidden) { pauseSummaryPresentation(); presentedDeath=null; presentedVictory=null; loseFocus(); } else restoreAudio();
  });
  window.addEventListener('pointerdown', event => {
    const fresh = !heldPointers.has(event.pointerId); heldPointers.add(event.pointerId);
    if (game.phase !== 'summary' && game.phase !== 'dying' && game.phase !== 'winning') {
      if(fresh){blockedPointerClicks.delete(event.pointerId);blockedLegacyClick=false;}
      summaryAudioPointers.delete(event.pointerId); summaryAudioClick = false; return;
    }
    if(game.phase==='summary'&&summaryUtility(event.target)){
      sharePointerPermit={id:event.pointerId,summary:game.summary,allowed:fresh&&summaryReady()};
      if(!sharePointerPermit.allowed){event.preventDefault();event.stopImmediatePropagation();blockPointerClick(event.pointerId);}return;
    }
    blockPointerClick(event.pointerId);
    event.preventDefault(); event.stopImmediatePropagation();
    const accepted = game.phase==='summary' && fresh && summaryReady() && game.continueSummary();
    summaryAudioClick = !accepted;
    summaryAudioPointers.set(event.pointerId, accepted);
    if (summaryAudioPointers.size > 32) summaryAudioPointers.delete(summaryAudioPointers.keys().next().value);
    if (accepted) { clearInput(); canvas.focus({ preventScroll: true }); getAudio(); }
  }, { capture: true, passive: false });
  for (const type of ['pointerup', 'pointercancel']) window.addEventListener(type, event => {heldPointers.delete(event.pointerId);if(type==='pointercancel'&&sharePointerPermit?.id===event.pointerId)sharePointerPermit=null;}, true);
  // Continuation is handled at fresh pointer/key down. A delayed click from
  // a press begun during the lock can never become a later dismissal.
  window.addEventListener('click',event=>{
    if(game.phase==='summary'&&summaryUtility(event.target)){
      const button=event.target.closest('button');if(!button)return;
      const key=shareKeyPermit&&shareKeyPermit.summary===game.summary&&shareKeyPermit.target===button;
      const pointer=sharePointerPermit&&sharePointerPermit.summary===game.summary&&sharePointerPermit.allowed&&(!('pointerId'in event)||event.pointerId===sharePointerPermit.id);
      const assistive=event.detail===0&&!physicalKeys.has('Space')&&!physicalKeys.has('Enter')&&!summaryHeldKeys.has('Space')&&!summaryHeldKeys.has('Enter');
      shareKeyPermit=sharePointerPermit=null;event.preventDefault();event.stopImmediatePropagation();
      if(summaryReady()&&(key||pointer||assistive))activateShare();return;
    }
    const delayed=blockedPointerClicks.has(event.pointerId)||(!('pointerId' in event)&&event.detail>0&&blockedLegacyClick);
    const heldKey=event.detail===0&&(summaryHeldKeys.has('Space')||summaryHeldKeys.has('Enter'));
    if(game.phase==='dying'||game.phase==='winning'||game.phase==='summary'||delayed||heldKey){event.preventDefault();event.stopImmediatePropagation();}
  },{capture:true,passive:false});
  document.getElementById('summary-continue').addEventListener('click', event => event.preventDefault());
  canvas.addEventListener('pointerdown', () => { canvas.focus({ preventScroll: true }); if (soundEnabled) getAudio(); });
  const joypad = document.getElementById('joystick'), thumb = document.getElementById('joystick-thumb');
  function moveStick(event) {
    if(document.hidden)return;
    const box = joypad.getBoundingClientRect(), radius = box.width * .34;
    let dx = event.clientX - box.x - box.width / 2, dy = event.clientY - box.y - box.height / 2;
    const length = Math.hypot(dx, dy);
    if (length > radius) { dx *= radius / length; dy *= radius / length; }
    if (length < 7) { dx = 0; dy = 0; }
    stick.x = dx / radius; stick.y = dy / radius;
    thumb.style.transform = 'translate(calc(-50% + ' + dx + 'px), calc(-50% + ' + dy + 'px))';
  }
  joypad.addEventListener('pointerdown', event => {
    if (document.hidden || (game.phase !== 'shop' && game.phase !== 'run') || stick.pointer !== null || event.pointerType==='mouse'&&event.button!==0) return;
    event.preventDefault(); joypad.setPointerCapture(event.pointerId); stick.pointer = event.pointerId; joypad.classList.add('active'); moveStick(event); if (soundEnabled) getAudio();
  });
  joypad.addEventListener('pointermove', event => { if (event.pointerId === stick.pointer) { event.preventDefault(); moveStick(event); } });
  const releaseStick = event => { if (event.pointerId === stick.pointer) clearInput(); };
  joypad.addEventListener('pointerup', releaseStick); joypad.addEventListener('pointercancel', releaseStick); joypad.addEventListener('lostpointercapture', releaseStick);
  joypad.addEventListener('contextmenu', event => event.preventDefault());
  function bindMarketButton(button, kind, shownIntent=()=>displayedBuyIntent) {
    const presses=new Set(),clicks=new Set(),keyPresses=new Set();let pointerClick=false;
    const activate=()=>{if(button.disabled||button.hidden)return;if(soundEnabled)getAudio();requestMarketAction(kind,shownIntent());};
    button.addEventListener('pointerdown',event=>{
      if(event.pointerType==='mouse'&&event.button!==0)return;
      event.preventDefault();if(presses.has(event.pointerId))return;
      presses.add(event.pointerId);clicks.add(event.pointerId);pointerClick=true;
      if(clicks.size>16)clicks.delete(clicks.values().next().value);activate();
    });
    for(const type of ['pointerup','pointercancel'])window.addEventListener(type,event=>{presses.delete(event.pointerId);if(type==='pointercancel')game.invalidateShopIntent();},true);
    button.addEventListener('keydown',event=>{
      if(event.code!=='Space'&&event.code!=='Enter')return;
      event.preventDefault();if(event.repeat||keyPresses.has(event.code))return;keyPresses.add(event.code);pointerClick=false;activate();
    });
    window.addEventListener('keyup',event=>{if(keyPresses.delete(event.code))event.preventDefault();});
    window.addEventListener('blur',()=>{presses.clear();keyPresses.clear();});
    button.addEventListener('click',event=>{
      if(clicks.has(event.pointerId)||event.detail>0&&pointerClick||keyPresses.size){event.preventDefault();return;}
      // Keyboard presses are handled above; detail-zero remains available to
      // assistive technology that invokes the button without a pointer press.
      if(event.detail===0)activate();
    });
  }
  const supplyButton = document.getElementById('use-supply');
  const supplyTouches = new Set(), supplyTouchClicks = new Set();
  const usePackedSupply = () => { if(soundEnabled)getAudio();requestLegacySupply();canvas.focus({preventScroll:true}); };
  supplyButton.addEventListener('pointerdown', event => {
    if (event.pointerType !== 'touch') return;
    // A fresh primary touch retains the ordinary click path. A second finger
    // has no synthesized click while the first remains on the joypad.
    if (event.isPrimary) { supplyTouchClicks.delete(event.pointerId); return; }
    event.preventDefault();
    if (supplyTouches.has(event.pointerId)) return;
    supplyTouches.add(event.pointerId);
    supplyTouchClicks.delete(event.pointerId); supplyTouchClicks.add(event.pointerId);
    if (supplyTouchClicks.size > 8) supplyTouchClicks.delete(supplyTouchClicks.values().next().value);
    usePackedSupply();
  });
  for (const type of ['pointerup', 'pointercancel']) window.addEventListener(type, event => supplyTouches.delete(event.pointerId), true);
  supplyButton.addEventListener('click', event => {
    if (event.pointerType === 'touch' && supplyTouchClicks.has(event.pointerId)) { event.preventDefault(); return; }
    usePackedSupply();
  });
  window.addEventListener('storage', event => {
    if(event.key===STATE_SAVE_KEY&&marketStore)persistentMutation(record=>({record})).catch(()=>{});
  });
  function input() {
    if(document.hidden||!marketInitialized)return{x:0,y:0,interact:false,useSupply:false};
    const keyboardX = Number(keys.has('KeyD') || keys.has('ArrowRight')) - Number(keys.has('KeyA') || keys.has('ArrowLeft'));
    const keyboardY = Number(keys.has('KeyS') || keys.has('ArrowDown')) - Number(keys.has('KeyW') || keys.has('ArrowUp'));
    return { x: keyboardX || stick.x, y: keyboardY || stick.y, interact: false, useSupply: false };
  }
  function frameTick(now) {
    const elapsedDt = Math.max(0, (now - previousTime) / 1000); previousTime = now;
    const dt=document.hidden||resumeFramePending?0:elapsedDt;
    if(!document.hidden)resumeFramePending=false;
    applyDeferredGameplayEffects();
    atmosphereTime += Math.min(dt, .1);
    // A newly visible death must be drawn at its current age before advancing.
    // Visible ordinary simulation keeps full dt; hidden callbacks use zero above.
    const simulationDt=game.phase==='dying'?(document.hidden||presentedDeath!==game.summary?0:Math.min(dt,DEATH_FLOURISH.frameCap)):game.phase==='winning'?(document.hidden||presentedVictory!==game.summary?0:Math.min(dt,VICTORY_FLOURISH.frameCap)):dt;
    game.step(simulationDt, input()); interactQueued = false; supplyQueued = false;
    processEvents(); updateHud(); render(Math.min(dt, .1));
    if (toastUntil && now > toastUntil) { document.getElementById('toast').classList.remove('visible'); toastUntil = 0; }
    requestAnimationFrame(frameTick);
  }
  updateHud(); render(1); getAudio(); requestAnimationFrame(frameTick);
  if (testMode) window.__fryingPanguin = { game, snowState, backgroundState:()=>({hidden:document.hidden,neutralResume:resumeFramePending,supply:deferredSupply&&{...deferredSupply},ticket:deferredTicket&&{...deferredTicket}}), shockwaveState:()=>({age:shockwavePulse?.age??null,amplitude:shockwavePulse?1.5*Math.pow(Math.max(0,1-shockwavePulse.age/.14),2):0,projection:{...shopProjection},eligible:game.hazards.map(h=>shockwaveEligible.has(h))}), processEvents, render: (dt=1) => { updateHud(); render(dt); }, input, inputState: () => ({ physical: [...physicalKeys], quarantined: [...summaryHeldKeys], pointers: [...heldPointers], audioPointers: summaryAudioPointers.size }), camera, soundtrack, setSoundEnabled, soundEnabled:()=>soundEnabled, buyIntent:()=>displayedBuyIntent&&({...displayedBuyIntent}), requestMarketAction, requestLegacySupply, marketReady:()=>marketReadyPromise, flushMarket, persistenceReady:()=>marketReadyPromise, flushPersistence:flushMarket, readPersistentState };
})();
