export interface ThreeDWorldEventMeshData {
  positions: Float32Array;
  indices: Uint16Array;
}

/**
 * A compact faceted octahedron used as the instanced volume for world events.
 * The event shader stretches and animates each instance into wave crests,
 * tornado debris, volcanic ejecta, storm fragments, and objective beacons.
 */
export function buildWorldEventParticleMesh(): ThreeDWorldEventMeshData {
  return {
    positions: new Float32Array([
      0, 1, 0, 1, 0, 0, 0, 0, 1, -1, 0, 0, 0, 0, -1, 0, -1, 0,
    ]),
    indices: new Uint16Array([
      0, 1, 2, 0, 2, 3, 0, 3, 4, 0, 4, 1, 5, 2, 1, 5, 3, 2, 5, 4, 3, 5, 1, 4,
    ]),
  };
}
