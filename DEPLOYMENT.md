# Deployment Guide

This guide covers deploying the Customer Feedback to Polaris Webhook Service to Render.

## 🚀 Render Deployment

### Prerequisites

1. **Render account** (sign up at [render.com](https://render.com))
2. **GitHub repository** with your code
3. **JIRA OAuth app** configured (see main README)

### Step 1: Prepare Your Repository

1. **Push your code** to GitHub:
   ```bash
   git add .
   git commit -m "Initial webhook service"
   git push origin main
   ```

2. **Verify all files** are included:
   - `package.json`
   - `server.js`
   - `polaris/` directory
   - `jira/` directory
   - `README.md`

### Step 2: Create Render Service

1. **Log into Render** dashboard
2. **Click "New +"** → **"Web Service"**
3. **Connect your GitHub repository**
4. **Configure the service**:
   - **Name**: `customer-feedback-polaris-webhook`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Choose appropriate plan (Free tier available)

### Step 3: Set Environment Variables

In the Render dashboard, go to **Environment** tab and add:

```bash
JIRA_CLIENT_ID=your_client_id_here
JIRA_CLIENT_SECRET=your_client_secret_here
JIRA_REDIRECT_URI=https://your-app.onrender.com
JIRA_CLOUD_HOST=https://your-site.atlassian.net
JIRA_PROJECT_KEY=PROJ
JIRA_AUTH_CODE=your_authorization_code_here
PORT=3000
NODE_ENV=production
```

**Important Notes:**
- Update `JIRA_REDIRECT_URI` to your Render app URL
- Get `JIRA_AUTH_CODE` by visiting your deployed app's `/auth/setup` endpoint

### Step 4: Deploy

1. **Click "Create Web Service"**
2. **Wait for deployment** to complete
3. **Note your app URL** (e.g., `https://customer-feedback-polaris-webhook.onrender.com`)

### Step 5: Complete OAuth Setup

1. **Visit your deployed app**: `https://your-app.onrender.com/auth/setup`
2. **Click the authorization URL**
3. **Complete OAuth flow**
4. **Copy the authorization code** from the redirect URL
5. **Update the `JIRA_AUTH_CODE`** environment variable in Render
6. **Redeploy** the service

### Step 6: Test the Webhook

1. **Test health endpoint**:
   ```bash
   curl https://your-app.onrender.com/health
   ```

2. **Test webhook endpoint**:
   ```bash
   curl -X POST https://your-app.onrender.com/webhook/feedback \
     -H "Content-Type: application/json" \
     -d '{
       "customer_name": "Test Customer",
       "issue_description": "Test feedback message",
       "priority": "medium"
     }'
   ```

## 🔧 Alternative Deployment Options

### Railway

1. **Install Railway CLI**: `npm install -g @railway/cli`
2. **Login**: `railway login`
3. **Initialize**: `railway init`
4. **Deploy**: `railway up`
5. **Set environment variables**: `railway variables set KEY=value`

### Heroku

1. **Install Heroku CLI**
2. **Create app**: `heroku create your-app-name`
3. **Deploy**: `git push heroku main`
4. **Set config vars**: `heroku config:set KEY=value`

### AWS Lambda + API Gateway

1. **Use Serverless Framework**
2. **Deploy**: `serverless deploy`
3. **Set environment variables** in AWS Lambda console

## 📊 Monitoring

### Render Dashboard

- **Logs**: View real-time logs in Render dashboard
- **Metrics**: Monitor CPU, memory, and response times
- **Alerts**: Set up alerts for failures

### Health Checks

- **Endpoint**: `GET /health`
- **Expected response**: `{"status": "healthy"}`
- **Use for**: Uptime monitoring, load balancer health checks

### Logs

Monitor these log messages:
- `✅ Successfully created Polaris insight`
- `❌ Error processing feedback`
- `🔄 Getting fresh OAuth token`
- `⚠️ OAuth setup required`

## 🔒 Security Considerations

### Environment Variables

- **Never commit** `.env` files
- **Use strong secrets** for OAuth credentials
- **Rotate tokens** regularly
- **Limit access** to environment variables

### Network Security

- **Use HTTPS** in production
- **Validate webhook signatures** (if needed)
- **Rate limit** webhook endpoints
- **Monitor for abuse**

### OAuth Security

- **Secure redirect URIs** (exact match required)
- **Regular token rotation**
- **Monitor token usage**
- **Revoke unused tokens**

## 🚨 Troubleshooting

### Common Issues

1. **Build failures**
   - Check Node.js version compatibility
   - Verify all dependencies in `package.json`
   - Check build logs in Render dashboard

2. **Runtime errors**
   - Verify environment variables are set
   - Check application logs
   - Ensure OAuth setup is complete

3. **Webhook failures**
   - Test webhook endpoint manually
   - Check Zapier configuration
   - Verify JIRA permissions

### Debug Steps

1. **Check logs** in Render dashboard
2. **Test endpoints** manually with curl
3. **Verify environment variables** are set correctly
4. **Check OAuth token** validity
5. **Test JIRA API access** directly

## 📈 Scaling

### Performance Optimization

- **Add Redis** for token storage
- **Implement caching** for JIRA API calls
- **Add connection pooling**
- **Optimize database queries** (if using database)

### High Availability

- **Multiple instances** (Render Pro plan)
- **Load balancing**
- **Health checks**
- **Automatic failover**

## 🔄 Updates and Maintenance

### Deploying Updates

1. **Push changes** to GitHub
2. **Render auto-deploys** (if enabled)
3. **Or manually deploy** from Render dashboard
4. **Test** the updated service

### Monitoring

- **Set up alerts** for failures
- **Monitor performance** metrics
- **Regular health checks**
- **Log analysis**

## 📞 Support

For deployment issues:
1. **Check Render documentation**
2. **Review application logs**
3. **Test locally** first
4. **Contact support** if needed
