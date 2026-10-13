import { randomUUID } from "node:crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export function decodePhoto(url: string): Buffer {
  if (url.length > 400_000 || !/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(url))
    throw new Error("Only small JPEG photos are accepted");
  const image = Buffer.from(url.split(",")[1] ?? "", "base64");
  if (
    image.length > 300_000 ||
    image.length < 4 ||
    image[0] !== 0xff ||
    image[1] !== 0xd8 ||
    image[2] !== 0xff ||
    image.at(-2) !== 0xff ||
    image.at(-1) !== 0xd9
  )
    throw new Error("Choose a smaller valid JPEG photograph");
  return image;
}

export async function storePhoto(sessionId: string, url: string) {
  const path = `${sessionId}/${randomUUID()}.jpg`;
  const { error } = await supabaseAdmin.storage
    .from("oceanx-evidence")
    .upload(path, decodePhoto(url), { contentType: "image/jpeg", upsert: false });
  if (error)
    throw new Error(
      "Your photo could not be uploaded. Check your connection and retry, or remove it to submit text only.",
    );
  // Do not delete on ambiguous database/network errors: the transaction may have
  // committed. Retention checks can remove unreferenced uploads after review.
  return path;
}
