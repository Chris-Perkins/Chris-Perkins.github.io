(() => {
  'use strict';

  // All artwork is local, overhead, and drawn on a one-pixel grid.
  const C = Object.freeze({
    ink: '#34485e', snow: '#edf3eb', snowLight: '#fafaf0', snowShade: '#d6e5df',
    ice: '#c0dae1', iceLight: '#e1eeeb', iceDark: '#8baebf', sea: '#85b8cb',
    water: '#6394b2', wood: '#c5a287', woodLight: '#e1c3a2', coral: '#df8496',
    coralLight: '#edb3a2', gold: '#efcf82', blue: '#7798ad'
  });
  const alphabet = {
    A:['01110','10001','10001','11111','10001','10001','10001'],B:['11110','10001','10001','11110','10001','10001','11110'],C:['01111','10000','10000','10000','10000','10000','01111'],D:['11110','10001','10001','10001','10001','10001','11110'],E:['11111','10000','10000','11110','10000','10000','11111'],F:['11111','10000','10000','11110','10000','10000','10000'],G:['01111','10000','10000','10111','10001','10001','10001'],H:['10001','10001','10001','11111','10001','10001','10001'],I:['111','010','010','010','010','010','111'],J:['00111','00010','00010','00010','10010','10010','01100'],K:['10001','10010','10100','11000','10100','10010','10001'],L:['10000','10000','10000','10000','10000','10000','11111'],M:['10001','11011','10101','10101','10001','10001','10001'],N:['10001','11001','10101','10011','10001','10001','10001'],O:['01110','10001','10001','10001','10001','10001','01110'],P:['11110','10001','10001','11110','10000','10000','10000'],Q:['01110','10001','10001','10001','10101','10010','01101'],R:['11110','10001','10001','11110','10100','10010','10001'],S:['01111','10000','10000','01110','00001','00001','11110'],T:['11111','00100','00100','00100','00100','00100','00100'],U:['10001','10001','10001','10001','10001','10001','01110'],V:['10001','10001','10001','10001','10001','01010','00100'],W:['10001','10001','10001','10101','10101','10101','01010'],X:['10001','10001','01010','00100','01010','10001','10001'],Y:['10001','10001','01010','00100','00100','00100','00100'],Z:['11111','00001','00010','00100','01000','10000','11111'],
    '0':['111','101','101','101','101','101','111'],'1':['010','110','010','010','010','010','111'],'2':['111','001','001','111','100','100','111'],'3':['111','001','001','111','001','001','111'],'4':['101','101','101','111','001','001','001'],'5':['111','100','100','111','001','001','111'],'6':['111','100','100','111','101','101','111'],'7':['111','001','001','010','010','010','010'],'8':['111','101','101','111','101','101','111'],'9':['111','101','101','111','001','001','111'],
    '+':['000','010','010','111','010','010','000'],'-':['000','000','000','111','000','000','000'],':':['0','1','1','0','1','1','0'],'.':['0','0','0','0','0','1','1'],'!':['1','1','1','1','1','0','1'],'?':['111','001','001','010','010','000','010'],'/':['001','001','010','010','010','100','100'],'&':['01100','10010','10100','01000','10101','10010','01101']
  };
  function rect(ctx,x,y,w,h,color) {
    ctx.fillStyle=color;
    ctx.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));
  }
  function pixelText(ctx,value,x,y,color,scale=1,align='left') {
    const text=String(value).toUpperCase();
    const width=[...text].reduce((sum,char)=>sum+(alphabet[char]?.[0].length||3)+1,0)*scale;
    if(align==='center')x-=width/2;
    if(align==='right')x-=width;
    ctx.fillStyle=color;
    for(const char of text){
      const glyph=alphabet[char];
      if(glyph)for(let row=0;row<glyph.length;row++)for(let col=0;col<glyph[row].length;col++)if(glyph[row][col]==='1')ctx.fillRect(Math.round(x+col*scale),Math.round(y+row*scale),scale,scale);
      x+=((glyph?.[0].length||3)+1)*scale;
    }
  }
  function oval(ctx,x,y,rx,ry,color,step=1) {
    if(ry<=0){rect(ctx,x-rx,y,rx*2+1,1,color);return;}
    for(let dy=-ry;dy<=ry;dy+=step){
      const span=Math.floor(Math.sqrt(Math.max(0,1-dy*dy/(ry*ry)))*rx/step)*step;
      rect(ctx,x-span,y+dy,span*2+step,step,color);
    }
  }
  function cross(ctx,x,y,color) {
    rect(ctx,x-2,y,5,1,color);rect(ctx,x,y-2,1,5,color);
  }
  function ring(ctx,x,y,r,color) {
    for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++){
      const d=dx*dx+dy*dy;
      if(d<=r*r&&d>(r-1.5)*(r-1.5))rect(ctx,x+dx,y+dy,1,1,color);
    }
  }
  function annulus(ctx,x,y,outer,inner,color) {
    // Two scanline spans retain the exact pixel footprint without sampling an
    // entire large warning disk each frame.
    for(let dy=Math.ceil(-outer);dy<=Math.floor(outer);dy++){
      const span=Math.floor(Math.sqrt(Math.max(0,outer*outer-dy*dy)));
      const cut=inner>Math.abs(dy)?Math.ceil(Math.sqrt(inner*inner-dy*dy))-1:-1;
      if(cut<0)rect(ctx,x-span,y+dy,span*2+1,1,color);
      else if(span>cut){rect(ctx,x-span,y+dy,span-cut,1,color);rect(ctx,x+cut+1,y+dy,span-cut,1,color);}
    }
  }
  function stars(ctx,x,y,r,time,count=3) {
    for(let i=0;i<count;i++){
      const a=time*5+i*Math.PI*2/count,sx=Math.round(x+Math.cos(a)*r),sy=Math.round(y+Math.sin(a)*r*.7);
      rect(ctx,sx-1,sy-2,3,5,'#b69561');rect(ctx,sx-2,sy-1,5,3,'#b69561');cross(ctx,sx,sy,'#ffe2a0');rect(ctx,sx,sy,1,1,'#fff6cf');
    }
  }
  function bowlingCue(ctx,object,time,reduceMotion,radius) {
    const x=Math.round(object.x),y=Math.round(object.y);
    const vx=object.bowlVx??object.vx??object.facingX??0,vy=object.bowlVy??object.vy??object.facingY??1;
    const length=Math.hypot(vx,vy)||1,fx=vx/length,fy=vy/length;
    ring(ctx,x,y,radius+4,'#d4b46f');
    // Friendly outgoing bonks get mint ticks; hostile charges stay coral.
    for(let i=0;i<3;i++)for(const side of [-1,1]){
      const d=radius+6+i*5,sx=x-fx*d-fy*side*3,sy=y-fy*d+fx*side*3;
      rect(ctx,sx,sy,i===2?1:2,1,i===2?'#c1dcd0':'#92beb0');
    }
    const a=reduceMotion?0:time*7;
    for(let i=0;i<2;i++){const angle=a+i*Math.PI;rect(ctx,x+Math.cos(angle)*(radius+4),y+Math.sin(angle)*(radius+4),2,2,'#fff0b5');}
    if(object.bounceReady||object.bounceUsed)reboundCue(ctx,x+radius+5,y-radius+2,object.bounceUsed);
  }
  function reboundCue(ctx,x,y,used=false) {
    // A tiny lavender bent arrow marks a friendly body's one bankshot.
    const shade=used?'#b6bfc4':'#ae8fb6',light=used?'#dae1dc':'#ead5e7';
    rect(ctx,x-3,y-3,5,1,shade);rect(ctx,x+2,y-2,1,4,shade);rect(ctx,x-1,y+2,3,1,shade);
    rect(ctx,x-2,y+1,2,3,shade);rect(ctx,x-3,y+2,1,1,shade);rect(ctx,x-2,y-2,3,1,light);rect(ctx,x+1,y-1,1,2,light);
  }
  function bondStamp(ctx,x,y) {
    // An overhead polar-bear paw seal, shared by contract lids and shop icons.
    oval(ctx,x,y,5,5,'#6d8a9b');oval(ctx,x,y,4,4,'#c8e3e4');
    oval(ctx,x,y+1,2,2,'#6e96a6');
    rect(ctx,x-3,y-2,1,2,'#6e96a6');rect(ctx,x-1,y-3,1,2,'#6e96a6');rect(ctx,x+1,y-3,1,2,'#6e96a6');rect(ctx,x+3,y-2,1,2,'#6e96a6');
  }
  function peelGlyph(ctx,x,y) {
    rect(ctx,x-1,y-6,3,4,'#9b815b');rect(ctx,x,y-5,1,3,'#dcc37a');
    // Three flat flaps make a peel rather than another round coin.
    for(let i=0;i<5;i++){
      rect(ctx,x-2-i,y-1+i*.6,3,3,'#a98a53');rect(ctx,x+1+i,y-1+i*.6,3,3,'#a98a53');
    }
    for(let i=0;i<5;i++){
      rect(ctx,x-1-i,y+i*.6,2,1,'#f1d787');rect(ctx,x+1+i,y+i*.6,2,1,'#f1d787');
    }
    rect(ctx,x-1,y-1,3,8,'#a98a53');rect(ctx,x,y,1,6,'#fff0ad');rect(ctx,x-2,y-1,5,2,'#f4da88');
  }
  const hornCache=new Map();
  function hornSprite(direction=0,small=false) {
    const key=direction+'|'+small;if(hornCache.has(key))return hornCache.get(key);
    const canvas=document.createElement('canvas');canvas.width=canvas.height=24;
    const ctx=canvas.getContext('2d'),a=direction*Math.PI/4,fx=Math.cos(a),fy=Math.sin(a),scale=small?.65:1;
    for(let y=-10;y<=10;y++)for(let x=-10;x<=10;x++){
      const u=(x*fx+y*fy)/scale,v=(-x*fy+y*fx)/scale;
      let color=null;
      if(u>-7&&u<-2&&Math.abs(v)<1.5)color='#806945';
      if(u>=-3&&u<6&&Math.abs(v)<1.6+(u+3)*.35)color='#806945';
      if(u>=-2&&u<5&&Math.abs(v)<.7+(u+2)*.35)color='#e8c77c';
      if(u>4&&u<6&&Math.abs(v)<4.9)color='#806945';
      if(u>4&&u<5.1&&Math.abs(v)<3.7)color='#f7de93';
      if(u>-2&&u<4&&v>-.5&&v<.7)color='#fff0bb';
      if(color)rect(ctx,x+12,y+12,1,1,color);
    }
    hornCache.set(key,canvas);return canvas;
  }
  function shopGlyph(ctx,kind,x,y) {
    if(kind==='banana')peelGlyph(ctx,x,y);
    else if(kind==='bond'){
      rect(ctx,x-8,y-10,16,21,C.ink);rect(ctx,x-7,y-9,14,19,'#f9edd7');rect(ctx,x-5,y-7,8,1,'#bfa78e');rect(ctx,x-5,y-5,5,1,'#bfa78e');bondStamp(ctx,x,y+2);rect(ctx,x+3,y+6,3,4,'#d69b9c');
    }else if(kind==='jelly'){
      oval(ctx,x,y,8,7,'#927ca5');oval(ctx,x,y,7,6,'#eededb');oval(ctx,x,y,5,5,'#aa749d');oval(ctx,x-1,y-1,4,4,'#dbaaC5');oval(ctx,x-2,y-2,2,2,'#f4d2dd');rect(ctx,x+2,y+2,1,1,'#bb87af');reboundCue(ctx,x+9,y-7);
    }else if(kind==='rocky'){
      rect(ctx,x-8,y-1,12,10,C.ink);rect(ctx,x-10,y+2,16,5,C.ink);rect(ctx,x-7,y,10,8,'#91a8b3');rect(ctx,x-9,y+3,14,3,'#91a8b3');rect(ctx,x-6,y+1,5,3,'#c0d5d3');
      oval(ctx,x+3,y-3,6,6,'#7799ab');oval(ctx,x+3,y-3,5,5,'#dbece7');oval(ctx,x+2,y-4,3,3,'#fff9e9');rect(ctx,x-10,y-5,3,1,'#92beb0');rect(ctx,x-12,y-2,2,1,'#c1dcd0');
    }else if(kind==='greedy'){
      ctx.drawImage(hornSprite(0),x-13,y-10);oval(ctx,x-5,y-5,4,4,'#ae8b4e');oval(ctx,x-5,y-5,3,3,C.gold);rect(ctx,x-6,y-7,1,4,'#fff0b7');
    }else if(kind==='golden'){
      rect(ctx,x-1,y-2,13,3,'#806945');rect(ctx,x+5,y-2,6,1,'#edcd7d');oval(ctx,x-5,y,8,8,C.ink);oval(ctx,x-5,y,7,7,'#ba944f');oval(ctx,x-5,y,6,6,'#edcd79');oval(ctx,x-6,y-1,4,4,'#ffe5a0');rect(ctx,x-8,y-4,4,1,'#fff7ca');cross(ctx,x+7,y-7,'#e8c984');
    }else if(kind==='outing'){
      // HUD pictogram: home plus a returning arrow, independent of enemy KOs.
      for(let i=0;i<6;i++)rect(ctx,x-8+i,y-8-i*.7,16-i*2,2,'#6f8e9f');
      rect(ctx,x-8,y-6,16,13,'#6f8e9f');rect(ctx,x-6,y-5,12,10,'#d3e6df');rect(ctx,x-2,y,4,6,'#91b5ba');
      rect(ctx,x+6,y+6,5,2,'#9abdab');rect(ctx,x+10,y+1,2,6,'#7b9e8e');rect(ctx,x+5,y,7,2,'#7b9e8e');rect(ctx,x+4,y-1,2,4,'#7b9e8e');rect(ctx,x+3,y,1,2,'#7b9e8e');
    }else if(kind==='survival'){
      oval(ctx,x-2,y-1,9,9,'#6e8c9f');oval(ctx,x-2,y-1,7,7,'#eef0dc');rect(ctx,x-3,y-7,2,7,'#7692a2');rect(ctx,x-2,y-2,5,2,'#7692a2');rect(ctx,x-5,y-12,6,3,'#6e8c9f');
      rect(ctx,x+2,y+3,4,5,'#edf3eb');rect(ctx,x+1,y+4,3,2,'#6f9d84');rect(ctx,x+3,y+6,3,2,'#6f9d84');rect(ctx,x+5,y+4,3,2,'#6f9d84');rect(ctx,x+7,y+2,3,2,'#6f9d84');rect(ctx,x+9,y,2,2,'#6f9d84');
    }
  }
  function emote(ctx,kind,x,y) {
    rect(ctx,x-7,y,15,12,C.ink);rect(ctx,x-6,y+1,13,10,'#fff3d9');
    rect(ctx,x-1,y+12,3,2,C.ink);rect(ctx,x,y+12,1,1,'#fff3d9');
    if(kind==='bear'){
      const hx=x-1;
      rect(ctx,hx-5,y+3,4,3,'#ae7087');rect(ctx,hx+1,y+3,4,3,'#ae7087');rect(ctx,hx-5,y+5,10,3,'#ae7087');rect(ctx,hx-3,y+8,6,1,'#ae7087');rect(ctx,hx-1,y+9,2,1,'#ae7087');
      rect(ctx,hx-4,y+4,3,3,'#efa8b9');rect(ctx,hx+1,y+4,3,3,'#efa8b9');rect(ctx,hx-3,y+7,6,1,'#efa8b9');rect(ctx,hx-1,y+8,2,1,'#efa8b9');
      rect(ctx,x+6,y+2,1,4,C.coral);rect(ctx,x+6,y+7,1,1,C.coral);
    }else if(kind==='snowbird'){
      for(const side of [-1,1]){
        rect(ctx,x+side*3-2,y+4,4,3,'#7798ad');
        rect(ctx,x+side*4-1,y+3,2,3,'#e5eeea');
      }
      rect(ctx,x-1,y+4,3,4,'#d28b91');rect(ctx,x,y+9,1,1,C.coral);
    }else if(kind==='penguin'){
      rect(ctx,x-4,y+4,7,5,C.ink);rect(ctx,x-3,y+3,5,7,C.ink);rect(ctx,x+3,y+4,3,5,C.ink);
      rect(ctx,x-3,y+5,6,3,'#eda6a1');rect(ctx,x-2,y+4,4,5,'#eda6a1');rect(ctx,x+4,y+5,1,3,'#eda6a1');rect(ctx,x-2,y+5,1,1,C.ink);
    }else{
      rect(ctx,x-1,y+2,3,5,C.coral);rect(ctx,x,y+8,2,2,C.coral);
    }
  }

  function createTerrain(api,layout) {
    const {WORLD,SHOP,inShop,seededRandom}=api;
    const POND=layout?.pond||api.POND,shore=layout?.shore||api.SHORE;
    const landContains=(x,y,radius=0)=>api.landContains(x,y,radius,shore);
    const canvas=document.createElement('canvas');canvas.width=WORLD.width;canvas.height=WORLD.height;
    const ctx=canvas.getContext('2d',{alpha:false});ctx.imageSmoothingEnabled=false;
    const random=seededRandom(layout?.seed??41728);
    rect(ctx,0,0,WORLD.width,WORLD.height,C.sea);
    // The stepped sea edge follows the simulation's shore polygon exactly enough
    // to show the collision bank while preserving an unmistakable pixel grid.
    const landRows=Array.from({length:Math.ceil(WORLD.height/4)},()=>new Uint8Array(Math.ceil(WORLD.width/4)));
    for(let y=0;y<WORLD.height;y+=4)for(let x=0;x<WORLD.width;x+=4){
      if(!landContains(x+2,y+2))continue;
      landRows[y/4][x/4]=1;
      const edge=!landContains(x+2,y+2,10),inner=!landContains(x+2,y+2,17);
      rect(ctx,x,y,4,4,edge?'#a9ccd5':inner?'#d7e8e5':C.snow);
      if(edge&&landContains(x+2,y+2,4))rect(ctx,x,y,4,2,'#d9eeec');
    }
    for(let i=0;i<650;i++){
      const x=Math.round(random()*WORLD.width),y=Math.round(random()*WORLD.height);
      if(landContains(x,y,0))continue;
      rect(ctx,x,y,5+Math.floor(random()*11),1,i%3?'#a4ced7':'#c7e5e4');
      if(i%4===0)rect(ctx,x+2,y+3,4,1,'#92c2d1');
    }
    for(const [x,y,r] of [[28,93,9],[119,28,14],[890,95,10],[943,584,13],[28,615,12],[818,704,8],[236,699,10],[935,47,14]]){
      if(landContains(x,y,r+4))continue;
      oval(ctx,x,y,r,r*.65,'#669fb9',2);oval(ctx,x,y-2,r-1,r*.6,C.ice,2);oval(ctx,x-2,y-3,r-4,r*.4,C.snowLight,2);
      rect(ctx,x-r+5,y,r-2,1,'#a3c8d3');
    }
    // Wind-smoothed snow: subtle flecks, ice specks and little drifts.
    for(let i=0;i<2500;i++){
      const x=Math.round(random()*WORLD.width),y=Math.round(random()*WORLD.height);
      if(!landContains(x,y,24)||inShop(x,y,12))continue;
      rect(ctx,x,y,i%8===0?5:2,1,i%3?'#e2ece6':'#d7e5e1');
      if(i%25===0){rect(ctx,x,y-1,5,1,C.snowLight);rect(ctx,x+2,y+1,6,1,'#dce8e3');}
    }
    for(let i=0;i<55;i++){
      const x=Math.round(60+random()*840),y=Math.round(50+random()*600);
      if(!landContains(x,y,25)||inShop(x,y,28)||Math.abs(x-480)<40)continue;
      oval(ctx,x,y,10+random()*8,3,'#d8e7e3',2);oval(ctx,x-2,y-2,8+random()*6,2,C.snowLight,2);
    }
    // Packed snow and paired footprints gently hint at exploration.
    ctx.save();ctx.beginPath();
    // The identical sampled land mask needs one span per row, rather than tens
    // of thousands of touching clip rectangles (costly in WebKit).
    for(let row=0;row<landRows.length;row++){
      const cells=landRows[row];
      for(let col=0;col<cells.length;){
        if(!cells[col]){col++;continue;}
        const start=col;while(col<cells.length&&cells[col])col++;
        ctx.rect(start*4,row*4,(col-start)*4,4);
      }
    }
    ctx.clip();
    ctx.strokeStyle='#dbe7e1';ctx.lineWidth=25;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(480,246);ctx.lineTo(480,347);ctx.bezierCurveTo(480,420,512,456,485,583);ctx.stroke();
    ctx.lineWidth=20;ctx.beginPath();ctx.moveTo(143,350);ctx.bezierCurveTo(330,345,560,360,824,350);ctx.stroke();
    for(let i=0;i<27;i++){
      const x=477+Math.sin(i*.55)*3,y=256+i*11;
      rect(ctx,x-3,y,2,3,'#c6dbd9');rect(ctx,x+3,y+4,2,3,'#c6dbd9');
    }
    for(let i=0;i<48;i++){const x=156+i*14,y=349+Math.sin(i*.4)*3;rect(ctx,x,y-3,3,2,'#c9ddda');rect(ctx,x+5,y+3,3,2,'#c9ddda');}
    ctx.restore();
    // A cold open pond with a thick, readable icy rim. No plants or lily pads.
    oval(ctx,POND.x,POND.y,POND.rx+9,POND.ry+9,'#bad5da',2);
    oval(ctx,POND.x,POND.y,POND.rx+5,POND.ry+5,C.snowLight,2);
    oval(ctx,POND.x,POND.y,POND.rx,POND.ry,'#507f9f',2);
    oval(ctx,POND.x,POND.y-1,POND.rx-3,POND.ry-3,'#80b1c6',2);
    oval(ctx,POND.x-4,POND.y-3,POND.rx-10,POND.ry-9,'#93c4d1',2);
    for(let i=0;i<28;i++){
      const rx=Math.max(4,POND.rx-12),ry=Math.max(4,POND.ry-10),x=POND.x-rx+random()*rx*2,y=POND.y-ry+random()*ry*2;
      if(((x-POND.x)/rx)**2+((y-POND.y)/ry)**2<1)rect(ctx,x,y,5+random()*8,1,'#bedfe2');
    }
    for(const [dx,dy,r] of [[-.58,-.25,7],[.27,.3,9],[.39,-.27,5]]){
      const x=POND.x+dx*POND.rx,y=POND.y+dy*POND.ry;
      oval(ctx,x,y,r,r*.45,'#649cb5',2);oval(ctx,x,y-1,r-1,r*.4,'#dbede8',2);rect(ctx,x-r+3,y-2,r,1,C.snowLight);
    }
    // Delicate cracks lie in the shoreline ice, rather than looking like grass.
    for(const [x,y] of [[173,126],[859,297],[121,493],[573,652],[838,592]]){
      if(!landContains(x,y,22))continue;
      rect(ctx,x,y,12,1,'#b8d6d9');rect(ctx,x+11,y-3,1,4,'#b8d6d9');rect(ctx,x+11,y-3,8,1,'#b8d6d9');rect(ctx,x+17,y-5,1,2,'#b8d6d9');
    }
    drawShop(ctx,SHOP);
    // Floor-map arrows: flat painted ice tiles seen from overhead.
    rect(ctx,472,275,16,13,'#c4dce0');rect(ctx,474,277,12,9,'#e5f0e9');rect(ctx,479,279,2,5,C.blue);rect(ctx,477,282,6,1,C.blue);rect(ctx,478,283,4,1,C.blue);
    return canvas;
  }

  const upgradeCanvases=new Map(),upgradeURLs=new Map();
  function upgradeIconCanvas(id){
    if(!['heart','walk','swing'].includes(id))return null;
    if(upgradeCanvases.has(id))return upgradeCanvases.get(id);
    const canvas=document.createElement('canvas');canvas.width=canvas.height=32;
    const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;
    const ink='#34485e',cream='#fff0d6';
    if(id==='heart'){
      // Clean candy-heart silhouette: one highlight, one quiet lower shade.
      const outline=[[7,4,6,1],[19,4,6,1],[5,5,9,2],[18,5,9,2],[4,7,11,2],[17,7,11,2],[3,9,26,7],[4,16,24,3],[6,19,20,2],[8,21,16,2],[10,23,12,2],[12,25,8,2],[14,27,4,1]];
      for(const [x,y,w,h]of outline)rect(ctx,x,y,w,h,ink);
      const fill=[[7,6,6,2],[19,6,6,2],[5,8,9,3],[18,8,9,3],[5,10,22,6],[6,16,20,2],[8,18,16,2],[10,20,12,2],[12,22,8,2],[14,24,4,2]];
      for(const [x,y,w,h]of fill)rect(ctx,x,y,w,h,'#e79b9e');
      rect(ctx,7,8,5,2,cream);
      rect(ctx,10,20,12,2,'#d98794');rect(ctx,12,22,8,2,'#d98794');rect(ctx,14,24,4,2,'#d98794');
    }else if(id==='walk'){
      // Two-pixel cuffs and soles survive the shop's 32-to-24px reduction.
      rect(ctx,5,11,10,13,ink);rect(ctx,2,20,13,7,ink);
      rect(ctx,7,13,6,11,'#edbd8c');rect(ctx,4,22,9,3,'#edbd8c');
      rect(ctx,11,13,2,11,'#d99f77');rect(ctx,4,24,9,1,'#d99f77');
      rect(ctx,4,6,11,7,ink);rect(ctx,6,8,7,3,cream);
      rect(ctx,18,14,10,11,ink);rect(ctx,18,22,12,6,ink);
      rect(ctx,20,16,6,9,'#edbd8c');rect(ctx,20,24,8,2,'#edbd8c');
      rect(ctx,24,16,2,9,'#d99f77');rect(ctx,20,25,8,1,'#d99f77');
      rect(ctx,18,9,11,7,ink);rect(ctx,20,11,7,3,cream);
    }else{
      // Plain silver pan with a crisp rim and a short, straight wooden grip.
      const grip=[[21,19,4,1],[21,20,6,1],[22,21,6,1],[23,22,6,1],[24,23,6,1],[25,24,5,1],[26,25,4,1],[27,26,2,1]];
      for(const [x,y,w,h]of grip)rect(ctx,x,y,w,h,ink);
      for(const [x,y,w]of [[22,20,2],[23,21,3],[24,22,3],[25,23,3],[26,24,3],[27,25,1]])rect(ctx,x,y,w,1,'#d5aa83');
      oval(ctx,12,13,11,11,ink);oval(ctx,12,13,9,9,'#8daab8');oval(ctx,12,13,7,7,'#c4d7da');
      rect(ctx,7,6,7,1,cream);rect(ctx,5,8,2,5,cream);
    }
    upgradeCanvases.set(id,canvas);return canvas;
  }
  function drawUpgradeIcon(ctx,id,x,y,size=32){const canvas=upgradeIconCanvas(id);if(!canvas)return false;ctx.drawImage(canvas,x-size/2,y-size/2,size,size);return true;}
  function upgradeIconDataURL(id){const canvas=upgradeIconCanvas(id);if(!canvas)return '';if(!upgradeURLs.has(id))upgradeURLs.set(id,canvas.toDataURL('image/png'));return upgradeURLs.get(id);}

  function drawShop(ctx,shop) {
    const {x,y,width:w,height:h}=shop;
    rect(ctx,x-3,y-3,w+6,h+6,'#d3e3df');rect(ctx,x-1,y-1,w+2,h+2,C.ink);
    rect(ctx,x,y,w,h,'#f1e4ce');
    for(let fy=y+34;fy<y+h-10;fy+=10)rect(ctx,x+10,fy,w-20,9,(fy/10|0)%2?'#eedfc9':'#e8d7bc');
    rect(ctx,x,y,w,34,'#9db7c3');rect(ctx,x+3,y+3,w-6,28,'#c6dce0');
    rect(ctx,x+w/2-42,y+7,84,20,'#e8efe7');pixelText(ctx,'POLAR',x+w/2,y+14,'#6b8b9e',1,'center');
    for(const display of window.FryingPanguin.SHOP_DISPLAYS){
      const c=display.counter;rect(ctx,c.x,c.y,c.w,c.h,C.ink);rect(ctx,c.x+2,c.y+2,c.w-4,c.h-4,display.id==='heart'?'#e7b5b5':display.id==='walk'?'#b9cfb0':'#a6c2cf');
      drawUpgradeIcon(ctx,display.id,display.x,c.y+13,24);
    }
    rect(ctx,shop.spawnX-23,shop.spawnY-12,46,32,'#b38f8d');
    rect(ctx,shop.spawnX-21,shop.spawnY-10,42,28,'#efd4b9');
    for(let i=0;i<4;i++)rect(ctx,shop.spawnX-15+i*9,shop.spawnY+9,3,3,'#d8ae9d');
    rect(ctx,x,y+34,10,h-34,C.ink);rect(ctx,x+2,y+34,6,h-36,'#d4e4e3');
    rect(ctx,x+w-10,y+34,10,h-34,C.ink);rect(ctx,x+w-8,y+34,6,h-36,'#d4e4e3');
    for(const [left,width] of [[x,shop.doorLeft-x],[shop.doorRight,x+w-shop.doorRight]]){
      rect(ctx,left,y+h-10,width,10,C.ink);rect(ctx,left+2,y+h-8,width-4,6,'#d4e4e3');
    }
    rect(ctx,shop.doorLeft,y+h-10,shop.doorRight-shop.doorLeft,10,'#f1e4ce');
  }
  function drawCounter(ctx,x,y,w,accent) {
    rect(ctx,x,y,w,32,'#697a88');rect(ctx,x+1,y+1,w-2,30,accent);rect(ctx,x+3,y+3,w-6,26,'#e4cfb4');rect(ctx,x+4,y+4,w-8,24,'#f0dfc1');
    rect(ctx,x+5,y+23,w-10,1,'#d4bb9e');
    for(let i=0;i<3;i++){
      const cx=x+12+i*(w-24)/2;
      if(x>480){oval(ctx,cx,y+12,7,6,C.ink);oval(ctx,cx,y+12,5,4,'#9eb4bb');rect(ctx,cx+5,y+11,8,2,C.ink);rect(ctx,cx-3,y+9,4,1,'#dde6df');}
      else{oval(ctx,cx,y+12,7,6,'#9b8583');oval(ctx,cx,y+12,6,5,'#f7ecd5');oval(ctx,cx,y+12,4,3,'#dca480');rect(ctx,cx-2,y+10,2,1,'#f4d595');rect(ctx,cx+1,y+12,1,2,'#b0b898');rect(ctx,cx-2,y+13,2,1,'#f4d595');rect(ctx,cx+6,y+8,2,8,'#887f87');rect(ctx,cx+6,y+8,3,3,'#b9c7c8');}
    }
  }

  let snowbankSprite=null;
  function snowbank() {
    if(snowbankSprite)return snowbankSprite;
    snowbankSprite=document.createElement('canvas');snowbankSprite.width=30;snowbankSprite.height=28;
    const ctx=snowbankSprite.getContext('2d');
    const contains=(x,y)=>(x+4)**2/81+y*y/81<1||(x-5)**2/64+(y-2)**2/64<1||x*x/100+(y+4)**2/64<1;
    for(let y=-13;y<=13;y++)for(let x=-14;x<=14;x++){
      if(!contains(x,y))continue;
      const edge=!contains(x-1,y)||!contains(x+1,y)||!contains(x,y-1)||!contains(x,y+1);
      rect(ctx,x+15,y+14,1,1,edge?'#a8c6cf':y>4?'#d5e6e2':x+y<-4?'#faf8e9':'#eaf1e8');
    }
    rect(ctx,7,8,5,1,'#fffbee');rect(ctx,17,9,6,1,'#fffbee');rect(ctx,8,20,6,1,'#c4dcde');rect(ctx,19,19,4,1,'#c4dcde');
    return snowbankSprite;
  }
  function drawScenery(ctx,s) {
    const x=Math.round(s.x),y=Math.round(s.y),v=s.variant||0;
    if(s.kind==='snowbank'){
      if(s.broken){
        rect(ctx,x-9,y-3,6,1,'#c5dcda');rect(ctx,x+4,y+3,6,1,'#c5dcda');rect(ctx,x-4,y+4,5,1,'#d6e6de');rect(ctx,x+2,y-5,4,1,'#faf8e9');
        return;
      }
      ctx.drawImage(snowbank(),x-15,y-14);
      if(s.hp<s.maxHp){
        rect(ctx,x-3,y-7,1,5,'#8aadb9');rect(ctx,x-3,y-3,5,1,'#8aadb9');rect(ctx,x+1,y-2,1,5,'#8aadb9');rect(ctx,x-7,y+3,3,1,'#b4cfd3');
        rect(ctx,x-4,y-17,3,3,'#7c9caa');rect(ctx,x+1,y-17,3,3,'#7c9caa');rect(ctx,x-3,y-16,1,1,'#f8f5df');rect(ctx,x+2,y-16,1,1,'#c0d7d8');
      }
      return;
    }
    if(s.kind==='rock'){
      if(s.broken){
        rect(ctx,x-7,y-3,4,3,'#a9bdc3');rect(ctx,x-7,y-3,3,1,'#dbe8df');rect(ctx,x+3,y+2,4,2,'#93a9b5');rect(ctx,x+4,y+1,2,1,'#dbe8df');rect(ctx,x-2,y+4,3,2,'#b4c7c7');rect(ctx,x+1,y-5,2,2,'#a1b8c0');
        return;
      }
      oval(ctx,x,y,10,9,'#c8dad6');
      rect(ctx,x-5,y-8,10,16,'#6e8498');rect(ctx,x-8,y-5,16,10,'#6e8498');rect(ctx,x-9,y-2,18,4,'#6e8498');
      rect(ctx,x-4,y-7,8,14,'#93a8b5');rect(ctx,x-7,y-4,14,8,'#93a8b5');rect(ctx,x+2,y-3,5,6,'#7f97a8');
      rect(ctx,x-5,y-5,8,5,'#c1d1ce');rect(ctx,x-3,y-7,6,2,'#e4ede4');rect(ctx,x-6,y-3,3,5,'#b7c9c7');
      rect(ctx,x,y-1,1,5,'#748b9e');rect(ctx,x+1,y+3,3,1,'#748b9e');rect(ctx,x+3,y+1,1,2,'#748b9e');
      if(s.ore){
        rect(ctx,x-6,y-4,7,2,'#98794f');rect(ctx,x,y-3,2,7,'#98794f');rect(ctx,x+1,y+3,5,2,'#98794f');
        rect(ctx,x-5,y-4,5,1,'#f3d080');rect(ctx,x,y-2,1,6,'#e9c475');rect(ctx,x+1,y+3,4,1,'#f6d58b');rect(ctx,x-4,y-5,2,1,'#fff0b3');rect(ctx,x+4,y+2,1,1,'#fff0b3');
      }
      if(s.hp<s.maxHp){
        rect(ctx,x-3,y-6,1,4,C.ink);rect(ctx,x-3,y-3,4,1,C.ink);rect(ctx,x,y-2,1,5,C.ink);rect(ctx,x,y+3,4,1,C.ink);rect(ctx,x+1,y-1,1,3,'#d6e5df');
        rect(ctx,x-4,y-12,3,3,C.ink);rect(ctx,x+1,y-12,3,3,C.ink);rect(ctx,x-3,y-11,1,1,C.gold);rect(ctx,x+2,y-11,1,1,'#d6e5df');
      }
      return;
    }
    if(s.solid===false){
      // Nonblocking lumps are pale, flat snow flecks without solid dark edges.
      const w=Math.min(5,s.radius||4);
      oval(ctx,x,y,w,2,'#d9e8e2');rect(ctx,x-w+1,y-1,w+1,1,'#f9f8e9');rect(ctx,x+1,y+1,2,1,'#cee1de');
      return;
    }
    const w=v===1?9:8;
    oval(ctx,x,y,w+1,8,'#b8d3d6');oval(ctx,x,y,w,7,'#86abba');oval(ctx,x-1,y-1,w-1,6,['#bddbe0','#c7e0e3','#b7d6df'][v%3]);
    rect(ctx,x-w+3,y-5,w+3,2,'#ebf4ee');rect(ctx,x-w+2,y-3,w-1,3,'#dceee9');rect(ctx,x+2,y+1,4,3,'#a8cbd5');rect(ctx,x-4,y+3,6,1,'#d4e9e7');rect(ctx,x-2,y-3,1,5,'#a2c6d3');rect(ctx,x-1,y+1,4,1,'#a2c6d3');
  }
  function drawChest(ctx,chest,time,{reduceMotion=false}={}) {
    const x=Math.round(chest.x),y=Math.round(chest.y),v=chest.variant%3||0;
    const wood=['#e4bb87','#deb1a1','#b6c9ae'][v],light=['#ffe0aa','#f8d3bc','#dce5bb'][v],seam=['#b88a63','#b4867e','#879d83'][v];
    if(chest.open){
      // Flat spent planks retain each box's palette and the existing floor pass.
      rect(ctx,x-8,y-5,6,2,seam);rect(ctx,x-7,y-4,4,1,light);rect(ctx,x+3,y+2,5,2,seam);rect(ctx,x+4,y+1,2,1,wood);rect(ctx,x-1,y-2,3,2,wood);
      if(chest.variant===2){rect(ctx,x-6,y+4,2,1,C.coral);rect(ctx,x+5,y-5,1,2,'#bca4c2');rect(ctx,x+8,y,2,1,C.gold);}
      if(chest.stamped)bondStamp(ctx,x,y);
      return;
    }
    // Small overhead wooden lids: stepped corners, flat planks, no metal lock.
    rect(ctx,x-9,y-7,18,14,'#775e59');rect(ctx,x-10,y-6,20,12,'#775e59');
    rect(ctx,x-9,y-5,18,10,seam);rect(ctx,x-8,y-6,16,11,wood);rect(ctx,x-8,y-6,16,1,light);
    if(v===0){
      rect(ctx,x-8,y-2,16,1,seam);rect(ctx,x-8,y+2,16,1,seam);
      rect(ctx,x-6,y-5,2,10,light);rect(ctx,x+4,y-5,2,10,light);
      rect(ctx,x-5,y-4,1,1,seam);rect(ctx,x+4,y+3,1,1,seam);
    }else if(v===1){
      rect(ctx,x-3,y-5,1,10,seam);rect(ctx,x+3,y-5,1,10,seam);
      rect(ctx,x-8,y-5,3,2,light);rect(ctx,x+5,y-5,3,2,light);rect(ctx,x-8,y+3,3,2,light);rect(ctx,x+5,y+3,3,2,light);
      rect(ctx,x-1,y-3,2,1,light);
    }else{
      // Party identity remains a coral ribbon and tiny buttered pancake.
      rect(ctx,x-8,y-2,16,1,seam);rect(ctx,x-8,y+2,16,1,seam);
      rect(ctx,x-1,y-5,3,10,'#cb8d88');rect(ctx,x-8,y-1,16,2,'#cb8d88');rect(ctx,x-4,y-4,3,2,'#edae9e');rect(ctx,x+2,y-4,3,2,'#edae9e');
      rect(ctx,x-5,y+2,1,1,'#fff1be');rect(ctx,x+6,y+3,1,1,'#fff1be');rect(ctx,x-7,y-3,1,1,'#bb9dc0');
      oval(ctx,x,y,3,3,'#a57e64');oval(ctx,x,y,2,2,'#efd19a');rect(ctx,x-1,y-1,2,1,'#fff0b5');
    }
    if(chest.stamped)bondStamp(ctx,x,y);
    if(!reduceMotion&&Math.sin(time*2.7+(chest.id||0)*2)>.985)cross(ctx,x+10,y-8,'#fff6cb');
  }
  function drawCoin(ctx,coin,time,{reduceMotion=false}={}) {
    const gait=coin.pulling&&!reduceMotion?Math.sin((coin.pullAge??time)*22+(coin.phase||0)):0;
    const x=Math.round(coin.x),y=Math.round(coin.y+(coin.pulling?gait*.6:0));
    if(coin.pulling){
      const length=Math.hypot(coin.pullVx||0,coin.pullVy||0)||1,fx=(coin.pullVx||0)/length,fy=(coin.pullVy||0)/length;
      for(let i=0;i<2;i++)rect(ctx,x-fx*(7+i*4),y-fy*(7+i*4),1,1,i?'#e5d7b1':'#d8bf7e');
      for(const side of [-1,1]){
        rect(ctx,x-fy*side*4,y+fx*side*4+gait*side,2,1,'#bd995e');
        rect(ctx,x-fx*3-fy*side*2,y-fy*3+fx*side*2+gait*side,1,2,'#efc987');
      }
    }
    oval(ctx,x,y,4,4,'#b39056');oval(ctx,x,y,3,3,C.gold);rect(ctx,x-1,y-2,1,4,'#fff0b7');rect(ctx,x+1,y-1,1,3,'#d3ab62');
    if(!reduceMotion&&Math.sin(time*5+(coin.phase||0))>.9)rect(ctx,x-1,y-2,2,1,'#fff6d0');
  }
  function drawPowerup(ctx,item,time,{reduceMotion=false}={}) {
    const x=Math.round(item.x),y=Math.round(item.y),kind=item.kind;
    if(!['speed','frenzy','jelly'].includes(kind))return;
    const pop=reduceMotion?0:Math.max(0,1-(item.age||0)/.3);
    const aura={speed:'#c29dbd',frenzy:'#d5bc80',jelly:'#ab92b8'}[kind]||'#d5bc80';
    ring(ctx,x,y,Math.round(11+pop*4),aura);
    if(kind==='speed'){
      // The socks lie flat on the snow, pink and yellow with tiny toe paddles.
      for(let i=0;i<2;i++){
        const sx=x-7+i*8,sy=y-6+i*2,color=i?'#e7c986':'#d893aa';
        rect(ctx,sx,sy,5,10,C.ink);rect(ctx,sx,sy+7,7,4,C.ink);rect(ctx,sx+1,sy+1,3,8,color);rect(ctx,sx+1,sy+8,5,2,color);
        rect(ctx,sx+1,sy+2,3,1,'#f9e9cc');rect(ctx,sx+1,sy+5,3,1,'#f9e9cc');rect(ctx,sx+4,sy+8,2,1,'#f9e9cc');
      }
    }else if(kind==='jelly')shopGlyph(ctx,kind,x,y);
    else{
      // Concentric pancake edges and butter are a stack viewed from above.
      oval(ctx,x,y,8,7,'#879fab');oval(ctx,x,y,7,6,'#e9e9d8');oval(ctx,x,y,6,5,'#b08862');oval(ctx,x,y,5,4,'#e2b779');
      oval(ctx,x-1,y-1,3,2,'#f0cf94');rect(ctx,x+1,y,3,2,'#bf9465');rect(ctx,x-2,y-2,3,3,'#d8ba75');rect(ctx,x-2,y-2,3,2,'#fff0a7');
    }
    if(!reduceMotion&&Math.sin(time*4+(item.phase||0))>.8)cross(ctx,x+9,y-9,'#fff0bd');
  }
  function drawPeel(ctx,peel,time,{reduceMotion=false}={}) {
    const x=Math.round(peel.x),y=Math.round(peel.y),prior=ctx.globalAlpha;
    ctx.globalAlpha=prior*Math.min(1,Math.max(0,peel.life)*4);
    oval(ctx,x,y+2,8,5,'#d5e6d9');peelGlyph(ctx,x,y);
    // Mint corners identify an ally trap without disguising hostile warnings.
    rect(ctx,x-9,y-2,2,1,'#97bfb0');rect(ctx,x+9,y+3,2,1,'#97bfb0');
    if(!reduceMotion&&Math.sin(time*7)>.92)rect(ctx,x-4,y+1,1,1,'#fff4c1');
    ctx.globalAlpha=prior;
  }
  function drawSnowball(ctx,body,time,{reduceMotion=false}={}) {
    const x=Math.round(body.x),y=Math.round(body.y),r=body.radius||4,prior=ctx.globalAlpha;
    ctx.globalAlpha=prior*Math.min(1,Math.max(0,body.life)*8);
    if(body.kind==='hostile-snowball'){
      const speed=Math.hypot(body.vx,body.vy)||1,fx=body.vx/speed,fy=body.vy/speed;
      if(!reduceMotion)for(let i=3;i>=1;i--){ctx.globalAlpha=prior*(.32-i*.06);oval(ctx,x-fx*i*3,y-fy*i*3,2,2,'#bdd4df');}
      ctx.globalAlpha=prior*Math.min(1,Math.max(0,body.life)*8);
      // White, shaded snow stays circular; only its restrained outer contour
      // marks danger. The mint Rocky body/bowling cue remains distinct.
      oval(ctx,x,y,r+1,r+1,'#ba8494');oval(ctx,x,y,r,r,'#8baabe');
      oval(ctx,x,y-1,r-1,r-1,'#edf5f3');oval(ctx,x-1,y-2,2,1,'#fffdf1');
      rect(ctx,x+1,y+2,2,1,'#c9dfe5');
      ctx.globalAlpha=prior;return;
    }
    if(body.bowled>0)bowlingCue(ctx,body,time,reduceMotion,r);
    oval(ctx,x,y+1,r+1,r,'#bad6dc');oval(ctx,x,y,r,r,'#7797ab');oval(ctx,x,y,r-1,r-1,'#ddeee8');
    oval(ctx,x-1,y-1,Math.max(1,r-2),Math.max(1,r-2),'#fff9e9');rect(ctx,x+1,y+1,1,1,'#bdd7dd');
    ctx.globalAlpha=prior;
  }
  function ringForecast(ctx,x,y,from,to) {
    // Quiet gaps forecast the second outward wave. The solid inner footprint
    // and later continuous annulus remain the immediate danger cue.
    for(let i=0;i<40;i++){
      const a=i*Math.PI/20;
      rect(ctx,x+Math.cos(a)*to,y+Math.sin(a)*to,2,1,'#d9b1ae');
    }
    const d=from+(to-from)*.45;
    for(let i=0;i<4;i++){
      const a=i*Math.PI/2,fx=Math.round(Math.cos(a)),fy=Math.round(Math.sin(a));
      rect(ctx,x+fx*d,y+fy*d,2,2,'#d4a7a5');
      for(const side of [-1,1])rect(ctx,x+fx*(d-3)-fy*side*3,y+fy*(d-3)+fx*side*3,2,2,'#e3bfB4');
    }
  }
  function drawHazard(ctx,hazard,time,{reduceMotion=false,releaseEmphasis=false}={}) {
    if(hazard.kind!=='snow-ring')return;
    const x=Math.round(hazard.x),y=Math.round(hazard.y),radius=Math.max(0,hazard.radius||0),half=(hazard.width||8)/2;
    const outer=radius+half,inner=Math.max(0,radius-half),prior=ctx.globalAlpha;
    if(hazard.delay>0){
      ringForecast(ctx,x,y,radius,hazard.maxRadius||100);
      // The pending rim stays at the engine's start radius. Gaps distinguish
      // its pause from the continuous, damaging outward annulus.
      ctx.globalAlpha=prior*.48;
      annulus(ctx,x,y,outer,inner,'#e8b1ad');ctx.globalAlpha=prior;
      for(let i=0;i<24;i++){
        const a=i*Math.PI/12;
        rect(ctx,x+Math.cos(a)*radius,y+Math.sin(a)*radius,2,2,'#c57c86');
      }
    }else{
      ctx.globalAlpha=prior*.75;
      annulus(ctx,x,y,outer,inner,'#ecc7ba');ctx.globalAlpha=prior;
      annulus(ctx,x,y,outer,Math.max(0,outer-1.3),'#c77d88');
      annulus(ctx,x,y,inner+1.2,inner,'#d5999c');
      const activeAge=hazard.maxLife-hazard.life;
      if(releaseEmphasis&&hazard.released&&!hazard.cosmetic&&Number.isFinite(activeAge)&&activeAge>=0&&activeAge<.14)annulus(ctx,x,y,outer,Math.max(0,outer-1),'#fff5df');
      for(let i=0;i<16;i++){
        const a=i*Math.PI/8+(reduceMotion?0:time*.3);
        rect(ctx,x+Math.cos(a)*radius,y+Math.sin(a)*radius,2,1,'#fff0d8');
      }
    }
    ctx.globalAlpha=prior;
  }
  function enemyWindupGeometry(e,{reduceMotion=false}={}) {
    const cap=window.FryingPanguin?.ENEMY_MOTION_MAX_DT;
    const total=e.windupMax,remaining=e.windup;
    const snowman=e.kind==='burrower';
    const x=snowman?Math.round(e.x):e.attackX,y=snowman?Math.round(e.y):e.attackY;
    const radius=e.attack==='stomp'?e.attackRadius:(e.radius+7);
    // Missing engine timing or malformed/dead ownership is explicitly inactive.
    // Never invent a second timing constant or a default committed duration.
    const active=Number.isFinite(cap)&&cap>0&&Number.isFinite(total)&&total>0&&
      Number.isFinite(remaining)&&remaining>0&&Number.isFinite(e.hp)&&e.hp>0&&
      Number.isFinite(e.attackX)&&Number.isFinite(e.attackY)&&
      (!snowman||(Number.isFinite(e.x)&&Number.isFinite(e.y)))&&
      Number.isFinite(x)&&Number.isFinite(y)&&Number.isFinite(radius)&&radius>0&&
      ['peck','slide','stomp','swoop','snowball'].includes(e.attack)&&
      ![e.bowled,e.stun,e.crash,e.charge,e.stomp,e.recovery].some(value=>value>0);
    const rawProgress=active?Math.max(0,Math.min(1,1-remaining/total)):0;
    // A prior positive-timer render reaches ready before the next capped step
    // can release. Tolerance only covers floating-point subtraction error.
    const readyLead=active?Math.min(total/2,cap+Number.EPSILON*Math.max(1,total)*8):0;
    const fillProgress=active?Math.max(0,Math.min(1,(total-remaining)/(total-readyLead))):0;
    const ready=active&&fillProgress===1;
    return {active,rawProgress,fillProgress,ready,x,y,radius,readyLead,
      filledQuarters:reduceMotion?(ready?4:Math.floor(fillProgress*4)):0};
  }
  function drawEnemyWindup(ctx,cue,{reduceMotion=false}={}) {
    if(!cue.active)return;
    const {x,y,radius,fillProgress,filledQuarters}=cue,start=-Math.PI/2;
    ctx.save();ctx.lineWidth=2;ctx.lineCap='butt';
    // This fixed perimeter is a status clock; forecasts retain physical bounds.
    ctx.strokeStyle='#e7c3c0';ctx.beginPath();ctx.arc(x,y,radius,0,Math.PI*2);ctx.stroke();
    ctx.strokeStyle='#c56f80';
    if(reduceMotion){
      for(let i=0;i<filledQuarters;i++){
        const a=start+i*Math.PI/2;
        ctx.beginPath();ctx.arc(x,y,radius,a+.055,a+Math.PI/2-.055);ctx.stroke();
      }
    }else if(fillProgress>0){
      ctx.beginPath();ctx.arc(x,y,radius,start,start+Math.PI*2*fillProgress);ctx.stroke();
    }
    ctx.restore();
  }
  function bearWindupGeometry(e,{reduceMotion=false}={}) {
    const radius=e.attackRadius||42;
    const progress=Math.max(0,Math.min(1,1-e.windup/(e.windupMax||e.windup||1)));
    const active=e.attack==='stomp'&&e.windup>0&&!(e.stomp>0||e.bowled>0||e.stun>0||e.crash>0);
    // One inward pulse spans the complete committed windup. Progress never
    // wraps, so there is no second stroke or outside reset before release.
    const phase=progress;
    const opacity=active?Math.max(0,Math.min(1,(phase-.06)/.12,(.94-phase)/.12))*.72:0;
    return {x:Math.round(e.attackX??e.x),y:Math.round(e.attackY??e.y),radius,progress,active,
      phase,contourRadius:radius-2-phase*Math.min(16,radius*.38),
      opacity:reduceMotion?0:opacity,notchRadius:radius-10,readiness:progress>.7?1:.65};
  }
  function stompFootprint(ctx,e,{reduceMotion=false}={}) {
    const cue=bearWindupGeometry(e,{reduceMotion});
    const {x,y,radius}=cue,prior=ctx.globalAlpha;
    const progress=e.stomp>0?1:cue.progress;
    ctx.save();
    if(e.windup>0)ringForecast(ctx,x,y,radius,window.FryingPanguin?.ENCOUNTER_DEFS?.ringRadius||100);
    ctx.globalAlpha=prior*(.09+progress*.13);oval(ctx,x,y,radius,radius,'#d28b91');ctx.globalAlpha=prior;
    annulus(ctx,x,y,radius,Math.max(0,radius-1.8),'#c47a85');
    // Small inward tick marks occupy the actual footprint; no implied lane.
    for(let i=0;i<8;i++){
      const a=i*Math.PI/4,d=radius-4;
      rect(ctx,x+Math.cos(a)*d,y+Math.sin(a)*d,2,2,progress>.6?'#c77981':'#dda1a3');
    }
    if(cue.active&&reduceMotion){
      ctx.globalAlpha=prior*cue.readiness;
      // Four stationary points face inward. Readiness changes once; neither
      // position nor alpha cycles under reduced motion.
      for(let i=0;i<4;i++){
        const a=i*Math.PI/2,fx=Math.round(Math.cos(a)),fy=Math.round(Math.sin(a)),d=cue.notchRadius;
        rect(ctx,x+fx*(d-3),y+fy*(d-3),2,2,'#be707e');
        for(const side of [-1,1])rect(ctx,x+fx*d-fy*side*3,y+fy*d+fx*side*3,2,2,'#be707e');
      }
    }else if(cue.opacity>0){
      ctx.globalAlpha=prior*cue.opacity;
      annulus(ctx,x,y,cue.contourRadius,Math.max(0,cue.contourRadius-1.5),'#be707e');
    }
    ctx.restore();
  }

  const waterMotionGeometry=new WeakMap();
  function drawWaterMotion(ctx,game,time,{reduceMotion=false}={}) {
    const api=window.FryingPanguin,layout=game.layout;
    let water=waterMotionGeometry.get(game);
    if(!water||water.layout!==layout||water.revision!==layout?.revision){
      const cols=Math.ceil(api.WORLD.width/4),rows=Math.ceil(api.WORLD.height/4),sea=new Uint8Array(cols*rows);
      const shore=layout?.shore||api.SHORE,waves=[];
      // Match the terrain's four-pixel sampled shore exactly; never wash over snow.
      for(let y=0;y<rows;y++)for(let x=0;x<cols;x++)sea[y*cols+x]=api.landContains(x*4+2,y*4+2,0,shore)?0:1;
      for(let y=18,row=0;y<api.WORLD.height;y+=38,row++)for(let x=10+(row%2)*24;x<api.WORLD.width;x+=58){
        if(sea[Math.floor(y/4)*cols+Math.floor(x/4)])waves.push({x,y,phase:x*.031+y*.017});
      }
      water={layout,revision:layout?.revision,cols,sea,waves};waterMotionGeometry.set(game,water);
    }
    const t=reduceMotion?0:time;
    const wet=(x,y)=>{
      if(x<0||y<0||x>=api.WORLD.width||y>=api.WORLD.height)return false;
      return !!water.sea[Math.floor(y/4)*water.cols+Math.floor(x/4)];
    };
    const span=(x,y,width)=>{
      x=Math.round(x);y=Math.round(y);
      for(let row=0;row<2;row++){
        let start=null;
        for(let i=0;i<=width;i++){
          if(i<width&&wet(x+i,y+row)){if(start===null)start=x+i;}
          else if(start!==null){rect(ctx,start,y+row,x+i-start,1,'#e0f6ef');start=null;}
        }
      }
    };
    ctx.save();const alpha=ctx.globalAlpha;
    for(const wave of water.waves){
      const x=wave.x+Math.sin(t*.35+wave.phase)*4,y=wave.y+Math.sin(t*.6+wave.phase)*2.5;
      ctx.globalAlpha=alpha*(.48+.18*(.5+.5*Math.sin(t*.55+wave.phase)));
      span(x-12,y+2,6);span(x-6,y,12);span(x+6,y+2,6);
    }
    ctx.restore();
  }

  const footprintTrails=new WeakMap();
  function drawFootprints(ctx,game,time) {
    const p=game.player,revision=game.layout?.revision,api=window.FryingPanguin;
    let trail=footprintTrails.get(game);
    if(!trail||trail.player!==p||trail.revision!==revision||time<trail.time){
      trail={player:p,revision,x:p.x,y:p.y,time,distance:0,side:-1,marks:[]};
      footprintTrails.set(game,trail);
    }
    const dx=p.x-trail.x,dy=p.y-trail.y,distance=Math.hypot(dx,dy),dt=time-trail.time;
    trail.marks=trail.marks.filter(mark=>time-mark.time<3.2);
    const walking=p.alive&&p.moving&&(game.phase==='shop'||game.phase==='run');
    if(walking&&dt>0&&dt<=.2&&distance>0&&distance<=48){
      const fx=dx/distance,fy=dy/distance;
      // Distance-based spacing never emits extra prints while pushing a wall.
      for(let along=12-trail.distance;along<=distance;along+=12){
        const x=Math.round(trail.x+fx*along-fy*trail.side*3);
        const y=Math.round(trail.y+fy*along+4+fx*trail.side*3);
        trail.side*=-1;
        const pond=game.layout?.pond||api.POND,shore=game.layout?.shore||api.SHORE;
        if(api.inShop(x,y)||!api.landContains(x,y,5,shore)||ellipse(x,y,pond.x,pond.y,pond.rx+5,pond.ry+5))continue;
        trail.marks.push({x,y,fx,fy,time:trail.time+dt*along/distance});
      }
      trail.distance=(trail.distance+distance)%12;
      if(trail.marks.length>80)trail.marks.splice(0,trail.marks.length-80);
    }else if(!walking||dt>.2||distance>48){
      trail.distance=0; // No bridge across a reset, teleport, or paused sample.
    }
    trail.x=p.x;trail.y=p.y;trail.time=time;
    ctx.save();const alpha=ctx.globalAlpha;
    // Prints stay still in both motion modes; only their opacity fades.
    for(const mark of trail.marks){
      ctx.globalAlpha=alpha*.5*Math.max(0,1-(time-mark.time)/3.2);
      rect(ctx,mark.x,mark.y,2,2,'#8faab7');
      for(const toe of [-1,0,1])rect(ctx,mark.x+mark.fx*2-mark.fy*toe,mark.y+mark.fy*2+mark.fx*toe,1,1,'#8faab7');
    }
    ctx.restore();
  }

  // Round, toy-like characters use crisp cached pixels. The player keeps an
  // upright waddle; head turns communicate eight headings on the overhead map.
  const spriteCache=new Map();
  const penguinColors=Object.freeze({
    outline:'#3e5268', coat:'#58758c', light:'#7595a8', cream:'#fff5df',
    creamShade:'#e7e6d5', blush:'#eea4ad', bill:'#f4b567', billShade:'#b67f53',
    foot:'#efa55f', footLight:'#ffcf89', scarf:'#db8398', scarfLight:'#f6b9bf'
  });
  const hurtPenguinColors=Object.freeze({ ...penguinColors, coat:'#d9414d', light:'#ff8586', creamShade:'#ffb2ae', cream:'#ffe4d5', scarf:'#a52a41', scarfLight:'#f66e73' });
  function ellipse(u,v,x,y,rx,ry) {
    return (u-x)**2/(rx*rx)+(v-y)**2/(ry*ry)<=1;
  }
  // A tiny local waddle, driven only by real travel. Feet never leave the
  // belly or plant in the world; stopped/blocked penguins settle immediately.
  const playerMotion=new WeakMap();
  const PLAYER_WADDLE=48;
  function samplePlayerMotion(p,time,phase) {
    let state=playerMotion.get(p);
    if(!state){state={x:p.x,y:p.y,time,phase,progress:0,moving:false};playerMotion.set(p,state);return state;}
    const distance=Math.hypot(p.x-state.x,p.y-state.y),dt=time-state.time;
    const active=p.alive!==false&&p.moving&&(phase==='shop'||phase==='run');
    if(active&&phase===state.phase&&dt===0&&distance===0)return state;
    const continuous=active&&phase===state.phase&&Number.isFinite(dt)&&dt>0&&dt<.2&&Number.isFinite(distance)&&distance<32&&distance>1e-9;
    state.progress=continuous?(state.progress+distance)%PLAYER_WADDLE:0;
    state.moving=continuous;state.x=p.x;state.y=p.y;state.time=time;state.phase=phase;
    return state;
  }
  function playerPixelLine(ctx,x1,y1,x2,y2,width,color) {
    const steps=Math.max(1,Math.ceil(Math.max(Math.abs(x2-x1),Math.abs(y2-y1))));
    for(let i=0;i<=steps;i++)rect(ctx,x1+(x2-x1)*i/steps-Math.floor(width/2),y1+(y2-y1)*i/steps-Math.floor(width/2),width,width,color);
  }
  function drawPlayerFoot(ctx,foot) {
    const x=Math.round(foot.x),y=Math.round(foot.y),P=penguinColors;
    rect(ctx,x-2,y-1,4,1,P.billShade);
    rect(ctx,x-2,y,5,2,foot.far?'#d99257':P.foot);
    rect(ctx,x-1,y,3,1,foot.far?'#efba77':P.footLight);
  }
  function sampleMotion(cache,object,time,cycleLength) {
    let state=cache.get(object);
    if(!state){
      state={x:object.x,y:object.y,time,phase:0,moving:false,dx:object.facingX||0,dy:object.facingY||1,trail:[],trailDistance:0};
      cache.set(object,state);return state;
    }
    if(time===state.time)return state;
    const dx=object.x-state.x,dy=object.y-state.y,distance=Math.hypot(dx,dy);
    const continuous=time>state.time&&time-state.time<.2&&distance<32;
    state.moving=continuous&&distance>.015;
    if(state.moving){
      state.dx=dx/distance;state.dy=dy/distance;
      state.phase=(state.phase+distance/cycleLength)%1;
      state.trailDistance+=distance;
      if(state.trailDistance>=2.5){
        state.trail.push({x:object.x-state.dx*10,y:object.y-state.dy*10,dx:state.dx,dy:state.dy,time});
        state.trailDistance%=2.5;
      }
    }else if(!continuous){state.phase=0;state.trail=[];state.trailDistance=0;}
    state.trail=state.trail.filter(point=>time-point.time<.42).slice(-14);
    state.x=object.x;state.y=object.y;state.time=time;
    return state;
  }
  function playerSprite(ctx,center,fx,fy,frame,pose,hurt=false) {
    const scale=.8;
    const playerRect=(context,x,y,w,h,color)=>rect(context,center+(x-center)*scale,center+(y-center)*scale,w*scale,h*scale,color);
    const playerOval=(context,x,y,rx,ry,color)=>oval(context,center+(x-center)*scale,center+(y-center)*scale,rx*scale,ry*scale,color);
    const P=hurt?hurtPenguinColors:penguinColors,blink=pose.startsWith('blink'),weaponSide=pose.endsWith(':left')?-1:1;
    const bob=0;
    // One free flipper. The other is the live shoulder-to-pan arm, never a
    // second decorative arm underneath it. The small finite pose follows
    // support transfer; the head, scarf and coat remain one upright shape.
    const freeSide=-weaponSide,wingY=center-3+frame;
    playerOval(ctx,center+freeSide*8,wingY,2,4,P.outline);
    playerOval(ctx,center+freeSide*8,wingY-1,1,2,P.light);
    playerOval(ctx,center,center-2,8,7,P.outline);
    playerOval(ctx,center,center-2,7,6,P.coat);
    if(fy>=-.4){
      playerOval(ctx,center+Math.round(fx*2),center-1+bob,5,5,P.creamShade);
      playerOval(ctx,center+Math.round(fx*2)-1,center-2+bob,4,4,P.cream);
    }else{
      playerOval(ctx,center-2,center-3+bob,4,4,P.light);
      playerRect(ctx,center-2,center+3+bob,5,1,P.creamShade);
    }
    const hx=center+Math.round(fx),hy=center-10+bob;
    playerOval(ctx,hx,hy,8,8,P.outline);
    playerOval(ctx,hx,hy,7,7,P.coat);
    playerOval(ctx,hx-2,hy-2,4,4,P.light);
    playerRect(ctx,hx-4,hy-5,4,1,'#9bb7bf');
    const side=Math.abs(fx)<.1?0:Math.sign(fx),front=Math.abs(fx)<.4,profile=Math.abs(fy)<.4;
    if(fy>=-.4){
      if(front){
        playerOval(ctx,hx-3,hy+2,3,4,P.creamShade);playerOval(ctx,hx+3,hy+2,3,4,P.creamShade);
        playerOval(ctx,hx,hy+4,5,3,P.creamShade);
        playerOval(ctx,hx-3,hy+1,3,3,P.cream);playerOval(ctx,hx+3,hy+1,3,3,P.cream);
        playerOval(ctx,hx,hy+3,5,3,P.cream);
        for(const eye of [-1,1]){
          playerRect(ctx,hx+eye*3-1,hy+(blink?1:0),2,blink?1:3,P.outline);
          if(!blink)playerRect(ctx,hx+eye*3-1,hy,1,1,'#fffdf1');
          playerRect(ctx,hx+eye*5-1,hy+3,2,1,P.blush);
        }
        playerRect(ctx,hx-1,hy+4,3,2,P.bill);
        playerRect(ctx,hx-1,hy+4,2,1,P.footLight);playerRect(ctx,hx,hy+6,1,1,P.billShade);
      }else{
        // Three-quarter views retain both eyes; pure side views show one cheek.
        const faceX=hx+side*(profile?4:2);
        playerOval(ctx,faceX,hy+2,profile?3:5,4,P.creamShade);
        playerOval(ctx,faceX,hy+1,profile?3:4,3,P.cream);
        playerOval(ctx,faceX,hy+3,profile?2:4,3,P.cream);
        const eyeX=hx+side*(profile?5:4);
        playerRect(ctx,eyeX-1,hy+(blink?1:0),2,blink?1:3,P.outline);if(!blink)playerRect(ctx,eyeX-1,hy,1,1,'#fffdf1');
        if(!profile)playerRect(ctx,hx-side,hy+1,1,blink?1:2,P.outline);
        playerRect(ctx,eyeX-1,hy+3,2,1,P.blush);
        const billX=hx+side*(profile?7:5);
        playerRect(ctx,billX-1,hy+4,3,2,P.bill);
        playerRect(ctx,billX-1,hy+4,2,1,P.footLight);
      }
    }else if(side){
      playerOval(ctx,hx+side*6,hy+1,1,2,P.creamShade);
      playerRect(ctx,hx+side*7-1,hy+2,3,2,P.bill);
    }
    // A warm scarf connects the oversized head to a little marshmallow belly.
    playerRect(ctx,center-6,center-3+bob,13,2,P.scarf);
    playerRect(ctx,center-5,center-3+bob,11,1,P.scarfLight);
    playerRect(ctx,center+4,center-1+bob,3,4,P.scarf);
    playerRect(ctx,center+4,center+bob,2,2,P.scarfLight);
  }
  function penguinPixel(u,v,kind,frame,pose) {
    const chick=kind==='chick',size=chick?.66:.9,P=penguinColors;
    u/=size;v/=size;
    const coat=chick?'#9fb7c4':'#677a99',light=chick?'#c0d3d6':'#879ab4';
    const stroke=frame<0?0:[0,1,2,3,3,3,3,3][frame%8];
    const wingU=[7,9,8,6.5][stroke],wingV=[-1,-2,-5,-6][stroke];
    let color=null;
    // Feet point backwards, fully beyond the tail. They never appear to stand
    // underneath a face; the long back and leading head form a prone body.
    for(const side of [-1,1]){
      const kick=pose==='charge'?0:frame===1&&side<0||frame===2&&side>0?1:0;
      const footU=side*3.7,footV=-13.4-kick;
      if(ellipse(u,v,footU,footV,2.1,2.7))color=P.billShade;
      if(ellipse(u,v,footU,footV-.3,1.4,1.8))color=P.foot;
      if(ellipse(u,v,footU-.2,footV-1.1,.8,.55))color=P.footLight;
    }
    for(const side of [-1,1]){
      const wingX=side*(pose==='charge'?6.2:wingU),wingY=pose==='charge'?-6.5:wingV;
      if(ellipse(u,v,wingX,wingY,3,4.4))color=P.outline;
      if(ellipse(u,v,wingX,wingY-.4,2.1,3.2))color=coat;
      if(ellipse(u,v,wingX-side*.3,wingY-1,.6,1.8))color=light;
    }
    // Narrow, long belly on the ice, with the rounded head ahead of it.
    if(ellipse(u,v,0,-3.8,6.7,9.6))color=P.outline;
    if(ellipse(u,v,0,-3.9,5.7,8.6))color=coat;
    if(ellipse(u,v,-1.5,-4.7,3.7,6.5))color=light;
    if(ellipse(u,v,-2.3,-8.2,1.5,1))color=chick?'#dfebe3':'#9db1c3';
    if(!chick){
      if(Math.abs(u)<5.9&&v>-.9&&v<1.1)color='#b29ac7';
      if(Math.abs(u)<5.5&&v>-.9&&v<-.1)color='#ddc7e4';
      if(u<-4.2&&u>-6.2&&v>-5&&v<-.5)color='#b29ac7';
    }
    if(ellipse(u,v,0,4.8,6.6,5.7))color=P.outline;
    if(ellipse(u,v,0,4.7,5.7,4.9))color=coat;
    if(ellipse(u,v,-2.4,5.9,3,3.6)||ellipse(u,v,2.4,5.9,3,3.6)||ellipse(u,v,0,7.4,4.1,2.4))color=P.creamShade;
    if(ellipse(u,v,-2.3,5.7,2.6,3.1)||ellipse(u,v,2.3,5.7,2.6,3.1)||ellipse(u,v,0,7.1,3.7,2.1))color=P.cream;
    if(ellipse(u,v,-2.8,5.4,.85,1.2)||ellipse(u,v,2.8,5.4,.85,1.2))color=P.outline;
    if((u>-3.3&&u<-2.6||u>2.3&&u<3)&&v>4.35&&v<5.1)color='#fffdf1';
    if(ellipse(u,v,-4,7.3,.95,.65)||ellipse(u,v,4,7.3,.95,.65))color=P.blush;
    if(Math.abs(u)<2&&v>8&&v<11.6&&Math.abs(u)<(12-v)*.75)color=P.billShade;
    if(Math.abs(u)<1.5&&v>8.2&&v<10.7&&Math.abs(u)<(11.2-v)*.8)color=P.bill;
    if(Math.abs(u)<1.2&&v>8.2&&v<9.2)color=P.footLight;
    if(chick){
      if(ellipse(u,v,-1,.2,.8,1.2)||ellipse(u,v,1,.4,.8,1))color=light;
    }else{
      if(ellipse(u,v,0,1.5,4.1,1.9))color=P.outline;
      if(ellipse(u,v,-.3,1.3,3.3,1.2))color='#edaab2';
      if(u>2.5&&u<5.2&&Math.abs(v-1.4)<(u-2)*.6)color='#e3a1ad';
      if(u>-2.4&&u<-1.4&&v>.5&&v<1.5)color=P.outline;
      if(u>-.3&&u<1.6&&v>.5&&v<1.1)color='#ffd2c5';
    }
    return color;
  }
  function bearPixel(u,v,step,pose) {
    u/=1.62;v/=1.56;
    if(pose==='flop'){u/=1.18;v/=.83;}
    else if(pose==='crouch'){u/=1.08;v/=.92;}
    const ink='#708498',fur='#fff4df',shade='#e4e5d7';
    let color=null;
    for(const side of [-1,1])for(const front of [-1,1]){
      const pawU=side*9.1,pawV=front>0?6+side*step*.65:-6-side*step*.65;
      if(ellipse(u,v,pawU,pawV,3,3.4))color=ink;
      if(ellipse(u,v,pawU,pawV-.4,2.1,2.5))color=fur;
      if(front>0&&ellipse(u,v,pawU,pawV+1,1.1,.65))color='#e8b4b8';
    }
    if(ellipse(u,v,0,-1.9,10.8,11))color=ink;
    if(ellipse(u,v,0,-2,9.8,10))color=shade;
    if(ellipse(u,v,-1,-2.8,8.3,8.5))color=fur;
    // A lavender pajama bottom with a handful of embroidered cream dots.
    if(ellipse(u,v,0,-2,9.8,10)&&v<.7)color='#b5a7cf';
    if(ellipse(u,v,-1.7,-3.2,7.7,7.7)&&v<-.3)color='#cfbfdf';
    if(Math.abs(u)<9.3&&v>-.3&&v<1)color='#eee0ec';
    for(const [px,py] of [[-5,-6],[1,-8],[5,-4],[-2,-2]])if(ellipse(u,v,px,py,.85,.85))color='#f6eced';
    // Big plush ears and a broad muzzle; no angry eyebrow pixels.
    for(const side of [-1,1]){
      if(ellipse(u,v,side*6.1,2.6,3,3.2))color=ink;
      if(ellipse(u,v,side*6.1,2.4,2.1,2.2))color=fur;
      if(ellipse(u,v,side*6.2,2.5,1.1,1.2))color='#e8b4b8';
    }
    if(ellipse(u,v,0,5.8,7.2,7.1))color=ink;
    if(ellipse(u,v,0,5.5,6.3,6.3))color=fur;
    if(ellipse(u,v,-2.2,3.7,3,2))color='#fffbea';
    if(ellipse(u,v,-3.1,5.7,.9,1.2)||ellipse(u,v,3.1,5.7,.9,1.2))color='#42566b';
    if(ellipse(u,v,-4.3,7.5,1.25,.75)||ellipse(u,v,4.3,7.5,1.25,.75))color='#eab1b6';
    if(ellipse(u,v,0,9,3.2,2.25))color='#e5e3d5';
    if(ellipse(u,v,0,8.7,2.7,1.8))color='#fffbed';
    if(ellipse(u,v,0,8.2,1.5,1))color='#42566b';
    if(Math.abs(u)<.5&&v>8.5&&v<10.2)color='#708498';
    // A floppy nightcap and butter-yellow pompom on one ear.
    if(u>3.2&&u<6.4&&v>-.8&&v<2.4)color='#9b88b9';
    if(u>5.2&&u<8.2&&v>-.7&&v<.8)color='#b6a3ce';
    if(ellipse(u,v,8.1,.7,1.1,1.2))color='#f4d797';
    return color;
  }
  function snowbirdPixel(u,v,step,pose) {
    const tucked=pose==='swoop',bonked=pose==='bonk',ink='#637d94',fur='#fff9e8',shade='#dce7e4';
    let color=null;
    // Wide feathery wings, a small teardrop body and rose flight goggles keep
    // snowbirds distinct from sliding penguins and pajama bears from overhead.
    for(const side of [-1,1]){
      const wingU=side*(tucked?5:8.3),wingV=tucked?-3:-1.3+(step?1.3:-1);
      if(ellipse(u,v,wingU,wingV,tucked?2.7:6,tucked?5:3.2))color=ink;
      if(ellipse(u,v,wingU,wingV-.3,tucked?1.9:5,tucked?4.1:2.3))color=shade;
      if(ellipse(u,v,wingU-side,wingV-.7,tucked?1.3:3.8,tucked?3:1.5))color=fur;
      if(!tucked&&Math.abs(v-wingV)<2.4&&Math.abs(u)>9.5&&Math.abs(u)<13.5&&Math.round(Math.abs(u))%2===0)color=ink;
    }
    if(ellipse(u,v,0,-1,4.9,7.1))color=ink;
    if(ellipse(u,v,0,-1.2,3.9,6.1))color=shade;
    if(ellipse(u,v,-.7,-1.8,3.2,5.3))color=fur;
    if(v<-5&&v>-9&&Math.abs(u)<(9+v)*.6)color=shade;
    if(ellipse(u,v,0,4.2,4.5,4.1))color=ink;
    if(ellipse(u,v,0,4.1,3.6,3.2))color=fur;
    if(Math.abs(u)<3.8&&v>2.1&&v<3.5)color='#d38ca7';
    for(const side of [-1,1]){
      if(ellipse(u,v,side*1.9,3.2,1.2,1.2))color=ink;
      if(ellipse(u,v,side*1.9,2.9,.6,.6))color='#f6c8ce';
      if(ellipse(u,v,side*2.8,5.1,.7,.55))color='#eeafba';
    }
    if(v>6&&v<10&&Math.abs(u)<(10.6-v)*.65)color='#b98d59';
    if(v>6.2&&v<8.5&&Math.abs(u)<(9.6-v)*.7)color='#f1c777';
    if(bonked&&Math.abs(u)<1&&v>2.2&&v<4.4)color=fur;
    return color;
  }
  function sprite(kind,direction,step=0,pose='walk',directions=8,hurt=false) {
    const key=kind+'|'+direction+'|'+step+'|'+pose+'|'+directions+'|'+hurt;
    if(spriteCache.has(key))return spriteCache.get(key);
    const canvas=document.createElement('canvas');canvas.width=canvas.height=kind==='bear'?64:40;
    const center=canvas.width/2,ctx=canvas.getContext('2d'),a=direction*Math.PI*2/directions,fx=Math.abs(Math.cos(a))<1e-8?0:Math.cos(a),fy=Math.abs(Math.sin(a))<1e-8?0:Math.sin(a);
    if(kind==='player'){
      playerSprite(ctx,center,fx,fy,step,pose,hurt);
      spriteCache.set(key,canvas);return canvas;
    }
    for(let y=1-center;y<center;y++)for(let x=1-center;x<center;x++){
      const u=x*(-fy)+y*fx,v=x*fx+y*fy;
      const color=kind==='bear'?bearPixel(u,v,step,pose):kind==='snowbird'?snowbirdPixel(u,v,step,pose):penguinPixel(u,v,kind,step,pose);
      if(color)rect(ctx,x+center,y+center,1,1,color);
    }
    spriteCache.set(key,canvas);return canvas;
  }
  function directionOf(object) {
    return (Math.round(Math.atan2(object.facingY||0,object.facingX||0)/(Math.PI/4))+8)%8;
  }
  function playerSwingProgress(p) {
    const duration=p.swingDuration||window.FryingPanguin?.SWING_SECONDS||((.32/1.5)/.67);
    // Reserve one sampled frame for the held endpoint, including a recovery
    // shortened by scheduling overshoot. This is cosmetic; damage is unchanged.
    const recovery=p.swingRecovery??p.swingCadence??duration;
    const reserve=Math.max(.05,p.swingStepSeconds||0);
    if(recovery<=reserve)return 1;
    const visualDuration=Math.max(duration*.01,Math.min(duration,recovery)-reserve);
    return Math.max(0,Math.min(1,(duration-(p.swing||0))/visualDuration));
  }
  // Four cached ground variants: steel/gold pan × ordinary/hurt palette.
  // No facing/time variants.
  const fallenPlayerCache=[null,null,null,null];
  function fallenPlayerSprite(golden,hurt=false) {
    const key=(golden?1:0)+(hurt?2:0);if(fallenPlayerCache[key])return fallenPlayerCache[key];
    const canvas=document.createElement('canvas');canvas.width=56;canvas.height=40;
    const brush=canvas.getContext('2d'),P=hurt?hurtPenguinColors:penguinColors;brush.imageSmoothingEnabled=false;
    oval(brush,31,25,10,2,'#adc1c6');
    // Sideways coat and two feet already resting on the snow.
    oval(brush,29,19,12,6,P.outline);oval(brush,29,18,11,5,P.coat);
    oval(brush,28,18,8,4,P.light);oval(brush,28,20,8,3,P.creamShade);oval(brush,28,19,7,2,P.cream);
    rect(brush,38,15,6,3,P.billShade);rect(brush,39,15,5,2,P.foot);rect(brush,40,15,3,1,P.footLight);
    rect(brush,36,22,3,5,P.billShade);rect(brush,36,22,2,4,P.foot);rect(brush,36,25,5,2,P.foot);rect(brush,37,25,3,1,P.footLight);
    oval(brush,28,13,7,2,P.outline);oval(brush,28,13,6,1,P.light);
    oval(brush,18,16,8,7,P.outline);oval(brush,18,16,7,6,P.coat);
    oval(brush,15,17,5,5,P.creamShade);oval(brush,15,16,4,4,P.cream);
    rect(brush,9,16,5,3,P.billShade);rect(brush,9,16,4,2,P.bill);
    // Closed eyes and scarf identify the same comic penguin without motion.
    rect(brush,13,14,3,1,P.outline);rect(brush,17,13,3,1,P.outline);rect(brush,12,18,2,1,P.blush);
    rect(brush,23,13,3,10,P.scarf);rect(brush,23,14,2,8,P.scarfLight);rect(brush,23,22,8,2,P.scarf);
    // The pan is already beside the body: no drop, swing, or interpolated image.
    rect(brush,18,31,9,3,C.ink);rect(brush,19,31,7,1,'#91a9b3');
    oval(brush,14,32,6,5,C.ink);oval(brush,14,32,5,4,golden?'#dcb968':'#a8bbc0');
    oval(brush,13,31,3,2,golden?'#ffe29a':'#cfdbd4');rect(brush,12,29,3,1,golden?'#fff5c2':'#f0f1df');
    fallenPlayerCache[key]=canvas;return canvas;
  }
  // Summary uses the complete authored pose at exact 2x without world downsampling.
  function drawSummaryFallen(ctx,p) {
    ctx.save();
    try {
      ctx.imageSmoothingEnabled=false;
      ctx.drawImage(fallenPlayerSprite(Boolean(p.golden||p.panFinish==='gold'),false),0,4,112,80);
    } finally { ctx.restore(); }
  }
  function drawPlayer(ctx,p,time,{phase='run',reduceMotion=false,fallen=false,hurt=phase==='run'&&p.hurtFlash>0}={}) {
    const golden=p.golden||p.panFinish==='gold';
    if(phase==='dying'||fallen){
      playerMotion.delete(p);
      // About 60% of the authored size, with the same ground anchor and crisp pixels.
      const smoothing=ctx.imageSmoothingEnabled;ctx.imageSmoothingEnabled=false;
      ctx.drawImage(fallenPlayerSprite(golden,hurt),Math.round(p.x)-17,Math.round(p.y)-11,34,24);
      ctx.imageSmoothingEnabled=smoothing;return;
    }
    const x=Math.round(p.x),y=Math.round(p.y),direction=directionOf(p);
    const motion=samplePlayerMotion(p,time,phase);
    const pose=motion.moving?(motion.progress<PLAYER_WADDLE/2?-1:1):0;
    const sway=reduceMotion||!motion.moving?0:Math.round(Math.sin(motion.progress/PLAYER_WADDLE*Math.PI*2)*.7);
    const bodyX=x+sway,bodyY=y;
    const feet=[-1,1].map(side=>({x:bodyX+side*3,y:bodyY+4+(pose===side?1:0),far:side===-1}));
    const facing=direction*Math.PI/4,fx=Math.cos(facing),fy=Math.sin(facing);
    if(p.gadget==='greedy'&&p.honk>0){
      const radius=reduceMotion?20:18+(1-Math.min(.35,p.honk)/.35)*12;
      ring(ctx,x,y,Math.round(radius),'#b2cdbb');
      for(const side of [-1,1])rect(ctx,x+side*(radius+2),y-1,2,2,'#e8cf94');
    }
    if(p.buffs?.speed>0&&p.moving){
      const fx=p.facingX||0,fy=p.facingY||0;
      for(let i=0;i<3;i++)for(const side of [-1,1]){
        const d=11+i*6,sx=x-fx*d-fy*side*3,sy=y-fy*d+fx*side*3;
        rect(ctx,sx,sy,i===2?1:2,i===2?1:2,i%2?'#e8c3cc':'#dca4be');
      }
    }
    oval(ctx,x,y+4,7,2,'#c9ddda');
    const t=playerSwingProgress(p),swinging=p.swing>0;
    const geometry=window.FryingPanguin.PAN_GEOMETRY;
    const captured=swinging&&Number.isFinite(p.swingFacingX)&&Number.isFinite(p.swingFacingY)&&Math.hypot(p.swingFacingX,p.swingFacingY)>0;
    const face=Math.atan2(captured?p.swingFacingY:p.facingY||0,captured?p.swingFacingX:p.facingX||0);
    // Brief cock-back, fast cross-body sweep, then a held follow-through.
    const half=geometry.halfAngle;
    const sweep=t<.12?-half*.7-t/.12*half*.3:t<.78?-half+(1-Math.pow(1-(t-.12)/.66,2))*half*2:half-(t-.78)*.35;
    const angle=face+(swinging?(reduceMotion?0:sweep):.9);
    const reachScale=p.reachScale||1,reach=swinging?geometry.reach*reachScale-geometry.headRadius:17*reachScale;
    const pivotY=swinging?y:y-2,px=Math.round(x+Math.cos(angle)*reach),py=Math.round(pivotY+Math.sin(angle)*reach);
    const drawPan=()=>{
      if(swinging&&!reduceMotion&&t>.12){
        // A curved ribbon and receding pan echoes expose the actual swing path.
        const arcStart=Math.max(face-half,angle-.95);
        const prior=ctx.globalAlpha;
        for(let a=arcStart;a<angle;a+=.045){
          ctx.globalAlpha=prior*.3;
          for(let r=reach-3;r<=reach+3;r+=2)rect(ctx,x+Math.cos(a)*r,pivotY+Math.sin(a)*r,2,2,'#efcc86');
          ctx.globalAlpha=prior*.75;
          rect(ctx,x+Math.cos(a)*(reach+4),pivotY+Math.sin(a)*(reach+4),2,1,'#fff3cc');
        }
        for(const lag of [.65,.32]){
          const a=Math.max(face-half,angle-lag),gx=x+Math.cos(a)*reach,gy=pivotY+Math.sin(a)*reach;
          ctx.globalAlpha=prior*(lag>.5?.13:.24);
          oval(ctx,gx,gy,6,6,C.ink);oval(ctx,gx,gy,5,5,'#e4d5ab');
        }
        ctx.globalAlpha=prior;
      }
      // The flipper bends from the shoulder into the handle instead of leaving
      // a detached pan orbiting around the penguin.
      const shoulderX=bodyX+(Math.cos(angle)<0?-6:6),shoulderY=bodyY-2;
      const hx=Math.round(x+Math.cos(angle)*10),hy=Math.round(pivotY+Math.sin(angle)*10);
      playerPixelLine(ctx,shoulderX,shoulderY,hx,hy,5,C.ink);
      playerPixelLine(ctx,shoulderX,shoulderY,hx,hy,3,(hurt?hurtPenguinColors:penguinColors).light);
      playerPixelLine(ctx,hx,hy,px,py,3,C.ink);
      rect(ctx,hx-1,hy-1,3,3,'#91a6ad');
      if(p.buffs?.frenzy>0){
        ring(ctx,px,py,geometry.frenzyRadius,'#dfbe7d');
        for(let i=0;i<4;i++){const a=(reduceMotion?0:time*2)+i*Math.PI/2;oval(ctx,px+Math.cos(a)*(geometry.frenzyRadius-2),py+Math.sin(a)*(geometry.frenzyRadius-2),2,2,'#e8c489');rect(ctx,px+Math.cos(a)*(geometry.frenzyRadius-2),py+Math.sin(a)*(geometry.frenzyRadius-2)-1,1,1,'#fff0ba');}
      }
      oval(ctx,px,py,6,6,C.ink);oval(ctx,px,py,5,5,golden?'#dcb968':'#a8bbc0');oval(ctx,px-1,py-1,3,3,golden?'#ffe29a':'#cfdbd4');rect(ctx,px-2,py-3,3,1,golden?'#fff5c2':'#f0f1df');
      if(golden)rect(ctx,px+2,py+2,2,1,'#b38d4d');
    };
    if(!hurt&&phase!=='dying'&&p.invulnerable>0&&!reduceMotion&&Math.floor(time*18)%2)ctx.globalAlpha=.48;
    // The handle passes under the flippers, keeping the face and both feet clear.
    drawPan();
    const expression=reduceMotion?'steady':!motion.moving&&time%4.5>4.32?'blink':'walk';
    const freePose=0;
    const armSide=Math.cos(angle)<0?'left':'right';
    ctx.drawImage(sprite('player',direction,freePose,expression+':'+armSide,8,hurt),bodyX-20,bodyY-20);
    for(const foot of feet)drawPlayerFoot(ctx,foot);
    ctx.globalAlpha=1;
    if(p.gadget==='greedy')ctx.drawImage(hornSprite(direction,true),x-fy*10-fx*6-12,y+fx*10-fy*6-12);
    if(p.buffs?.jelly>0)reboundCue(ctx,x-13,y-12);
    if(phase!=='dying'&&p.invulnerable>0)stars(ctx,x,y,13,reduceMotion?0:time,3);
    if(phase==='shop'){rect(ctx,x-3,y-21,6,1,C.coralLight);rect(ctx,x-2,y-20,4,1,C.coralLight);rect(ctx,x-1,y-19,2,1,C.coralLight);}
  }
  // Skates leave a short path in world coordinates, not six dots glued to a
  // sprite. The paired ice scratches curve through turns and fade where laid.
  const enemyMotion=new WeakMap();
  // Presentation only. Actual entity identity, not ids or steering intent, owns
  // the remembered body heading. Wake/gait sampling remains independent.
  const enemyDisplayHeading=new WeakMap();
  const ENEMY_HEADING=Object.freeze({ confirmSeconds:.06, slowSeconds:.10, distance:.75, slowDistance:.02, windowSeconds:.10, sectorMargin:5*Math.PI/180, gapSeconds:.20, teleport:32 });
  const wrappedAngle=a=>Math.atan2(Math.sin(a),Math.cos(a));
  function sampleEnemyHeading(e,time,{phase='run',generation=null}={},directions=8) {
    const raw=Number.isFinite(e.facingX)&&Number.isFinite(e.facingY)&&Math.hypot(e.facingX,e.facingY)>1e-9?Math.atan2(e.facingY,e.facingX):null;
    const sector=a=>(Math.round(a/(Math.PI*2/directions))+directions)%directions;
    let state=enemyDisplayHeading.get(e);
    const fresh=!state||state.kind!==e.kind||state.generation!==generation;
    if(fresh){
      const angle=raw??Math.PI/2;
      state={x:e.x,y:e.y,time,phase,generation,kind:e.kind,angle,sector:sector(angle),dx:0,dy:0,seconds:0};
      enemyDisplayHeading.set(e,state);
    }
    const authoritative=e.windup>0||e.charge>0||e.stomp>0||e.spin>0||e.bowled>0||e.kind==='burrower'||(e.recovery>0&&!(e.stun>0||e.crash>0));
    // Frozen history never advances, but a retained commitment may have begun
    // on the same lethal step or entirely offscreen. Project its raw body pose
    // without changing remembered locomotion or travel evidence.
    if(phase==='dying'||phase==='winning')return authoritative&&raw!==null?sector(raw):state.sector;
    const anchor=()=>{state.x=e.x;state.y=e.y;state.time=time;state.phase=phase;state.dx=0;state.dy=0;state.seconds=0;};
    // Committed poses, live spin and friendly bowling always preserve their raw
    // facing, even when an attack starts between two same-time redraws.
    // Recovery also carries this authority when the whole attack was culled.
    if(authoritative){if(raw!==null){state.angle=raw;state.sector=sector(raw);}anchor();return state.sector;}
    if(e.stun>0||e.crash>0||e.recovery>0||e.hp<=0){anchor();return state.sector;}
    const dt=time-state.time,dx=e.x-state.x,dy=e.y-state.y,length=Math.hypot(dx,dy);
    if(fresh||state.phase!==phase||!Number.isFinite(time)||!Number.isFinite(dt)||!Number.isFinite(length)||dt<0||dt>ENEMY_HEADING.gapSeconds||length>ENEMY_HEADING.teleport){anchor();return state.sector;}
    if(dt===0)return state.sector;
    state.x=e.x;state.y=e.y;state.time=time;
    if(length<=1e-7){state.dx=0;state.dy=0;state.seconds=0;return state.sector;}
    // Opposed or incoherent movement cannot bank path length and later win a
    // periodic timer. A genuine turn starts a new bounded net-progress window.
    const pending=Math.hypot(state.dx,state.dy);
    if(pending>0&&(dx*state.dx+dy*state.dy)/(length*pending)<.5){state.dx=0;state.dy=0;state.seconds=0;}
    state.dx+=dx;state.dy+=dy;state.seconds+=dt;
    const net=Math.hypot(state.dx,state.dy);
    const confirmed=state.seconds+1e-9>=ENEMY_HEADING.confirmSeconds&&net>=ENEMY_HEADING.distance||state.seconds+1e-9>=ENEMY_HEADING.slowSeconds&&net>=ENEMY_HEADING.slowDistance;
    if(confirmed){
      const angle=Math.atan2(state.dy,state.dx),step=Math.PI*2/directions;
      // Retain the current wrapped sector until the accepted continuous base
      // crosses its edge plus a small margin, including the +/-pi seam.
      state.angle=angle;
      if(Math.abs(wrappedAngle(angle-state.sector*step))>step/2+ENEMY_HEADING.sectorMargin)state.sector=sector(angle);
      state.dx=0;state.dy=0;state.seconds=0;
    }else if(state.seconds>=ENEMY_HEADING.windowSeconds){state.dx=0;state.dy=0;state.seconds=0;}
    return state.sector;
  }

  function drawAttackForecast(ctx,e,time,{reduceMotion=false}={}) {
    if(e.bowled>0||e.recovery>0||!(e.windup>0||e.charge>0)||!['slide','swoop','snowball'].includes(e.attack))return;
    const x=e.charge>0?e.x:e.attackX??e.x,y=e.charge>0?e.y:e.attackY??e.y;
    const fallback=(e.chargeSpeed||0)*(e.chargeFor||e.chargeDuration||0);
    const endX=Number.isFinite(e.aimX)?e.aimX:x+(e.facingX||0)*fallback,endY=Number.isFinite(e.aimY)?e.aimY:y+(e.facingY||0)*fallback;
    const length=Math.hypot(endX-x,endY-y);if(length<2)return;
    const padding=e.attack==='snowball'?0:window.FryingPanguin?.ENCOUNTER_DEFS?.chargeHitPadding??5;
    const fx=(endX-x)/length,fy=(endY-y)/length,r=(e.attack==='snowball'?window.FryingPanguin.BURROWER_DEFS.projectileRadius:e.radius||7)+padding,prior=ctx.globalAlpha;
    ctx.save();ctx.globalAlpha=prior*.065;ctx.strokeStyle='#d28b91';ctx.lineWidth=r*2;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(endX,endY);ctx.stroke();ctx.restore();
    // Fixed dotted rails and the endpoint cross are geometry, not motion FX:
    // they remain visible under reduced motion and never chase the player.
    for(let d=0;d<=length;d+=6)for(const side of [-1,1])rect(ctx,x+fx*d-fy*side*r,y+fy*d+fx*side*r,1,1,'#d49b9e');
    ring(ctx,Math.round(endX),Math.round(endY),Math.round(r),'#c8818e');
    rect(ctx,endX-2,endY,5,1,'#c8818e');rect(ctx,endX,endY-2,1,5,'#c8818e');
    const tip=Math.min(17,length*.3),ax=endX-fx*tip,ay=endY-fy*tip;
    for(const side of [-1,1])for(let i=0;i<4;i++)rect(ctx,ax-fx*i-fy*side*i,ay-fy*i+fx*side*i,1,1,'#c8818e');
    ctx.globalAlpha=prior;
  }
  function drawSlideWake(ctx,motion,kind,time,reduceMotion) {
    const width=kind==='chick'?2:3,prior=ctx.globalAlpha;
    for(let i=1;i<motion.trail.length;i++){
      const a=motion.trail[i-1],b=motion.trail[i],fade=1-(time-b.time)/.42;
      const count=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)));
      ctx.globalAlpha=prior*Math.max(0,fade)*.8;
      for(const side of [-1,1])for(let j=0;j<=count;j++){
        const t=j/count,x=a.x+(b.x-a.x)*t-b.dy*side*width,y=a.y+(b.y-a.y)*t+b.dx*side*width;
        rect(ctx,x,y,2,2,'#9bbfcc');rect(ctx,x,y-1,1,1,'#f8faf0');
      }
    }
    if(motion.moving&&motion.phase<.32){
      const reach=kind==='chick'?12:16,spread=kind==='chick'?3:4;
      const progress=motion.phase/.32;
      ctx.globalAlpha=prior*(reduceMotion?.5:1-progress*.6);
      for(const side of [-1,1]){
        const d=reach+(reduceMotion?1:progress*5),u=side*(spread+(reduceMotion?0:progress*2));
        const x=motion.x-motion.dx*d-motion.dy*u,y=motion.y-motion.dy*d+motion.dx*u;
        oval(ctx,x,y,2,1,'#a9cbd5');rect(ctx,x-1,y-1,3,1,'#fffdf0');
      }
    }
    ctx.globalAlpha=prior;
  }
  function drawBurrower(ctx,e,time,{reduceMotion=false,forecast=true}={}) {
    const x=Math.round(e.x),y=Math.round(e.y),fx=e.facingX||0,fy=e.facingY??1;
    const preparing=e.windup>0,recovering=e.recovery>0;
    const progress=preparing?Math.max(0,Math.min(1,1-e.windup/(e.windupMax||.75))):recovering?Math.min(1,e.recovery/.3):0;
    drawEnemyWindup(ctx,enemyWindupGeometry(e,{reduceMotion}),{reduceMotion});
    if(preparing&&forecast)drawAttackForecast(ctx,e,time,{reduceMotion});
    oval(ctx,x,y+5,10,3,'#b4cbd5');
    // Two stacked snowballs, coal and a carrot remain readable at native size.
    oval(ctx,x,y,9,8,'#7897a5');oval(ctx,x,y-1,8,7,'#dcebef');oval(ctx,x-1,y-2,6,5,'#f7fbf7');
    oval(ctx,x,y-13,6,6,'#7897a5');oval(ctx,x,y-14,5,5,'#f7fbf7');
    rect(ctx,x-3,y-17,3,1,'#ffffff');
    const faceX=x+Math.round(fx*2),faceY=y-14+Math.round(fy);
    rect(ctx,faceX-3,faceY-1,2,2,'#405366');rect(ctx,faceX+2,faceY-1,2,2,'#405366');
    const noseX=Math.round(faceX+fx*5),noseY=Math.round(faceY+2+fy*3);
    playerPixelLine(ctx,faceX,faceY+2,noseX,noseY,2,'#df995a');rect(ctx,faceX,faceY+1,2,1,'#ffd08b');
    for(const by of [-4,0,4])rect(ctx,x-1,y+by,2,2,'#536875');
    // Twig arms show a held snowy ball, the locked release, then recovery.
    const handX=Math.round(x+10*(1-progress)+fx*12*progress),handY=Math.round(y-5*(1-progress)+fy*12*progress);
    playerPixelLine(ctx,x-7,y-4,x-12,y-7,2,'#9a8069');rect(ctx,x-13,y-10,1,4,'#9a8069');
    playerPixelLine(ctx,x+6,y-5,handX,handY,2,'#9a8069');
    if(preparing){oval(ctx,handX,handY,4,4,'#90aebe');oval(ctx,handX,handY-1,3,3,'#eff7f2');rect(ctx,handX-1,handY-3,2,1,'#fffdf1');}
    if(e.stun>0)stars(ctx,x,y-25,10,reduceMotion?0:time,3);
  }
  const powerGlyphCache=new Map();
  function directPowerGlyph(ctx,kind,x,y,size) {
    ctx.save();ctx.translate(x,y);ctx.scale(size/24,size/24);
    drawPowerup(ctx,{x:0,y:0,kind,age:1},0,{reduceMotion:true});ctx.restore();
  }
  function prewarmPowerFeedback() {
    for(const kind of ['speed','frenzy','jelly'])if(!powerGlyphCache.has(kind)){
      const canvas=document.createElement('canvas');canvas.width=canvas.height=36;
      const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;
      directPowerGlyph(ctx,kind,18,18,36);powerGlyphCache.set(kind,canvas);
    }
  }
  function powerFeedbackGlyph(ctx,kind,x,y,size) {
    const cached=powerGlyphCache.get(kind);
    if(cached)ctx.drawImage(cached,Math.round(x-size/2),Math.round(y-size/2),size,size);
    else directPowerGlyph(ctx,kind,x,y,size); // Decode-independent first frame.
  }
  function drawPowerActivation(ctx,p,time,{reduceMotion=false,viewport=null,exclusions=[]}={}) {
    const x=Math.round(p.x),y=Math.round(p.y),prior=ctx.globalAlpha;
    const active=(p.activations?.length?p.activations:p.activation?[p.activation]:[]).filter(fx=>['speed','frenzy','jelly'].includes(fx.kind)).slice(-4);
    const ended=(p.expiries||[]).filter(fx=>['speed','frenzy','jelly'].includes(fx.kind)).slice(-4);if(!active.length&&!ended.length)return;
    const colors={speed:'#82b8bf',frenzy:'#e1b26e',jelly:'#ad92b8'};
    const slots={speed:[20,-86],frenzy:[-20,-48],jelly:[20,-48]};
    let baseX=x,baseY=y,sidebar=false,size=36;
    if(viewport){
      const top=Math.max(active.length?(active.length>1?104:66):0,ended.length?(ended.length>1?94:46):0);
      const required=viewport.top+4-(baseY-top);
      if(required>8){sidebar=true;const left=x-viewport.left,right=viewport.right-x;
        baseX=x+(left>right?-76:76);
        if(Math.max(left,right)<114&&active.length>1)size=32;
      }
      const half=Math.max(active.length?(active.length>1?(size===32?36:38):18):0,ended.length?(ended.length>1?53:5):0);
      baseX=Math.max(viewport.left+4+half,Math.min(viewport.right-4-half,baseX));
      const bottom=active.length?30:ended.length>1?35:33;
      baseY=Math.max(viewport.top+4+top,Math.min(viewport.bottom-4+bottom,baseY));
    }
    if (viewport && exclusions.length) {
      const overlap = (a,b) => Math.max(0,Math.min(a.right,b.right)-Math.max(a.left,b.left)) * Math.max(0,Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top));
      const bounds = (side,glyphSize) => {
        const boxes=[];
        for(const fx of active){const point=active.length>1?slots[fx.kind]:[0,-48];boxes.push({left:point[0]-glyphSize/2,top:point[1]-glyphSize/2,right:point[0]+glyphSize/2,bottom:point[1]+glyphSize/2});}
        if(active.length&&!reduceMotion&&!side)boxes.push(active.length>1?{left:-56,top:-108,right:56,bottom:-28}:{left:-36,top:-82,right:36,bottom:-28});
        for(let i=0;i<ended.length;i++){const cx=ended.length===1?0:(i%2?48:-48),cy=ended.length===1?-40:-(i<2?88:42);boxes.push({left:cx-5,top:cy-5,right:cx+5,bottom:cy+7});}
        return {boxes,left:Math.min(...boxes.map(b=>b.left)),top:Math.min(...boxes.map(b=>b.top)),right:Math.max(...boxes.map(b=>b.right)),bottom:Math.max(...boxes.map(b=>b.bottom))};
      };
      const actor={left:x-34,top:y-28,right:x+34,bottom:y+12};
      const choose=(cx,cy,side,glyphSize)=>{
        const b=bounds(side,glyphSize);
        cx=Math.max(viewport.left+4-b.left,Math.min(viewport.right-4-b.right,cx));
        cy=Math.max(viewport.top+4-b.top,Math.min(viewport.bottom-4-b.bottom,cy));
        const box={left:cx+b.left,top:cy+b.top,right:cx+b.right,bottom:cy+b.bottom};
        const parts=b.boxes.map(r=>({left:cx+r.left,top:cy+r.top,right:cx+r.right,bottom:cy+r.bottom}));
        const blocked=parts.reduce((sum,r)=>sum+exclusions.reduce((area,e)=>area+overlap(r,{left:e.left-4,top:e.top-4,right:e.right+4,bottom:e.bottom+4}),0),0);
        const actorArea=parts.reduce((sum,r)=>sum+overlap(r,actor),0);
        return {x:cx,y:cy,sidebar:side,size:glyphSize,box,hudOverlap:blocked,actorOverlap:actorArea,score:blocked*1e6+actorArea*1e7+(cx-x)**2+(cy-y)**2};
      };
      let best=choose(baseX,baseY,sidebar,size);
      if(best.hudOverlap||best.actorOverlap){
        const first=x-viewport.left>viewport.right-x?-1:1;
        let clearAnchor=null;
        for(const glyphSize of [36,32]){
          for(const side of [first,-first])for(const cx of [x+side*76,x]){const candidate=choose(cx,y,true,glyphSize);if(!candidate.hudOverlap&&!candidate.actorOverlap&&(!clearAnchor||candidate.score<clearAnchor.score))clearAnchor=candidate;}
          if(clearAnchor)break;
        }
        if(clearAnchor)best=clearAnchor;
        else for(const glyphSize of [36,32])for(const side of [first,-first]){
          const b=bounds(true,glyphSize),xs=[x+side*76,x],ys=[y];
          for(const e of exclusions){xs.push(e.left-4-b.right,e.right+4-b.left);ys.push(e.top-4-b.bottom,e.bottom+4-b.top);}
          // Finite edge/corner refinements avoid a full coordinate grid. A
          // short viewport can need both axes moved past one occupied control.
          const candidates=[...xs.map(cx=>[cx,y]),...ys.map(cy=>[x+side*76,cy])];
          for(const e of exclusions)for(const cx of [e.left-4-b.right,e.right+4-b.left])for(const cy of [e.top-4-b.bottom,e.bottom+4-b.top])candidates.push([cx,cy]);
          for(const [cx,cy]of candidates){const candidate=choose(cx,cy,true,glyphSize);if(candidate.score<best.score)best=candidate;}
        }
      }
      baseX=best.x;baseY=best.y;sidebar=best.sidebar;size=best.size;
    }
    // One compact composition; at most three modest marks per accepted kind,
    // twelve TOTAL. Side clamping suppresses marks near short-screen actors.
    for(const fx of active){
      const point=active.length>1?slots[fx.kind]:[0,-48],cx=baseX+point[0],cy=baseY+point[1];
      const progress=1-fx.life/fx.maxLife;
      if(!reduceMotion&&!sidebar){
        ctx.globalAlpha=prior*.3*Math.max(0,1-progress);
        for(let i=0;i<3;i++){
          const angle=(i/3)*Math.PI*2,reach=20+progress*12;
          const px=Math.max(baseX-54,Math.min(baseX+54,cx+Math.cos(angle)*reach));
          const py=Math.max(baseY-106,Math.min(baseY-30,cy+Math.sin(angle)*reach));
          rect(ctx,px-1,py-1,3,2,colors[fx.kind]);
        }
      }
      ctx.globalAlpha=prior*Math.min(1,fx.life*5);
      powerFeedbackGlyph(ctx,fx.kind,cx,cy,size);
    }
    for(const [index,fx]of ended.entries()){
      const cx=ended.length===1?baseX:baseX+(index%2?48:-48),cy=ended.length===1?baseY-40:baseY-(index<2?88:42);
      ctx.globalAlpha=prior*.45*Math.min(1,fx.life*6);
      powerFeedbackGlyph(ctx,fx.kind,cx,cy,10);
      rect(ctx,cx-3,cy+6,6,1,colors[fx.kind]);
    }
    ctx.globalAlpha=prior;
  }
  function drawEnemy(ctx,e,time,{reduceMotion=false,forecast=true,phase='run',generation=null}={}) {
    const x=Math.round(e.x),y=Math.round(e.y),r=e.radius||7;
    if(e.kind==='burrower'){drawBurrower(ctx,e,time,{reduceMotion,forecast});return;}
    const friendly=e.bowled>0,stomper=e.attack==='stomp',bird=e.kind==='snowbird';
    if(forecast)drawAttackForecast(ctx,e,time,{reduceMotion});
    const penguin=e.kind==='chick'||e.kind==='penguin';
    const motion=sampleMotion(enemyMotion,e,time,e.kind==='chick'?19:26);
    const gliding=penguin&&motion.moving&&!friendly&&!(e.stun>0||e.windup>0||e.recovery>0);
    if(penguin&&!friendly){
      if(gliding)drawSlideWake(ctx,motion,e.kind,time,reduceMotion);
      else if(motion.trail.length)drawSlideWake(ctx,{...motion,moving:false},e.kind,time,reduceMotion);
    }
    if(friendly)bowlingCue(ctx,e,time,reduceMotion,r);
    if(e.charge>0&&!friendly){
      const length=Math.hypot(e.facingX||0,e.facingY||0)||1,fx=(e.facingX||0)/length,fy=(e.facingY||0)/length;
      for(let i=0;i<(bird?3:4);i++){
        const d=r+4+i*6,px=x-fx*d,py=y-fy*d;
        if(bird){rect(ctx,px-fy*3,py+fx*3,3,1,'#d3a7b5');rect(ctx,px+fy*3,py-fx*3,2,1,'#f9f0de');}
        else{oval(ctx,px,py,4-i*.6,3-i*.5,'#bed8dd');oval(ctx,px,py-1,3-i*.5,2-i*.4,'#fbf7e8');}
      }
      // Coral speed ticks retain the danger cue after the windup bubble ends.
      for(const side of [-1,1])rect(ctx,x-fy*side*(r+3)-fx*4,y+fx*side*(r+3)-fy*4,2,2,'#d58f91');
    }
    const cue=enemyWindupGeometry(e,{reduceMotion});
    if(cue.active){
      if(stomper)stompFootprint(ctx,e,{reduceMotion});
      else{
        const a=Math.atan2(e.facingY||0,e.facingX||0);
        for(let i=0;i<5;i++)rect(ctx,x+Math.cos(a+(i-2)*.25)*(r+10),y+Math.sin(a+(i-2)*.25)*(r+10),2,2,'#d8918b');
      }
      drawEnemyWindup(ctx,cue,{reduceMotion});
    }
    if(stomper&&e.stomp>0&&!friendly)stompFootprint(ctx,e,{reduceMotion});
    if(!penguin)oval(ctx,x,y+(bird?4:0),e.kind==='bear'?19:bird?9:r+1,e.kind==='bear'?17:bird?3:r,'#c6d8d7');
    if(bird&&!friendly){rect(ctx,x-8,y+5,3,1,'#b4d1d1');rect(ctx,x+6,y+5,3,1,'#b4d1d1');}
    if(!friendly&&!(e.crash>0)&&(e.hurt>0||e.flash>0||e.stun>0)&&!reduceMotion)ctx.globalAlpha=.5;
    const spinning=(e.spin>0||friendly)&&!reduceMotion;
    const bowlDuration=window.FryingPanguin?.SLAPSTICK_DEFS?.duration||.38;
    const turn=spinning?friendly?Math.floor((bowlDuration-Math.min(bowlDuration,e.bowled))/bowlDuration*8):Math.floor((.42-Math.min(.42,e.spin))/.42*8):0;
    const displayed=sampleEnemyHeading(e,time,{phase,generation},penguin?16:8);
    const direction=((spinning?directionOf(e):penguin?Math.round(displayed/2):displayed)+turn)%8;
    const wobble=spinning?Math.round(Math.sin(time*35)*2):0;
    const pose=bird?friendly?'bonk':e.charge>0||e.windup>0?'swoop':'walk':stomper&&!friendly?(e.stomp>0||e.recovery>.4?'flop':e.windup>0?'crouch':'walk'):'walk';
    const step=(e.kind==='bear'||bird)&&!reduceMotion&&Math.sin((e.walk||time*8+(e.age||0)))>0?1:0;
    const slideDirection=spinning?direction*2:displayed;
    const slideFrame=gliding?Math.floor(motion.phase*8):-1;
    const image=penguin?sprite(e.kind,slideDirection,e.charge>0?3:slideFrame,e.charge>0?'charge':'slide',16):sprite(e.kind||'penguin',direction,step,pose);
    ctx.drawImage(image,x-image.width/2+wobble,y-image.height/2);ctx.globalAlpha=1;
    if(stomper&&!friendly&&e.recovery>0){
      // A snow-flopped bear takes a visibly exhausted pause, giving the pan
      // a readable counter-bonk opportunity without another warning color.
      rect(ctx,x-r-4,y-3,3,1,'#b5cbd7');rect(ctx,x+r+2,y+2,3,1,'#b5cbd7');
      rect(ctx,x-3,y+r+3,6,1,'#e2ece6');
      if(e.stomp>0)for(const side of [-1,1]){oval(ctx,x+side*(r+5),y+2,4,2,'#c8dfe0');rect(ctx,x+side*(r+5)-2,y,4,1,'#fff8e9');}
    }
    if(e.crash>0)stars(ctx,x,y,r+7,reduceMotion?0:time,3);
    else if(e.spin>0&&!friendly)stars(ctx,x,y,r+6,reduceMotion?0:time,2);
    // Sliding penguins have long trailing feet; UI sits above the full sprite,
    // not the smaller circular collision radius.
    const top=e.kind==='bear'?27:bird?13:penguin?(e.kind==='chick'?11:15):r;
    if(e.hp<e.maxHp){const w=r*2+3;rect(ctx,x-w/2,y-top-7,w,3,C.ink);rect(ctx,x-w/2+1,y-top-6,Math.ceil((w-2)*Math.max(0,e.hp/e.maxHp)),1,C.coralLight);}
    if(e.windup>0&&!friendly)emote(ctx,e.kind,x,y-top-23);
  }
  function drawGoof(ctx,goof,time,{reduceMotion=false}={}) {
    const x=Math.round(goof.x),y=Math.round(goof.y),life=Math.max(0,goof.life),progress=1-life/(goof.maxLife||.65);
    const bird=goof.kind==='snowbird',radius=goof.radius||(goof.kind==='bear'?window.FryingPanguin.ENEMY_DEFS.bear.radius:goof.kind==='chick'?5:bird?6:7);
    const back=Math.atan2(goof.bowled>0?goof.bowlVy||0:goof.vy||0,goof.bowled>0?goof.bowlVx||0:goof.vx||0)+Math.PI;
    ctx.globalAlpha=Math.min(1,life*5);
    if(goof.bowled>0)bowlingCue(ctx,goof,time,reduceMotion,radius);
    // Slapstick slide trails are snow puffs; enemies simply get snow-flumped.
    for(let i=0;i<3;i++){
      const d=8+i*6,px=x+Math.cos(back)*d,py=y+Math.sin(back)*d;
      oval(ctx,px,py,4-i,3-i,'#c9dfe0');oval(ctx,px,py-1,3-i,2-i,'#faf8e9');
    }
    oval(ctx,x,y,radius+2,radius,'#bed4d9');
    const direction=reduceMotion?2:((Math.round((goof.spin||time*9)/(Math.PI/4))%8)+8)%8;
    const wobble=reduceMotion?0:Math.round(Math.sin(progress*Math.PI*4)*2);
    if(goof.kind==='burrower'){drawBurrower(ctx,{...goof,exposed:true,windup:0,stun:1,facingX:Math.cos(direction*Math.PI/4),facingY:Math.sin(direction*Math.PI/4)},time,{reduceMotion,forecast:false});ctx.globalAlpha=1;return;}
    const image=sprite(goof.kind||'penguin',direction,0,bird?'bonk':'walk');
    ctx.drawImage(image,x-image.width/2+wobble,y-image.height/2);
    const angle=direction*Math.PI/4;
    // Penguins keep the two feet in their sprite as they tumble. Legacy wing
    // flails apply only to other species, never a second orange pair.
    if(goof.kind!=='penguin'&&goof.kind!=='chick')for(const side of [-1,1]){
      const d=radius+3+(reduceMotion?0:Math.sin(progress*20)*2),fx=x-Math.sin(angle)*side*d-Math.cos(angle)*3,fy=y+Math.cos(angle)*side*d-Math.sin(angle)*3;
      rect(ctx,fx-2,fy-1,4,2,bird?'#889baa':'#be9365');rect(ctx,fx-1,fy-1,3,1,bird?'#fff5df':'#efc47e');
    }
    for(let i=0;i<6;i++){
      const a=i*Math.PI/3+(reduceMotion?0:progress*2),d=radius+4+(reduceMotion?3:progress*13),cx=x+Math.cos(a)*d,cy=y+Math.sin(a)*d;
      rect(ctx,cx,cy,i%2?1:2,i%2?2:1,['#e69cac','#b2a0c9','#f1d191'][i%3]);
      if(i%3===0){oval(ctx,cx,cy,2,1,'#c3a075');rect(ctx,cx-1,cy-1,2,1,'#f3d397');}
    }
    stars(ctx,x,y,radius+7,reduceMotion?0:time,3);
    if(progress>.72){oval(ctx,x,y,radius+3,3,'#e2eeea');rect(ctx,x-4,y-1,4,1,'#fafaf0');rect(ctx,x+3,y+1,3,1,'#fafaf0');}
    ctx.globalAlpha=1;
  }
  function drawImpact(ctx,impact,time,{reduceMotion=false}={}) {
    const x=Math.round(impact.x),y=Math.round(impact.y),progress=Math.max(0,Math.min(1,1-impact.life/(impact.maxLife||.4)));
    const crash=impact.kind==='crash'||impact.kind==='snowball'||impact.kind==='stomp',bounce=impact.kind==='bounce',chain=Math.min(2,impact.chain||0),reach=(crash?7:6)+progress*(crash?11:9)+chain;
    const priorAlpha=ctx.globalAlpha;ctx.globalAlpha=priorAlpha*Math.min(1,impact.life*7);
    if(!reduceMotion){
      for(let i=0;i<6;i++){
        const a=i*Math.PI/3+(crash?.3:0),px=x+Math.cos(a)*reach,py=y+Math.sin(a)*reach;
        if(crash){oval(ctx,px,py,3,2,'#b7d5dc');rect(ctx,px-1,py-2,3,2,'#f6f8eb');}
        else{rect(ctx,px,py,2,1,bounce?i%2?'#ad92b8':'#e3c4dd':i%2?'#93beb0':'#e6c887');if(i%3===0)cross(ctx,px,py,bounce?'#edd9e7':'#fff0b6');}
      }
    }
    if(crash){
      rect(ctx,x-4,y-1,9,3,'#d7e9e5');rect(ctx,x-2,y-3,5,7,'#e8f1e9');cross(ctx,x,y,'#fbf9eb');
    }else if(bounce)reboundCue(ctx,x,y);
    else{
      oval(ctx,x,y,4,3,'#c09c71');oval(ctx,x,y,3,2,'#efcf93');rect(ctx,x-1,y-1,2,2,'#fff0ab');
      if(chain>0){cross(ctx,x-7,y-4,'#e9cc90');cross(ctx,x+8,y+3,'#9cc8b4');}
    }
    ctx.globalAlpha=priorAlpha;
  }
  function drawGate(ctx,game) {
    if(!['run','dying','summary'].includes(game.phase))return;
    const shop=window.FryingPanguin.SHOP;
    rect(ctx,shop.doorLeft,shop.y+shop.height-10,shop.doorRight-shop.doorLeft,10,'#698798');rect(ctx,shop.doorLeft+1,shop.y+shop.height-9,shop.doorRight-shop.doorLeft-2,8,'#abc8d1');
    for(let x=shop.doorLeft+4;x<shop.doorRight;x+=7)rect(ctx,x,shop.y+shop.height-8,2,6,'#dbeae5');
    rect(ctx,477,shop.y+shop.height-8,6,6,'#a1866c');rect(ctx,478,shop.y+shop.height-7,4,4,C.gold);rect(ctx,480,shop.y+shop.height-6,1,2,'#9c845e');
  }
  // Fixed one-pixel scanlines give red waves crisp edges rather
  // than canvas antialiasing. Clip every span, including the empty center.
  function deathPolygon(ctx,points,width,height,cx,cy,gap,color) {
    ctx.fillStyle=color;
    const top=Math.max(0,Math.floor(Math.min(...points.map(p=>p[1]))));
    const bottom=Math.min(height,Math.ceil(Math.max(...points.map(p=>p[1]))));
    for(let y=top;y<bottom;y++){
      const row=1,sample=y+.5,crossings=[];
      for(let i=0;i<points.length;i++){
        const a=points[i],b=points[(i+1)%points.length];
        if((a[1]<=sample&&b[1]>sample)||(b[1]<=sample&&a[1]>sample))crossings.push(a[0]+(sample-a[1])*(b[0]-a[0])/(b[1]-a[1]));
      }
      crossings.sort((a,b)=>a-b);
      const nearY=cy<y?y-cy:cy>y+row?cy-y-row:0;
      const clear=nearY<gap?Math.sqrt(gap*gap-nearY*nearY):0;
      for(let i=0;i+1<crossings.length;i+=2){
        const left=Math.max(0,Math.ceil(crossings[i])),right=Math.min(width,Math.floor(crossings[i+1]));
        if(right<=left)continue;
        if(!clear){ctx.fillRect(left,y,right-left,row);continue;}
        const before=Math.min(right,Math.floor(cx-clear)),after=Math.max(left,Math.ceil(cx+clear));
        if(before>left)ctx.fillRect(left,y,before-left,row);
        if(right>after)ctx.fillRect(after,y,right-after,row);
      }
    }
  }
  // Screen-space, fixed authored shapes; no particles, RNG or actor mutation.
  // x/y use the exact rounded frozen player + camera projection from runtime.
  function drawDeathFlourish(ctx,{x,y,width,height,age},{reduceMotion=false}={}) {
    const d=window.FryingPanguin.DEATH_FLOURISH;
    if(!Number.isFinite(age)||age<0||age>=d.duration)return;
    ctx.save();ctx.setTransform(1,0,0,1,0,0);
    if(age<d.flashEnd){
      ctx.globalAlpha=(reduceMotion?.10:.24)*(1-age/d.flashEnd);
      rect(ctx,0,0,width,height,'#fff5df');
    }else{
      const progress=Math.min(1,(age-d.flashEnd)/(d.extendEnd-d.flashEnd));
      const growth=reduceMotion?1:1-(1-progress)*(1-progress);
      const reach=Math.max(d.gap,Math.hypot(width,height)*d.reach);
      ctx.globalAlpha=age<=d.fadeStart?1:(d.duration-age)/(d.duration-d.fadeStart);
      for(let i=0;i<d.rays;i++){
        const angle=i*Math.PI*2/d.rays-Math.PI/2,half=(i%2?7:11)*Math.PI/180;
        const end=d.gap+(reach*(i%2?.76:1)-d.gap)*growth;
        if(end-d.gap<2)continue;
        const point=(r,a)=>[Math.round(x+Math.cos(a)*r),Math.round(y+Math.sin(a)*r)];
        const outline=[point(d.gap,angle-half),point(end,angle-half),point(end,angle+half),point(d.gap,angle+half)];
        deathPolygon(ctx,outline,width,height,x,y,d.gap,'#68203f');
        const band=(start,finish,inset,color)=>{
          const near=Math.max(start*Math.cos(half),inset/Math.sin(half)),far=finish*Math.cos(half)-inset;
          if(far<=near)return;
          const point=(along,side)=>{
            const across=Math.max(0,along*Math.tan(half)-inset/Math.cos(half))*side;
            return[Math.round(x+Math.cos(angle)*along-Math.sin(angle)*across),Math.round(y+Math.sin(angle)*along+Math.cos(angle)*across)];
          };
          deathPolygon(ctx,[point(near,-1),point(far,-1),point(far,1),point(near,1)],width,height,x,y,d.gap,color);
        };
        band(d.gap,end,2,i%2?'#ad294a':'#cf3e55');
        // Three finite outward fronts; each arrives at a different final radius.
        // Reduced motion shows that final arrangement immediately after the wash.
        const finalEnd=reach*(i%2?.76:1),waveWidth=Math.max(10,finalEnd*.08);
        for(let wave=0;wave<3;wave++){
          const delay=wave*.09;
          const t=reduceMotion?1:Math.max(0,Math.min(1,(age-d.flashEnd-delay)/(d.extendEnd-d.flashEnd-delay)));
          const front=d.gap+(finalEnd-d.gap)*(1-wave*.3)*(1-(1-t)*(1-t));
          if(front-d.gap<4)continue;
          band(Math.max(d.gap,front-waveWidth),front,2,'#f16b72');
          band(Math.max(d.gap,front-3),front,2,'#ffb5af');
        }
      }
    }
    ctx.restore();
  }
  // Ten bounded screen-space gold fronts; no world state or random particles.
  function drawVictoryFlourish(ctx,{x,y,width,height,age},{reduceMotion=false}={}) {
    const d=window.FryingPanguin.VICTORY_FLOURISH;
    if(!Number.isFinite(age)||age<0||age>=d.duration)return;
    ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.beginPath();ctx.rect(0,0,width,height);ctx.clip();
    const line=(points,color,size)=>{ctx.strokeStyle=color;ctx.lineWidth=size;ctx.lineJoin='bevel';ctx.beginPath();points.forEach(([px,py],i)=>{ctx[i?'lineTo':'moveTo'](Math.round(px),Math.round(py));});ctx.stroke();};
    const cx=width/2,cy=height/2,rx=Math.max(12,width/2-9),ry=Math.max(12,height/2-9);
    if(reduceMotion){
      line([[7,7],[width-7,7],[width-7,height-7],[7,height-7],[7,7]],'#bd913e',2);
      for(const [px,py]of [[cx,7],[width-7,cy],[cx,height-7],[7,cy]])line([[px-3,py],[px,py-3],[px+3,py],[px,py+3],[px-3,py]],'#fff0a9',2);
    }else if(age>0){
      const outward=Math.min(1,age/d.outwardEnd),orbit=Math.max(0,(age-d.outwardEnd)/(d.duration-d.outwardEnd));
      for(let i=0;i<d.rays;i++){
        const angle=i*Math.PI*2/d.rays-Math.PI/2;
        let points;
        if(outward<1){
          const tx=cx+Math.cos(angle)*rx,ty=cy+Math.sin(angle)*ry,gap=Math.hypot(tx-x,ty-y),start=Math.min(1,16/Math.max(1,gap));
          const head=start+(1-start)*(1-(1-outward)**2),tail=Math.max(start,head-.19);
          points=[[x+(tx-x)*tail,y+(ty-y)*tail],[x+(tx-x)*head,y+(ty-y)*head]];
        }else{
          const a=angle+orbit*Math.PI*2;points=Array.from({length:5},(_,j)=>{const t=a-.18+j*.045;return[cx+Math.cos(t)*rx,cy+Math.sin(t)*ry];});
        }
        line(points,'#a97b30',4);line(points,'#f4cc67',2);const end=points.at(-1);rect(ctx,Math.round(end[0])-1,Math.round(end[1])-1,2,2,'#fff2ba');
      }
    }
    ctx.restore();
  }
  const hudIconCache=new Map();
  function iconDataURL(kind) {
    if(kind==='heart')return upgradeIconDataURL('heart');
    if(hudIconCache.has(kind))return hudIconCache.get(kind);
    const canvas=document.createElement('canvas');canvas.width=canvas.height=32;
    const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;
    if(['chick','penguin','bear','snowbird'].includes(kind)){oval(ctx,16,16,14,14,'#dcebe4');const image=sprite(kind,2,0);if(kind==='bear')ctx.drawImage(image,image.width/2-22,image.height/2-22,44,44,0,0,32,32);else ctx.drawImage(image,16-image.width/2,16-image.height/2,image.width,image.height);}
    else if(kind==='summary-coin'){
      // Summary-only face-on coin; flat integer steps keep the rim crisp at32/28px.
      const disc=(left,top,color)=>{
        for(const [y,inset,width,height] of [[0,9,8,1],[1,6,14,2],[3,4,18,2],[5,2,22,3],[8,1,24,3],[11,0,26,4],[15,1,24,3],[18,2,22,3],[21,4,18,2],[23,6,14,2],[25,9,8,1]])
          rect(ctx,left+inset,top+y,width,height,color);
      };
      disc(4,5,'#9b682d');disc(3,3,'#bc8738');
      oval(ctx,15,15,10,10,'#f3cc68');oval(ctx,15,15,8,8,'#eab64e');
      rect(ctx,10,7,8,2,'#fff0b0');rect(ctx,7,10,2,7,'#fff0b0');
      rect(ctx,14,11,3,2,'#bc8738');rect(ctx,12,13,7,5,'#bc8738');rect(ctx,14,18,3,2,'#bc8738');
      rect(ctx,14,12,3,2,'#f3cc68');rect(ctx,13,14,5,3,'#f3cc68');
    }
    else if(kind==='pan'){
      rect(ctx,15,14,13,3,C.ink);rect(ctx,21,14,6,1,'#91a9b3');oval(ctx,11,16,8,8,C.ink);oval(ctx,11,16,7,7,'#a9bec5');oval(ctx,10,15,5,5,'#d3dfd6');rect(ctx,8,11,4,1,'#f3f1dc');
    }else if(['banana','bond','jelly','rocky','greedy','golden','outing','survival'].includes(kind))shopGlyph(ctx,kind,16,16);
    else drawPowerup(ctx,{x:16,y:16,kind,age:1},0,{reduceMotion:true});
    const url=canvas.toDataURL('image/png');hudIconCache.set(kind,url);return url;
  }
  window.PanguinArt=Object.freeze({drawDeathFlourish,drawVictoryFlourish,enemyWindupGeometry,bearWindupGeometry,stompFootprint,playerSwingProgress,drawUpgradeIcon,upgradeIconCanvas,upgradeIconDataURL,createTerrain,drawWaterMotion,drawPlayer,drawSummaryFallen,drawFootprints,drawPowerActivation,prewarmPowerFeedback,drawEnemy,drawAttackForecast,drawGoof,drawImpact,drawPowerup,drawPeel,drawSnowball,drawHazard,drawScenery,drawChest,drawCoin,drawGate,pixelText,rect,iconDataURL});
})();
