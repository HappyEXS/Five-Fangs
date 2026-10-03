// Smoke check po deployu (docs/DEPLOY.md §5): czeka, aż strona poda oczekiwany commit
// w version.json, potem sprawdza nagłówki i status brakującego pliku.
//
//   SITE_URL=https://five-fangs.onrender.com EXPECTED_COMMIT=<sha> node scripts/smoke-check.ts
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { allIgnored, parseIgnoredPaths, parseRenderHeaders } from './lib/render-config.ts';
import { checkSmoke, findAssetPath, type ProbeResponse, readCommit } from './lib/smoke.ts';

const TIMEOUT_MS = 10 * 60 * 1000;
const POLL_MS = 15 * 1000;

const siteUrl = (process.env.SITE_URL ?? '').replace(/\/+$/, '');
const expectedCommit = (process.env.EXPECTED_COMMIT ?? '').trim().toLowerCase();

if (siteUrl === '') {
  console.log('SITE_URL nie jest ustawiony; smoke check pominięty.');
  process.exit(0);
}
if (expectedCommit === '') {
  console.error('Brak EXPECTED_COMMIT.');
  process.exit(1);
}

const renderYaml = readFileSync(new URL('../render.yaml', import.meta.url), 'utf8');

function changedFiles(): string[] {
  try {
    const out = execFileSync('git', ['diff', '--name-only', 'HEAD~1', 'HEAD'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    return out.split('\n').filter((line) => line !== '');
  } catch {
    return [];
  }
}

// Render nie buduje commitów, które zmieniają tylko ścieżki z buildFilter.ignoredPaths.
if (allIgnored(changedFiles(), parseIgnoredPaths(renderYaml))) {
  console.log('Commit zmienia tylko ścieżki pomijane przez buildFilter; deploy nie nastąpi.');
  process.exit(0);
}

async function probe(path: string): Promise<{ response: ProbeResponse; body: string }> {
  const res = await fetch(`${siteUrl}${path}`, {
    cache: 'no-store',
    headers: { 'accept-encoding': 'br, gzip' },
  });
  const headers: Record<string, string> = {};
  res.headers.forEach((value, name) => {
    headers[name.toLowerCase()] = value;
  });
  return { response: { status: res.status, headers }, body: await res.text() };
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

async function waitForCommit(): Promise<boolean> {
  const deadline = Date.now() + TIMEOUT_MS;
  for (;;) {
    let served: string | null = null;
    let status = 'brak odpowiedzi';
    try {
      const { response, body } = await probe(`/version.json?t=${Date.now()}`);
      status = `HTTP ${response.status}`;
      served = readCommit(body);
    } catch (error) {
      console.log(`  zapytanie nieudane: ${String(error)}`);
    }
    if (served === expectedCommit) return true;
    console.log(
      `  ${status}, serwowany commit: ${served ?? 'nieczytelny'}; czekam na ${expectedCommit}`,
    );
    if (Date.now() + POLL_MS > deadline) return false;
    await sleep(POLL_MS);
  }
}

console.log(`Smoke check: ${siteUrl}`);
if (!(await waitForCommit())) {
  console.error(`Strona nie podała commita ${expectedCommit} w ciągu ${TIMEOUT_MS / 60000} minut.`);
  process.exit(1);
}

const index = await probe('/');
const version = await probe('/version.json');
const assetPath = findAssetPath(index.body);
const asset = assetPath === null ? null : await probe(assetPath);
const missing = await probe(`/smoke-check-missing-${Date.now()}.txt`);

const problems = checkSmoke({
  expectedCommit,
  rules: parseRenderHeaders(renderYaml),
  index: index.response,
  version: version.response,
  versionBody: version.body,
  assetPath,
  asset: asset?.response ?? null,
  missing: missing.response,
});

if (problems.length > 0) {
  for (const problem of problems) console.error(problem);
  console.error(`\nProblemy wdrożenia: ${problems.length}`);
  process.exit(1);
}
console.log('Deploy poprawny: commit, nagłówki, kompresja i status 404 zgodne z oczekiwaniami.');
