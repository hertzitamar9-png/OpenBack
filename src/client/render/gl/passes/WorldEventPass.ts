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
    float wall=1.0-smoothstep(0.045,0.15,abs(q.x));
    float foam=0.55+0.45*sin(q.y*34.0+uTime*28.0);
    float wake=exp(-max(0.0,-q.x)*4.0)*(q.x<0.0?1.0:0.0);
    alpha=(wall*(0.72+foam*0.28)+wake*0.35)*(1.0-smoothstep(0.72,1.0,d));
    color=mix(vec3(0.02,0.28,0.52),vec3(0.72,0.95,1.0),wall*foam);
  }else if(uKind==2){
    float spiral=1.0-smoothstep(0.035,0.095,abs(sin(a*3.0-d*17.0-uTime*13.0)));
    float debris=step(0.82,hash(floor((vP+uTime*vec2(1.1,-0.8))*19.0)))*(1.0-d);
    alpha=spiral*(1.0-d)*0.78+ring(d,0.25+0.05*sin(uTime*8.0),0.05)+debris*0.7;
    color=mix(vec3(0.35,0.42,0.39),vec3(0.9,0.97,0.94),spiral);
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
  }else{
    float dust=hash(floor((q+uTime*vec2(1.4,0.22))*17.0));
    float bands=0.5+0.5*sin(q.y*21.0+q.x*7.0+uTime*18.0);
    alpha=smoothstep(0.48,0.9,dust)*mix(0.25,0.7,bands)*(1.0-d);
    color=mix(vec3(0.42,0.28,0.12),vec3(0.96,0.77,0.39),bands);
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
          e.kind === "wildfire"
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
