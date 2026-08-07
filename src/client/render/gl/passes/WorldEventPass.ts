import type { WorldEventFx } from "../../types";
import { createProgram } from "../utils/GlUtils";

const vert = `#version 300 es
precision highp float;
layout(location=0) in vec2 aPos;
uniform mat3 uCamera;
uniform vec2 uCenter;
uniform float uRadius;
out vec2 vP;
void main(){ vP=aPos*2.0-1.0; vec2 w=uCenter+vP*uRadius; gl_Position=vec4((uCamera*vec3(w,1)).xy,0,1); }`;

const frag = `#version 300 es
precision highp float;
in vec2 vP;
uniform float uTime;
uniform int uKind;
uniform float uAngle;
out vec4 outColor;
float ring(float d,float r,float w){return 1.0-smoothstep(w,w+0.035,abs(d-r));}
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float band(float x,float width){return 1.0-smoothstep(width,width+0.035,abs(x));}
void main(){
  float d=length(vP); if(d>1.0) discard;
  float ca=cos(uAngle),sa=sin(uAngle);
  vec2 q=vec2(ca*vP.x+sa*vP.y,-sa*vP.x+ca*vP.y);
  float a=atan(vP.y,vP.x); float alpha=0.0; vec3 color=vec3(1.0);
  if(uKind==0){
    float cracks=1.0-smoothstep(0.02,0.085,abs(sin(a*9.0+floor(d*8.0)*2.1)));
    float shock=ring(d,min(0.94,uTime*1.45),0.026);
    float dust=hash(floor((vP+uTime*vec2(0.5,-0.2))*24.0));
    alpha=cracks*(1.0-d)*0.8+shock*0.7+smoothstep(0.78,0.96,dust)*(1.0-d)*0.28;
    color=mix(vec3(0.38,0.22,0.10),vec3(1.0,0.78,0.28),shock);
  }else if(uKind==1){
    // A directional wall of water with a curling white crest, layered body,
    // foam breaks and trailing ripples. The whole shape advances along pathEnd.
    float curl=0.075*sin(q.y*10.0+uTime*18.0)+0.025*sin(q.y*31.0-uTime*23.0);
    float front=q.x-curl;
    float crest=band(front,0.045);
    float face=(1.0-smoothstep(-0.02,0.20,front))*smoothstep(-0.58,-0.08,front);
    float ripple1=band(front+0.29+0.025*sin(q.y*17.0),0.025);
    float ripple2=band(front+0.48+0.018*sin(q.y*23.0),0.018);
    float broken=0.55+0.45*smoothstep(0.18,0.82,hash(floor(vec2(q.y*42.0,uTime*15.0))));
    float foam=(crest*broken+ripple1*0.42+ripple2*0.25)*(1.0-smoothstep(0.72,0.96,abs(q.y)));
    alpha=(face*0.62+foam)*(1.0-smoothstep(0.78,1.0,d));
    color=mix(vec3(0.015,0.24,0.52),vec3(0.82,0.98,1.0),clamp(foam+crest*0.5,0.0,1.0));
  }else if(uKind==2){
    // Top-down tornado: a dense eye, rotating funnel bands, broad wind arcs
    // and fast debris. It reads as moving air rather than a static grey icon.
    float spin=a*4.0-d*19.0-uTime*31.0;
    float funnel=1.0-smoothstep(0.05,0.16,abs(sin(spin)));
    float wind1=ring(d,0.34+0.035*sin(uTime*9.0),0.035);
    float wind2=ring(d,0.58+0.025*cos(uTime*7.0),0.026);
    float wind3=ring(d,0.79,0.018);
    float arcMask=smoothstep(-0.3,0.75,sin(a*3.0-uTime*24.0+d*8.0));
    float eye=1.0-smoothstep(0.04,0.19,d);
    vec2 debrisCell=floor(vec2(a*15.0/6.28318,d*13.0-uTime*8.0));
    float debris=step(0.77,hash(debrisCell))*smoothstep(0.18,0.35,d)*(1.0-d);
    float air=(wind1+wind2*0.72+wind3*0.48)*arcMask;
    alpha=(funnel*(1.0-d)*0.68+air+eye*0.72+debris*0.8)*(1.0-smoothstep(0.9,1.0,d));
    color=mix(vec3(0.27,0.34,0.36),vec3(0.88,0.97,1.0),clamp(air+funnel*0.65,0.0,1.0));
  }else if(uKind==3){
    float n=hash(floor((vP+uTime*vec2(0.2,-1.8))*18.0));
    float flame=smoothstep(0.38,0.9,n)*(1.0-d)*(0.65+0.35*sin((vP.y-uTime)*31.0));
    float smoke=smoothstep(0.52,0.9,hash(floor((vP+uTime*vec2(-0.1,-0.7))*11.0)))*(1.0-d);
    alpha=max(flame,smoke*0.5); color=mix(vec3(0.19,0.16,0.15),vec3(1.0,0.22,0.015),flame);
  }else if(uKind==4){
    float blast=ring(d,min(0.95,uTime*1.55),0.07);
    float core=(1.0-smoothstep(0.0,0.23,d))*max(0.0,1.0-uTime*1.2);
    float sparks=step(0.9,hash(floor(vP*29.0-uTime*7.0)))*(1.0-d);
    alpha=blast+core+sparks*0.8; color=mix(vec3(1.0,0.16,0.01),vec3(1.0,0.94,0.48),core+blast);
  }else if(uKind==5){
    float dust=hash(floor((q+uTime*vec2(1.4,0.22))*17.0));
    float bands=0.5+0.5*sin(q.y*21.0+q.x*7.0+uTime*18.0);
    alpha=smoothstep(0.48,0.9,dust)*mix(0.25,0.7,bands)*(1.0-d);
    color=mix(vec3(0.42,0.28,0.12),vec3(0.96,0.77,0.39),bands);
  }else if(uKind==6){
    float flakes=step(0.78,hash(floor((q+uTime*vec2(1.8,-2.6))*31.0)));
    float gust=pow(0.5+0.5*sin(q.y*35.0+q.x*9.0+uTime*42.0),7.0);
    float whiteout=(1.0-d)*(0.18+gust*0.48+flakes*0.8);
    alpha=whiteout; color=mix(vec3(0.42,0.68,0.88),vec3(1.0),flakes+gust);
  }else if(uKind==7){
    float front=q.x-0.10*sin(q.y*8.0+uTime*15.0);
    float surge=band(front,0.08)+band(front+0.24,0.035)*0.55;
    float foam=step(0.66,hash(floor(vec2(q.y*38.0,uTime*18.0))))*surge;
    alpha=(surge*0.7+foam)*(1.0-smoothstep(0.8,1.0,d));
    color=mix(vec3(0.02,0.31,0.57),vec3(0.86,0.98,1.0),foam);
  }else if(uKind==8){
    float cone=smoothstep(0.34,0.02,abs(q.x)) * smoothstep(0.62,-0.72,q.y);
    float lava=pow(max(0.0,sin(a*7.0-d*18.0+uTime*19.0)),8.0)*(1.0-d);
    float plume=smoothstep(0.55,0.05,d)*(0.45+0.55*hash(floor((q-uTime*vec2(0.0,1.6))*18.0)));
    float shock=ring(d,min(0.92,uTime*1.3),0.045);
    alpha=max(cone*0.75+lava,plume*0.55)+shock*0.8;
    color=mix(vec3(0.13,0.11,0.12),vec3(1.0,0.20,0.015),clamp(lava+shock,0.0,1.0));
  }else if(uKind==9){
    float bolt=band(q.x-0.08*sin(q.y*23.0)-0.035*sin(q.y*61.0),0.025)*smoothstep(-0.92,0.7,q.y);
    float flash=(1.0-smoothstep(0.0,0.7,d))*pow(max(0.0,sin(uTime*75.0)),18.0);
    float ground=ring(d,0.22+uTime*0.5,0.035);
    alpha=bolt+flash*0.8+ground*0.65; color=mix(vec3(0.30,0.50,1.0),vec3(1.0),bolt+flash);
  }else if(uKind==10){
    float wall=smoothstep(0.65,-0.45,q.x)*(1.0-smoothstep(0.72,1.0,abs(q.y)));
    float grain=hash(floor((q+uTime*vec2(2.4,0.18))*45.0));
    float curls=pow(0.5+0.5*sin(q.y*18.0-q.x*7.0+uTime*28.0),5.0);
    alpha=wall*(0.25+grain*0.42+curls*0.25); color=mix(vec3(0.42,0.23,0.08),vec3(0.96,0.70,0.30),grain);
  }else if(uKind==11){
    float slope=smoothstep(-0.72,0.62,q.y+q.x*0.28);
    float chunks=step(0.63,hash(floor((q+vec2(0.0,uTime*2.8))*22.0)));
    float powder=pow(0.5+0.5*sin(q.x*26.0+q.y*9.0+uTime*35.0),6.0);
    alpha=slope*(chunks*0.75+powder*0.38)*(1.0-d); color=mix(vec3(0.42,0.55,0.64),vec3(0.98),powder);
  }else if(uKind==12){
    float edge=ring(d,0.18+uTime*0.62,0.055);
    float pit=(1.0-smoothstep(0.05,0.48,d))*smoothstep(0.16,0.8,uTime);
    float fractures=pow(max(0.0,sin(a*11.0+d*17.0)),14.0)*(1.0-d);
    alpha=pit*0.88+edge+fractures*0.7; color=mix(vec3(0.025,0.02,0.018),vec3(0.48,0.27,0.12),edge+fractures);
  }else if(uKind==13){
    float cells=hash(floor((q+uTime*vec2(1.3,-0.4))*24.0));
    float arcs=ring(d,fract(uTime*1.9),0.032)+ring(d,fract(uTime*1.9+0.5),0.025);
    float glow=smoothstep(0.54,0.95,cells)*(1.0-d);
    alpha=glow*0.7+arcs*0.5; color=mix(vec3(0.08,0.45,0.05),vec3(0.68,1.0,0.12),glow+arcs);
  }else if(uKind==14){
    float crystal=pow(abs(cos(a*6.0))*max(0.0,1.0-d),7.0);
    float frost=ring(d,min(0.95,uTime*1.25),0.07)+crystal*0.7;
    alpha=frost; color=mix(vec3(0.18,0.62,0.92),vec3(0.92,1.0,1.0),crystal);
  }else if(uKind==15){
    float crack=pow(abs(sin(a*8.0+d*14.0)),15.0);
    float melt=ring(d,max(0.08,1.0-uTime),0.08);
    alpha=(crack*0.5+melt)*(1.0-d*0.35); color=mix(vec3(0.05,0.35,0.66),vec3(0.75,0.96,1.0),melt);
  }else if(uKind==16){
    float hazard=0.5+0.5*sin(a*3.0+uTime*7.0);
    float pulse=ring(d,0.34+0.08*sin(uTime*11.0),0.055)+ring(d,0.72,0.03);
    float embers=step(0.82,hash(floor((q-uTime*vec2(0.2,1.1))*28.0)))*(1.0-d);
    alpha=pulse*hazard+embers*0.75; color=mix(vec3(0.12,0.55,0.02),vec3(0.90,1.0,0.12),pulse);
  }else{
    float sweep=fract(a/6.28318+uTime*1.7);
    float arc=step(0.0,sweep)*step(sweep,0.13)*smoothstep(0.28,0.38,d)*smoothstep(0.94,0.84,d);
    float outer=ring(d,0.88,0.028)*(0.35+0.65*step(0.5,fract(a*12.0/6.28318)));
    float inner=ring(d,0.52+0.045*sin(uTime*25.0),0.025);
    float cross=band(vP.x,0.012)*step(abs(vP.y),0.24)+band(vP.y,0.012)*step(abs(vP.x),0.24);
    alpha=outer+inner*0.75+arc+cross*0.7; color=mix(vec3(1.0,0.13,0.03),vec3(1.0,0.86,0.12),arc+inner);
  }
  alpha*=1.0-smoothstep(0.86,1.0,d); if(alpha<0.015) discard; outColor=vec4(color,alpha);
}`;

interface ActiveEvent extends WorldEventFx {
  start: number;
}

export class WorldEventPass {
  private program: WebGLProgram;
  private vao: WebGLVertexArrayObject;
  private events: ActiveEvent[] = [];
  private uCamera: WebGLUniformLocation;
  private uCenter: WebGLUniformLocation;
  private uRadius: WebGLUniformLocation;
  private uTime: WebGLUniformLocation;
  private uKind: WebGLUniformLocation;
  private uAngle: WebGLUniformLocation;

  constructor(
    private gl: WebGL2RenderingContext,
    private mapW: number,
    private msPerTick: number,
  ) {
    this.program = createProgram(gl, vert, frag);
    this.uCamera = gl.getUniformLocation(this.program, "uCamera")!;
    this.uCenter = gl.getUniformLocation(this.program, "uCenter")!;
    this.uRadius = gl.getUniformLocation(this.program, "uRadius")!;
    this.uTime = gl.getUniformLocation(this.program, "uTime")!;
    this.uKind = gl.getUniformLocation(this.program, "uKind")!;
    this.uAngle = gl.getUniformLocation(this.program, "uAngle")!;
    this.vao = gl.createVertexArray()!;
    gl.bindVertexArray(this.vao);
    const b = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([0, 0, 1, 0, 0, 1, 1, 0, 1, 1, 0, 1]),
      gl.STATIC_DRAW,
    );
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);
  }

  add(events: WorldEventFx[]): void {
    const now = performance.now();
    for (const event of events) this.events.push({ ...event, start: now });
    // Prevent a continent/world event burst from creating permanent overdraw
    // if several updates arrive together after a slow frame or reconnect.
    if (this.events.length > 24) {
      this.events.splice(0, this.events.length - 24);
    }
  }

  draw(camera: Float32Array): void {
    if (this.events.length === 0) return;
    const now = performance.now();
    let write = 0;
    for (let read = 0; read < this.events.length; read++) {
      const event = this.events[read];
      if (now - event.start < event.durationTicks * this.msPerTick) {
        this.events[write++] = event;
      }
    }
    this.events.length = write;
    if (this.events.length === 0) return;
    const kinds: Record<string, number> = {
      earthquake: 0,
      tsunami: 1,
      tornado: 2,
      wildfire: 3,
      meteor: 4,
      drought: 5,
      blizzard: 6,
      flood: 7,
      volcano: 8,
      lightning: 9,
      sandstorm: 10,
      avalanche: 11,
      sinkhole: 12,
      radiation_storm: 13,
      winter_freeze: 14,
      spring_thaw: 15,
      nuclear_saturation: 16,
      disaster_warning: 17,
    };
    const gl = this.gl;
    gl.useProgram(this.program);
    gl.uniformMatrix3fv(this.uCamera, false, camera);
    gl.bindVertexArray(this.vao);
    for (const e of this.events) {
      const progress = (now - e.start) / (e.durationTicks * this.msPerTick);
      const sx = e.tile % this.mapW,
        sy = (e.tile - sx) / this.mapW;
      let x = sx,
        y = sy;
      let angle = 0;
      if (e.pathEnd !== undefined) {
        const ex = e.pathEnd % this.mapW,
          ey = (e.pathEnd - ex) / this.mapW;
        angle = Math.atan2(ey - sy, ex - sx);
        if (
          e.kind === "tornado" ||
          e.kind === "tsunami" ||
          e.kind === "flood" ||
          e.kind === "wildfire" ||
          e.kind === "sandstorm" ||
          e.kind === "avalanche"
        ) {
          x += (ex - sx) * progress;
          y += (ey - sy) * progress;
        }
      }
      gl.uniform2f(this.uCenter, x, y);
      gl.uniform1f(this.uRadius, e.radius);
      gl.uniform1f(this.uTime, progress);
      gl.uniform1i(this.uKind, kinds[e.kind] ?? 0);
      gl.uniform1f(this.uAngle, angle);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
    gl.bindVertexArray(null);
  }

  dispose(): void {
    this.gl.deleteProgram(this.program);
    this.gl.deleteVertexArray(this.vao);
  }
}
