# CodeRifts GitLab CI Component

> ⚠️ **Beta**: This GitLab CI component is not yet registered in the GitLab Catalog.
> For production use, please use the [GitHub App](https://github.com/apps/coderifts) instead.


[![License: Proprietary](https://img.shields.io/badge/license-Proprietary-red.svg)](https://coderifts.com/terms/)

Official GitLab CI/CD Catalog component for [CodeRifts](https://coderifts.com). Detects breaking API changes on every Merge Request, scores risk, and enforces governance policies.

Works with GitHub, GitLab, Bitbucket, and any CI/CD pipeline.

## Quick Start

> Beta: this component is not registered in the GitLab CI/CD Catalog yet and the
> `gitlab.com/coderifts/` namespace does not exist, so the `include` below will
> not resolve. Until it ships, use the live [REST API](#alternative-rest-api)
> path below (or the GitHub App).

```yaml
include:
  - component: gitlab.com/coderifts/gitlab-ci-component/coderifts@main
    inputs:
      api_key: $CODERIFTS_API_KEY
```

## Requirements

- GitLab CI/CD
- `CODERIFTS_API_KEY` variable set in GitLab CI/CD settings

## Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `api_key` | Yes | — | Your CodeRifts API key |
| `base_branch` | No | `main` | Branch to compare against |
| `fail_on_breaking` | No | `false` | Fail pipeline on breaking changes |

## Setup

1. Get a free API key at [app.coderifts.com/api/signup](https://app.coderifts.com/api/signup)
2. Add `CODERIFTS_API_KEY` to your GitLab CI/CD variables (**Settings → CI/CD → Variables**). Mark it as masked.
3. Add the `include` block to your `.gitlab-ci.yml`
4. Open a Merge Request that changes an OpenAPI schema

## What You Get

Every Merge Request that modifies an OpenAPI schema receives a governance report with:

- **Risk Score (0–100)** — Revenue impact, blast radius, compatibility, and security scored across 4 dimensions
- **Policy Violations** — Breaking budgets, freeze windows, and approval requirements checked against `.coderifts.yml`
- **Security Analysis** — Auth scheme changes detected with 5 severity levels and OAuth scope tracking
- **Migration Estimates** — Engineering effort and downstream service impact calculated per breaking change
- **Change Intent** — Every change classified as structural, behavioral, security, or performance
- **Confidence Score** — How certain CodeRifts is about each detected change

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
      curl -sf -X POST https://app.coderifts.com/api/v1/diff \
        -H "Authorization: Bearer $CODERIFTS_API_KEY" \
        -H "Content-Type: application/json" \
        -d "{\"old_spec\": \"$CI_MERGE_REQUEST_TARGET_BRANCH_NAME:api/openapi.yaml\",
             \"new_spec\": \"api/openapi.yaml\"}"
  rules:
    - if: $CI_MERGE_REQUEST_IID
```

## Works Everywhere You Code

This is the GitLab CI integration. CodeRifts also works with:

| Platform | How |
|---|---|
| GitHub App | Zero-config, one-click install |
| GitHub Actions | [`coderifts/action@v1`](https://coderifts.com/integrations/github-actions/) |
| GitLab CI | CI/CD Catalog component (this repo) |
| Bitbucket Pipelines | [Docker pipe](https://coderifts.com/integrations/bitbucket/) |
| REST API | Bearer token, any CI/CD system |
| CLI | `npx coderifts diff` |
| Web UI | [app.coderifts.com/try](https://app.coderifts.com/try) |

Full integration docs: [coderifts.com/integrations/](https://coderifts.com/integrations/)

## Links

- **Website:** [coderifts.com](https://coderifts.com)
- **GitLab CI docs:** [coderifts.com/integrations/gitlab/](https://coderifts.com/integrations/gitlab/)
- **Install GitHub App:** [github.com/apps/coderifts](https://github.com/apps/coderifts)
- **All integrations:** [coderifts.com/integrations/](https://coderifts.com/integrations/)
- **CLI on npm:** [npmjs.com/package/coderifts](https://www.npmjs.com/package/coderifts)

## License

Proprietary. See [Terms of Service](https://coderifts.com/terms/).
