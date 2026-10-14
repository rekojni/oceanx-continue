export const MAX_SOURCE_BYTES = 15 * 1024 * 1024;
export const MAX_PHOTO_URL_LENGTH = 400_000;
const ACCEPTED = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);

export function validatePhotoFile(file: Pick<File, "type" | "size">) {
  if (!ACCEPTED.has(file.type))
    throw new Error("Choose a JPEG, PNG, WebP or HEIC photo. Other files are not supported.");
  if (!file.size || file.size > MAX_SOURCE_BYTES)
    throw new Error("Choose a photo smaller than 15 MB.");
}

// Re-encoding through canvas removes source EXIF metadata, including location.
export async function compressPhoto(file: File): Promise<string> {
  validatePhotoFile(file);
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () =>
        reject(
          new Error(
            "This browser cannot open that photo. Export it as JPEG or choose another photo.",
          ),
        );
      img.src = objectUrl;
    });
    if (!img.width || !img.height || img.width * img.height > 60_000_000)
      throw new Error("Choose a photo with a smaller resolution.");
    const scale = Math.min(1, 720 / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(img.width * scale));
    canvas.height = Math.max(1, Math.round(img.height * scale));
    const context = canvas.getContext("2d");
    if (!context)
      throw new Error(
        "Photo conversion is unavailable. You can submit your written observation instead.",
      );
    context.fillStyle = "white";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(img, 0, 0, canvas.width, canvas.height);
    for (const quality of [0.65, 0.5, 0.35]) {
      const encoded = canvas.toDataURL("image/jpeg", quality);
      if (encoded.startsWith("data:image/jpeg;base64,") && encoded.length <= MAX_PHOTO_URL_LENGTH)
        return encoded;
    }
    throw new Error("The compressed photo is too large. Choose a simpler or smaller photo.");
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
