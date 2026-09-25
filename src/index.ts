import { Target } from './contracts';
import { Policy } from './contracts';
import { IngestWorkflow } from './workflow';
import type { Env } from './workflow';
import { policyIdentity } from './storage';
import { ENGINE_VERSION } from './policy';
import targetsFile from '../config/targets.json';
import policyFile from '../policies/security-content-us.json';

export { IngestWorkflow };
const targets = Target.array().parse(targetsFile);
const policy = Policy.parse(policyFile);

async function limitedJson(req: Request): Promise<unknown> {
  const reader = req.body?.getReader();
  if (!reader) throw new Error('empty body');
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const {done,value} = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 2048) { await reader.cancel(); throw new Error('body too large'); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return JSON.parse(new TextDecoder('utf-8', {fatal:true}).decode(bytes));
}

function authorized(req: Request, env: Env): boolean {
  if (!env.LEDGER_TOKEN || env.LEDGER_TOKEN.length < 32) return false;
  const header = req.headers.get('authorization');
  return header === `Bearer ${env.LEDGER_TOKEN}`;
}

async function start(env: Env, target: Target) {
  const instance = await env.INGEST.create({ params: { target } });
  return { target, instanceId: instance.id };
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    if (!authorized(req, env)) return new Response('Unauthorized', { status: 401 });
    const url = new URL(req.url);
    if (req.method === 'POST' && url.pathname === '/runs') {
      if (Number(req.headers.get('content-length')) > 2048) return new Response('Too large', { status: 413 });
      let input: unknown;
      try { input = await limitedJson(req); } catch { return new Response('Invalid or oversized JSON', { status: 400 }); }
      const wanted = Target.pick({ provider: true, board: true }).strict().safeParse(input);
      if (!wanted.success) return new Response('Invalid target', { status: 400 });
      const target = targets.find(t => t.provider === wanted.data.provider && t.board === wanted.data.board);
      if (!target) return new Response('Target not registered', { status: 404 });
      return Response.json(await start(env, target), { status: 202 });
    }
    if (req.method === 'GET' && url.pathname.startsWith('/runs/')) {
      const id = url.pathname.slice('/runs/'.length);
      if (!/^[a-zA-Z0-9_-]{1,120}$/.test(id)) return new Response('Invalid id', { status: 400 });
      try { return Response.json(await (await env.INGEST.get(id)).status()); }
      catch { return new Response('Run not found', { status: 404 }); }
    }
    if (req.method === 'GET' && url.pathname === '/opportunities') {
      const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit') ?? 30) || 30));
      const policySha = await policyIdentity(policy);
      const rows = await env.DB.prepare(`SELECT o.id,o.company,o.title,o.location_mode,o.canonical_url,
        o.last_seen_at,e.disposition,e.score,e.explanation_json,b.raw_sha256,b.canonical_sha256,
        b.raw_payload_ref,b.raw_json_pointer,b.source_url,b.fetched_at,e.policy_sha256
        FROM opportunities o
        JOIN observations b ON b.opportunity_id=o.id
        JOIN evaluations e ON e.observation_id=b.id
        WHERE b.id=(SELECT b2.id FROM observations b2 WHERE b2.opportunity_id=o.id
          ORDER BY b2.fetched_at DESC,b2.id DESC LIMIT 1)
        AND e.policy_sha256=? AND e.engine_version=? AND e.disposition='candidate'
        ORDER BY e.score DESC,o.id LIMIT ?`).bind(policySha,ENGINE_VERSION,limit).all();
      return Response.json(rows.results);
    }
    return new Response('Not found', { status: 404 });
  },
  async scheduled(_controller: ScheduledController, env: Env, ctx: ExecutionContext) {
    for (const target of targets) ctx.waitUntil(start(env, target));
  }
} satisfies ExportedHandler<Env>;
