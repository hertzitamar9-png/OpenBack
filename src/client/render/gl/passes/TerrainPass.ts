/**
 * TerrainPass — renders the terrain map as a textured quad.
 *
 * Initial upload happens once; per-tile updates flow through
 * applyTerrainDelta() so water-nuke conversions (land → water) are reflected
 * live. Vertex shader transforms the map quad by the camera mat3; fragment
 * shader samples the RGBA8 terrain texture with nearest-neighbour filtering
 * so each terrain cell stays pixel-crisp at every zoom level.
 */

import type { TerrainRect } from "../../types";
import terrainVertSrc from "../shaders/terrain/terrain.vert.glsl?raw";
import terrainFragSrc from "../shaders/terrain/war-table-terrain.frag.glsl?raw";
import {
  buildTerrainRGBA,
  encodeTerrainTile,
  TerrainColorOverrides,
} from "../utils/ColorUtils";
import {
  createMapQuad,
  createProgram,
  createTexture2D,
  shaderSrc,
} from "../utils/GlUtils";

// ---------------------------------------------------------------------------
// TerrainPass
// ---------------------------------------------------------------------------

/**
 * The four open-water glare layers, as the fragment shader declares them.
 *
 * Their animation depends only on time, never on the pixel, so working it out
 * per fragment made every one of them recompute the same handful of sines.
 * It is worked out once per frame here and handed over as uniforms instead.
 *
 * `speed` and `phase` must match the call sites in
 * war-table-terrain.frag.glsl; a test asserts they do.
 */
const GLARE_LAYERS = [
  { speed: 1.05, phase: 0.7 },
  { speed: -0.82, phase: 3.2 },
  { speed: 1.18, phase: 5.6 },
  { speed: -0.68, phase: 8.1 },
] as const;

/**
 * A layer's phase at `time`, and where its noise gate has wandered to.
 *
 * The wobble is added to the phase rather than multiplied into it, so the
 * crests surge and ease off -- instantaneous speed swings roughly 0.58x to
 * 1.42x -- without the wave ever jumping when the rate changes.
 */
function glareAnimation(time: number) {
  const drift = new Float32Array(4);
  const wanderX = new Float32Array(4);
  const wanderY = new Float32Array(4);
  for (let i = 0; i < GLARE_LAYERS.length; i++) {
    const { speed, phase } = GLARE_LAYERS[i];
    drift[i] = time * speed + 6.0 * Math.sin(time * 0.07 * speed + phase * 1.7);
    wanderX[i] = Math.sin(time * 0.021 + phase * 2.3) * 9.0;
    wanderY[i] = Math.cos(time * 0.017 + phase * 1.1) * 9.0;
  }
  return { drift, wanderX, wanderY };
}

export class TerrainPass {
  private program: WebGLProgram;
  private tex: WebGLTexture;
  private terrainByteTex: WebGLTexture;
  private vao: WebGLVertexArrayObject;
  private uCamera: WebGLUniformLocation;
  private uZoom: WebGLUniformLocation;
  private uTime: WebGLUniformLocation;
  private uGlareDrift: WebGLUniformLocation;
  private uGlareWanderX: WebGLUniformLocation;
  private uGlareWanderY: WebGLUniformLocation;
  private mapW: number;
  private mapH: number;
  // Base ocean (deep water) color; reused by applyTerrainDelta and rebuilds.
  private terrainColors: TerrainColorOverrides | undefined;
  // Scratch RGBA buffer for rect sub-uploads; grown as needed and reused.
  private rgbaScratch = new Uint8Array(0);
  // Scratch buffer for 1×1 sub-uploads; reused across applyTerrainDelta calls.
  private pixelScratch = new Uint8Array(4);

  constructor(
    private gl: WebGL2RenderingContext,
    // Regenerates current per-tile terrain bytes (reflecting water-nuke
    // conversions) for the rare full re-bake in setTerrainColors. A provider
    // instead of a retained buffer: terrain bytes are map-sized (8 MB on the
    // giant map).
    private terrainSource: () => Uint8Array,
    terrainBytes: Uint8Array,
    mapW: number,
    mapH: number,
    terrainColors?: TerrainColorOverrides,
  ) {
    this.mapW = mapW;
    this.mapH = mapH;
    this.terrainColors = terrainColors;
    this.program = createProgram(
      gl,
      shaderSrc(terrainVertSrc, { MAP_W: mapW, MAP_H: mapH }),
      terrainFragSrc,
    );
    this.uCamera = gl.getUniformLocation(this.program, "uCamera")!;
    this.uZoom = gl.getUniformLocation(this.program, "uZoom")!;
    this.uTime = gl.getUniformLocation(this.program, "uTime")!;
    this.uGlareDrift = gl.getUniformLocation(this.program, "uGlareDrift")!;
    this.uGlareWanderX = gl.getUniformLocation(this.program, "uGlareWanderX")!;
    this.uGlareWanderY = gl.getUniformLocation(this.program, "uGlareWanderY")!;
    gl.useProgram(this.program);
    gl.uniform1i(gl.getUniformLocation(this.program, "uTerrain"), 0);
    gl.uniform1i(gl.getUniformLocation(this.program, "uTerrainBytes"), 1);
    gl.uniform2f(gl.getUniformLocation(this.program, "uMapSize"), mapW, mapH);

    this.tex = createTexture2D(gl, {
      width: mapW,
      height: mapH,
      internalFormat: gl.RGBA8,
      format: gl.RGBA,
      type: gl.UNSIGNED_BYTE,
      data: buildTerrainRGBA(terrainBytes, mapW, mapH, terrainColors),
      filter: gl.NEAREST, // pixel-crisp at all zoom levels
    });
    this.terrainByteTex = createTexture2D(gl, {
      width: mapW,
      height: mapH,
      internalFormat: gl.R8UI,
      format: gl.RED_INTEGER,
      type: gl.UNSIGNED_BYTE,
      data: terrainBytes,
      filter: gl.NEAREST,
    });

    this.vao = createMapQuad(gl, mapW, mapH);
  }

  /**
   * Replace the base terrain colors and re-upload the whole terrain texture.
   * Called when the user changes the terrain colors in graphics settings.
   */
  setTerrainColors(terrainColors?: TerrainColorOverrides): void {
    this.terrainColors = terrainColors;
    const gl = this.gl;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texSubImage2D(
      gl.TEXTURE_2D,
      0,
      0,
      0,
      this.mapW,
      this.mapH,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      buildTerrainRGBA(
        this.terrainSource(),
        this.mapW,
        this.mapH,
        terrainColors,
      ),
    );
  }

  /**
   * Update a subset of terrain tiles in-place (e.g. land→water from a water
   * nuke). `bytes[i]` is the new terrain byte for `refs[i]` (parallel arrays).
   * One 1×1 texSubImage2D per ref — fine for the small bursts a single nuke
   * produces. A later full re-upload (setTerrainColors) regenerates from
   * terrainSource, whose backing game map already reflects these conversions.
   */
  applyTerrainRects(rects: readonly TerrainRect[], bytes: Uint8Array): void {
    if (rects.length === 0) return;
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    let offset = 0;
    for (const r of rects) {
      const count = r.w * r.h;
      if (this.rgbaScratch.length < count * 4) {
        this.rgbaScratch = new Uint8Array(count * 4);
      }
      for (let i = 0; i < count; i++) {
        encodeTerrainTile(
          bytes[offset + i],
          this.rgbaScratch,
          i * 4,
          this.terrainColors,
        );
      }
      gl.texSubImage2D(
        gl.TEXTURE_2D,
        0,
        r.x,
        r.y,
        r.w,
        r.h,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        this.rgbaScratch,
        0,
      );
      offset += count;
    }
  }

  applyTerrainDelta(refs: readonly number[], bytes: Uint8Array): void {
    if (refs.length === 0) return;
    // Full-map fast path: rebuild the entire RGBA texture in one upload.
    if (refs.length === this.mapW * this.mapH) {
      const gl = this.gl;
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, this.terrainByteTex);
      gl.texSubImage2D(
        gl.TEXTURE_2D,
        0,
        0,
        0,
        this.mapW,
        this.mapH,
        gl.RED_INTEGER,
        gl.UNSIGNED_BYTE,
        bytes,
      );
      gl.activeTexture(gl.TEXTURE0);
      this.setTerrainColors(this.terrainColors);
      return;
    }
    const gl = this.gl;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    for (let i = 0; i < refs.length; ) {
      const ref = refs[i];
      const x = ref % this.mapW;
      const y = (ref - x) / this.mapW;
      let end = i + 1;
      while (
        end < refs.length &&
        refs[end] === refs[end - 1] + 1 &&
        Math.floor(refs[end] / this.mapW) === y
      ) {
        end++;
      }
      const runLength = end - i;
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, this.terrainByteTex);
      gl.texSubImage2D(
        gl.TEXTURE_2D,
        0,
        x,
        y,
        runLength,
        1,
        gl.RED_INTEGER,
        gl.UNSIGNED_BYTE,
        bytes.subarray(i, end),
      );
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.tex);
      const required = runLength * 4;
      if (this.pixelScratch.length < required) {
        let capacity = this.pixelScratch.length;
        while (capacity < required) capacity *= 2;
        this.pixelScratch = new Uint8Array(capacity);
      }
      for (let j = 0; j < runLength; j++) {
        encodeTerrainTile(
          bytes[i + j],
          this.pixelScratch,
          j * 4,
          this.terrainColors,
        );
      }
      gl.texSubImage2D(
        gl.TEXTURE_2D,
        0,
        x,
        y,
        runLength,
        1,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        this.pixelScratch.subarray(0, required),
      );
      i = end;
    }
  }

  /** Render the terrain. Call with depth test disabled, no blending. */
  draw(cameraMatrix: Float32Array, zoom: number, timeSeconds: number): void {
    const gl = this.gl;
    gl.useProgram(this.program);
    gl.uniformMatrix3fv(this.uCamera, false, cameraMatrix);
    gl.uniform1f(this.uZoom, zoom);
    gl.uniform1f(this.uTime, timeSeconds);
    const glare = glareAnimation(timeSeconds);
    gl.uniform4fv(this.uGlareDrift, glare.drift);
    gl.uniform4fv(this.uGlareWanderX, glare.wanderX);
    gl.uniform4fv(this.uGlareWanderY, glare.wanderY);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.terrainByteTex);
    gl.activeTexture(gl.TEXTURE0);

    gl.bindVertexArray(this.vao);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  dispose(): void {
    const gl = this.gl;
    gl.deleteProgram(this.program);
    gl.deleteTexture(this.tex);
    gl.deleteTexture(this.terrainByteTex);
    // VAO + buffer leak is acceptable on dispose (context is being destroyed)
  }
}
