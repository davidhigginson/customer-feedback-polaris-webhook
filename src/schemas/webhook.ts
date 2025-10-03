import { z } from 'zod';

export const webhookPayloadSchema = z
  .object({
    issueKey: z.string().min(1, 'issueKey cannot be empty').optional(),
    issueId: z.string().min(1, 'issueId cannot be empty').optional(),
    title: z.string().optional(),
    summary: z.string().optional(),
    body: z.string().optional(),
    url: z.string().url().optional(),
    source: z.string().optional(),
    timestamp: z.union([z.string(), z.number(), z.date()]).optional(),
    submittedBy: z
      .object({
        name: z.string().optional(),
        email: z.string().email().optional(),
      })
      .optional(),
    data: z
      .record(z.union([z.string(), z.number(), z.boolean()]))
      .optional(),
    tags: z.array(z.string()).optional(),
    attachments: z
      .array(
        z.object({
          label: z.string(),
          url: z.string().url(),
        })
      )
      .optional(),
    insight: z
      .object({
        description: z.string().optional(),
        data: z
          .array(
            z.object({
              key: z.string(),
              value: z.string(),
            })
          )
          .optional(),
      })
      .optional(),
  })
  .passthrough()
  .superRefine((value, ctx) => {
    if (!value.issueKey && !value.issueId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Either issueKey or issueId must be supplied',
        path: ['issueKey'],
      });
    }
  });

export type WebhookPayload = z.infer<typeof webhookPayloadSchema>;
