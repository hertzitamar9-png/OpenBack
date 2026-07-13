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
out vec4 outColor;
float ring(float d,float r,float w){return 1.0-smoothstep(w,w+0.035,abs(d-r));}
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
void main(){
  float d=length(vP); if(d>1.0) discard;
  float a=atan(vP.y,vP.x); float alpha=0.0; vec3 color=vec3(1.0);
  if(uKind==0){
    float cracks=1.0-smoothstep(0.02,0.085,abs(sin(a*9.0+floor(d*8.0)*2.1)));
    alpha=cracks*(1.0-d)*0.85+ring(d,fract(uTime*1.8),0.025)*0.5; color=vec3(0.95,0.78,0.38);
  }else if(uKind==1){
    alpha=(ring(d,fract(uTime*0.9),0.055)+ring(d,fract(uTime*0.9+0.35),0.04))*0.75; color=vec3(0.15,0.72,1.0);
  }else if(uKind==2){
    float spiral=1.0-smoothstep(0.035,0.095,abs(sin(a*3.0-d*17.0-uTime*13.0)));
    alpha=spiral*(1.0-d)*0.72+ring(d,0.25+0.05*sin(uTime*8.0),0.05); color=vec3(0.82,0.9,0.88);
  }else if(uKind==3){
    float n=hash(floor((vP+uTime*vec2(0.2,-1.8))*18.0));
    alpha=smoothstep(0.42,0.88,n)*(1.0-d)*0.9; color=mix(vec3(1.0,0.15,0.01),vec3(1.0,0.9,0.1),n);
  }else if(uKind==4){
    alpha=ring(d,min(0.95,uTime*1.25),0.075)+ring(d,min(0.85,uTime*0.7),0.035); color=vec3(1.0,0.47,0.08);
  }else{
    float dust=hash(floor((vP+uTime*vec2(0.8,0.15))*13.0));
    alpha=smoothstep(0.58,0.9,dust)*(1.0-d)*0.55; color=vec3(0.78,0.61,0.31);
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
    const now = performance.now();
    this.events = this.events.filter(
      (e) => now - e.start < e.durationTicks * this.msPerTick,
    );
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
      if (e.kind === "tornado" && e.pathEnd !== undefined) {
        const ex = e.pathEnd % this.mapW,
          ey = (e.pathEnd - ex) / this.mapW;
        x += (ex - sx) * progress;
        y += (ey - sy) * progress;
      }
      gl.uniform2f(this.uCenter, x, y);
      gl.uniform1f(this.uRadius, e.radius);
      gl.uniform1f(this.uTime, progress);
      gl.uniform1i(this.uKind, kinds[e.kind] ?? 0);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
    gl.bindVertexArray(null);
  }

  dispose(): void {
    this.gl.deleteProgram(this.program);
    this.gl.deleteVertexArray(this.vao);
  }
}
