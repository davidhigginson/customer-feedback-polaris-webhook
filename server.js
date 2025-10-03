const express = require('express');
const cors = require('cors');
const { createInsight } = require('./polaris/createInsight');
const { getAccessToken } = require('./jira/accessToken');
const { getAccessibleResources } = require('./jira/accessibleResources');
const { getIssue } = require('./jira/issue');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Store OAuth tokens (use Redis in production for persistence)
let accessToken = null;
let refreshToken = null;
let tokenExpiresAt = null;

// Configuration from environment variables
const config = {
  clientId: process.env.JIRA_CLIENT_ID,
  clientSecret: process.env.JIRA_CLIENT_SECRET,
  redirectUri: process.env.JIRA_REDIRECT_URI || 'http://localhost:3000',
  cloudHost: process.env.JIRA_CLOUD_HOST, // e.g., https://your-site.atlassian.net
  issueKey: process.env.JIRA_ISSUE_KEY, // e.g., PROJ-123
  authCode: process.env.JIRA_AUTH_CODE, // Get this from OAuth flow
};

// Validate required environment variables
const requiredEnvVars = ['JIRA_CLIENT_ID', 'JIRA_CLIENT_SECRET', 'JIRA_CLOUD_HOST', 'JIRA_ISSUE_KEY'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingEnvVars.join(', '));
  console.error('Please check your .env file or environment configuration.');
  process.exit(1);
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Customer Feedback to Polaris Webhook Service',
    version: '1.0.0',
    endpoints: {
      webhook: '/webhook/feedback',
      health: '/health',
      auth: '/auth/setup'
    },
    status: 'running'
  });
});

// Auth setup endpoint - helps with OAuth flow
app.get('/auth/setup', (req, res) => {
  const authUrl = `https://auth.atlassian.com/authorize?audience=api.atlassian.com&client_id=${config.clientId}&scope=${encodeURIComponent('read:jira-user read:jira-work write:jira-work')}&redirect_uri=${encodeURIComponent(config.redirectUri)}&state=&response_type=code&prompt=consent`;
  
  res.json({
    message: 'OAuth setup required',
    authUrl: authUrl,
    instructions: [
      '1. Click the authUrl above to authorize the app',
      '2. Copy the authorization code from the redirect URL',
      '3. Set JIRA_AUTH_CODE environment variable with the code',
      '4. Restart the service'
    ]
  });
});

// Main webhook endpoint for Zapier
app.post('/webhook/feedback', async (req, res) => {
  try {
    console.log('📨 Received feedback from Zapier:', JSON.stringify(req.body, null, 2));
    
    const { 
      customer_name, 
      issue_description, 
      priority = 'medium',
      source = 'zapier',
      email,
      timestamp
    } = req.body;
    
    // Validate required fields
    if (!customer_name || !issue_description) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: customer_name and issue_description are required' 
      });
    }
    
    // Get or refresh OAuth token
    await ensureValidToken();
    
    // Get cloud ID and issue details
    const { cloudId, projectId, issueId } = await getJiraDetails();
    
    // Create Polaris insight
    const insightId = await createInsight(accessToken, {
      input: {
        cloudId: cloudId,
        projectId: projectId,
        issueId: issueId,
        descriptionAdf: {
          version: 1,
          type: "doc",
          content: [{
            type: "paragraph",
            content: [{
              type: "text",
              text: `Customer: ${customer_name}\nIssue: ${issue_description}\nPriority: ${priority}${email ? `\nEmail: ${email}` : ''}${timestamp ? `\nTimestamp: ${timestamp}` : ''}`
            }]
          }]
        },
        data: [
          { key: "customer_name", value: customer_name },
          { key: "issue_description", value: issue_description },
          { key: "priority", value: priority },
          { key: "source", value: source },
          ...(email ? [{ key: "email", value: email }] : []),
          ...(timestamp ? [{ key: "timestamp", value: timestamp }] : [])
        ]
      }
    });
    
    console.log('✅ Successfully created Polaris insight:', insightId);
    
    res.json({ 
      success: true, 
      insightId,
      message: 'Feedback sent to Polaris successfully',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error processing feedback:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Ensure we have a valid OAuth token
async function ensureValidToken() {
  if (!accessToken || !tokenExpiresAt || Date.now() >= tokenExpiresAt) {
    console.log('🔄 Getting fresh OAuth token...');
    
    if (!config.authCode) {
      throw new Error('No authorization code found. Please complete OAuth setup first. Visit /auth/setup for instructions.');
    }
    
    const tokenData = await getAccessToken(
      config.clientId,
      config.clientSecret,
      config.redirectUri,
      config.authCode
    );
    
    accessToken = tokenData.access_token;
    refreshToken = tokenData.refresh_token;
    tokenExpiresAt = Date.now() + (tokenData.expires_in * 1000);
    
    console.log('✅ OAuth token obtained successfully');
  }
}

// Get JIRA cloud ID and issue details
async function getJiraDetails() {
  // Get accessible resources to find cloud ID
  const accessibleResources = await getAccessibleResources(accessToken);
  const cloudResource = accessibleResources.find(resource => resource.url === config.cloudHost);
  
  if (!cloudResource) {
    throw new Error(`No accessible resource found for host: ${config.cloudHost}`);
  }
  
  const cloudId = cloudResource.id;
  
  // Get issue details
  const issue = await getIssue(accessToken, cloudId, config.issueKey);
  
  return {
    cloudId: cloudId,
    projectId: issue.fields.project.id,
    issueId: issue.id
  };
}

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('💥 Unhandled error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    timestamp: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('🚀 Customer Feedback to Polaris Webhook Service started');
  console.log(`📍 Server running on port ${PORT}`);
  console.log(`🔗 Webhook endpoint: http://localhost:${PORT}/webhook/feedback`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  console.log(`🔐 Auth setup: http://localhost:${PORT}/auth/setup`);
  
  if (!config.authCode) {
    console.log('⚠️  OAuth setup required. Visit /auth/setup for instructions.');
  }
});
