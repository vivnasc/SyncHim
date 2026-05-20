/**
 * Dispara um workflow GitHub Actions via workflow_dispatch.
 * Documentação:
 *   https://docs.github.com/en/rest/actions/workflows#create-a-workflow-dispatch-event
 */

export async function dispatchWorkflow(opts: {
  workflowFile: string; // ex: 'render-carrossel.yml'
  inputs: Record<string, string>;
  ref?: string;
}): Promise<void> {
  const token = process.env.GITHUB_DISPATCH_TOKEN;
  const owner = process.env.GITHUB_REPO_OWNER;
  const repo = process.env.GITHUB_REPO_NAME;
  const ref = opts.ref || process.env.GITHUB_DISPATCH_REF || 'main';

  if (!token || !owner || !repo) {
    throw new Error('github dispatch not configured (GITHUB_DISPATCH_TOKEN/OWNER/NAME)');
  }

  const url = `https://api.github.com/repos/${owner}/${repo}/actions/workflows/${opts.workflowFile}/dispatches`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ ref, inputs: opts.inputs })
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`github dispatch failed (${res.status}): ${detail}`);
  }
}
