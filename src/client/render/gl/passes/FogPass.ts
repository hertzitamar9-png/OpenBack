import overlayVertSrc from "../shaders/map-overlay/overlay.vert.glsl?raw";
import { createMapQuad, createProgram, shaderSrc } from "../utils/GlUtils";
import { TILE_DEFINES } from "../utils/TileCodec";

const fragment = `#version 300 es
precision highp float;
precision highp usampler2D;
in vec2 vWorldPos;
uniform usampler2D uTileTex;
uniform vec2 uMapSize;
uniform uint uLocalOwner;
uniform int uRadarCount;
uniform vec3 uRadar[8];
uniform float uTime;
out vec4 outColor;
float mine(vec2 p) {
  ivec2 q = ivec2(clamp(p, vec2(0.0), uMapSize - vec2(1.0)));
  return (texelFetch(uTileTex, q, 0).r & uint(OWNER_MASK)) == uLocalOwner ? 1.0 : 0.0;
}
void main() {
  if (uLocalOwner == 0u) discard;
  float reveal = mine(vWorldPos);
  for(int i=0;i<8;i++) {
    if(i<uRadarCount) {
      float d = distance(vWorldPos,uRadar[i].xy);
      reveal = max(reveal, 1.0-smoothstep(uRadar[i].z-5.0,uRadar[i].z+7.0,d));
    }
  }
  // Reveal the territory itself, not four offset copies of every owned patch.
  // The old long-distance samples turned small disconnected holdings into a
  // field of circular holes around the player.
  if (reveal > 0.5) discard;

  // Two inexpensive moving wave fields make the unexplored area read as
  // rolling cloud banks rather than a flat grey screen.
  vec2 p = vWorldPos;
  float cloud = 0.50;
  cloud += 0.27*sin(p.x*0.050 + sin(p.y*0.031+uTime*0.18)*2.2 + uTime*0.23);
  cloud += 0.18*sin(p.y*0.071 - p.x*0.019 - uTime*0.31);
  cloud += 0.09*sin((p.x+p.y)*0.115 + uTime*0.41);
  cloud = smoothstep(0.12,0.88,cloud);
  float alpha = mix(0.48,0.78,cloud);
  vec3 shadow = vec3(0.055,0.085,0.12);
  vec3 mist = vec3(0.38,0.47,0.55);
  outColor = vec4(mix(shadow,mist,cloud),alpha);
}`;

export class FogPass {
  private program: WebGLProgram;
  private vao: WebGLVertexArrayObject;
  private uCamera: WebGLUniformLocation;
  private uMapSize: WebGLUniformLocation;
  private uLocalOwner: WebGLUniformLocation;
  private uTileTex: WebGLUniformLocation;
  private uRadarCount: WebGLUniformLocation;
  private uRadar: WebGLUniformLocation;
  private uTime: WebGLUniformLocation;
  private localOwner = 0;
  private radarData = new Float32Array(24);
  private radarCount = 0;

  constructor(
    private gl: WebGL2RenderingContext,
    private tileTex: WebGLTexture,
    private mapW: number,
    private mapH: number,
    private enabled: boolean,
  ) {
    this.program = createProgram(
      gl,
      overlayVertSrc,
      shaderSrc(fragment, TILE_DEFINES),
    );
    this.vao = createMapQuad(gl, mapW, mapH);
    this.uCamera = gl.getUniformLocation(this.program, "uCamera")!;
    this.uMapSize = gl.getUniformLocation(this.program, "uMapSize")!;
    this.uLocalOwner = gl.getUniformLocation(this.program, "uLocalOwner")!;
    this.uTileTex = gl.getUniformLocation(this.program, "uTileTex")!;
    this.uRadarCount = gl.getUniformLocation(this.program, "uRadarCount")!;
    this.uRadar = gl.getUniformLocation(this.program, "uRadar[0]")!;
    this.uTime = gl.getUniformLocation(this.program, "uTime")!;
  }

  setLocalOwner(owner: number): void {
    this.localOwner = owner;
  }

  setRadarReveals(
    reveals: Array<{ x: number; y: number; radius: number }>,
  ): void {
    this.radarCount = Math.min(8, reveals.length);
    for (let i = 0; i < this.radarCount; i++) {
      const off = i * 3;
      this.radarData[off] = reveals[i].x;
      this.radarData[off + 1] = reveals[i].y;
      this.radarData[off + 2] = reveals[i].radius;
    }
  }

  draw(camera: Float32Array): void {
    if (!this.enabled || this.localOwner === 0) return;
    const gl = this.gl;
    gl.useProgram(this.program);
    gl.uniformMatrix3fv(this.uCamera, false, camera);
    gl.uniform2f(this.uMapSize, this.mapW, this.mapH);
    gl.uniform1ui(this.uLocalOwner, this.localOwner);
    gl.uniform1i(this.uRadarCount, this.radarCount);
    gl.uniform3fv(this.uRadar, this.radarData);
    gl.uniform1f(this.uTime, performance.now() / 1000);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.tileTex);
    gl.uniform1i(this.uTileTex, 0);
    gl.bindVertexArray(this.vao);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.bindVertexArray(null);
  }

  dispose(): void {
    this.gl.deleteProgram(this.program);
    this.gl.deleteVertexArray(this.vao);
  }
}
