# CodeRifts GitLab CI/CD Component

Detect breaking changes in OpenAPI schemas on every GitLab Merge Request.

This CI/CD component uses the [CodeRifts CLI](https://www.npmjs.com/package/coderifts) to analyze OpenAPI spec changes and report breaking changes, risk scores, and policy violations directly in your GitLab pipeline.

## Quick Start

Add the following to your `.gitlab-ci.yml`:

```yaml
include:
  - component: gitlab.com/coderifts/gitlab-ci-component/coderifts@main
    inputs:
      api_key: $CODERIFTS_API_KEY

stages:
  - test
```

## Setup

1. Get a free API key at [app.coderifts.com/api/signup](https://app.coderifts.com/api/signup)
2. Add `CODERIFTS_API_KEY` as a CI/CD variable in your GitLab project: **Settings → CI/CD → Variables**
3. Add the `include` block above to your `.gitlab-ci.yml`
4. Every Merge Request will now run a CodeRifts check

## Inputs

| Input | Required | Default | Description |
|---|---|---|---|
| `api_key` | Yes | — | CodeRifts API key. Set as a masked CI/CD variable. |
| `base_branch` | No | `main` | Base branch to compare against. |
| `fail_on_breaking` | No | `true` | Fail the pipeline when breaking changes are detected. |

## What It Does

On every Merge Request, CodeRifts:

- Detects 10 types of breaking changes (endpoint removals, type changes, required field additions, etc.)
- Calculates a risk score (0–100) across 4 dimensions
- Checks policy violations (breaking budgets, freeze windows, no-delete rules)
- Runs security analysis (auth changes, sensitive field exposure)
- Fails the pipeline if breaking changes exceed your configured threshold

## Alternative: REST API

If you prefer not to use the CI/CD component, you can call the CodeRifts REST API directly:

```yaml
api-contract-check:
  stage: test
  image: curlimages/curl:latest
  variables:
    CODERIFTS_API_KEY: $CODERIFTS_API_KEY
  script:
    - |
      curl -sf -X POST https://app.coderifts.com/api/diff \
        -H "Authorization: Bearer $CODERIFTS_API_KEY" \
        -H "Content-Type: application/json" \
        -d "{\"base\": \"$CI_MERGE_REQUEST_TARGET_BRANCH_NAME:api/openapi.yaml\",
             \"head\": \"api/openapi.yaml\"}"
  rules:
    - if: $CI_MERGE_REQUEST_IID
```

## Links

- [CodeRifts Website](https://coderifts.com)
- [GitLab Integration Guide](https://coderifts.com/integrations/gitlab/)
- [Documentation](https://coderifts.com/docs/)
- [CLI on npm](https://www.npmjs.com/package/coderifts)

## License

Proprietary. See [Terms of Service](https://coderifts.com/terms/).
