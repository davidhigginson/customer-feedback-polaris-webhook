export interface SubmittedBy {
  name?: string;
  email?: string;
}

export interface Attachment {
  label: string;
  url: string;
}

export interface InsightDataItem {
  key: string;
  value: string;
}

export interface InsightBlock {
  description?: string;
  data?: InsightDataItem[];
}

export interface WebhookPayload {
  issueKey?: string;
  issueId?: string;
  title?: string;
  summary?: string;
  body?: string;
  url?: string;
  source?: string;
  timestamp?: string | number | Date;
  submittedBy?: SubmittedBy;
  data?: Record<string, string | number | boolean>;
  tags?: string[];
  attachments?: Attachment[];
  insight?: InsightBlock;
}

export interface ValidationIssue {
  path: string;
  message: string;
}

export type ValidationResult =
  | { success: true; data: WebhookPayload }
  | { success: false; errors: ValidationIssue[] };

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isStringRecord = (value: unknown): value is Record<string, unknown> => isPlainObject(value);

const isValidUrl = (value: string): boolean => {
  try {
    // eslint-disable-next-line no-new
    new URL(value);
    return true;
  } catch {
    return false;
  }
};

const isValidEmail = (value: string): boolean => /.+@.+\..+/.test(value);

export function validateWebhookPayload(input: unknown): ValidationResult {
  if (!isPlainObject(input)) {
    return { success: false, errors: [{ path: 'root', message: 'Expected an object payload' }] };
  }

  const errors: ValidationIssue[] = [];
  const result: WebhookPayload = {};

  const addError = (path: string, message: string) => {
    errors.push({ path, message });
  };

  const issueKeyValue = input.issueKey;
  const issueIdValue = input.issueId;

  if (issueKeyValue !== undefined) {
    if (typeof issueKeyValue !== 'string' || !issueKeyValue.trim()) {
      addError('issueKey', 'issueKey must be a non-empty string when provided');
    } else {
      result.issueKey = issueKeyValue.trim();
    }
  }

  if (issueIdValue !== undefined) {
    if (typeof issueIdValue !== 'string' || !issueIdValue.trim()) {
      addError('issueId', 'issueId must be a non-empty string when provided');
    } else {
      result.issueId = issueIdValue.trim();
    }
  }

  if (!result.issueKey && !result.issueId) {
    addError('issueKey', 'Either issueKey or issueId must be supplied');
  }

  const optionalStringFields: Array<keyof Pick<WebhookPayload, 'title' | 'summary' | 'body' | 'source'>> = [
    'title',
    'summary',
    'body',
    'source',
  ];

  optionalStringFields.forEach((field) => {
    const value = (input as Record<string, unknown>)[field as string];
    if (value === undefined) {
      return;
    }
    if (typeof value !== 'string') {
      addError(String(field), `${String(field)} must be a string`);
      return;
    }
    result[field] = value;
  });

  if (input.url !== undefined) {
    if (typeof input.url !== 'string') {
      addError('url', 'url must be a string');
    } else if (!isValidUrl(input.url)) {
      addError('url', 'url must be a valid URL');
    } else {
      result.url = input.url;
    }
  }

  if (input.timestamp !== undefined) {
    const timestamp = input.timestamp;
    if (
      typeof timestamp === 'string' ||
      typeof timestamp === 'number' ||
      timestamp instanceof Date
    ) {
      result.timestamp = timestamp;
    } else {
      addError('timestamp', 'timestamp must be a string, number, or Date');
    }
  }

  if (input.submittedBy !== undefined) {
    if (!isPlainObject(input.submittedBy)) {
      addError('submittedBy', 'submittedBy must be an object');
    } else {
      const submitted: SubmittedBy = {};
      if (input.submittedBy.name !== undefined) {
        if (typeof input.submittedBy.name !== 'string') {
          addError('submittedBy.name', 'submittedBy.name must be a string');
        } else {
          submitted.name = input.submittedBy.name;
        }
      }
      if (input.submittedBy.email !== undefined) {
        if (typeof input.submittedBy.email !== 'string') {
          addError('submittedBy.email', 'submittedBy.email must be a string');
        } else if (!isValidEmail(input.submittedBy.email)) {
          addError('submittedBy.email', 'submittedBy.email must be a valid email address');
        } else {
          submitted.email = input.submittedBy.email;
        }
      }
      if (Object.keys(submitted).length) {
        result.submittedBy = submitted;
      }
    }
  }

  if (input.data !== undefined) {
    if (!isStringRecord(input.data)) {
      addError('data', 'data must be an object of key/value pairs');
    } else {
      const record: Record<string, string | number | boolean> = {};
      Object.entries(input.data).forEach(([key, value]) => {
        if (
          typeof value === 'string' ||
          typeof value === 'number' ||
          typeof value === 'boolean'
        ) {
          record[key] = value;
        } else if (value !== undefined && value !== null) {
          addError(`data.${key}`, 'Data values must be strings, numbers, or booleans');
        }
      });
      if (Object.keys(record).length) {
        result.data = record;
      }
    }
  }

  if (input.tags !== undefined) {
    if (!Array.isArray(input.tags)) {
      addError('tags', 'tags must be an array of strings');
    } else if (!input.tags.every((tag) => typeof tag === 'string')) {
      addError('tags', 'tags must contain only strings');
    } else {
      result.tags = input.tags as string[];
    }
  }

  if (input.attachments !== undefined) {
    if (!Array.isArray(input.attachments)) {
      addError('attachments', 'attachments must be an array of objects');
    } else {
      const attachments: Attachment[] = [];
      input.attachments.forEach((attachment, index) => {
        if (!isPlainObject(attachment)) {
          addError(`attachments[${index}]`, 'Each attachment must be an object');
          return;
        }
        const { label, url } = attachment;
        if (typeof label !== 'string' || !label.trim()) {
          addError(`attachments[${index}].label`, 'Attachment label must be a non-empty string');
        }
        if (typeof url !== 'string' || !isValidUrl(url)) {
          addError(`attachments[${index}].url`, 'Attachment url must be a valid URL');
        }
        if (typeof label === 'string' && label.trim() && typeof url === 'string' && isValidUrl(url)) {
          attachments.push({ label: label.trim(), url });
        }
      });
      if (attachments.length) {
        result.attachments = attachments;
      }
    }
  }

  if (input.insight !== undefined) {
    if (!isPlainObject(input.insight)) {
      addError('insight', 'insight must be an object');
    } else {
      const block: InsightBlock = {};
      if (input.insight.description !== undefined) {
        if (typeof input.insight.description !== 'string') {
          addError('insight.description', 'insight.description must be a string');
        } else {
          block.description = input.insight.description;
        }
      }
      if (input.insight.data !== undefined) {
        if (!Array.isArray(input.insight.data)) {
          addError('insight.data', 'insight.data must be an array');
        } else {
          const insightData: InsightDataItem[] = [];
          input.insight.data.forEach((item, index) => {
            if (!isPlainObject(item)) {
              addError(`insight.data[${index}]`, 'insight.data items must be objects');
              return;
            }
            if (typeof item.key !== 'string' || !item.key.trim()) {
              addError(`insight.data[${index}].key`, 'key must be a non-empty string');
            }
            if (typeof item.value !== 'string' || !item.value.trim()) {
              addError(`insight.data[${index}].value`, 'value must be a non-empty string');
            }
            if (
              typeof item.key === 'string' &&
              item.key.trim() &&
              typeof item.value === 'string' &&
              item.value.trim()
            ) {
              insightData.push({ key: item.key.trim(), value: item.value });
            }
          });
          if (insightData.length) {
            block.data = insightData;
          }
        }
      }
      if (Object.keys(block).length) {
        result.insight = block;
      }
    }
  }

  return errors.length ? { success: false, errors } : { success: true, data: result };
}
