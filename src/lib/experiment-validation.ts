import { z } from "zod";

export const sessionRef = z.object({ sessionId: z.string().uuid(), token: z.string().uuid() });
export const interactionInput = sessionRef.extend({
  answers: z
    .object({
      bottle: z.enum(["recycle", "compost", "bin"]),
      apple: z.enum(["recycle", "compost", "bin"]),
      crisps: z.enum(["recycle", "compost", "bin"]),
    })
    .strict(),
});
export const activityInput = sessionRef
  .extend({
    status: z.enum(["completed", "skipped"]),
    observationText: z.string().trim().max(500).optional(),
    photoDataUrl: z.string().max(400_000).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.status === "completed" && (data.observationText?.length ?? 0) < 5)
      ctx.addIssue({
        code: "custom",
        message: "Write a short observation (at least 5 characters).",
      });
    if (data.status === "skipped" && data.photoDataUrl)
      ctx.addIssue({ code: "custom", message: "Skipped activities cannot include a photo." });
  });
