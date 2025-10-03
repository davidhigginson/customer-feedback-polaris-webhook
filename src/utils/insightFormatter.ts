import type { IssueContext } from '../services/jira.js';
import type { InsightDataEntry } from '../services/insights.js';
import type { Attachment, InsightDataItem, WebhookPayload } from '../schemas/webhook.js';
import config from '../config.js';

type AdfNode = Record<string, unknown>;

const createTextNode = (text: string): AdfNode => ({
  type: 'text',
  text,
});

const createParagraph = (text: string): AdfNode => ({
  type: 'paragraph',
  content: [createTextNode(text)],
});

const normaliseTimestamp = (value: WebhookPayload['timestamp']): string | undefined => {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === 'number') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value.toString() : date.toISOString();
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
};

export const buildInsightDescription = (
  payload: WebhookPayload,
  issue: IssueContext
): AdfNode => {
  const content: AdfNode[] = [];
  const headingText = payload.title ?? payload.summary ?? `Feedback received for ${issue.key}`;

  content.push({
    type: 'heading',
    attrs: { level: 3 },
    content: [createTextNode(headingText)],
  });

  if (payload.body) {
    payload.body
      .split(/\n{2,}/)
      .map((paragraph: string) => paragraph.trim())
      .filter(Boolean)
      .forEach((paragraph: string) => {
        content.push(createParagraph(paragraph));
      });
  }

  if (payload.insight?.description) {
    payload.insight.description
      .split(/\n{2,}/)
      .map((paragraph: string) => paragraph.trim())
      .filter(Boolean)
      .forEach((paragraph: string) => {
        content.push(createParagraph(paragraph));
      });
  }

  const detailItems: string[] = [];

  detailItems.push(`Issue: ${issue.key} — ${issue.summary}`);

  if (payload.source ?? config.defaultInsightSource) {
    detailItems.push(`Source: ${payload.source ?? config.defaultInsightSource}`);
  }

  if (payload.submittedBy?.name) {
    detailItems.push(`Submitted by: ${payload.submittedBy.name}`);
  }

  if (payload.submittedBy?.email) {
    detailItems.push(`Contact: ${payload.submittedBy.email}`);
  }

  const timestamp = normaliseTimestamp(payload.timestamp);
  if (timestamp) {
    detailItems.push(`Received: ${timestamp}`);
  }

  if (payload.url) {
    detailItems.push(`More context: ${payload.url}`);
  }

  if (payload.tags?.length) {
    detailItems.push(`Tags: ${payload.tags.join(', ')}`);
  }

  if (payload.attachments?.length) {
    payload.attachments.forEach((attachment: Attachment) => {
      detailItems.push(`Attachment: ${attachment.label} (${attachment.url})`);
    });
  }

  detailItems.forEach((line) => {
    content.push(createParagraph(line));
  });

  if (content.length === 1) {
    content.push(createParagraph('No additional context was provided.'));
  }

  return {
    version: 1,
    type: 'doc',
    content,
  };
};

export const buildInsightData = (
  payload: WebhookPayload,
  issue: IssueContext
): InsightDataEntry[] => {
  const entries = new Map<string, string>();

  const addEntry = (key: string, value?: string) => {
    if (!value) {
      return;
    }
    entries.set(key, value);
  };

  addEntry('issueKey', issue.key);
  addEntry('issueSummary', issue.summary);
  addEntry('source', payload.source ?? config.defaultInsightSource);

  const timestamp = normaliseTimestamp(payload.timestamp);
  addEntry('timestamp', timestamp);

  if (payload.submittedBy?.name) {
    addEntry('submittedBy', payload.submittedBy.name);
  }
  if (payload.submittedBy?.email) {
    addEntry('submittedByEmail', payload.submittedBy.email);
  }

  if (payload.url) {
    addEntry('url', payload.url);
  }

  if (payload.tags?.length) {
    addEntry('tags', payload.tags.join(', '));
  }

  if (payload.data) {
    Object.entries(payload.data).forEach(([key, value]) => {
      addEntry(key, String(value));
    });
  }

  if (payload.insight?.data) {
    payload.insight.data.forEach(({ key, value }: InsightDataItem) => addEntry(key, value));
  }

  return Array.from(entries.entries()).map(([key, value]) => ({ key, value }));
};
