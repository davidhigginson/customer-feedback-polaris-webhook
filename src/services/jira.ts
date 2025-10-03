import fetch from 'node-fetch';
import config from '../config.js';

export interface IssueContext {
  id: string;
  key: string;
  projectId: string;
  summary: string;
}

const ISSUE_FIELDS = 'summary,project';

type IssueLookup = {
  issueId?: string;
  issueKey?: string;
};

export async function fetchIssueContext({
  issueId,
  issueKey,
}: IssueLookup): Promise<IssueContext> {
  if (!issueId && !issueKey) {
    throw new Error('Either issueId or issueKey must be provided to fetch the Jira issue');
  }

  const identifier = issueId ?? encodeURIComponent(issueKey ?? '');
  const baseUrl = `${config.atlBaseUrl}/ex/jira/${config.cloudId}/rest/api/3/issue/${identifier}`;
  const url = `${baseUrl}?fields=${ISSUE_FIELDS}`;

  const response = await fetch(url, {
    headers: {
      Authorization: config.authorizationHeader,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  });

  if (response.status === 404) {
    throw new Error(`Issue not found in Jira (searched for ${issueKey ?? issueId})`);
  }

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Failed to fetch issue: ${response.status} ${response.statusText} - ${body}`);
  }

  const payload = (await response.json()) as {
    id: string;
    key: string;
    fields: { summary: string; project: { id: string } };
  };

  return {
    id: payload.id,
    key: payload.key,
    summary: payload.fields.summary,
    projectId: payload.fields.project.id,
  };
}
