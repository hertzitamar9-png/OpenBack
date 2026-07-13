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
out vec4 outColor;
bool mine(vec2 p) {
  ivec2 q = ivec2(clamp(p, vec2(0.0), uMapSize - vec2(1.0)));
  return (texelFetch(uTileTex, q, 0).r & uint(OWNER_MASK)) == uLocalOwner;
}
void main() {
  float r = 14.0;
  bool visible = mine(vWorldPos) || mine(vWorldPos + vec2(r,0.0)) ||
    mine(vWorldPos + vec2(-r,0.0)) || mine(vWorldPos + vec2(0.0,r)) ||
    mine(vWorldPos + vec2(0.0,-r)) || mine(vWorldPos + vec2(r,r)) ||
    mine(vWorldPos + vec2(-r,r)) || mine(vWorldPos + vec2(r,-r)) ||
    mine(vWorldPos + vec2(-r,-r));
  for(int i=0;i<8;i++){ if(i<uRadarCount && distance(vWorldPos,uRadar[i].xy)<=uRadar[i].z) visible=true; }
  if (visible || uLocalOwner == 0u) discard;
  float grain = fract(sin(dot(floor(vWorldPos * 0.45), vec2(12.9898,78.233))) * 43758.5453);
  outColor = vec4(vec3(0.015 + grain * 0.018), 0.82);
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
