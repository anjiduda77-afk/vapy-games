import { TrafficCar } from "../GoCarGame";

export const drawCityBg = (ctx: CanvasRenderingContext2D, offset: number, CW: number, CH: number, ROAD_LEFT: number, ROAD_RIGHT: number, ROAD_W: number) => {
  const sky = ctx.createLinearGradient(0, 0, 0, CH);
  sky.addColorStop(0, "#050520"); sky.addColorStop(1, "#0a0a2e");
  ctx.fillStyle = sky; ctx.fillRect(0, 0, CW, CH);
  const bColors = ["#1a1a3e","#0e0e2a","#141428"];
  [[0,55,200],[0,40,280],[5,50,160]].forEach(([bx,bw,bh],i) => {
    ctx.fillStyle = bColors[i%3]; ctx.fillRect(bx, CH-bh, bw, bh);
    ctx.fillStyle = "rgba(255,220,80,0.6)";
    for(let wy=CH-bh+10; wy<CH-10; wy+=18) for(let wx=bx+6; wx<bx+bw-6; wx+=12) {
      if(Math.sin(wx+wy)>0) ctx.fillRect(wx, wy, 6, 8);
    }
  });
  [[ROAD_RIGHT+5,50,240],[ROAD_RIGHT+10,45,180],[ROAD_RIGHT,55,300]].forEach(([bx,bw,bh],i) => {
    ctx.fillStyle = bColors[i%3]; ctx.fillRect(bx, CH-bh, bw, bh);
    ctx.fillStyle = "rgba(100,200,255,0.4)";
    for(let wy=CH-bh+10; wy<CH-10; wy+=18) for(let wx=bx+6; wx<bx+bw-6; wx+=12) {
      if(Math.cos(wx*wy)>0) ctx.fillRect(wx, wy, 6, 8);
    }
  });
  ctx.fillStyle = "#111122"; ctx.fillRect(ROAD_LEFT, 0, ROAD_W, CH);
  const dashLen = 40; const dashGap = 30;
  const totalLen = dashLen + dashGap;
  const startY = ((offset % totalLen) - dashLen);
  ctx.strokeStyle = "rgba(255,214,0,0.6)"; ctx.lineWidth = 2; ctx.setLineDash([dashLen, dashGap]);
  [ROAD_LEFT+ROAD_W/3, ROAD_LEFT+ROAD_W*2/3].forEach(lx => {
    ctx.beginPath(); ctx.moveTo(lx, startY); ctx.lineTo(lx, CH+50); ctx.stroke();
  });
  ctx.setLineDash([]);
  ctx.fillStyle = "#cc1111"; ctx.fillRect(ROAD_LEFT-4, 0, 4, CH); ctx.fillRect(ROAD_RIGHT, 0, 4, CH);
  const glowL = ctx.createLinearGradient(ROAD_LEFT-20, 0, ROAD_LEFT+10, 0);
  glowL.addColorStop(0,"transparent"); glowL.addColorStop(1,"rgba(0,200,255,0.15)");
  ctx.fillStyle = glowL; ctx.fillRect(ROAD_LEFT-20, 0, 30, CH);
  const glowR = ctx.createLinearGradient(ROAD_RIGHT-10, 0, ROAD_RIGHT+20, 0);
  glowR.addColorStop(0,"rgba(255,0,200,0.15)"); glowR.addColorStop(1,"transparent");
  ctx.fillStyle = glowR; ctx.fillRect(ROAD_RIGHT-10, 0, 30, CH);
  
  const lightSpacing = 120;
  const lightOffset = CH - (offset % lightSpacing);
  for(let ly = lightOffset - lightSpacing*2; ly < CH+lightSpacing; ly += lightSpacing) {
    ctx.fillStyle = "#334"; ctx.fillRect(ROAD_LEFT-22, ly-60, 4, 65);
    ctx.beginPath(); ctx.arc(ROAD_LEFT-20, ly-62, 8, 0, Math.PI*2); ctx.fillStyle = "rgba(0,255,255,0.9)"; ctx.fill();
    const lg = ctx.createRadialGradient(ROAD_LEFT-20, ly-62, 0, ROAD_LEFT-20, ly-62, 40);
    lg.addColorStop(0,"rgba(0,255,255,0.15)"); lg.addColorStop(1,"transparent");
    ctx.fillStyle = lg; ctx.beginPath(); ctx.arc(ROAD_LEFT-20, ly-62, 40, 0, Math.PI*2); ctx.fill();
    
    ctx.fillStyle = "#334"; ctx.fillRect(ROAD_RIGHT+18, ly-60, 4, 65);
    ctx.beginPath(); ctx.arc(ROAD_RIGHT+20, ly-62, 8, 0, Math.PI*2); ctx.fillStyle = "rgba(255,0,200,0.9)"; ctx.fill();
    const rg = ctx.createRadialGradient(ROAD_RIGHT+20, ly-62, 0, ROAD_RIGHT+20, ly-62, 40);
    rg.addColorStop(0,"rgba(255,0,200,0.15)"); rg.addColorStop(1,"transparent");
    ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(ROAD_RIGHT+20, ly-62, 40, 0, Math.PI*2); ctx.fill();
  }
};

export const drawVillageBg = (ctx: CanvasRenderingContext2D, offset: number, CW: number, CH: number, ROAD_LEFT: number, ROAD_RIGHT: number, ROAD_W: number) => {
  const sky = ctx.createLinearGradient(0, 0, 0, CH*0.6);
  sky.addColorStop(0, "#87CEEB"); sky.addColorStop(1, "#d4eef7");
  ctx.fillStyle = sky; ctx.fillRect(0, 0, CW, CH);
  ctx.fillStyle = "#6b7c8c";
  [[0,CH*0.5,120],[60,CH*0.45,90],[CW-100,CH*0.5,110],[CW-50,CH*0.42,80]].forEach(([mx,my,mh]) => {
    ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(mx+mh*0.7, my-mh); ctx.lineTo(mx+mh*1.4, my); ctx.fill();
  });
  ctx.fillStyle = "#4a7c3f"; ctx.fillRect(0, 0, ROAD_LEFT, CH); ctx.fillRect(ROAD_RIGHT, 0, CW-ROAD_RIGHT, CH);
  ctx.fillStyle = "#8b7355"; ctx.fillRect(ROAD_LEFT, 0, ROAD_W, CH);
  ctx.fillStyle = "rgba(100,80,50,0.4)";
  for(let ty=0; ty<CH; ty+=8) ctx.fillRect(ROAD_LEFT+5, ty, ROAD_W-10, 2);
  ctx.strokeStyle = "rgba(255,255,255,0.5)"; ctx.lineWidth = 2; ctx.setLineDash([30,25]);
  const startY2 = (offset % 55) - 30;
  [ROAD_LEFT+ROAD_W/3, ROAD_LEFT+ROAD_W*2/3].forEach(lx => {
    ctx.beginPath(); ctx.moveTo(lx, startY2); ctx.lineTo(lx, CH+50); ctx.stroke();
  });
  ctx.setLineDash([]);
  const treeSpacing = 80;
  const treeOffset = (offset % treeSpacing);
  for(let ty2 = treeOffset - treeSpacing; ty2 < CH+treeSpacing; ty2 += treeSpacing) {
    ctx.fillStyle = "#5a3a1a"; ctx.fillRect(20, ty2, 8, 35);
    ctx.fillStyle = "#2d7a2d"; ctx.beginPath(); ctx.arc(24, ty2-10, 22, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = "#5a3a1a"; ctx.fillRect(ROAD_RIGHT+32, ty2, 8, 35);
    ctx.fillStyle = "#256025"; ctx.beginPath(); ctx.arc(ROAD_RIGHT+36, ty2-10, 22, 0, Math.PI*2); ctx.fill();
  }
  ctx.fillStyle = "rgba(255,255,255,0.3)"; ctx.fillRect(ROAD_LEFT, 0, 3, CH); ctx.fillRect(ROAD_RIGHT-3, 0, 3, CH);
};

export const drawPlayerCar = (ctx: CanvasRenderingContext2D, x: number, y: number, neon: boolean, CAR_W: number, CAR_H: number) => {
  ctx.save();
  if(neon) { ctx.shadowColor = "#00ffff"; ctx.shadowBlur = 18; }
  const bodyGrad = ctx.createLinearGradient(x, y, x+CAR_W, y+CAR_H);
  bodyGrad.addColorStop(0, neon ? "#00aaff" : "#3399ff");
  bodyGrad.addColorStop(0.5, neon ? "#0044cc" : "#1166bb");
  bodyGrad.addColorStop(1, neon ? "#00ffff" : "#0088dd");
  ctx.fillStyle = bodyGrad;
  ctx.beginPath(); ctx.roundRect(x, y+8, CAR_W, CAR_H-16, 4); ctx.fill();
  ctx.fillStyle = neon ? "rgba(0,200,255,0.8)" : "rgba(50,150,220,0.8)";
  ctx.beginPath(); ctx.roundRect(x+5, y+14, CAR_W-10, CAR_H-32, 3); ctx.fill();
  ctx.fillStyle = "rgba(150,220,255,0.6)"; ctx.beginPath(); ctx.roundRect(x+6, y+16, CAR_W-12, 16, 2); ctx.fill();
  ctx.fillStyle = "rgba(100,180,200,0.5)"; ctx.beginPath(); ctx.roundRect(x+6, y+CAR_H-32, CAR_W-12, 12, 2); ctx.fill();
  ctx.fillStyle = "rgba(255,255,200,0.9)"; ctx.shadowColor="#ffff00"; ctx.shadowBlur=10;
  ctx.beginPath(); ctx.ellipse(x+6, y+10, 5, 3, 0, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(x+CAR_W-6, y+10, 5, 3, 0, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = "rgba(255,50,50,0.9)"; ctx.shadowColor="#ff0000"; ctx.shadowBlur=8;
  ctx.beginPath(); ctx.ellipse(x+6, y+CAR_H-10, 5, 3, 0, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(x+CAR_W-6, y+CAR_H-10, 5, 3, 0, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = "#111"; ctx.shadowBlur=0;
  [[-3,12],[CAR_W-1,12],[-3,CAR_H-22],[CAR_W-1,CAR_H-22]].forEach(([wx,wy]) => {
    ctx.beginPath(); ctx.roundRect(x+wx, y+wy, 5, 14, 2); ctx.fill();
  });
  ctx.restore();
};

export const drawTrafficCar = (ctx: CanvasRenderingContext2D, car: TrafficCar) => {
  ctx.save();
  ctx.fillStyle = car.color; ctx.beginPath(); ctx.roundRect(car.x, car.y, car.width, car.height, 4); ctx.fill();
  ctx.fillStyle = "rgba(150,220,255,0.5)"; ctx.beginPath(); ctx.roundRect(car.x+4, car.y+6, car.width-8, 14, 2); ctx.fill();
  ctx.fillStyle = "rgba(255,200,100,0.8)";
  ctx.fillRect(car.x+3, car.y+car.height-8, 8, 4); ctx.fillRect(car.x+car.width-11, car.y+car.height-8, 8, 4);
  ctx.fillStyle = "#222";
  [[-2,8],[-2,car.height-16],[car.width-2,8],[car.width-2,car.height-16]].forEach(([wx,wy]) => { ctx.fillRect(car.x+wx, car.y+wy, 4, 10); });
  ctx.restore();
};

export const drawHUD = (ctx: CanvasRenderingContext2D, gs: any, level: number, getSpeedBase: (l:number)=>number, CW: number, CH: number, def: any) => {
  ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.beginPath(); ctx.roundRect(10, 10, 120, 18, 4); ctx.fill();
  const hpColor = gs.health > 60 ? "#00ff88" : gs.health > 30 ? "#ffaa00" : "#ff2244";
  ctx.fillStyle = hpColor; Math.max(gs.health, 0);
  ctx.beginPath(); ctx.roundRect(12, 12, (Math.max(0, gs.health)/100)*116, 14, 3); ctx.fill();
  ctx.fillStyle = "white"; ctx.font = "bold 9px sans-serif"; ctx.fillText(`HP ${Math.round(Math.max(0,gs.health))}%`, 16, 23);
  
  const tColor = gs.timeLeft <= 10 ? "#ff2244" : "#ffffff";
  ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.beginPath(); ctx.roundRect(CW/2-30, 10, 60, 22, 4); ctx.fill();
  ctx.fillStyle = tColor; ctx.font = "bold 14px monospace";
  ctx.textAlign = "center"; ctx.fillText(`${Math.ceil(gs.timeLeft)}s`, CW/2, 26); ctx.textAlign="left";
  
  ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.beginPath(); ctx.roundRect(CW-90, 10, 80, 22, 4); ctx.fill();
  ctx.fillStyle = "#ffd700"; ctx.font = "bold 12px sans-serif";
  ctx.textAlign = "right"; ctx.fillText(`⭐ ${gs.score}`, CW-14, 26); ctx.textAlign="left";
  
  ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.beginPath(); ctx.arc(CW-38, CH-38, 30, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.2)"; ctx.lineWidth=2;
  ctx.beginPath(); ctx.arc(CW-38, CH-38, 28, Math.PI*0.75, Math.PI*2.25); ctx.stroke();
  const speedAngle = Math.PI*0.75 + (gs.speed / (getSpeedBase(level)+3)) * Math.PI*1.5;
  ctx.strokeStyle = "#00ffff"; ctx.lineWidth=3;
  ctx.beginPath(); ctx.moveTo(CW-38, CH-38);
  ctx.lineTo(CW-38+Math.cos(speedAngle)*20, CH-38+Math.sin(speedAngle)*20); ctx.stroke();
  ctx.fillStyle="white"; ctx.font="bold 8px sans-serif"; ctx.textAlign="center";
  ctx.fillText(`${Math.round(gs.speed*20)}`, CW-38, CH-33); ctx.textAlign="left";
  ctx.fillStyle="#aaa"; ctx.font="7px sans-serif"; ctx.textAlign="center";
  ctx.fillText("km/h", CW-38, CH-22); ctx.textAlign="left";
  
  ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.beginPath(); ctx.roundRect(10, CH-30, 90, 22, 4); ctx.fill();
  ctx.fillStyle = def.color.replace("text-","").includes("emerald") ? "#10b981" : "#a855f7";
  ctx.font="bold 10px sans-serif";
  ctx.fillText(`${def.emoji} Lv.${level} ${def.name}`, 16, CH-15);
};
