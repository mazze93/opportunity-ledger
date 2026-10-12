#!/usr/bin/env node
// Render a tailored resume + cover letter pair (.docx) from one JSON file.
//
// Usage: node scripts/render-application.mjs <application.json> <out-dir>
//
// The JSON holds personal data and belongs OUTSIDE this public repository.
// Shape (all strings unless noted):
//   { slug, contact: { name, location, email, phone, links: [..] },
//     resume: { headline, summary, skills: [..],
//               roles: [{ title, org, place, dates, bullets: [..] }],
//               education, tools: [..] },
//     letter: { date, salutation, paragraphs: [..], close } }
// See docs/application-loop.md, Step 5: every claim must trace to the claim bank.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import {
  AlignmentType, BorderStyle, Document, LevelFormat, Packer, Paragraph, TextRun
} from 'docx';

// ── Style ───────────────────────────────────────────────────────────────────
const FONT = 'Arial';
const INK = '1A1A1A';
const BODY = '444444';
const LINK = '1A5276';
const PAGE = { size: { width: 12240, height: 15840 } };

const run = (text, o = {}) => new TextRun({ text, font: FONT, size: o.size ?? 19, color: o.color ?? BODY, bold: o.bold ?? false });
const para = (children, o = {}) => new Paragraph({
  alignment: o.align, spacing: { before: o.before ?? 0, after: o.after ?? 40 }, border: o.border, numbering: o.numbering, children
});
const heading = text => para([run(text.toUpperCase(), { bold: true, size: 20, color: INK })], {
  before: 160, after: 60, border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC', space: 4 } }
});
const bullet = text => para([run(text)], { before: 18, after: 18, numbering: { reference: 'bullets', level: 0 } });
const DOT = '  •  ';

// ── Validation (fail loudly on a malformed file) ─────────────────────────────
function require(obj, path) {
  const value = path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
  if (value === undefined || value === '' || (Array.isArray(value) && !value.length))
    throw new Error(`application file is missing ${path}`);
  return value;
}

function validate(app) {
  ['slug', 'contact.name', 'contact.email', 'resume.headline', 'resume.summary', 'resume.roles',
    'resume.education', 'letter.paragraphs', 'letter.salutation'].forEach(p => require(app, p));
  if (!/^[a-z0-9][a-z0-9-]{0,80}$/.test(app.slug)) throw new Error('slug must be lowercase kebab-case');
  return app;
}

// ── Resume ───────────────────────────────────────────────────────────────────
function contactLine(c) {
  const parts = [c.location, c.email, c.phone].filter(Boolean).join(DOT);
  return [run(parts, { size: 17 }), ...(c.links ?? []).flatMap(l => [run(DOT, { size: 17 }), run(l, { size: 17, color: LINK })])];
}

function resume(app) {
  const { contact: c, resume: r } = app;
  const roles = r.roles.flatMap((role, i) => [
    para([run([role.title, role.org, role.place, role.dates].filter(Boolean).join('  —  '), { bold: true, size: 20, color: INK })],
      { before: i ? 70 : 50, after: 20 }),
    ...role.bullets.map(bullet)
  ]);
  const children = [
    para([run(c.name.toUpperCase(), { bold: true, size: 34, color: INK })], { align: AlignmentType.CENTER, after: 30 }),
    para(contactLine(c), { align: AlignmentType.CENTER, after: 60 }),
    para([], { before: 100, after: 60, border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: '2E75B6', space: 4 } } }),
    para([run(r.headline, { bold: true, color: INK })], { align: AlignmentType.CENTER, before: 40 }),
    para([run(r.summary)], { before: 50, after: 80 }),
    ...(r.skills?.length ? [heading('Core skills'), para([run(r.skills.join(DOT))], { before: 50, after: 80 })] : []),
    heading('Experience'), ...roles,
    heading('Education'), para([run(r.education)], { before: 40 }),
    ...(r.tools?.length ? [heading('Tools'), para([run(r.tools.join(DOT))], { before: 40 })] : [])
  ];
  return new Document({
    numbering: { config: [{ reference: 'bullets', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•',
      alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 480, hanging: 240 } } } }] }] },
    sections: [{ properties: { page: { ...PAGE, margin: { top: 900, right: 1080, bottom: 900, left: 1080 } } }, children }]
  });
}

// ── Cover letter ─────────────────────────────────────────────────────────────
function letter(app) {
  const { contact: c, letter: l } = app;
  const body = text => para([run(text, { size: 22 })], { after: 200 });
  const children = [
    para([run(c.name, { bold: true, size: 28, color: INK })], { after: 20 }),
    para([run([c.location, c.email, c.phone].filter(Boolean).join(DOT), { size: 20 })], { after: 20 }),
    ...(c.links?.length ? [para([run(c.links.join(DOT), { size: 20, color: LINK })], { after: 100 })] : []),
    ...(l.date ? [para([run(l.date, { size: 20 })], { after: 100 })] : []),
    para([run(l.salutation, { size: 22, color: INK })], { after: 140 }),
    ...l.paragraphs.map(body),
    para([run(l.close ?? 'Sincerely,', { size: 22 })], { after: 400 }),
    para([run(c.name, { bold: true, size: 22, color: INK })])
  ];
  return new Document({ sections: [{ properties: { page: { ...PAGE, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } }, children }] });
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main([input, outDir]) {
  if (!input || !outDir) throw new Error('usage: render-application.mjs <application.json> <out-dir>');
  const app = validate(JSON.parse(readFileSync(input, 'utf8')));
  mkdirSync(outDir, { recursive: true });
  for (const [kind, doc] of [['resume', resume(app)], ['cover-letter', letter(app)]]) {
    const file = join(outDir, `${app.slug}.${kind}.docx`);
    writeFileSync(file, await Packer.toBuffer(doc));
    console.log(file);
  }
}

main(process.argv.slice(2)).catch(err => { console.error(`render-application: ${err.message}`); process.exit(1); });
