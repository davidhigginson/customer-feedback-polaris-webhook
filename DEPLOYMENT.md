# Deployment Guide

This document walks through deploying the webhook service to Render using the included `render.yaml` blueprint. The same steps apply to other platforms that can run a Node.js service.

## ✅ Prerequisites

- A Render account with access to the Blueprint (Infrastructure as Code) feature.
- Jira Product Discovery enabled on your Atlassian site.
- An OAuth 2.0 access token with the scopes `read:jira-work`, `write:jira-work`, and `read:jira-user`.
- The Atlassian **cloud ID** for the Jira site you want to target.

## 1. Prepare the repository

1. Commit all changes to the branch you want to deploy from (the blueprint uses the `production` branch by default).
2. Push the branch to GitHub:
   ```bash
   git push origin production
   ```

## 2. Configure the Render blueprint

1. In Render, choose **New → Blueprint** and point it at your GitHub repository.
2. Review the detected service:
   - **Build command:** `npm install && npm run build`
   - **Start command:** `npm start`
   - **Environment:** Node 18

## 3. Set environment variables

Supply the following variables via the Render dashboard (or via `render.yaml` sync secrets):

| Variable | Required | Description |
| -------- | -------- | ----------- |
| `ATLASSIAN_ACCESS_TOKEN` | ✅ | OAuth access token including the prefix, e.g. `Bearer eyJ...` |
| `ATLASSIAN_CLOUD_ID` | ✅ | The cloud ID for your Jira site |
| `DEFAULT_INSIGHT_SOURCE` | ❌ | Overrides the default source label (`webhook`) |
| `WEBHOOK_SHARED_SECRET` | ❌ | If set, incoming requests must include `X-Webhook-Secret` header |
| `PORT` | ❌ | Defaults to 3000 |

The cloud ID can be retrieved from `https://api.atlassian.com/oauth/token/accessible-resources` when using the same access token.

## 4. Deploy

1. Click **Apply** in Render to create the service.
2. Render will run the build and start commands defined in the blueprint.
3. Once live, note the public URL (e.g. `https://customer-feedback-webhook.onrender.com`).

## 5. Smoke test the deployment

```bash
curl https://<your-app>.onrender.com/health

curl -X POST https://<your-app>.onrender.com/webhook/insights \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Secret: $WEBHOOK_SHARED_SECRET" \  # omit if not used
  -d '{
        "issueKey": "DISC-42",
        "body": "Testing the production deployment"
      }'
```

Expect a `201` response containing the created insight ID.

## 🔄 Alternative platforms

- **Fly.io / Railway / Heroku:** build with `npm install && npm run build`, start with `npm start`, and forward environment variables.
- **Containers (Docker/Kubernetes):** run `npm install`, `npm run build`, then execute `node dist/index.js`.

## 🔐 Operational tips

- Rotate the Atlassian access token regularly (the service treats the header as an opaque value).
- Consider running behind HTTPS and enabling the shared secret for webhook protection.
- Add observability (e.g. Render alerts, log drains) to track failures when calling Jira or the Polaris API.
