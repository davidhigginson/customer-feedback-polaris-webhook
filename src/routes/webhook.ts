import { Router, Request, Response, NextFunction } from 'express';
import config from '../config.js';
import { webhookPayloadSchema } from '../schemas/webhook.js';
import { fetchIssueContext } from '../services/jira.js';
import { buildInsightData, buildInsightDescription } from '../utils/insightFormatter.js';
import { createInsight } from '../services/insights.js';

export const webhookRouter = Router();

const verifySecret = (req: Request): void => {
  if (!config.webhookSecret) {
    return;
  }
  const provided = req.headers['x-webhook-secret'];
  if (typeof provided !== 'string' || provided !== config.webhookSecret) {
    throw Object.assign(new Error('Invalid webhook secret'), { status: 401 });
  }
};

webhookRouter.post(
  '/insights',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      verifySecret(req);

      const parsed = webhookPayloadSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          error: 'Invalid payload',
          details: parsed.error.flatten(),
        });
        return;
      }

      const payload = parsed.data;
      const issue = await fetchIssueContext({
        issueId: payload.issueId,
        issueKey: payload.issueKey,
      });

      console.log(`📥 Incoming insight payload for ${issue.key}`);

      const descriptionAdf = buildInsightDescription(payload, issue);
      const data = buildInsightData(payload, issue);

      const insightId = await createInsight({
        cloudId: config.cloudId,
        projectId: issue.projectId,
        issueId: issue.id,
        descriptionAdf,
        data,
      });

      console.log(`✅ Created insight ${insightId} for ${issue.key}`);

      res.status(201).json({
        success: true,
        insightId,
        issueKey: issue.key,
        projectId: issue.projectId,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default webhookRouter;
