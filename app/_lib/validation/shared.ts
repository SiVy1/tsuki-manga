import { z } from "zod";

export const nullableTrimmedString = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? value : null));

export const uuidSchema = z.string().uuid();
