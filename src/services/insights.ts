import fetch from 'node-fetch';
import config from '../config.js';

export interface InsightDataEntry {
  key: string;
  value: string;
}

export interface CreateInsightArgs {
  cloudId: string;
  projectId: string;
  issueId: string;
  descriptionAdf: unknown;
  data?: InsightDataEntry[];
}

interface GraphQLError {
  message: string;
}

interface CreateInsightResponse {
  data?: {
    createPolarisInsight?: {
      success: boolean;
      errors?: GraphQLError[];
      node?: {
        id: string;
      };
    };
  };
  errors?: GraphQLError[];
}

const CREATE_INSIGHT_MUTATION = `
  mutation CreateInsight($input: CreatePolarisInsightInput!) {
    createPolarisInsight(input: $input) {
      success
      errors {
        message
      }
      node {
        id
      }
    }
  }
`;

export async function createInsight(args: CreateInsightArgs): Promise<string> {
  const response = await fetch(config.atlGraphqlUrl, {
    method: 'POST',
    headers: {
      Authorization: config.authorizationHeader,
      'Content-Type': 'application/json',
      'X-ExperimentalApi': 'polaris-v0',
    },
    body: JSON.stringify({
      query: CREATE_INSIGHT_MUTATION,
      variables: {
        input: {
          cloudId: args.cloudId,
          projectId: args.projectId,
          issueId: args.issueId,
          descriptionAdf: args.descriptionAdf,
          data: args.data,
        },
      },
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to call Polaris GraphQL API: ${response.status} ${response.statusText} - ${text}`);
  }

  const payload = (await response.json()) as CreateInsightResponse;

  if (payload.errors?.length) {
    throw new Error(`Polaris GraphQL errors: ${payload.errors.map((error) => error.message).join(', ')}`);
  }

  const result = payload.data?.createPolarisInsight;
  if (!result?.success || !result.node?.id) {
    const errorMessages = result?.errors?.map((error) => error.message).join(', ');
    throw new Error(`Failed to create insight${errorMessages ? `: ${errorMessages}` : ''}`);
  }

  return result.node.id;
}
