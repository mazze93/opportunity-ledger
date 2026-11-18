// ============================================================
// copies.ts — make the files that actually get uploaded.
//
// Rule: a submitted file name carries no version number. The
// versioned originals stay where they were built; this copies each
// one byte for byte to a plain name under <record>/submit/, hashes
// it, and writes SOURCE.md saying which original each copy came from.
//
// Side effects: replaces <record>/submit/ wholesale, so a stale copy
// from an earlier build can never ride along with the current one.
// ============================================================
import { copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { basename, join } from 'node:path';
import type { SubmitFile } from './record.ts';

const VERSION_TAIL = /[_-]v\d+(?:\.\d+)*(?=\.[^.]+$)/i;

/** "Resume_Acme_v1.2.0.pdf" → "Resume_Acme.pdf". Fails if a version survives elsewhere in the name. */
export function plainName(file: string): string {
  const name = basename(file).replace(VERSION_TAIL, '');
  if (/[_-]v\d/i.test(name)) throw new Error(`cannot strip version from ${basename(file)}; rename the source`);
  return name;
}

export function sha256File(path: string): string {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

/** "build/x.resume.pdf=Jane_Doe_Resume.pdf" → explicit upload name; otherwise the source's own name. */
export function splitSource(arg: string): { from: string; name: string } {
  const eq = arg.lastIndexOf('=');
  if (eq <= 0) return { from: arg, name: plainName(arg) };
  const raw = arg.slice(eq + 1);
  if (/[\\/]/.test(raw) || raw.startsWith('.')) throw new Error(`upload name must be a plain file name: ${raw}`);
  return { from: arg.slice(0, eq), name: plainName(raw) };
}

/** Copy sources (path or path=UploadName.ext) to <recDir>/submit with plain names; return the manifest entries. */
export function makeSubmitCopies(recDir: string, args: string[]): SubmitFile[] {
  if (!args.length) throw new Error('give at least one file to submit');
  const out = join(recDir, 'submit');
  const parsed = args.map(splitSource);
  const sources = parsed.map(p => p.from);
  const names = parsed.map(p => p.name);
  const dupe = names.find((n, i) => names.indexOf(n) !== i);
  if (dupe) throw new Error(`two sources map to the same submit name: ${dupe}`);

  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });
  const files = sources.map((from, i) => {
    const to = join(out, names[i]);
    copyFileSync(from, to);
    return { name: names[i], sha256: sha256File(to), from: basename(from) };
  });
  writeFileSync(join(out, 'SOURCE.md'), manifest(files));
  return files;
}

function manifest(files: SubmitFile[]): string {
  const rows = files.map(f => `| ${f.name} | ${f.from} | \`${f.sha256.slice(0, 12)}\` |`);
  return ['# Submission copies', '',
    'Plain-named copies of the versioned files. Do not edit; rebuild and rerun `apply copies`.', '',
    '| Submitted file | Copied from | sha256 |', '|---|---|---|', ...rows, ''].join('\n');
}

/** Re-hash the copies on disk; return names whose bytes no longer match the record. */
export function driftedFiles(recDir: string, files: SubmitFile[]): string[] {
  return files.filter(f => {
    try { return sha256File(join(recDir, 'submit', f.name)) !== f.sha256; }
    catch { return true; }
  }).map(f => f.name);
}

