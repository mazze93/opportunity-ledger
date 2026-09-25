import { Canonical, Evaluation, Feature, Policy, Predicate } from './contracts';

export const ENGINE_VERSION = '0.1.0';
const pass = (evidence: string[]): Predicate => ({ result: 'pass', evidence });
const reject = (reason: string, evidence: string[]): Predicate => ({ result: 'reject', reason, evidence });
const unknown = (reason: string, evidence: string[]): Predicate => ({ result: 'unknown', reason, evidence });

function matchedTerms(text: string, terms: string[]): string[] {
  const haystack = text.toLocaleLowerCase('en-US');
  return terms.filter(t => haystack.includes(t.toLocaleLowerCase('en-US')));
}

export function evaluate(record: Canonical, policy: Policy, now: string): Evaluation {
  const c = Canonical.parse(record), p = Policy.parse(policy);
  const clock = Date.parse(now);
  if (!Number.isFinite(clock)) throw new Error('invalid evaluation clock');
  const excluded = matchedTerms(c.title, p.excludedTitles);
  const predicates: Record<string, Predicate> = {
    title: excluded.length ? reject('excluded title', excluded.map(t => `title:${t}`)) : pass(['title:allowed']),
    directPosting: p.requireDirectPosting && !c.canonicalUrl.startsWith('https://')
      ? reject('HTTPS direct posting required', ['canonicalUrl:non-https']) : pass(['canonicalUrl:provider']),
    locationEligibility: !p.requireRemoteUS ? pass(['policy:any-location'])
      : c.locationMode !== 'remote' && c.locationMode !== 'unknown'
        ? reject('remote role required', [`locationMode:${c.locationMode}`])
        : c.countryUS === 'no' ? reject('outside US', [`countryUS:no`, `locationRaw:${c.locationRaw}`])
        : c.locationMode === 'remote' && c.countryUS === 'yes'
          ? pass(['locationMode:remote', 'countryUS:yes'])
          : p.onUnknown.locationEligibility === 'reject'
            ? reject('US remote eligibility unverified', [`locationMode:${c.locationMode}`, `countryUS:${c.countryUS}`])
            : unknown('US remote eligibility unverified', [`locationMode:${c.locationMode}`, `countryUS:${c.countryUS}`])
  };
  if (!c.postedAt) {
    predicates.recency = p.onUnknown.recency === 'reject' ? reject('publication date missing', ['postedAt:null'])
      : p.onUnknown.recency === 'unknown' ? unknown('publication date missing', ['postedAt:null'])
      : pass(['postedAt:unknown-allowed']);
  } else {
    const age = clock - Date.parse(c.postedAt);
    predicates.recency = age < -3_600_000 ? unknown('future publication date', [`postedAt:${c.postedAt}`])
      : age > p.freshnessThresholdHours * 3_600_000
        ? reject('posting older than threshold', [`postedAt:${c.postedAt}`])
        : pass([`postedAt:${c.postedAt}`]);
  }
  if (Object.values(predicates).some(x => x.result === 'reject'))
    return { disposition: 'reject', score: null, predicates, features: {} };
  if (Object.values(predicates).some(x => x.result === 'unknown'))
    return { disposition: 'unknown', score: null, predicates, features: {} };

  const title = matchedTerms(c.title, p.titleTerms);
  const domain = matchedTerms(`${c.title} ${c.descriptionText}`, p.domainTerms);
  const features: Record<string, Feature> = {};
  function add(name: string, value: number, weight: number, evidence: string[]) {
    features[name] = { value, weight, contribution: value * weight, evidence };
  }
  add('titleMatch', Math.min(1, title.length / 2), p.rankingWeights.titleMatch, title.map(t => `title:${t}`));
  add('domainMatch', Math.min(1, domain.length / 2), p.rankingWeights.domainMatch, domain.map(t => `titleOrDescription:${t}`));
  add('locationMatch', c.countryUS === 'yes' && c.locationMode === 'remote' ? 1 : 0,
    p.rankingWeights.locationMatch, [`locationMode:${c.locationMode}`, `countryUS:${c.countryUS}`]);
  const age = c.postedAt ? Math.max(0, clock - Date.parse(c.postedAt)) : null;
  add('recency', age === null ? 0 : Math.max(0, 1 - age / (p.freshnessThresholdHours * 3_600_000)),
    p.rankingWeights.recency, [c.postedAt ? `postedAt:${c.postedAt}` : 'postedAt:unknown']);
  add('directLink', c.canonicalUrl.startsWith('https://') ? 1 : 0,
    p.rankingWeights.directLink, ['canonicalUrl:provider']);
  const score = Math.round(Object.values(features).reduce((sum, f) => sum + f.contribution, 0) * 10000) / 10000;
  return { disposition: 'candidate', score, predicates, features };
}
