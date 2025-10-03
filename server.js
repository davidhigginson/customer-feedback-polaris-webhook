const express = require('express');
const cors = require('cors');
const { createInsight } = require('./polaris/createInsight');
const { getAccessToken } = require('./jira/accessToken');
const { getAccessibleResources } = require('./jira/accessibleResources');
const { getIssue } = require('./jira/issue');
const { createIssue } = require('./jira/createIssue');
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
  projectKey: process.env.JIRA_PROJECT_KEY, // e.g., PROJ (project key for creating issues)
  authCode: process.env.JIRA_AUTH_CODE, // Get this from OAuth flow
};

// Validate required environment variables
const requiredEnvVars = ['JIRA_CLIENT_ID', 'JIRA_CLIENT_SECRET', 'JIRA_CLOUD_HOST', 'JIRA_PROJECT_KEY'];
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


// Auth setup endpoint - helps with OAuth flow
app.get('/auth/setup', (req, res) => {
  const authUrl = `https://auth.atlassian.com/authorize?audience=api.atlassian.com&client_id=${config.clientId}&scope=${encodeURIComponent('read:jira-user read:jira-work write:jira-work')}&redirect_uri=${encodeURIComponent(config.redirectUri)}&state=&response_type=code&prompt=consent`;
  
  res.json({
    message: 'OAuth setup required',
    authUrl: authUrl,
    instructions: [
      '1. Click the authUrl above to authorize the app',
      '2. The authorization code will be automatically processed',
      '3. Check the server logs for success/error messages'
    ]
  });
});

// OAuth callback handler - receives authorization code from JIRA
app.get('/', async (req, res) => {
  const { code, error } = req.query;
  
  if (error) {
    console.error('❌ OAuth error:', error);
    return res.status(400).json({
      success: false,
      error: `OAuth error: ${error}`,
      message: 'Please try the authorization flow again'
    });
  }
  
  if (!code) {
    return res.json({
      message: 'Customer Feedback to Polaris Webhook Service',
      version: '1.0.0',
      endpoints: {
        webhook: '/webhook/feedback',
        health: '/health',
        auth: '/auth/setup'
      },
      status: 'running'
    });
  }
  
  try {
    console.log('🔄 Processing authorization code...');
    
    // Exchange authorization code for access token
    const tokenData = await getAccessToken(
      config.clientId,
      config.clientSecret,
      config.redirectUri,
      code
    );
    
    // Store tokens
    accessToken = tokenData.access_token;
    refreshToken = tokenData.refresh_token;
    tokenExpiresAt = Date.now() + (tokenData.expires_in * 1000);
    
    console.log('✅ OAuth setup completed successfully!');
    console.log('🔑 Access token obtained');
    
    res.json({
      success: true,
      message: 'OAuth setup completed successfully!',
      details: {
        accessToken: accessToken ? 'Obtained' : 'Failed',
        expiresAt: new Date(tokenExpiresAt).toISOString(),
        nextSteps: [
          'Your webhook is now ready to receive requests',
          'Test the webhook endpoint: POST /webhook/feedback',
          'Check health: GET /health'
        ]
      }
    });
    
  } catch (error) {
    console.error('❌ Error processing authorization code:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to process authorization code. Please try again.'
    });
  }
});

// Main webhook endpoint for Zapier
app.post('/webhook/feedback', async (req, res) => {
  try {
    console.log('📨 Received feedback from Zapier:', JSON.stringify(req.body, null, 2));
    
    const { 
      issue_key,
      summary,
      description,
      created_by,
      impact,
      customer_name,
      priority = 'medium',
      source = 'zapier',
      email,
      timestamp
    } = req.body;
    
    // Validate required fields
    if (!summary || !description) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: summary and description are required' 
      });
    }
    
    // Get or refresh OAuth token
    await ensureValidToken();
    
    // Get cloud ID
    const cloudId = await getCloudId();
    
    let issueKey, issueId, projectId;
    
    if (issue_key) {
      // Use existing issue
      console.log('🔍 Using existing issue:', issue_key);
      const issue = await getIssue(accessToken, cloudId, issue_key);
      issueKey = issue_key;
      issueId = issue.id;
      projectId = issue.fields.project.id;
    } else {
      // Create new issue
      console.log('🆕 Creating new JIRA issue...');
      const issueData = {
        summary,
        description,
        createdBy: created_by,
        impact: impact ? parseInt(impact) : null
      };
      
      const newIssue = await createIssue(accessToken, cloudId, config.projectKey, issueData);
      issueKey = newIssue.issueKey;
      issueId = newIssue.issueId;
      
      // Get project ID from the created issue
      const issue = await getIssue(accessToken, cloudId, issueKey);
      projectId = issue.fields.project.id;
      
      console.log('✅ Created JIRA issue:', issueKey);
    }
    
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
              text: `Issue: ${summary}\nDescription: ${description}${created_by ? `\nCreated by: ${created_by}` : ''}${impact ? `\nImpact: ${impact}` : ''}${customer_name ? `\nCustomer: ${customer_name}` : ''}${priority ? `\nPriority: ${priority}` : ''}${email ? `\nEmail: ${email}` : ''}${timestamp ? `\nTimestamp: ${timestamp}` : ''}`
            }]
          }]
        },
        data: [
          { key: "issue_key", value: issueKey },
          { key: "summary", value: summary },
          { key: "description", value: description },
          ...(created_by ? [{ key: "created_by", value: created_by }] : []),
          ...(impact ? [{ key: "impact", value: impact.toString() }] : []),
          ...(customer_name ? [{ key: "customer_name", value: customer_name }] : []),
          ...(priority ? [{ key: "priority", value: priority }] : []),
          ...(email ? [{ key: "email", value: email }] : []),
          ...(timestamp ? [{ key: "timestamp", value: timestamp }] : []),
          { key: "source", value: source }
        ]
      }
    });
    
    console.log('✅ Successfully created Polaris insight:', insightId);
    
    res.json({ 
      success: true, 
      insightId,
      issueKey,
      issueUrl: `${config.cloudHost}/browse/${issueKey}`,
      message: 'Feedback processed and sent to Polaris successfully',
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

// Get JIRA cloud ID
async function getCloudId() {
  // Get accessible resources to find cloud ID
  const accessibleResources = await getAccessibleResources(accessToken);
  const cloudResource = accessibleResources.find(resource => resource.url === config.cloudHost);
  
  if (!cloudResource) {
    throw new Error(`No accessible resource found for host: ${config.cloudHost}`);
  }
  
  return cloudResource.id;
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
