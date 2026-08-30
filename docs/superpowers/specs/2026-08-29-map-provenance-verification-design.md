# Complete Map Provenance Verification Design

## Goal

Give every map shipped by OpenBack an evidence-backed provenance record. A map
is verified only when its shipped files can be connected to an upstream open
asset release, a named open/public dataset, a licensed artwork page, or an
independently reproducible OpenBack generator.

## Verification classes

1. `openfront-inherited`: the map exists in the selected upstream OpenFront
   release and is covered by that release's asset licence and attribution.
2. `openback-generated`: the terrain is reproducible from a committed generator
   whose inputs are themselves recorded and licensed.
3. `third-party-licensed`: the source page, creator, exact licence, modification
   notice, and local derived files are recorded.
4. `unverified-reference`: a reference image influenced the land/water
   silhouette but its creator, source page, or licence cannot be proved.

Only the first three classes are legally verified. A credit line is not a
substitute for permission.

## Evidence record

Create `resources/maps/provenance.json` with one entry for every directory under
`resources/maps`. Each entry records the map id, verification class, origin,
source URL or upstream commit, creator, licence, modification description, and
the SHA-256 hashes of the generated map manifest and thumbnail. OpenBack-only
map sources under `map-generator/assets/maps` are also covered by their input
or generator record.

## Reference-derived maps

Recover the fifteen July 15 reference pictures from the preserved Codex session
and reverse-search the actual pictures. Searching the invented OpenBack display
names is not evidence. Record a source only when the visual match and source
page establish the same map and the page grants redistribution/modification
rights.

If a source cannot be verified, do not describe the map as legal or original.
Replace its silhouette with deterministic terrain created without reading the
reference image. Preserve the map id, display name, dimensions, category,
multiplayer frequency, nation names, and nation count; recalculate spawn points
onto the new land. The replacement generator, seed, and hashes become the
evidence for the new map. Git history and the audit report preserve the earlier
investigation without redistributing the reference pictures.

## Automated enforcement

A test must require exactly one provenance entry per shipped map, validate the
allowed verification classes, check required fields by class, verify local
hashes, reject `unverified-reference` entries from the playable map registry,
and prove that regenerating an OpenBack-original map is deterministic. The
credits page will summarize verified groups and list third-party attributions
without replacing the machine-readable record.

## Legal boundary

This is an engineering provenance audit, not a legal opinion. Wikimedia and
other repositories disclaim guarantees about uploaded licence metadata, and
copyright licences do not automatically clear trademarks, privacy, publicity,
or other rights.
