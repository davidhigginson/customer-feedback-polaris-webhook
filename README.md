# Customer feedback → Jira Product Discovery webhook

This project exposes a simple HTTP endpoint that turns webhook payloads into Jira Product Discovery insights. Provide the Jira issue in the webhook body, and the service will format the payload into an ADF description, attach structured key/value data, and call the Polaris GraphQL API on your behalf.

## ✨ What you get

- **Single `/webhook/insights` endpoint** for accepting JSON payloads from any integration tool.
- **Automatic Jira lookups** – supply an `issueKey` or `issueId` and the service will resolve the project context.
- **Insight formatting helpers** that turn free-form feedback into an Atlassian Document Format (ADF) description and structured data chips.
- **Optional shared secret** header for locking down the webhook endpoint.

## 🧱 Architecture

```
┌────────────┐      POST JSON       ┌───────────────────────┐
│ Your app / │  ───────────────▶   │  Webhook server       │
│ automation │                     │  (Express + TypeScript) │
└────────────┘                     └────────┬──────────────┘
                                            │
                                            │ fetch REST API
                                            ▼
                                  ┌──────────────────────┐
                                  │ Jira REST API        │
                                  │  (issue context)     │
                                  └────────┬─────────────┘
                                            │
                                            │ GraphQL mutation
                                            ▼
                                  ┌──────────────────────┐
                                  │ Polaris GraphQL API  │
                                  │  (create insight)    │
                                  └──────────────────────┘
```

## 🚀 Getting started

The service can run locally or on [Render](https://render.com/) using the included `render.yaml` blueprint. The only difference
between the two environments is the base URL you call once the server is running.

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Create a `.env` file**
   ```bash
   cp env.template .env
   ```

3. **Fill in the required variables**
   ```dotenv
   ATLASSIAN_ACCESS_TOKEN=Bearer <oauth-access-token>
   ATLASSIAN_CLOUD_ID=<your-cloud-id>
   # Optional extras
   # DEFAULT_INSIGHT_SOURCE=feedback-form
   # WEBHOOK_SHARED_SECRET=super-secret
   ```

   - Use an OAuth 2.0 access token that has the scopes `read:jira-work`, `write:jira-work`, and `read:jira-user`.
   - Grab the cloud ID from `https://api.atlassian.com/oauth/token/accessible-resources`.

4. **Run the service locally**
   ```bash
   npm run dev
   # or
   npm run build && npm start
   ```

   Render automatically injects a `PORT` environment variable, so you do not need to configure one there. When running locally the
   server listens on port `3000` by default.

5. **Check it is alive**
   ```bash
   # Local
   curl http://localhost:3000/health

   # Render deployment (replace <your-app> with the actual service name)
   curl https://<your-app>.onrender.com/health
   ```

## 📮 Sending a webhook

POST JSON to `<BASE_URL>/webhook/insights`, where `BASE_URL` is either `http://localhost:3000` during local development or the
public Render URL (for example `https://customer-feedback-polaris-webhook.onrender.com`).

```http
POST /webhook/insights HTTP/1.1
Host: <your-app>.onrender.com
Content-Type: application/json
# Required when WEBHOOK_SHARED_SECRET is configured
# X-Webhook-Secret: super-secret
```

```json
{
  "issueKey": "DISC-42",
  "title": "Customers cannot sign in",
  "body": "Support received 12 complaints in the last 24 hours.\n\nPeople report a blank screen after submitting the form.",
  "source": "support-form",
  "submittedBy": {
    "name": "Jess K.",
    "email": "jess@example.com"
  },
  "timestamp": "2024-04-22T08:30:00Z",
  "data": {
    "customers_affected": 12,
    "segment": "Pro"
  },
  "tags": ["login", "incident"],
  "url": "https://support.example.com/tickets/123"
}
```

### What the service does with that payload

1. Looks up the Jira issue to fetch its numeric ID and project ID.
2. Builds a Polaris insight description (ADF) with headings + detail paragraphs.
3. Collects structured key/value pairs (`issueKey`, `source`, `timestamp`, custom data, etc.).
4. Executes the `createPolarisInsight` GraphQL mutation.
5. Responds with the new insight ID and issue metadata.

Successful response:

```json
{
  "success": true,
  "insightId": "c2ViLm9iamVjdC9wYWdlLzEyMy80NTY=",
  "issueKey": "DISC-42",
  "projectId": "10001"
}
```

If the payload is invalid you will receive a `400` response containing the validation errors. Authentication issues from Jira or the GraphQL API bubble up as `500` responses with an explanatory message.

## 🔐 Securing the webhook

Set `WEBHOOK_SHARED_SECRET` in your environment to force callers to supply the same value via the `X-Webhook-Secret` header. Requests with missing or incorrect secrets are rejected with `401`.

For production deployments you should also place the service behind HTTPS (e.g. Render, Fly.io, Vercel, etc.) and consider IP allow-lists or signed webhook payloads.

## 🧪 Development scripts

| Command         | Purpose                              |
| --------------- | ------------------------------------- |
| `npm run dev`   | Start the TypeScript server with reload |
| `npm run build` | Compile TypeScript to `dist/`          |
| `npm start`     | Run the compiled JavaScript            |
| `npm run lint`  | Lint the TypeScript source             |

## 🧰 Project structure

```
src/
  config.ts              // Environment loading & validation
  index.ts               // Express bootstrap
  routes/webhook.ts      // POST /webhook/insights handler
  schemas/webhook.ts     // Webhook payload validator and types
  services/jira.ts       // Issue lookups against the Jira REST API
  services/insights.ts   // Polaris GraphQL mutation
  utils/insightFormatter.ts // Builds ADF + data entries
```

## ☁️ Deploying to Render

- The repository ships with a [`render.yaml`](./render.yaml) blueprint that provisions the service with the correct build/start
  commands and a `/health` check so Render can mark the instance healthy.
- Follow the step-by-step instructions in [DEPLOYMENT.md](./DEPLOYMENT.md) to sync environment variables and apply the blueprint.
- Once deployed, use the Render-provided URL as the `BASE_URL` for all webhook calls and health checks.

## 🗺️ Extending the service

- Add your own mapping logic inside `utils/insightFormatter.ts` to control the generated ADF document.
- Introduce persistence or queueing if you need retries.
- Swap the authentication strategy (e.g. exchange refresh tokens) before calling Jira/Polaris.

## 🤝 Need help?

- [Jira Product Discovery REST docs](https://developer.atlassian.com/cloud/jira/product-discovery/)
- [Polaris GraphQL reference app](https://github.com/Jira-Product-Discovery-Integrations/polaris-forge-ref-app)

Feel free to open issues or pull requests with improvements!
