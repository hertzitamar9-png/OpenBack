import { GameConfigSchema } from "./Schemas";

/**
 * What a client may declare when minting a private lobby.
 *
 * This used to be "a whole GameConfig, or nothing at all". A host has not
 * chosen any settings at that point, so it sent nothing -- and the game was
 * therefore born in the default 2D experience while the host's own client
 * connected asking for 3D, which the worker rejected as an experience
 * mismatch. The host could not enter the lobby they had just created.
 *
 * A partial config lets the creator state the few things that are already
 * decided, the experience above all, and leaves the rest to defaults exactly
 * as an empty body did. GameManager.createGame already takes a partial.
 */
export const CreateGameInputSchema = GameConfigSchema.partial();

export const GameInputSchema = GameConfigSchema.partial();
