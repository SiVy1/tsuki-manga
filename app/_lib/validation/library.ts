import { z } from "zod";

import { uuidSchema } from "@/app/_lib/validation/shared";

export const toggleSavedSeriesInputSchema = z.object({
  seriesId: uuidSchema,
});
