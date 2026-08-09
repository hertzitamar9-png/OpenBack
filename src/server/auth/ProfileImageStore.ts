import fs from "node:fs";
import path from "node:path";
import type { Pool } from "pg";

export const MAX_PROFILE_IMAGE_BYTES = 128 * 1024;

export interface ProfileImage {
  mimeType: "image/webp";
  bytes: Buffer;
}

export interface StoredProfileImage extends ProfileImage {
  revision: number;
}

export interface ProfileImageStore {
  get(publicId: string): Promise<StoredProfileImage | null>;
  put(publicId: string, bytes: Buffer): Promise<StoredProfileImage>;
  delete(publicId: string): Promise<void>;
  url(publicId: string, revision: number): string;
}

export class ProfileImageError extends Error {
  constructor(code: "invalid_profile_image" | "profile_image_too_large") {
    super(code);
    this.name = "ProfileImageError";
  }
}

export function validateProfileImageDataUrl(value: string): ProfileImage {
  const match = /^data:image\/webp;base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
  if (!match) throw new ProfileImageError("invalid_profile_image");

  const bytes = Buffer.from(match[1], "base64");
  if (bytes.length > MAX_PROFILE_IMAGE_BYTES) {
    throw new ProfileImageError("profile_image_too_large");
  }
  const isWebp =
    bytes.length >= 16 &&
    bytes.subarray(0, 4).toString("ascii") === "RIFF" &&
    bytes.subarray(8, 12).toString("ascii") === "WEBP" &&
    ["VP8 ", "VP8L", "VP8X"].includes(bytes.subarray(12, 16).toString("ascii"));
  if (!isWebp) throw new ProfileImageError("invalid_profile_image");
  return { mimeType: "image/webp", bytes };
}

function imageUrl(publicId: string, revision: number): string {
  return `/profile-images/${encodeURIComponent(publicId)}?v=${revision}`;
}

export function createMemoryProfileImageStore(): ProfileImageStore {
  const images = new Map<string, StoredProfileImage>();
  const revisions = new Map<string, number>();
  return {
    async get(publicId) {
      const image = images.get(publicId);
      return image ? { ...image, bytes: Buffer.from(image.bytes) } : null;
    },
    async put(publicId, bytes) {
      const revision = (revisions.get(publicId) ?? 0) + 1;
      revisions.set(publicId, revision);
      const image: StoredProfileImage = {
        mimeType: "image/webp",
        bytes: Buffer.from(bytes),
        revision,
      };
      images.set(publicId, image);
      return { ...image, bytes: Buffer.from(image.bytes) };
    },
    async delete(publicId) {
      images.delete(publicId);
    },
    url: imageUrl,
  };
}

interface FileSnapshotEntry {
  bytes?: string;
  revision: number;
}

export function createFileProfileImageStore(
  filePath: string,
): ProfileImageStore {
  let snapshot: Record<string, FileSnapshotEntry> = {};
  if (fs.existsSync(filePath)) {
    snapshot = JSON.parse(fs.readFileSync(filePath, "utf8")) as Record<
      string,
      FileSnapshotEntry
    >;
  }
  const save = () => {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(snapshot));
  };
  return {
    async get(publicId) {
      const value = snapshot[publicId];
      if (!value?.bytes) return null;
      return {
        mimeType: "image/webp",
        bytes: Buffer.from(value.bytes, "base64"),
        revision: value.revision,
      };
    },
    async put(publicId, bytes) {
      const revision = (snapshot[publicId]?.revision ?? 0) + 1;
      snapshot[publicId] = { bytes: bytes.toString("base64"), revision };
      save();
      return { mimeType: "image/webp", bytes: Buffer.from(bytes), revision };
    },
    async delete(publicId) {
      const current = snapshot[publicId];
      if (current) {
        snapshot[publicId] = { revision: current.revision };
        save();
      }
    },
    url: imageUrl,
  };
}

export async function createPostgresProfileImageStore(
  pool: Pool,
): Promise<ProfileImageStore> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS openback_profile_images (
      public_id TEXT PRIMARY KEY,
      mime_type TEXT NOT NULL DEFAULT 'image/webp',
      image_bytes BYTEA,
      revision INTEGER NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  return {
    async get(publicId) {
      const result = await pool.query<{
        mime_type: string;
        image_bytes: Buffer | null;
        revision: number;
      }>(
        `SELECT mime_type, image_bytes, revision
         FROM openback_profile_images WHERE public_id = $1`,
        [publicId],
      );
      const row = result.rows[0];
      if (!row?.image_bytes) return null;
      return {
        mimeType: "image/webp",
        bytes: row.image_bytes,
        revision: row.revision,
      };
    },
    async put(publicId, bytes) {
      const result = await pool.query<{
        image_bytes: Buffer;
        revision: number;
      }>(
        `INSERT INTO openback_profile_images
           (public_id, mime_type, image_bytes, revision, updated_at)
         VALUES ($1, 'image/webp', $2, 1, NOW())
         ON CONFLICT (public_id) DO UPDATE SET
           mime_type = 'image/webp',
           image_bytes = EXCLUDED.image_bytes,
           revision = openback_profile_images.revision + 1,
           updated_at = NOW()
         RETURNING image_bytes, revision`,
        [publicId, bytes],
      );
      const row = result.rows[0];
      return {
        mimeType: "image/webp",
        bytes: row.image_bytes,
        revision: row.revision,
      };
    },
    async delete(publicId) {
      await pool.query(
        `UPDATE openback_profile_images
         SET image_bytes = NULL, updated_at = NOW()
         WHERE public_id = $1`,
        [publicId],
      );
    },
    url: imageUrl,
  };
}
