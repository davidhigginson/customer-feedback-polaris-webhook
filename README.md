# Customer Feedback to Polaris Webhook Service

A webhook service that receives customer feedback from Zapier and automatically creates insights in JIRA Polaris.

## 🎯 Overview

This service acts as a bridge between your customer feedback collection tools (via Zapier) and JIRA Polaris, automatically creating insights from customer feedback data.

## 🚀 Features

- **Webhook endpoint** for receiving feedback from Zapier
- **OAuth 2.0 integration** with JIRA
- **Automatic token management** with refresh capabilities
- **Polaris insight creation** with structured data
- **Health monitoring** endpoints
- **Error handling** and logging
- **CORS support** for web requests

## 📋 Prerequisites

1. **JIRA Cloud site** with Polaris enabled
2. **Atlassian OAuth 2.0 app** (3LO app)
3. **Node.js 18+** installed
4. **Zapier account** (for triggering webhooks)

## 🔧 Setup

### 1. Create Atlassian OAuth App

1. Go to [Atlassian Developer Console](https://developer.atlassian.com/console/myapps/create-3lo-app/)
2. Create a new **3LO (3-Legged OAuth) app**
3. Go to **Permissions** tab and add **Jira platform REST API** with these scopes:
   - `read:jira-user`
   - `read:jira-work` 
   - `write:jira-work`
4. Go to **Authorization** tab and set **Callback URL** to `http://localhost:3000`
5. Copy the **Client ID** and **Client Secret** from the **Settings** tab

### 2. Clone and Install

```bash
git clone <your-repo-url>
cd customer-feedback-polaris-webhook
npm install
```

### 3. Environment Configuration

Copy the environment template:
```bash
cp env.template .env
```

Edit `.env` with your configuration:
```bash
# JIRA OAuth Configuration
JIRA_CLIENT_ID=your_client_id_here
JIRA_CLIENT_SECRET=your_client_secret_here
# Optional: override the detected base URL when running behind a proxy (Render sets this automatically)
JIRA_REDIRECT_URI=http://localhost:3000
JIRA_AUTH_CODE=your_authorization_code_here
JIRA_REFRESH_TOKEN=your_refresh_token_here # optional: set after completing OAuth flow

# JIRA Site Configuration
JIRA_CLOUD_HOST=https://your-site.atlassian.net
JIRA_PROJECT_KEY=PROJ

# Server Configuration
PORT=3000
NODE_ENV=production
```

### 4. OAuth Setup

1. Start the service:
   ```bash
   npm start
   ```

2. Visit the auth setup endpoint:
   ```
   http://localhost:3000/auth/setup
   ```

3. Click the authorization URL and complete OAuth flow

4. The server will exchange the code for tokens and respond with setup details (look for `refreshTokenValue` in the JSON response)

5. Copy the **refresh token** from the JSON response (or logs) and add it to your environment as `JIRA_REFRESH_TOKEN`

6. (Optional) Remove `JIRA_AUTH_CODE` once the refresh token is stored. Future refreshes use the long-lived refresh token.

7. Restart the service

### 5. Deploy to Render

1. **Create a `production` branch** in your repo and push it to GitHub. Render will auto-deploy from this branch using the provided `render.yaml` blueprint.
2. **Connect your GitHub repo** to Render and let it detect the blueprint
3. **Set environment variables** in Render dashboard:
   - `JIRA_CLIENT_ID`
   - `JIRA_CLIENT_SECRET`
   - `JIRA_CLOUD_HOST`
   - `JIRA_PROJECT_KEY`
   - `JIRA_AUTH_CODE` (only needed the first time you authorize)
   - `JIRA_REFRESH_TOKEN` (required after completing OAuth setup)
    - `JIRA_REDIRECT_URI` (optional — defaults to Render's `RENDER_EXTERNAL_URL`)
4. **Deploy**

> ℹ️ The `render.yaml` blueprint provisions a single Node web service on the Free plan. Adjust the plan or add additional services as needed before confirming the deployment in Render.

Once the service is created, Render automatically deploys every push to the `production` branch.

## 🔗 Zapier Configuration

### Webhook Setup

1. **Create a new Zap**
2. **Choose your trigger** (form, email, etc.)
3. **Add action**: **Webhooks by Zapier** → **POST**
4. **Configure webhook**:
   - **URL**: `https://your-app.onrender.com/webhook/feedback`
   - **Method**: `POST`
   - **Headers**: `Content-Type: application/json`
   - **Payload**:
     ```json
     {
       "summary": "{{summary}}",
       "description": "{{description}}",
       "created_by": "{{created_by}}",
       "impact": "{{impact}}",
       "customer_name": "{{customer_name}}",
       "priority": "{{priority}}",
       "email": "{{email}}",
       "timestamp": "{{timestamp}}"
     }
     ```

### Required Fields

- `summary` (required) - Issue title/summary
- `description` (required) - Issue description

### Optional Fields

- `issue_key` - Existing JIRA issue key (if not provided, creates new issue)
- `created_by` - Who created the issue
- `impact` - Impact number (1-10 scale)
- `customer_name` - Customer name
- `priority` (default: "medium")
- `email` - Customer email
- `timestamp` - When the feedback was received
- `source` (default: "zapier")

## 📡 API Endpoints

### `POST /webhook/feedback`
Main webhook endpoint for receiving feedback from Zapier.

**Request Body:**
```json
{
  "summary": "Login process is too slow",
  "description": "Customers are experiencing delays when logging in",
  "created_by": "John Doe",
  "impact": 8,
  "customer_name": "Jane Smith",
  "priority": "high",
  "email": "jane@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "insightId": "insight_123",
  "issueKey": "PROJ-456",
  "issueUrl": "https://your-site.atlassian.net/browse/PROJ-456",
  "message": "Feedback processed and sent to Polaris successfully",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### `GET /health`
Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "version": "1.0.0"
}
```

### `GET /auth/setup`
OAuth setup instructions and authorization URL.

## 🐛 Troubleshooting

### Common Issues

1. **"No authorization code found"**
   - Complete the OAuth setup process
   - Visit `/auth/setup` for instructions

2. **"No accessible resource found"**
   - Check that `JIRA_CLOUD_HOST` matches your JIRA site URL exactly
   - Ensure your OAuth app has access to the JIRA site

3. **"Failed to get issue"**
   - Verify `JIRA_PROJECT_KEY` exists and you have access to it
   - Check that the issue key format is correct (e.g., "PROJ-123")

4. **"Invalid JIRA token format"**
   - The service automatically handles token formatting
   - Check that your OAuth credentials are correct

### Logs

Check the service logs for detailed error messages:
```bash
# Local development
npm start

# Render deployment
# Check logs in Render dashboard
```

## 🔒 Security

- **Environment variables** for sensitive data
- **OAuth 2.0** for secure JIRA authentication
- **CORS** enabled for web requests
- **Input validation** for webhook data
- **Error handling** to prevent data leaks

## 📊 Monitoring

The service includes:
- **Health check endpoint** for monitoring
- **Structured logging** for debugging
- **Error tracking** and reporting
- **Token expiration** handling

## 🚀 Production Considerations

1. **Use Redis** for token storage instead of memory
2. **Add rate limiting** for webhook endpoints
3. **Implement proper logging** (Winston, etc.)
4. **Add monitoring** (Sentry, DataDog, etc.)
5. **Set up alerts** for failures
6. **Use HTTPS** in production

## 📝 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📞 Support

For issues and questions:
1. Check the troubleshooting section
2. Review the logs
3. Open an issue in the repository
