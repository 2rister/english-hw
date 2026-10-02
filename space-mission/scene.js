export class SpaceScene {
  constructor(canvas) {
    this.canvas=canvas; this.ctx=canvas.getContext('2d'); this.lane=1; this.x=.5;this.stage=0;
    this.ship=new Image();this.ship.src='./assets/rocket.jpg';this.particles=[];
    this.reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.stars=Array.from({length:80},()=>({x:Math.random(),y:Math.random(),z:Math.random()+.2}));
    addEventListener('resize',()=>this.resize());this.resize(); this.last=performance.now();this.loop(this.last);
  }
  resize() {
    this.w=innerWidth;this.h=innerHeight;const d=Math.min(devicePixelRatio||1,2);
    this.canvas.width=this.w*d;this.canvas.height=this.h*d;this.ctx.setTransform(d,0,0,d,0,0);
  }
  set(stage) { this.stage=stage;this.boostAt=0;this.exploded=false; }
  choose(lane) { this.lane=lane; }
  approachY() { return this.h*(this.h<700?.78:.74)-Math.min(this.w*.25,125)*1.45*.5; }
  boost() { this.boostAt=performance.now();this.stage=2; }
  explode() {
    this.exploded=true;
    this.particles=Array.from({length:75},()=>({x:this.x*this.w,y:this.h*(this.h<700?.78:.74),vx:(Math.random()-.5)*7,vy:(Math.random()-.5)*7,life:1}));
  }
  loop(now) {
    const dt=Math.min((now-this.last)/16.67,3);this.last=now;const c=this.ctx;c.clearRect(0,0,this.w,this.h);
    this.drawStars(dt);
    if (this.stage && !this.exploded) this.drawShip(now,dt);
    this.drawParticles(dt);
    requestAnimationFrame(t=>this.loop(t));
  }
  drawStars(dt) {
    const c=this.ctx;c.fillStyle='#d7e5f2';
    for (const star of this.stars) {
      if (!this.reduced) star.y=(star.y+dt*.0009*star.z*(this.boostAt?5:1))%1;
      c.globalAlpha=star.z*.45;c.fillRect(star.x*this.w,star.y*this.h,star.z*1.5,star.z*(this.stage?5:1.5));
    } c.globalAlpha=1;
  }
  drawShip(now,dt) {
    const c=this.ctx, target=[.22,.5,.78][this.lane];this.x+=(target-this.x)*Math.min(.14*dt,1);
    const width=Math.min(this.w*.25,125), height=width*1.45;
    let y=this.h*(this.h<700?.78:.74);
    if (this.boostAt) y-=Math.pow((now-this.boostAt)/900,2)*this.h;
    if (this.stage===2 && !this.boostAt) { y=this.h*.84; }
    const x=this.x*this.w, flame=this.stage===2?'#aa7aff':'#f9c174', pulse=this.reduced?1:1+Math.sin(now*.035)*.16;
    const gradient=c.createRadialGradient(x,y+height*.43,2,x,y+height*.48,70);gradient.addColorStop(0,flame);gradient.addColorStop(1,'transparent');
    c.fillStyle=gradient;c.fillRect(x-70,y+height*.2,140,130);
    c.fillStyle=flame;c.beginPath();c.moveTo(x-width*.12,y+height*.39);c.lineTo(x,y+height*(.78*pulse));c.lineTo(x+width*.12,y+height*.39);c.fill();
    c.save();c.globalCompositeOperation='screen';
    if (this.ship.complete && this.ship.naturalWidth) c.drawImage(this.ship,x-width*.7,y-height*.5,width*1.4,height);
    c.restore();
  }
  drawParticles(dt) {
    const c=this.ctx;
    for (const p of this.particles) { p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=.015*dt;c.globalAlpha=Math.max(0,p.life);c.fillStyle='#ffc48a';c.fillRect(p.x,p.y,4,4); }
    c.globalAlpha=1;this.particles=this.particles.filter(p=>p.life>0);
  }
}
