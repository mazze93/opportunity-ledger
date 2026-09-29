import test from 'node:test';
import assert from 'node:assert/strict';
// @ts-expect-error Deployment scripts are plain Node ESM.
import { provision } from '../scripts/provision.mjs';

const database = { name: 'opportunity-ledger', uuid: '12345678-1234-1234-1234-123456789abc' };
function options(fetchImpl: typeof fetch) {
  return { accountId: 'a'.repeat(32), apiToken: 'test-only', ledgerToken: 'b'.repeat(32), fetchImpl,
    config: { name: 'opportunity-ledger', d1_databases: [{ binding: 'DB', database_name: database.name }],
      r2_buckets: [{ binding: 'SNAPSHOTS', bucket_name: 'opportunity-ledger-snapshots' }] } };
}
const ok = (result: unknown) => Response.json({ success: true, result });

test('provision reuses resources without creating duplicates', async () => {
  const calls: string[] = [];
  const result = await provision(options(async (input, init) => {
    const path = new URL(String(input)).pathname;
    calls.push(init?.method ?? 'GET');
    if (path.endsWith('/workers/subdomain')) return ok({ subdomain: 'my-account' });
    if (path.endsWith('/d1/database')) return ok([database]);
    return ok({ name: 'opportunity-ledger-snapshots' });
  }));
  assert.deepEqual(calls, ['GET', 'GET', 'GET']);
  assert.equal(result.config.d1_databases[0].database_id, database.uuid);
  assert.equal(result.baseUrl, 'https://opportunity-ledger.my-account.workers.dev');
});

test('provision creates missing resources using exact configured names', async () => {
  const writes: unknown[] = [];
  await provision(options(async (input, init) => {
    const path = new URL(String(input)).pathname;
    if (init?.method === 'POST') { writes.push(JSON.parse(String(init.body))); return ok(database); }
    if (path.endsWith('/workers/subdomain')) return ok({ subdomain: 'test' });
    if (path.endsWith('/d1/database')) return ok([]);
    return new Response('', { status: 404 });
  }));
  assert.deepEqual(writes, [{ name: database.name }, { name: 'opportunity-ledger-snapshots' }]);
});

test('an R2 authorization error is not treated as a missing bucket', async () => {
  let writes = 0;
  await assert.rejects(provision(options(async (input, init) => {
    if (init?.method === 'POST') writes++;
    const path = new URL(String(input)).pathname;
    if (path.endsWith('/workers/subdomain')) return ok({ subdomain: 'test' });
    if (path.endsWith('/d1/database')) return ok([database]);
    return Response.json({ success: false, errors: [{ code: 10000 }] }, { status: 403 });
  })), /HTTP 403/);
  assert.equal(writes, 0);
});

test('missing credentials fail before Cloudflare calls', async () => {
  let calls = 0;
  await assert.rejects(provision({ ...options(async () => { calls++; return ok({}); }), apiToken: '' }), /repository secrets/);
  assert.equal(calls, 0);
});
