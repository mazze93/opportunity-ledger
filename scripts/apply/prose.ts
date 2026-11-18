// ============================================================
// prose.ts — the mechanical half of the prose gate.
//
// Ported from the per-application prose-probes.js that was copied
// into three application folders. It flags the constructions the
// prose-touchstone pass removes (negation pivots, "it's not X, it's
// Y", stock closers, em dashes, intensifiers, tricolons). It does
// not replace the prose-touchstone read; it makes that read start
// from a list instead of from scratch.
//
// A hit fails the gate unless its exact text is listed in the
// application file's "proseAccepted" array: an accepted hit is a
// recorded decision, not a silenced probe.
// Pure functions; no I/O.
// ============================================================

export const PROBES: Record<string, RegExp> = {
  negation_pivot: /\b(not|never|isn't|wasn't|haven't|don't|doesn't)\b[^.?!]{0,80}[.,;]\s*(but|what|instead|rather)\b/gi,
  its_not_its: /\b(it'?s|this is|that'?s) not\b[^.]{0,60}[,.;]\s*(it'?s|this is|that'?s)\b/gi,
  rather_than: /\brather than\b/gi,
  abstract_triplet: /\ban? [a-z-]+(?: [a-z-]+)?, an? [a-z-]+(?: [a-z-]+)?,? and an? [a-z-]+(?: [a-z-]+)?/gi,
  clause_tricolon: /,[^,.]{3,60},[^,.]{0,10}\band\b[^.]{3,80}\./gi,
  filler_opener: /(^|[.!?]\s+)(That'?s|That is|This is|It is|It's)\b/g,
  stock_closer: /(I would welcome|look forward|thank you for your (time|consideration)|excited to|passionate about|at your earliest)/gi,
  em_dash: /—|--/g,
  the_way_when: /\bthe way\b[^.]{0,60}\bwhen\b/gi,
  intensifiers: /\b(truly|deeply|incredibly|genuinely|really|very)\b/gi,
};

// Each probe must fire on its planted samples, or the gate is blind.
const SELFTEST: Record<string, string[]> = {
  negation_pivot: ["I haven't run one. What I have run is X.", 'It was never about speed, but about care.'],
  its_not_its: ["It's not a tool, it's a practice.", "That's not luck. That's design."],
  rather_than: ['build rather than claim'],
  abstract_triplet: ['a story, a proof point, and a reusable asset', 'a map, a guide and a baseline'],
  clause_tricolon: ['Here X is recorded, Y is measured, and Z is filed.'],
  filler_opener: ["Done. That's part of it.", 'Yes. This is how I work.'],
  stock_closer: ['I would welcome a conversation.'],
  em_dash: ['fast — and loud'],
  the_way_when: ['quiet the way a room goes quiet when'],
  intensifiers: ['I truly care'],
};

export interface ProseHit { probe: string; text: string; where: 'letter' | 'resume'; accepted: boolean }

/** Probes that failed to fire on their own planted samples. Must be empty. */
export function selfTest(): string[] {
  const blind: string[] = [];
  for (const [k, samples] of Object.entries(SELFTEST))
    for (const s of samples) if (!new RegExp(PROBES[k].source, PROBES[k].flags).test(s)) blind.push(`${k}: ${s}`);
  return blind;
}

interface AppText {
  resume?: { summary?: string; roles?: { bullets?: string[] }[] };
  letter?: { paragraphs?: string[]; close?: string };
  proseAccepted?: string[];
}

/** Run every probe over the letter and the resume prose of a render-application JSON file. */
export function scan(app: AppText): ProseHit[] {
  const accepted = new Set(app.proseAccepted ?? []);
  const parts: [ProseHit['where'], string][] = [
    ['letter', [...(app.letter?.paragraphs ?? []), app.letter?.close ?? ''].join('\n')],
    ['resume', [app.resume?.summary ?? '', ...(app.resume?.roles ?? []).flatMap(r => r.bullets ?? [])].join('\n')],
  ];
  return parts.flatMap(([where, text]) => Object.entries(PROBES).flatMap(([probe, re]) =>
    [...text.matchAll(new RegExp(re.source, re.flags))].map(m => {
      const hit = m[0].trim();
      return { probe, text: hit, where, accepted: accepted.has(hit) };
    })));
}
