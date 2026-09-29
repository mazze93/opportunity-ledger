import { readFile, writeFile, appendFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

export async function provision({ accountId, apiToken, ledgerToken, config, fetchImpl = fetch }) {
  if (!/^[a-f0-9]{32}$/i.test(accountId ?? '') || !apiToken || (ledgerToken?.length ?? 0) < 32)
    throw new Error('Set CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN, and LEDGER_TOKEN (32+ characters) as repository secrets.');
  const api = async (path, { method = 'GET', body, missingOK = false } = {}) => {
    const response = await fetchImpl(`https://api.cloudflare.com/client/v4/accounts/${accountId}${path}`, {
      method, redirect: 'error', signal: AbortSignal.timeout(30_000),
      headers: { Authorization: `Bearer ${apiToken}`, 'Content-Type': 'application/json' },
      ...(body ? { body: JSON.stringify(body) } : {})
    });
    if (missingOK && response.status === 404) return null;
    const data = await response.json();
    if (!response.ok || !data.success) throw new Error(`Cloudflare ${method} ${path.split('?')[0]} failed: HTTP ${response.status}; codes ${(data.errors ?? []).map(e => e.code).join(',')}`);
    return data;
  };
  const { result: { subdomain } } = await api('/workers/subdomain');
  if (!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(subdomain ?? ''))
    throw new Error('Enable a workers.dev subdomain for this Cloudflare account before deploying.');
  const dbConfig = config.d1_databases.find(x => x.binding === 'DB');
  const bucketConfig = config.r2_buckets.find(x => x.binding === 'SNAPSHOTS');
  if (!dbConfig || !bucketConfig) throw new Error('Missing DB or SNAPSHOTS binding');
  let database;
  for (let page = 1; ; page++) {
    const data = await api(`/d1/database?name=${encodeURIComponent(dbConfig.database_name)}&page=${page}&per_page=100`);
    database = data.result.find(x => x.name === dbConfig.database_name);
    if (database || data.result.length < 100 || page * 100 >= data.result_info?.total_count) break;
    if (page >= 100) throw new Error('D1 listing exceeded safety limit');
  }
  if (!database) ({ result: database } = await api('/d1/database', { method: 'POST', body: { name: dbConfig.database_name } }));
  if (!/^[a-f0-9-]{36}$/i.test(database.uuid ?? '')) throw new Error('Cloudflare returned an invalid D1 ID');
  const bucketPath = `/r2/buckets/${encodeURIComponent(bucketConfig.bucket_name)}`;
  if (!await api(bucketPath, { missingOK: true }))
    await api('/r2/buckets', { method: 'POST', body: { name: bucketConfig.bucket_name } });
  dbConfig.database_id = database.uuid;
  config.workers_dev = true;
  return { config, baseUrl: `https://${config.name}.${subdomain}.workers.dev` };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const result = await provision({ accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
      apiToken: process.env.CLOUDFLARE_API_TOKEN, ledgerToken: process.env.LEDGER_TOKEN,
      config: JSON.parse(await readFile('wrangler.jsonc', 'utf8')) });
    await writeFile('wrangler.jsonc', JSON.stringify(result.config, null, 2) + '\n');
    if (process.env.GITHUB_ENV) await appendFile(process.env.GITHUB_ENV, `WORKER_BASE_URL=${result.baseUrl}\n`);
    console.log(`Resources ready. Worker: ${result.baseUrl}`);
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
