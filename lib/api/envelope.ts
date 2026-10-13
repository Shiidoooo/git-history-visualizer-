import { z, type ZodType } from "zod";
import { API_ERROR_CODES } from "@/lib/github/errors";

// The one response envelope every API route returns, so the client parses all of them the same way.

export function successEnvelopeSchema<T>(dataSchema: ZodType<T>) {
  return z.object({
    status: z.literal("success"),
    data: dataSchema,
    message: z.string(),
  });
}

export const apiErrorSchema = z.object({
  status: z.literal("error"),
  data: z.null(),
  message: z.string(),
  error: z.object({
    code: z.enum(API_ERROR_CODES),
    details: z.array(z.unknown()),
    retryAfterSeconds: z.number().int().positive().optional(),
  }),
  requestId: z.string(),
});
