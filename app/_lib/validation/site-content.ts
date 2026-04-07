import { z } from "zod";

const recruitmentRoleSchema = z.object({
  title: z.string().trim().min(1).max(80),
  description: z.string().trim().min(1).max(280),
});

const recruitmentContactSchema = z.object({
  label: z.string().trim().min(1).max(80),
  value: z.string().trim().min(1).max(200),
});

export const siteContentSchema = z.object({
  rules: z.object({
    enabled: z.boolean(),
    title: z.string().trim().min(1).max(120),
    updatedAt: z.string().trim().min(1).max(40).nullable(),
    items: z.array(z.string().trim().min(1).max(400)).max(50),
  }),
  recruitment: z.object({
    enabled: z.boolean(),
    title: z.string().trim().min(1).max(120),
    summary: z.string().trim().min(1).max(400).nullable(),
    roles: z.array(recruitmentRoleSchema).max(20),
    contact: recruitmentContactSchema.nullable(),
  }),
});

export type SiteContent = z.infer<typeof siteContentSchema>;
