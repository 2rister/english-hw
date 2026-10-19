// ORBITAL scene adapter: the player's course is independent from visual camera shake.
export class SpaceScene{
 constructor(canvas){
  this.canvas=canvas;this.ctx=canvas.getContext('2d');this.x=.5;this.target=.5;this.active=false;this.rafId=null;this.stage=1;this.particles=[];this.confirmAt=0;this.impactAt=0;
  this.ship=new Image();this.ship.src=new URL('../space-mission/assets/rocket.jpg',location.href).href;
  this.reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  this.stars=Array.from({length:100},()=>({x:Math.random(),y:Math.random(),z:.3+Math.random()}));
  this.onResize=()=>this.resize();addEventListener('resize',this.onResize);this.resize();this.last=performance.now();
 }
 resize(){const box=this.canvas.parentElement.getBoundingClientRect(),d=Math.min(devicePixelRatio||1,1.5);this.w=box.width;this.h=box.height;this.canvas.width=this.w*d;this.canvas.height=this.h*d;this.ctx.setTransform(d,0,0,d,0,0);if(!this.active)this.render(performance.now(),0);}
 set(stage){this.stage=stage;this.confirmAt=0;this.impactAt=0;}
 choose(lane){this.steer([.22,.5,.78][lane]??.5);}
 steer(x){this.target=Math.max(.1,Math.min(.9,x));if(this.reduced){this.x=this.target;this.render(performance.now(),0);}}
 confirm(){this.confirmAt=performance.now();if(!this.reduced)this.burst('#a38aff',34);}
 impact(){this.impactAt=performance.now();if(!this.reduced)this.burst('#ff9b53',70);}
 burst(color,count){this.particles.push(...Array.from({length:count},()=>({x:this.x*this.w,y:this.h*.8,vx:(Math.random()-.5)*13,vy:(Math.random()-.5)*13,life:1,color})));this.particles=this.particles.slice(-150);}
 start(){if(this.active||this.reduced)return;this.active=true;this.last=performance.now();this.rafId=requestAnimationFrame(t=>this.loop(t));}
 stop(){this.active=false;cancelAnimationFrame(this.rafId);this.rafId=null;this.render(performance.now(),0);}
 destroy(){this.stop();removeEventListener('resize',this.onResize);}
 loop(now){if(!this.active)return;const dt=Math.min((now-this.last)/16.67,3);this.last=now;this.render(now,dt);this.rafId=requestAnimationFrame(t=>this.loop(t));}
 render(now,dt){
  const c=this.ctx;if(!c||!this.w)return;
  const hit=!this.reduced&&this.impactAt?Math.max(0,1-(now-this.impactAt)/900):0,boost=!this.reduced&&this.confirmAt?Math.max(0,1-(now-this.confirmAt)/1200):0;
  const step=hit>.92?0:dt;this.x+=(this.target-this.x)*(1-Math.exp(-step*.2));
  c.clearRect(0,0,this.w,this.h);c.save();
  c.translate(Math.sin(now*.073)*hit*hit*19,Math.cos(now*.091)*hit*hit*12);
  for(const star of this.stars){
   if(!this.reduced)star.y=(star.y+step*.0013*star.z*(1+boost*22))%1;
   c.globalAlpha=Math.min(1,star.z*.55+boost*.4);c.fillStyle=boost?'#bd9aff':'#bacde5';c.fillRect(star.x*this.w,star.y*this.h,star.z,star.z*(2+boost*90));
  }
  c.globalAlpha=1;
  if(boost){c.strokeStyle=`rgba(139,207,255,${boost*.5})`;c.lineWidth=2;for(let i=0;i<20;i++){const a=i*Math.PI/10,r=this.w*.4+(now%180)/180*this.w;c.beginPath();c.moveTo(this.w*.5+Math.cos(a)*r,this.h*.6+Math.sin(a)*r);c.lineTo(this.w*.5+Math.cos(a)*r*1.8,this.h*.6+Math.sin(a)*r*1.8);c.stroke();}}
  const x=this.x*this.w,y=this.h*.81,width=Math.min(70,this.w*.18),height=width*1.45;
  c.save();c.translate(x,y);c.rotate(this.reduced?0:(this.target-this.x)*.5);c.scale(1-boost*.12,1+boost*.2);
  const flame=boost?'#b398ff':'#69eaff',length=height*(.45+boost*.9),glow=c.createRadialGradient(0,height*.4,0,0,height*.6,width*(1+boost));glow.addColorStop(0,flame);glow.addColorStop(1,'transparent');
  c.fillStyle=glow;c.fillRect(-width*1.5,0,width*3,height*2);
  c.fillStyle=flame;c.beginPath();c.moveTo(-width*.12,height*.3);c.lineTo(0,height*.3+length);c.lineTo(width*.12,height*.3);c.fill();
  if(this.ship.complete&&this.ship.naturalWidth){c.globalCompositeOperation='screen';if(boost){c.globalAlpha=.25;c.drawImage(this.ship,-width*.7,-height*.25,width*1.4,height);c.globalAlpha=1;}c.drawImage(this.ship,-width*.7,-height*.5,width*1.4,height);}
  c.restore();
  if(hit){const travel=Math.min(1,(now-this.impactAt)/180),mx=-70+(x+70)*travel,my=this.h*.12+(y-this.h*.12)*travel;c.strokeStyle='#ffc27b';c.lineWidth=8;c.beginPath();c.moveTo(mx-75,my-140);c.lineTo(mx,my);c.stroke();c.fillStyle='#ffd1a0';c.beginPath();c.arc(mx,my,18+hit*8,0,Math.PI*2);c.fill();}
  for(const particle of this.particles){particle.x+=particle.vx*step;particle.y+=particle.vy*step;particle.life-=.025*step;c.globalAlpha=Math.max(0,particle.life);c.fillStyle=particle.color;c.fillRect(particle.x,particle.y,4+hit*3,4+hit*3);}
  this.particles=this.particles.filter(p=>p.life>0);c.globalAlpha=1;c.restore();
 }
}
