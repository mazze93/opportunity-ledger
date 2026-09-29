import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
import { verifyDeployment } from '../scripts/verify-deployment.mjs';

// Exercise real workerd bindings, Workflow steps, SQL migrations, and MCP transport.
// Only the public ATS upstream is replaced by a deterministic fixture.
test('ingest snapshots, persist candidates, and query through REST and MCP', { timeout: 60_000 }, async () => {
  const targets = JSON.parse(await readFile('config/targets.json', 'utf8'));
  const token = 'local-runtime-test-token-only-32-characters';
  const mf = new Miniflare(convertV4MiniflareOptions({
    modules: true, scriptPath: 'dist/index.js', compatibilityDate: '2026-09-25',
    bindings: { LEDGER_TOKEN: token }, d1Databases: ['DB'], r2Buckets: ['SNAPSHOTS'],
    workflows: { INGEST: { name: 'opportunity-ingest', className: 'IngestWorkflow' } },
    outboundService: async request => {
      const url = new URL(request.url);
      assert.equal(url.hostname, 'api.ashbyhq.com');
      const board = url.pathname.split('/').at(-1);
      assert.ok(targets.some(t => t.board === board));
      return Response.json({ jobs: [{ id: `${board}-fixture`, title: 'Senior Security Researcher',
        location: 'Remote - United States', isRemote: true, workplaceType: 'Remote',
        employmentType: 'FullTime', publishedAt: new Date().toISOString(),
        descriptionPlain: 'Security research, threat intelligence, technical writing, and application security.',
        jobUrl: `https://jobs.ashbyhq.com/${board}/fixture`,
        address: { postalAddress: { addressCountry: 'US' } } }] });
    }
  }));
  try {
    const db = await mf.getD1Database('DB');
    const migration = await readFile('migrations/0001_init.sql', 'utf8');
    for (const sql of migration.split(';').map(s => s.trim()).filter(Boolean)) await db.prepare(sql).run();
    const result = await verifyDeployment({ baseUrl: 'https://ledger.test', token, targets,
      fetchImpl: (input, init) => mf.dispatchFetch(input, init), pollMs: 50, timeoutMs: 30_000 });
    assert.equal(result.candidates, targets.length);
    assert.ok(result.runs.every(run => run.total === 1 && run.candidate === 1));
    const bucket = await mf.getR2Bucket('SNAPSHOTS');
    assert.equal((await bucket.list()).objects.length, targets.length);
    const evidence = await db.prepare('SELECT raw_payload_ref, raw_sha256 FROM observations').all();
    for (const row of evidence.results) {
      const raw = await (await bucket.get(row.raw_payload_ref)).arrayBuffer();
      const digest = Buffer.from(await crypto.subtle.digest('SHA-256', raw)).toString('hex');
      assert.equal(digest, row.raw_sha256);
    }
  } finally { await mf.dispose(); }
});
