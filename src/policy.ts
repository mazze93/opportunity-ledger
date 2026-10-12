import { Canonical, Evaluation, Feature, Policy, Predicate } from './contracts';

export const ENGINE_VERSION = '0.3.0';
const pass = (evidence: string[]): Predicate => ({ result: 'pass', evidence });
const reject = (reason: string, evidence: string[]): Predicate => ({ result: 'reject', reason, evidence });
const unknown = (reason: string, evidence: string[]): Predicate => ({ result: 'unknown', reason, evidence });

function matchedTerms(text: string, terms: string[]): string[] {
  const haystack = text.toLocaleLowerCase('en-US');
  return terms.filter(t => haystack.includes(t.toLocaleLowerCase('en-US')));
}

const escapeRe = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Areas named in the raw location string, matched as whole words. */
function matchedAreas(raw: string, areas: string[]): string[] {
  return areas.filter(a => new RegExp(`(?:^|[^\\p{L}\\p{N}])${escapeRe(a)}(?:$|[^\\p{L}\\p{N}])`, 'iu').test(raw));
}

/**
 * Two routes to eligibility, checked in order:
 *  1. remote + explicitly US (when requireRemoteUS);
 *  2. a named local area, with the posting's mode in localModes.
 * Anything explicitly outside the US is rejected first. A hybrid/onsite role
 * outside the local areas is rejected; an unresolved remote role follows
 * onUnknown.locationEligibility as before.
 */
function locationPredicate(c: Canonical, p: Policy): { predicate: Predicate; area: string[] } {
  const area = matchedAreas(c.locationRaw, p.localAreas);
  const mode = `locationMode:${c.locationMode}`, country = `countryUS:${c.countryUS}`;
  if (!p.requireRemoteUS && !p.localAreas.length) return { predicate: pass(['policy:any-location']), area };
  if (c.countryUS === 'no') return { predicate: reject('outside US', [country, `locationRaw:${c.locationRaw}`]), area };
  if (c.locationMode === 'remote' && c.countryUS === 'yes') return { predicate: pass([mode, country]), area };
  const localMode = c.locationMode === 'remote' || (p.localModes as string[]).includes(c.locationMode);
  if (area.length && localMode)
    return { predicate: pass([mode, ...area.map(a => `localArea:${a}`)]), area };
  if (c.locationMode === 'hybrid' || c.locationMode === 'onsite')
    return { predicate: reject('outside local areas', [mode, `locationRaw:${c.locationRaw}`]), area };
  if (!p.requireRemoteUS) return { predicate: pass([mode, 'policy:remote-any-country']), area };
  const why = 'US remote eligibility unverified';
  return { predicate: p.onUnknown.locationEligibility === 'reject' ? reject(why, [mode, country]) : unknown(why, [mode, country]), area };
}

export function evaluate(record: Canonical, policy: Policy, now: string): Evaluation {
  const c = Canonical.parse(record), p = Policy.parse(policy);
  const clock = Date.parse(now);
  if (!Number.isFinite(clock)) throw new Error('invalid evaluation clock');
  const excluded = matchedTerms(c.title, p.excludedTitles);
  const title = matchedTerms(c.title, p.titleTerms);
  const location = locationPredicate(c, p);
  const predicates: Record<string, Predicate> = {
    title: excluded.length ? reject('excluded title', excluded.map(t => `title:${t}`)) : pass(['title:allowed']),
    titleRelevance: p.requireTitleMatch && !title.length
      ? reject('title outside search tracks', [`title:${c.title}`])
      : pass(title.map(t => `title:${t}`)),
    directPosting: p.requireDirectPosting && !c.canonicalUrl.startsWith('https://')
      ? reject('HTTPS direct posting required', ['canonicalUrl:non-https']) : pass(['canonicalUrl:provider']),
    locationEligibility: location.predicate
  };
  if (!c.postedAt) {
    predicates.recency = p.onUnknown.recency === 'reject' ? reject('publication date missing', ['postedAt:null'])
      : p.onUnknown.recency === 'unknown' ? unknown('publication date missing', ['postedAt:null'])
      : pass(['postedAt:unknown-allowed']);
  } else {
    const age = clock - Date.parse(c.postedAt);
    predicates.recency = age < -3_600_000 ? unknown('future publication date', [`postedAt:${c.postedAt}`])
      : pass([`postedAt:${c.postedAt}`, age > p.freshnessThresholdHours * 3_600_000
        ? 'recency:older-than-scoring-window' : 'recency:within-scoring-window']);
  }
  if (Object.values(predicates).some(x => x.result === 'reject'))
    return { disposition: 'reject', score: null, predicates, features: {} };
  if (Object.values(predicates).some(x => x.result === 'unknown'))
    return { disposition: 'unknown', score: null, predicates, features: {} };

  const domain = matchedTerms(`${c.title} ${c.descriptionText}`, p.domainTerms);
  const features: Record<string, Feature> = {};
  function add(name: string, value: number, weight: number, evidence: string[]) {
    features[name] = { value, weight, contribution: value * weight, evidence };
  }
  add('titleMatch', Math.min(1, title.length / 2), p.rankingWeights.titleMatch, title.map(t => `title:${t}`));
  add('domainMatch', Math.min(1, domain.length / 2), p.rankingWeights.domainMatch, domain.map(t => `titleOrDescription:${t}`));
  const remoteUS = c.countryUS === 'yes' && c.locationMode === 'remote';
  add('locationMatch', remoteUS || location.area.length ? 1 : 0, p.rankingWeights.locationMatch,
    [`locationMode:${c.locationMode}`, `countryUS:${c.countryUS}`, ...location.area.map(a => `localArea:${a}`)]);
  const age = c.postedAt ? Math.max(0, clock - Date.parse(c.postedAt)) : null;
  add('recency', age === null ? 0 : Math.max(0, 1 - age / (p.freshnessThresholdHours * 3_600_000)),
    p.rankingWeights.recency, [c.postedAt ? `postedAt:${c.postedAt}` : 'postedAt:unknown']);
  add('directLink', c.canonicalUrl.startsWith('https://') ? 1 : 0,
    p.rankingWeights.directLink, ['canonicalUrl:provider']);
  const score = Math.round(Object.values(features).reduce((sum, f) => sum + f.contribution, 0) * 10000) / 10000;
  return { disposition: 'candidate', score, predicates, features };
}
