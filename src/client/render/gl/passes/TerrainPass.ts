/**
 * TerrainPass — renders the terrain map as a textured quad.
 *
 * Initial upload happens once; per-tile updates flow through
 * applyTerrainDelta() so water-nuke conversions (land → water) are reflected
 * live. Vertex shader transforms the map quad by the camera mat3; fragment
 * shader samples the RGBA8 terrain texture with nearest-neighbour filtering
 * so each terrain cell stays pixel-crisp at every zoom level.
 */

import terrainFragSrc from "../shaders/terrain/terrain.frag.glsl?raw";
import terrainVertSrc from "../shaders/terrain/terrain.vert.glsl?raw";
import { buildTerrainPalette } from "../utils/ColorUtils";
import {
  createMapQuad,
  createProgram,
  createTexture2D,
  shaderSrc,
} from "../utils/GlUtils";

// ---------------------------------------------------------------------------
// TerrainPass
// ---------------------------------------------------------------------------

export class TerrainPass {
  private program: WebGLProgram;
  private tex: WebGLTexture;
  private paletteTex: WebGLTexture;
  private vao: WebGLVertexArrayObject;
  private uCamera: WebGLUniformLocation;
  private mapW: number;
  private mapH: number;
  // Base ocean (deep water) color; reused by applyTerrainDelta and rebuilds.
  private oceanColor: readonly [number, number, number] | undefined;
  // Scratch buffer for 1×1 sub-uploads; reused across applyTerrainDelta calls.
  private readonly pixelScratch = new Uint8Array(1);

  constructor(
    private gl: WebGL2RenderingContext,
    private terrainBytes: Uint8Array,
    mapW: number,
    mapH: number,
    oceanColor?: readonly [number, number, number],
  ) {
    this.mapW = mapW;
    this.mapH = mapH;
    this.oceanColor = oceanColor;
    this.program = createProgram(
      gl,
      shaderSrc(terrainVertSrc, { MAP_W: mapW, MAP_H: mapH }),
      terrainFragSrc,
    );
    this.uCamera = gl.getUniformLocation(this.program, "uCamera")!;
    gl.useProgram(this.program);
    gl.uniform1i(gl.getUniformLocation(this.program, "uTerrain"), 0);
    gl.uniform1i(gl.getUniformLocation(this.program, "uTerrainPalette"), 1);

    this.tex = createTexture2D(gl, {
      width: mapW,
      height: mapH,
      internalFormat: gl.R8UI,
      format: gl.RED_INTEGER,
      type: gl.UNSIGNED_BYTE,
      data: terrainBytes,
      filter: gl.NEAREST, // pixel-crisp at all zoom levels
    });
    this.paletteTex = createTexture2D(gl, {
      width: 256,
      height: 1,
      internalFormat: gl.RGBA8,
      format: gl.RGBA,
      type: gl.UNSIGNED_BYTE,
      data: buildTerrainPalette(oceanColor),
      filter: gl.NEAREST,
    });

    this.vao = createMapQuad(gl, mapW, mapH);
  }

  /**
   * Replace the base ocean color and re-upload the whole terrain texture.
   * Called when the user changes the ocean color in graphics settings.
   */
  setOceanColor(oceanColor?: readonly [number, number, number]): void {
    this.oceanColor = oceanColor;
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, this.paletteTex);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texSubImage2D(
      gl.TEXTURE_2D,
      0,
      0,
      0,
      256,
      1,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      buildTerrainPalette(oceanColor),
    );
  }

  /**
   * Update a subset of terrain tiles in-place (e.g. land→water from a water
   * nuke). `bytes[i]` is the new terrain byte for `refs[i]` (parallel arrays).
   * One 1×1 texSubImage2D per ref — fine for the small bursts a single nuke
   * produces.
   *
   * Also writes back into `terrainBytes` so a later full re-upload (e.g.
   * setOceanColor) reflects these conversions instead of reverting them.
   */
  applyTerrainDelta(refs: readonly number[], bytes: Uint8Array): void {
    if (refs.length === 0) return;
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    let minY = this.mapH;
    let maxY = -1;
    for (let i = 0; i < refs.length; i++) {
      const ref = refs[i];
      const x = ref % this.mapW;
      const y = (ref - x) / this.mapW;
      this.terrainBytes[ref] = bytes[i];
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }

    const dirtyRowTexels = (maxY - minY + 1) * this.mapW;
    // A row-span upload avoids hundreds of driver calls for dense changes,
    // but scattered refs can span most of a large map. Only batch while the
    // extra unchanged pixels stay cheaper than the calls being removed.
    if (refs.length >= 64 && dirtyRowTexels <= refs.length * 64) {
      const start = minY * this.mapW;
      const end = (maxY + 1) * this.mapW;
      gl.texSubImage2D(
        gl.TEXTURE_2D,
        0,
        0,
        minY,
        this.mapW,
        maxY - minY + 1,
        gl.RED_INTEGER,
        gl.UNSIGNED_BYTE,
        this.terrainBytes.subarray(start, end),
      );
      return;
    }

    for (let i = 0; i < refs.length; i++) {
      const ref = refs[i];
      const x = ref % this.mapW;
      const y = (ref - x) / this.mapW;
      this.pixelScratch[0] = this.terrainBytes[ref];
      gl.texSubImage2D(
        gl.TEXTURE_2D,
        0,
        x,
        y,
        1,
        1,
        gl.RED_INTEGER,
        gl.UNSIGNED_BYTE,
        this.pixelScratch,
      );
    }
  }

  /** Shared raw terrain texture used by railroad bridge rendering. */
  getTexture(): WebGLTexture {
    return this.tex;
  }

  /** Render the terrain. Call with depth test disabled, no blending. */
  draw(cameraMatrix: Float32Array): void {
    const gl = this.gl;
    gl.useProgram(this.program);
    gl.uniformMatrix3fv(this.uCamera, false, cameraMatrix);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.paletteTex);

    gl.bindVertexArray(this.vao);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  dispose(): void {
    const gl = this.gl;
    gl.deleteProgram(this.program);
    gl.deleteTexture(this.tex);
    gl.deleteTexture(this.paletteTex);
    // VAO + buffer leak is acceptable on dispose (context is being destroyed)
  }
}
