import assert from 'node:assert/strict';
import { readFile, appendFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

export async function verifyDeployment({ baseUrl, token, targets, fetchImpl = fetch, pollMs = 3000, timeoutMs = 300_000 }) {
  assert.match(baseUrl ?? '', /^https:\/\/[a-z0-9.-]+(?::\d+)?$/);
  assert.ok(token?.length >= 32, 'LEDGER_TOKEN must contain at least 32 characters');
  const request = (path, options = {}, authenticated = true) => fetchImpl(baseUrl + path, {
    ...options, redirect: 'error', signal: AbortSignal.timeout(20_000),
    headers: { ...(authenticated ? { Authorization: `Bearer ${token}` } : {}), ...options.headers }
  });
  const json = async (path, options, status = 200) => {
    const response = await request(path, options);
    assert.equal(response.status, status, `${path}: unexpected HTTP status`);
    return response.json();
  };
  // Allow a newly deployed version and secret to propagate before checking routes.
  let ready = false;
  for (let attempt = 0; attempt < 10; attempt++) {
    try { ready = (await request('/opportunities?limit=1')).status === 200; } catch { /* retry rollout */ }
    if (ready) break;
    await new Promise(resolve => setTimeout(resolve, 3000));
  }
  assert.ok(ready, 'Worker did not become ready with the configured bearer token');
  for (const path of ['/opportunities', '/mcp', '/runs'])
    assert.equal((await request(path, {}, false)).status, 401, `${path} must require authentication`);
  assert.equal((await request('/runs', { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider: 'ashby-postings', board: 'not-registered' }) })).status, 404);

  let rpcId = 0;
  const rpc = async (method, params) => {
    const response = await request('/mcp', { method: 'POST', headers: { 'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream', 'MCP-Protocol-Version': '2025-11-25' },
      body: JSON.stringify({ jsonrpc: '2.0', id: ++rpcId, method, params }) });
    assert.equal(response.status, 200, `MCP ${method} HTTP status`);
    const body = await response.text();
    const messages = response.headers.get('content-type')?.includes('text/event-stream')
      ? body.split(/\r?\n/).filter(line => line.startsWith('data:')).map(line => JSON.parse(line.slice(5)))
      : [JSON.parse(body)];
    const message = messages.find(x => x.id === rpcId);
    assert.ok(message && !message.error, `MCP ${method} returned an error`);
    assert.ok(!message.result.isError, `MCP ${method} tool failed`);
    return message.result;
  };
  const initialize = await rpc('initialize', { protocolVersion: '2025-11-25', capabilities: {}, clientInfo: { name: 'ledger-deploy-check', version: '1.0.0' } });
  assert.equal(initialize.serverInfo.name, 'opportunity-ledger');
  const tools = await rpc('tools/list', {});
  for (const name of ['list_targets', 'list_opportunities']) assert.ok(tools.tools.some(t => t.name === name), `Missing MCP tool ${name}`);
  const listedTargets = JSON.parse((await rpc('tools/call', { name: 'list_targets', arguments: {} })).content[0].text);
  assert.deepEqual(listedTargets.targets, targets);

  const runs = await Promise.all(targets.map(async ({ provider, board }) => {
    const run = await json('/runs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ provider, board }) }, 202);
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const status = await json(`/runs/${run.instanceId}`);
      if (status.status === 'complete') {
        assert.ok(Number.isInteger(status.output?.total) && status.output.total >= 0, `${board}: missing ingestion totals`);
        return { board, ...status.output };
      }
      assert.ok(!['errored', 'terminated', 'paused'].includes(status.status), `${board}: workflow ${status.status}`);
      await new Promise(resolve => setTimeout(resolve, pollMs));
    }
    throw new Error(`${board}: ingestion did not finish within ${timeoutMs / 1000}s`);
  }));
  assert.ok(runs.reduce((sum, run) => sum + run.total, 0) > 0, 'All registered feeds were empty');
  const candidates = await json('/opportunities?limit=100');
  assert.ok(Array.isArray(candidates));
  for (const row of candidates) {
    for (const field of ['raw_sha256', 'canonical_sha256', 'policy_sha256']) assert.match(row[field], /^[a-f0-9]{64}$/);
    assert.match(row.canonical_url, /^https:\/\//);
    assert.match(row.raw_payload_ref, /^raw\/sha256\//);
    assert.ok(row.raw_json_pointer && row.fetched_at && row.explanation_json);
  }
  const mcpRows = JSON.parse((await rpc('tools/call', { name: 'list_opportunities', arguments: { limit: 100 } })).content[0].text);
  assert.deepEqual(mcpRows, candidates, 'MCP and REST results differ');
  return { baseUrl, runs: runs.map(({ board, total, candidate }) => ({ board, total, candidate })), candidates: candidates.length };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const result = await verifyDeployment({ baseUrl: process.env.WORKER_BASE_URL, token: process.env.LEDGER_TOKEN,
      targets: JSON.parse(await readFile('config/targets.json', 'utf8')) });
    console.log(JSON.stringify(result, null, 2));
    if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY,
      `## Verified deployment\n\nWorker: ${result.baseUrl}\n\nMCP: ${result.baseUrl}/mcp\n\n${result.candidates} qualifying opportunities (up to 100).\n\n\`\`\`json\n${JSON.stringify(result.runs, null, 2)}\n\`\`\`\n`);
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
