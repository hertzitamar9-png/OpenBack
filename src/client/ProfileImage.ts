const PROFILE_IMAGE_SIZE = 256;
const MAX_PROFILE_IMAGE_BYTES = 128 * 1024;
const SUPPORTED_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

function encodedByteLength(dataUrl: string): number {
  const encoded = dataUrl.slice(dataUrl.indexOf(",") + 1);
  return (
    Math.floor((encoded.length * 3) / 4) -
    (encoded.endsWith("==") ? 2 : encoded.endsWith("=") ? 1 : 0)
  );
}

export async function prepareProfileImage(file: File): Promise<string> {
  if (!SUPPORTED_TYPES.has(file.type)) {
    throw new Error("unsupported_profile_image");
  }
  const bitmap = await createImageBitmap(file);
  try {
    if (bitmap.width <= 0 || bitmap.height <= 0) {
      throw new Error("invalid_profile_image");
    }
    const sourceSize = Math.min(bitmap.width, bitmap.height);
    const sourceX = (bitmap.width - sourceSize) / 2;
    const sourceY = (bitmap.height - sourceSize) / 2;
    const canvas = document.createElement("canvas");
    canvas.width = PROFILE_IMAGE_SIZE;
    canvas.height = PROFILE_IMAGE_SIZE;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("profile_image_processing_failed");
    context.drawImage(
      bitmap,
      sourceX,
      sourceY,
      sourceSize,
      sourceSize,
      0,
      0,
      PROFILE_IMAGE_SIZE,
      PROFILE_IMAGE_SIZE,
    );

    for (const quality of [0.9, 0.82, 0.74, 0.66]) {
      const value = canvas.toDataURL("image/webp", quality);
      if (
        value.startsWith("data:image/webp;base64,") &&
        encodedByteLength(value) <= MAX_PROFILE_IMAGE_BYTES
      ) {
        return value;
      }
    }
    throw new Error("profile_image_too_large");
  } finally {
    bitmap.close();
  }
}
