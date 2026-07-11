// Server-only GitHub helper for the admin write-via-PR flow (Phase 3).
// Edge-safe: Web APIs + fetch only, no Node built-ins. The token is passed in
// from the API route (read from env there) and never leaves the server.
//
// Flow: create a new branch off the base branch, write a single file on it,
// then open a pull request. Never commits to the base branch directly.

const API = 'https://api.github.com';

export interface GithubConfig {
  token: string;
  owner: string;
  repo: string;
  baseBranch: string;
}

export interface CreatePrInput {
  path: string; // repo-relative file path
  content: string; // new file content (UTF-8)
  branch: string; // new branch name
  commitMessage: string;
  prTitle: string;
  prBody: string;
}

export interface CreatePrResult {
  url: string;
  number: number;
  branch: string;
}

/** Base64-encode a UTF-8 string (btoa alone mishandles non-latin1 chars). */
function base64Utf8(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function headers(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'guest-guide-admin',
    'Content-Type': 'application/json',
  };
}

async function gh<T = unknown>(
  cfg: GithubConfig,
  method: string,
  path: string,
  body?: unknown,
): Promise<{ status: number; data: T | null }> {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: headers(cfg.token),
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let data: T | null = null;
  try {
    data = (await res.json()) as T;
  } catch {
    data = null;
  }
  return { status: res.status, data };
}

/** Human-readable, token-free error for a failed GitHub call. */
function ghError(step: string, r: { status: number; data: unknown }): Error {
  const d = r.data as { message?: unknown } | null;
  const msg = d && typeof d.message === 'string' ? d.message : `HTTP ${r.status}`;
  return new Error(`GitHub ${step} failed: ${msg}`);
}

export async function createContentPr(cfg: GithubConfig, input: CreatePrInput): Promise<CreatePrResult> {
  // 1. Resolve the base branch head SHA.
  const ref = await gh<{ object?: { sha?: string } }>(
    cfg,
    'GET',
    `/repos/${cfg.owner}/${cfg.repo}/git/ref/heads/${cfg.baseBranch}`,
  );
  const baseSha = ref.data?.object?.sha;
  if (ref.status !== 200 || !baseSha) throw ghError('ref lookup', ref);

  // 2. Create the new branch.
  const branchRes = await gh(cfg, 'POST', `/repos/${cfg.owner}/${cfg.repo}/git/refs`, {
    ref: `refs/heads/${input.branch}`,
    sha: baseSha,
  });
  if (branchRes.status !== 201) throw ghError('branch create', branchRes);

  // 3. Look up the existing file SHA on the base branch (needed to update it).
  const existing = await gh<{ sha?: string }>(
    cfg,
    'GET',
    `/repos/${cfg.owner}/${cfg.repo}/contents/${input.path}?ref=${encodeURIComponent(cfg.baseBranch)}`,
  );
  const existingSha: string | undefined =
    existing.status === 200 && typeof existing.data?.sha === 'string' ? existing.data.sha : undefined;

  // 4. Write the file on the new branch.
  const put = await gh(cfg, 'PUT', `/repos/${cfg.owner}/${cfg.repo}/contents/${input.path}`, {
    message: input.commitMessage,
    content: base64Utf8(input.content),
    branch: input.branch,
    ...(existingSha ? { sha: existingSha } : {}),
  });
  if (put.status !== 200 && put.status !== 201) throw ghError('file write', put);

  // 5. Open the pull request.
  const pr = await gh<{ html_url?: string; number?: number }>(cfg, 'POST', `/repos/${cfg.owner}/${cfg.repo}/pulls`, {
    title: input.prTitle,
    head: input.branch,
    base: cfg.baseBranch,
    body: input.prBody,
  });
  if (pr.status !== 201 || !pr.data?.html_url) throw ghError('pull request create', pr);

  return {
    url: pr.data.html_url,
    number: typeof pr.data.number === 'number' ? pr.data.number : 0,
    branch: input.branch,
  };
}
