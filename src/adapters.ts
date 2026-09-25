import { z } from 'zod';
import { Canonical, Target } from './contracts';
import { removeMarkup } from './canonical';

const GH = z.object({ jobs: z.array(z.object({
  id: z.union([z.string(), z.number()]), title: z.string(),
  location: z.object({ name: z.string() }).optional(),
  absolute_url: z.string().url(), content: z.string().optional()
}).passthrough()) }).passthrough();
const LEVER = z.array(z.object({
  id: z.string(), text: z.string(), hostedUrl: z.string().url(),
  categories: z.object({ location: z.string().optional(), allLocations: z.array(z.string()).optional() }).optional(),
  country: z.string().nullable().optional(), workplaceType: z.string().optional(),
  descriptionPlain: z.string().optional(), description: z.string().optional()
}).passthrough());
const ASHBY = z.object({ jobs: z.array(z.object({
  title: z.string(), location: z.string().optional(),
  jobUrl: z.string().url(), isListed: z.boolean().optional(), isRemote: z.boolean().optional(),
  workplaceType: z.string().optional(), descriptionPlain: z.string().optional(),
  descriptionHtml: z.string().optional(), publishedAt: z.string().optional(),
  address: z.object({ postalAddress: z.object({ addressCountry: z.string().optional() }).passthrough().optional() }).passthrough().optional()
}).passthrough()) }).passthrough();

const HOSTS = {
  'greenhouse-job-board': 'boards-api.greenhouse.io',
  'lever-postings': 'api.lever.co',
  'ashby-postings': 'api.ashbyhq.com'
} as const;

export function boardUrl(target: Target, page = 0): string {
  const t = Target.parse(target);
  if (!Number.isSafeInteger(page) || page < 0 || page >= 10) throw new Error('page limit exceeded');
  const board = encodeURIComponent(t.board);
  const url = t.provider === 'greenhouse-job-board'
    ? `https://boards-api.greenhouse.io/v1/boards/${board}/jobs?content=true`
    : t.provider === 'lever-postings'
      ? `https://api.lever.co/v0/postings/${board}?mode=json&limit=100&skip=${page * 100}`
      : `https://api.ashbyhq.com/posting-api/job-board/${board}`;
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:' || parsed.hostname !== HOSTS[t.provider] ||
      parsed.port || parsed.username || parsed.password) throw new Error('egress denied');
  return url;
}

function locationMode(raw: string, declared?: string, remote?: boolean): Canonical['locationMode'] {
  const v = declared?.toLowerCase();
  if (v === 'remote' || remote === true || /\bremote\b/i.test(raw)) return 'remote';
  if (v === 'hybrid' || /\bhybrid\b/i.test(raw)) return 'hybrid';
  if (v === 'onsite' || v === 'on-site' || remote === false) return 'onsite';
  return 'unknown';
}

function countryUS(raw: string, code?: string | null): Canonical['countryUS'] {
  const c = code?.toUpperCase();
  if (c === 'US' || c === 'USA') return 'yes';
  if (c && c !== 'US' && c !== 'USA') return 'no';
  if (/\b(?:US|USA|U\.S\.|United States|America)\b/i.test(raw)) return 'yes';
  if (/\b(?:EMEA|LATAM|APAC|Europe|India|Canada|UK|United Kingdom|Australia)\b/i.test(raw)) return 'no';
  return 'unknown';
}

function postedDate(input?: string): string | null {
  if (!input) return null;
  const d = new Date(input);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export interface ParsedPosting { canonical: Canonical; pointer: string }

export function parseBoard(target: Target, payload: unknown): ParsedPosting[] {
  const t = Target.parse(target);
  if (t.provider === 'greenhouse-job-board') {
    return GH.parse(payload).jobs.map((j, i) => {
      const raw = j.location?.name ?? '';
      return { pointer: `/jobs/${i}`, canonical: Canonical.parse({
        schemaVersion: '1', provider: t.provider, sourceId: String(j.id), company: t.company,
        title: j.title, locationRaw: raw, locationMode: locationMode(raw), countryUS: countryUS(raw),
        canonicalUrl: j.absolute_url, descriptionText: removeMarkup(j.content ?? ''),
        postedAt: null // list updated_at is not publication time
      }) };
    });
  }
  if (t.provider === 'lever-postings') {
    return LEVER.parse(payload).map((j, i) => {
      const raw = [j.categories?.location, ...(j.categories?.allLocations ?? [])].filter(Boolean).join(' | ');
      return { pointer: `/${i}`, canonical: Canonical.parse({
        schemaVersion: '1', provider: t.provider, sourceId: j.id, company: t.company,
        title: j.text, locationRaw: raw, locationMode: locationMode(raw, j.workplaceType),
        countryUS: countryUS(raw, j.country), canonicalUrl: j.hostedUrl,
        descriptionText: removeMarkup(j.descriptionPlain ?? j.description ?? ''), postedAt: null
      }) };
    });
  }
  return ASHBY.parse(payload).jobs.flatMap((j, i) => {
    if (j.isListed === false) return [];
    // This public API has no posting id; its job URL is the provider-supplied stable key.
    const raw = j.location ?? '';
    return [{ pointer: `/jobs/${i}`, canonical: Canonical.parse({
      schemaVersion: '1', provider: t.provider, sourceId: j.jobUrl, company: t.company,
      title: j.title, locationRaw: raw, locationMode: locationMode(raw, j.workplaceType, j.isRemote),
      countryUS: countryUS(raw, j.address?.postalAddress?.addressCountry),
      canonicalUrl: j.jobUrl, descriptionText: removeMarkup(j.descriptionPlain ?? j.descriptionHtml ?? ''),
      postedAt: postedDate(j.publishedAt)
    }) }];
  });
}

export function countBoard(target: Target, payload: unknown): number {
  return target.provider === 'lever-postings' ? LEVER.parse(payload).length :
    target.provider === 'greenhouse-job-board' ? GH.parse(payload).jobs.length : ASHBY.parse(payload).jobs.length;
}
