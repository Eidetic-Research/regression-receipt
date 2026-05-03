# Regression Receipt

A bug is not closed until the regression test exists.

A bugfix quality gate that requires evidence of a regression test. It runs locally by default, emits deterministic JSON and Markdown, writes a GitHub Step Summary when used as an action, and can update one stable PR comment when requested.

## Install

```bash
pnpm add -D regression-receipt
```

Run locally:

```bash
pnpm regression-receipt scan --base origin/main --head HEAD --config .github/regression-receipt.yml --format markdown
pnpm regression-receipt scan --base origin/main --head HEAD --format json
```

## GitHub Actions

Use `actions/checkout` with full history so git comparisons are available.

```yaml
name: Regression Receipt

on:
  pull_request:

jobs:
  regression_receipt:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: write
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: pnpm/action-setup@v4
        with:
          version: 10.33.0
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - uses: njlane314/regression-receipt@v1
        with:
          mode: warn
          comment: true
```

Use `mode: fail` when findings should block the check. In `warn` mode, findings are reported but the action exits successfully unless a runtime error occurs.

## Config

Create `.github/regression-receipt.yml`:

```yaml
regression_receipt:
  bug_labels:
    - "bug"
    - "regression"
    - "incident"
  bug_title_patterns:
    - "^fix:"
    - "^bugfix:"
  bug_body_patterns:
    - "fixes #"
    - "closes #"
    - "resolves #"
  test_path_patterns:
    - "**/*.test.ts"
    - "**/*.spec.ts"
    - "tests/**"
    - "test/**"
    - "spec/**"
  waiver_labels:
    - "no-regression-test-needed"
  waiver_body_patterns:
    - "Regression test waiver:"
  verify:
    enabled: false
    command: ""
    timeout_seconds: 300
```

## Example JSON

```json
{
  "tool": "regression-receipt",
  "version": "0.1.1",
  "base": "origin/main",
  "head": "HEAD",
  "mode": "warn",
  "summary": {
    "findings": 1,
    "errors": 1,
    "warnings": 0
  },
  "findings": [
    {
      "id": "regression-receipt:example",
      "severity": "error",
      "title": "Example finding",
      "message": "This PR appears to fix a bug, but no regression test changed.",
      "evidence": {},
      "recommendation": "Add a regression test or apply no-regression-test-needed with justification."
    }
  ]
}
```

## Example Markdown

```markdown
Regression Receipt found 1 finding.

1. This PR appears to fix a bug, but no regression test changed.
   Evidence: see JSON output for matched paths and labels.
   Recommendation: Add a regression test or apply no-regression-test-needed with justification.
```

## Notes

- No telemetry.
- No LLM calls.
- No source-code upload.
- No external network calls except GitHub API calls for optional PR comments.
- The hidden PR comment marker is `<!-- regression-receipt-report -->`.

## License

Regression Receipt is licensed under the Business Source License 1.1. Evaluation, development, testing, security review, and use in public open-source repositories are allowed. Commercial use, including private/internal CI use, managed services, resale, hosted services, or competing products, requires a paid commercial license from njlane314.

Each version converts to Apache-2.0 on the earlier of its configured Change Date or the fourth anniversary of that version's first public distribution. See [LICENSE](LICENSE).

## Development

```bash
pnpm install
pnpm typecheck
pnpm test
pnpm build
pnpm build:action
```

The action bundle is written to `dist/index.js` with `@vercel/ncc`.
