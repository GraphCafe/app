# GitHub identity for Graph.Cafe (Cursor Cloud)

Two different GitHub logins matter: **who merges in the Cursor UI** vs **which token Cloud Agents use** in the VM.

## Merge a PR from Cursor (“not authenticated”)

The **Merge** button in Cursor (Agents or PR view) uses **your Cursor account’s linked GitHub OAuth**, not the agent VM’s `gh` CLI.

To merge into `GraphCafe/app`:

1. Sign in at **[cursor.com/dashboard](https://cursor.com/dashboard)** with the **same Cursor account** as the desktop app.
2. Open **Integrations** in the **web dashboard** sidebar (this is **not** in desktop **Settings** — searching “Integrations” in the IDE settings search returns nothing).
3. Under **Source control**, click **Connect** next to **GitHub** (or **Manage** if already linked). You can also install from [github.com/apps/cursor](https://github.com/apps/cursor).
4. Connect the GitHub user that has **write/merge access** to `GraphCafe/app` (org owner, maintainer, or the `@GraphCafe` machine user if that account owns the repo). Grant the app access to `GraphCafe/app` (selected repos or all repos).
5. If the org uses SSO, **authorize SSO** for the Cursor GitHub App on the GraphCafe organization.
6. Retry merge from the agent run or merge on github.com.

Official doc: [GitHub integration](https://cursor.com/docs/integrations/github).

**Desktop Settings** only has **Git & PRs** (review/attribution behavior), not GitHub login. When starting a Cloud agent, the **repo picker** may also show **Connect GitHub** inline — that uses the same account link as the dashboard.

There is **no** `environment.json` field to pick a GitHub username for the Merge button—that link is always the human (or service) account connected to Cursor.

## Cloud Agent git push / PR create

Agents push branches and open PRs with a **GitHub token Cursor injects** into the VM (`GITHUB_TOKEN` / `GH_TOKEN`), scoped to repos attached to the environment.

For this repo:

- Environment: [graphcafe/app on Cloud Agents](https://cursor.com/dashboard/cloud-agents/environments/e/070b8dd5-c613-11f1-ac31-5e2d0494121f)
- `.cursor/environment.json` lists `repositoryDependencies: ["github.com/GraphCafe/app"]` so the generated token includes this repo.

**To run agents as the GraphCafe org identity** (commits/PRs appear from `@GraphCafe` or a bot user):

1. Complete dashboard **Integrations → GitHub** first (account-level app install).
2. Open **[Cloud Agents → Environments](https://cursor.com/dashboard/cloud-agents)** → your **graphcafe/app** environment → ensure **GraphCafe/app** is in the selected repositories.
3. Optional: add an **environment secret** `GH_TOKEN` — a fine-grained PAT from the GraphCafe bot with `contents` + `pull_requests` on `GraphCafe/app`. Use only if dashboard linking is not enough.

Cloud setup doc: [Cloud environment setup](https://cursor.com/docs/cloud-agent/setup).

Verify in an agent shell:

```bash
gh api user --jq .login
git log -1 --format='%an <%ae>'
```

You should see the intended GitHub login on PRs you ask the agent to open.

## Fly.io deploy (GitHub Actions)

Pushes to `main` run `.github/workflows/fly-deploy.yml`. The **deploy** job needs **`FLY_API_TOKEN`** in GitHub repository secrets (Settings → Secrets and variables → Actions), not in Cursor environment secrets.

The workflow failed on PR #5 merge because the **verify** job failed (`legacy-sweep.test.tsx`), not because Fly was unreachable.
