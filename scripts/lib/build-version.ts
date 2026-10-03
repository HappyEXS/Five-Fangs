// Wersja builda: trafia do dist/version.json i jest wpiekana w paczkę (docs/DEPLOY.md §4).

export interface BuildVersion {
  /** Semver z package.json. */
  version: string;
  /** Pełny skrót commita albo "unknown", gdy nie da się go ustalić. */
  commit: string;
  /** Data buildu w ISO 8601 (UTC). */
  builtAt: string;
}

type Env = Readonly<Record<string, string | undefined>>;

const COMMIT_PATTERN = /^[0-9a-f]{7,40}$/;

/**
 * Skrót commita: najpierw zmienne ustawiane przez hosting i CI (tam katalog .git bywa niedostępny
 * albo płytki), potem lokalny git.
 */
export function resolveCommit(env: Env, readGitHead: () => string | null): string {
  const candidates = [env.RENDER_GIT_COMMIT, env.GITHUB_SHA, env.CF_PAGES_COMMIT_SHA];
  for (const candidate of candidates) {
    const value = candidate?.trim().toLowerCase();
    if (value !== undefined && COMMIT_PATTERN.test(value)) return value;
  }
  const head = readGitHead()?.trim().toLowerCase();
  return head !== undefined && COMMIT_PATTERN.test(head) ? head : 'unknown';
}

export function createBuildVersion(
  packageVersion: string,
  env: Env,
  readGitHead: () => string | null,
  now: Date,
): BuildVersion {
  return {
    version: packageVersion,
    commit: resolveCommit(env, readGitHead),
    builtAt: now.toISOString(),
  };
}
