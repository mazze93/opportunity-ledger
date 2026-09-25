import { WorkflowEntrypoint } from 'cloudflare:workers';
import type { WorkflowEvent, WorkflowStep } from 'cloudflare:workers';
import { boardUrl, parseBoard } from './adapters';
import { sha256 } from './canonical';
import { Policy, Snapshot, Target } from './contracts';
import { evaluate } from './policy';
import { persist } from './storage';
import policyFile from '../policies/security-content-us.json';

export interface Env {
  DB: D1Database;
  SNAPSHOTS: R2Bucket;
  INGEST: Workflow<IngestParams>;
  LEDGER_TOKEN: string;
}

export interface IngestParams { target: Target }

const MAX_BYTES = 4_000_000;
const MAX_ITEMS = 1000;
const policy = Policy.parse(policyFile);

export async function fetchSnapshot(target: Target, page: number, bucket: R2Bucket): Promise<Snapshot> {
  const sourceUrl = boardUrl(target, page);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  let response: Response;
  try {
    response = await fetch(sourceUrl, { method: 'GET', redirect: 'manual',
      headers: { Accept: 'application/json' }, signal: controller.signal });
    if (response.status !== 200) throw new Error(`provider returned HTTP ${response.status}`);
    if (!/^application\/(?:json|[\w.-]+\+json)(?:\s*;|\s*$)/i.test(response.headers.get('content-type') ?? ''))
      throw new Error('provider returned non-JSON');
    const length = Number(response.headers.get('content-length'));
    if (Number.isFinite(length) && length > MAX_BYTES) throw new Error('response too large');
    const reader = response.body?.getReader();
    if (!reader) throw new Error('empty response stream');
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BYTES) { await reader.cancel(); throw new Error('response too large'); }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    // Fail before storing malformed JSON. The exact wire bytes remain the hashed artifact.
    JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
    const rawSha256 = await sha256(bytes);
    const payloadRef = `raw/sha256/${rawSha256.slice(0,2)}/${rawSha256}.json`;
    await bucket.put(payloadRef, bytes, { httpMetadata: { contentType: 'application/json' } });
    return { rawSha256, payloadRef, sourceUrl, fetchedAt: new Date().toISOString(),
      httpStatus: response.status, etag: response.headers.get('etag'),
      lastModified: response.headers.get('last-modified') };
  } finally {
    clearTimeout(timer);
  }
}

export async function processSnapshot(target: Target, snap: Snapshot, env: Pick<Env, 'DB' | 'SNAPSHOTS'>) {
  const object = await env.SNAPSHOTS.get(snap.payloadRef);
  if (!object) throw new Error('raw snapshot missing');
  const bytes = new Uint8Array(await object.arrayBuffer());
  if (await sha256(bytes) !== snap.rawSha256) throw new Error('raw snapshot digest mismatch');
  const payload: unknown = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  const records = parseBoard(target, payload);
  // Do not truncate a board silently: incomplete feeds cannot establish absence/closure.
  if (records.length > MAX_ITEMS) throw new Error('board item limit exceeded');
  for (const { canonical, pointer } of records) {
    const result = evaluate(canonical, policy, snap.fetchedAt);
    await persist(env.DB, canonical, snap, pointer, result, policy);
  }
  return { count: records.length, candidate: records.filter(x =>
    evaluate(x.canonical, policy, snap.fetchedAt).disposition === 'candidate').length };
}

export class IngestWorkflow extends WorkflowEntrypoint<Env, IngestParams> {
  async run(event: WorkflowEvent<IngestParams>, step: WorkflowStep) {
    const target = Target.parse(event.payload.target);
    let total = 0, candidate = 0;
    const maxPages = target.provider === 'lever-postings' ? 10 : 1;
    for (let page = 0; page < maxPages; page++) {
      const currentPage = page;
      const snapshot = await step.do(`fetch-and-snapshot-${page}`, async () =>
        fetchSnapshot(target, currentPage, this.env.SNAPSHOTS));
      const result = await step.do(`evaluate-and-persist-${page}`, async () =>
        processSnapshot(target, snapshot, this.env));
      total += result.count;
      candidate += result.candidate;
      if (target.provider !== 'lever-postings' || result.count < 100) break;
      if (page === maxPages - 1) throw new Error('pagination cap reached; run incomplete');
    }
    return { target, total, candidate };
  }
}
