import { z } from 'zod';

export const Provider = z.enum(['greenhouse-job-board', 'lever-postings', 'ashby-postings']);
export type Provider = z.infer<typeof Provider>;

export const Target = z.object({
  provider: Provider,
  board: z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,99}$/),
  company: z.string().trim().min(1).max(160)
}).strict();
export type Target = z.infer<typeof Target>;

export const Policy = z.object({
  id: z.string().min(1), version: z.number().int().positive(),
  freshnessThresholdHours: z.number().int().positive(),
  requireDirectPosting: z.boolean(), requireRemoteUS: z.boolean(),
  onUnknown: z.object({
    locationEligibility: z.enum(['reject', 'unknown']),
    recency: z.enum(['reject', 'continue', 'unknown'])
  }).strict(),
  excludedTitles: z.array(z.string().min(1)),
  rankingWeights: z.object({
    titleMatch: z.number().min(0).max(1), domainMatch: z.number().min(0).max(1),
    locationMatch: z.number().min(0).max(1), recency: z.number().min(0).max(1),
    directLink: z.number().min(0).max(1)
  }).strict(),
  titleTerms: z.array(z.string().min(1)), domainTerms: z.array(z.string().min(1))
}).strict().refine(p => Math.abs(Object.values(p.rankingWeights).reduce((a, b) => a + b, 0) - 1) < 1e-9,
  'ranking weights must sum to one');
export type Policy = z.infer<typeof Policy>;

export const Canonical = z.object({
  schemaVersion: z.literal('1'),
  normalizerVersion: z.literal('1'),
  provider: Provider, sourceId: z.string().min(1), company: z.string().min(1),
  title: z.string().min(1), locationRaw: z.string(),
  locationMode: z.enum(['remote', 'hybrid', 'onsite', 'unknown']),
  countryUS: z.enum(['yes', 'no', 'unknown']),
  canonicalUrl: z.string().url(), descriptionText: z.string(),
  postedAt: z.string().datetime().nullable()
}).strict();
export type Canonical = z.infer<typeof Canonical>;

export interface Snapshot {
  rawSha256: string;
  payloadRef: string;
  sourceUrl: string;
  fetchedAt: string;
  httpStatus: number;
  etag: string | null;
  lastModified: string | null;
}

export type Predicate =
  | { result: 'pass'; evidence: string[] }
  | { result: 'reject' | 'unknown'; reason: string; evidence: string[] };

export interface Feature {
  value: number;
  weight: number;
  contribution: number;
  evidence: string[];
}

export interface Evaluation {
  disposition: 'candidate' | 'reject' | 'unknown';
  score: number | null;
  predicates: Record<string, Predicate>;
  features: Record<string, Feature>;
}
