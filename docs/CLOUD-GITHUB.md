# GitHub identity for Graph.Cafe (Cursor Cloud)

Two different GitHub logins matter: **who merges in the Cursor UI** vs **which token Cloud Agents use** in the VM.

## Merge a PR from Cursor (“not authenticated”)

The **Merge** button in Cursor (Agents or PR view) uses **your Cursor account’s linked GitHub OAuth**, not the agent VM’s `gh` CLI.

To merge into `GraphCafe/app`:

1. Open **Cursor Settings → Integrations → GitHub** (or [cursor.com dashboard](https://cursor.com/dashboard) → GitHub).
2. Connect the GitHub user that has **write/merge access** to `GraphCafe/app` (org owner, maintainer, or the `@GraphCafe` machine user if that account owns the repo).
3. If the org uses SSO, **authorize SSO** for the Cursor GitHub App on the GraphCafe organization.
4. Retry merge from Cursor, or merge on github.com (as you did for PR #5).

There is **no** `environment.json` field to pick a GitHub username for the Merge button—that link is always the human (or service) account connected to Cursor.

## Cloud Agent git push / PR create

Agents push branches and open PRs with a **GitHub token Cursor injects** into the VM (`GITHUB_TOKEN` / `GH_TOKEN`), scoped to repos attached to the environment.

For this repo:

- Environment: [graphcafe/app on Cloud Agents](https://cursor.com/dashboard/cloud-agents/environments/e/070b8dd5-c613-11f1-ac31-5e2d0494121f)
- `.cursor/environment.json` lists `repositoryDependencies: ["github.com/GraphCafe/app"]` so the generated token includes this repo.

**To run agents as the GraphCafe org identity** (commits/PRs appear from `@GraphCafe` or a bot user):

1. In **Cloud Agents → Environment → GitHub**, connect or reinstall access using the **GraphCafe** GitHub account (or install the Cursor GitHub App on the **GraphCafe** org with access to `app`).
2. Optional: add a team **environment secret** `GH_TOKEN` — a fine-grained PAT from the GraphCafe bot with `contents` + `pull_requests` on `GraphCafe/app`. Cursor merges injected secrets with the generated token; use only if dashboard linking is not enough.

Verify in an agent shell:

```bash
gh api user --jq .login
git log -1 --format='%an <%ae>'
```

You should see the intended GitHub login on PRs you ask the agent to open.

## Fly.io deploy (GitHub Actions)

Pushes to `main` run `.github/workflows/fly-deploy.yml`. The **deploy** job needs **`FLY_API_TOKEN`** in GitHub repository secrets (Settings → Secrets and variables → Actions), not in Cursor environment secrets.

The workflow failed on PR #5 merge because the **verify** job failed (`legacy-sweep.test.tsx`), not because Fly was unreachable.
