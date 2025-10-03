import express, { Request, Response, NextFunction } from 'express';
import config from './config.js';
import { webhookRouter } from './routes/webhook.js';

const app = express();

app.use(express.json({ limit: '1mb' }));

app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'customer-feedback-polaris-webhook',
    timestamp: new Date().toISOString(),
  });
});

app.use('/webhook', webhookRouter);

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((error: Error & { status?: number }, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled error', error);
  const status = error.status && Number.isInteger(error.status) ? error.status : 500;
  res.status(status).json({
    error: status === 500 ? 'Internal server error' : error.message,
    message: error.message,
  });
});

app.listen(config.port, () => {
  console.log(`🚀 Webhook server listening on port ${config.port}`);
});
