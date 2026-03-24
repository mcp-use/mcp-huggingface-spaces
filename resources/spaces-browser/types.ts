import { z } from "zod";

export const spaceSchema = z.object({
  id: z.string(),
  author: z.string(),
  name: z.string(),
  title: z.string(),
  description: z.string(),
  likes: z.number(),
  sdk: z.string(),
  tags: z.array(z.string()),
  url: z.string(),
  embedUrl: z.string(),
  lastModified: z.string(),
  trendingScore: z.number().optional(),
  runtime: z
    .object({
      stage: z.string(),
      hardware: z.string().optional(),
    })
    .optional(),
});

export const propSchema = z.object({
  spaces: z.array(spaceSchema).describe("List of HF Spaces"),
  query: z.string().optional().describe("Search query used"),
  activeSpaceId: z
    .string()
    .nullable()
    .optional()
    .describe("Currently active/embedded space ID"),
});

export type HFSpace = z.infer<typeof spaceSchema>;
export type SpacesBrowserProps = z.infer<typeof propSchema>;
