import { ExperienceMode, normalizeExperienceMode } from "./Schemas";

type ExperienceConfigInput = {
  experienceMode?: ExperienceMode;
  worldMechanics?: Record<string, unknown> & { threeDMode?: boolean };
};

/**
 * Attach the canonical experience field and remove the legacy modifier from a
 * newly-created configuration without disturbing other world mechanics.
 */
export function applyExperienceMode<T extends ExperienceConfigInput>(
  config: T,
  experienceMode: ExperienceMode,
): T & { experienceMode: ExperienceMode } {
  const mechanics = config.worldMechanics;
  if (mechanics === undefined) return { ...config, experienceMode };
  const worldMechanics = { ...mechanics };
  delete worldMechanics.threeDMode;
  return { ...config, experienceMode, worldMechanics };
}

/** Convert legacy or mixed wire data to the single canonical experience field. */
export function canonicalizeExperienceConfig<T extends ExperienceConfigInput>(
  config: T,
): T & { experienceMode: ExperienceMode } {
  return applyExperienceMode(config, normalizeExperienceMode(config));
}

/** Legacy clients omit the request and remain compatible during rollout. */
export function isExperienceMismatch(
  lobbyMode: ExperienceMode,
  requestedMode: ExperienceMode | undefined,
): boolean {
  return requestedMode !== undefined && requestedMode !== lobbyMode;
}
