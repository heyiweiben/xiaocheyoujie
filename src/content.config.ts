import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const solutions = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/solutions' }),
  schema: z.object({
    title: z.string(),
    summary: z.string(),
    type: z.enum(['solution', 'reality_check', 'field_note', 'guide', 'topic']),
    vehicle: z.string().optional(),
    status: z.enum(['concept', 'researched', 'measured', 'installed', 'verified']),
    image: z.string(),
    imageAlt: z.string(),
    alternatePath: z.string().optional(),
    publishedAt: z.coerce.date(),
    updatedAt: z.coerce.date(),
  }),
});

export const collections = { solutions };
