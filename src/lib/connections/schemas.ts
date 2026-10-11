import { z } from "zod";

export const authKindSchema = z.enum([
  "none",
  "apiKeyHeader",
  "bearer",
  "basic",
]);

export const datasetRequestSchema = z.object({
  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]).default("GET"),
  path: z.string().min(1),
  query: z.record(z.string(), z.string()).optional(),
  headers: z.record(z.string(), z.string()).optional(),
  body: z.unknown().optional(),
  rowsPath: z.string().optional(),
});

export const connectionTestSchema = z.object({
  baseUrl: z.string().url(),
  auth: authKindSchema,
  apiKeyHeader: z.string().optional(),
  secret: z.string().optional(),
  basicUsername: z.string().optional(),
  basicPassword: z.string().optional(),
  path: z.string().default("/"),
  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]).default("GET"),
  query: z.record(z.string(), z.string()).optional(),
});

export const connectionCreateSchema = z.object({
  name: z.string().min(1).max(120),
  baseUrl: z.string().url(),
  auth: authKindSchema,
  apiKeyHeader: z.string().optional(),
  secret: z.string().optional(),
  basicUsername: z.string().optional(),
  basicPassword: z.string().optional(),
});

export const connectionUpdateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  baseUrl: z.string().url().optional(),
  auth: authKindSchema.optional(),
  apiKeyHeader: z.string().optional(),
  secret: z.string().optional(),
  basicUsername: z.string().optional(),
  basicPassword: z.string().optional(),
});

export const datasetCreateSchema = z.object({
  connectionId: z.string().min(1),
  name: z.string().min(1).max(120),
  request: datasetRequestSchema,
});

export type ConnectionCredentials = {
  auth: z.infer<typeof authKindSchema>;
  apiKeyHeader?: string;
  secret?: string;
  basicUsername?: string;
  basicPassword?: string;
};
