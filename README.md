# CasualCrawl Dashboard

Public homepage, GitHub-only sign-in screen, and authenticated dashboard for
CasualCrawl. It is intentionally separate from the crawler/controller so it can
deploy to Vercel as a small static app with one serverless API proxy.

## Routes

- `/` — product homepage
- `/login` and `/signin` — GitHub-only authentication entry point
- `/dashboard` — authenticated workspace

## Vercel setup

Create a Vercel project from this repository and add:

```text
CASUALCRAWL_API_ORIGIN=https://your-casualcrawl-controller.example.com
```

The proxy keeps `/v1/*` and `/health` same-origin from the browser, so the
controller's HttpOnly dashboard session cookie works without a cross-origin
cookie/CORS workaround.

Set the controller's public base URL to the deployed dashboard URL:

```text
CASUALCRAWL_BASE_URL=https://your-dashboard.example.com
```

That makes the GitHub OAuth callback URL:

```text
https://your-dashboard.example.com/v1/auth/github/callback
```

The controller must still keep `CASUALCRAWL_REQUIRE_API_KEY=1` and
`CASUALCRAWL_ALLOW_PRIVATE=0` in a public deployment.

## Local check

With Vercel CLI installed and the environment variable set:

```bash
vercel dev
```
