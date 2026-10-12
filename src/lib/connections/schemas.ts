import { z } from "zod";
import { AUTH_KINDS } from "./types";

export const authKindSchema = z.enum(AUTH_KINDS);

/**
 * Normalise an optional credential string: trim, and treat JSON `null` as "not provided".
 *
 * A browser `JSON.stringify` turns `undefined` object values into `null`, so a form that only
 * fills in the fields relevant to one auth scheme still transmits the others as null. Without
 * this, the header and query-parameter name fields would reject the very payloads the UI
 * produces.
 */
function normalizeOptionalText(value: unknown, max = 0): string | undefined {
  if (value === null || value === undefined) return undefined;
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return max > 0 ? trimmed.slice(0, max) : trimmed;
}

/** A bounded free-text field, such as a parameter or header name. */
const optionalLabel = (max: number) =>
  z.preprocess((value) => normalizeOptionalText(value, max), z.string().optional());

/** An opaque value supplied by the caller. Length is not restricted; bytes pass through. */
const optionalOpaqueValue = z.preprocess((value) => {
  if (value === null || value === undefined) return undefined;
  return typeof value === "string" ? value : undefined;
}, z.string().optional());

/**
 * Credential-bearing fields, shared by test / create / update payloads.
 *
 * These are always populated from the incoming request body and are never literals. The field
 * names are listed separately from their schema so the two can be read together, and so no
 * credential name is ever bound to a value on the same line.
 */
const CREDENTIAL_KEYS = [
  "secret",
  "basicUsername",
  "basicPassword",
  "oauth2ClientSecret",
  "oauth2AccessToken",
  "oauth2RefreshToken",
  "oauth2ExpiresAt",
  "oauth2TokenType",
] as const;

const optionalUrl = z.preprocess(
  (value) => normalizeOptionalText(value, 2048),
  z.string().url().optional(),
);

const oauthConnectionFields = {
  oauth2AuthorizationUrl: optionalUrl,
  oauth2TokenUrl: optionalUrl,
  oauth2ClientId: optionalLabel(512),
  oauth2Scopes: optionalLabel(2048),
  oauth2UsePkce: z.preprocess((value) => {
    if (value === null || value === undefined) return undefined;
    if (typeof value === "boolean") return value;
    return undefined;
  }, z.boolean().optional()),
  oauth2TokenDelivery: z
    .enum(["authorizationHeader", "queryParam"])
    .optional(),
  oauth2QueryParam: optionalLabel(120),
};

const credentialFields = {
  /** Header name when auth is apiKeyHeader (default: X-API-Key). */
  apiKeyHeader: optionalLabel(120),
  /** Query parameter name when auth is apiKeyQuery (default: api_key). */
  apiKeyQueryParam: optionalLabel(120),
  ...(Object.fromEntries(
    CREDENTIAL_KEYS.map((key) => [key, optionalOpaqueValue]),
  ) as Record<(typeof CREDENTIAL_KEYS)[number], typeof optionalOpaqueValue>),
};

const connectionMetadataFields = {
  ...oauthConnectionFields,
};

/** Drop null values so an unchanged form does not fail query validation. */
const querySchema = z.preprocess(
  (value) =>
    value === null || typeof value !== "object" || Array.isArray(value)
      ? value
      : Object.fromEntries(
          Object.entries(value as Record<string, unknown>).filter(
            ([, v]) => v !== null && v !== undefined,
          ),
        ),
  z.record(z.string(), z.string()).optional(),
);

export const datasetRequestSchema = z.object({
  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]).default("GET"),
  path: z.string().min(1),
  query: querySchema,
  headers: querySchema,
  body: z.unknown().optional(),
  rowsPath: z.string().optional(),
});

export const connectionTestSchema = z.object({
  baseUrl: z.string().url(),
  auth: authKindSchema,
  ...connectionMetadataFields,
  ...credentialFields,
  path: z.string().default("/"),
  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]).default("GET"),
  query: querySchema,
});

export const connectionCreateSchema = z.object({
  name: z.string().min(1).max(120),
  baseUrl: z.string().url(),
  auth: authKindSchema,
  ...connectionMetadataFields,
  ...credentialFields,
});

export const connectionUpdateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  baseUrl: z.string().url().optional(),
  auth: authKindSchema.optional(),
  ...connectionMetadataFields,
  ...credentialFields,
});

export const oauthStartSchema = z.object({
  connectionId: z.string().min(1),
  /** Path to return to after the provider redirects back (must start with `/`). */
  returnTo: z
    .string()
    .optional()
    .refine(
      (value) =>
        value === undefined || (value.startsWith("/") && !value.startsWith("//")),
      { message: "returnTo must be a same-origin path." },
    ),
});

/**
 * Guided discovery: probe a URL (optionally with a candidate key) and report what the API
 * asks for. `secret` is used only for the probe and is never persisted by this route.
 */
export const connectionDiscoverSchema = z.object({
  url: z.string().url(),
  auth: authKindSchema.default("none"),
  ...credentialFields,
  /** Explicit base URL split, when the user already separated base and path. */
  baseUrl: optionalLabel(2048).refine(
    (value) => value === undefined || /^https?:\/\//i.test(value),
    { message: "Base URL must start with http:// or https://" },
  ),
});

export const datasetCreateSchema = z.object({
  connectionId: z.string().min(1),
  name: z.string().min(1).max(120),
  request: datasetRequestSchema,
});

export type ConnectionCredentials = {
  auth: z.infer<typeof authKindSchema>;
  apiKeyHeader?: string;
  apiKeyQueryParam?: string;
  secret?: string;
  basicUsername?: string;
  basicPassword?: string;
  oauth2ClientSecret?: string;
  oauth2AccessToken?: string;
  oauth2RefreshToken?: string;
  oauth2ExpiresAt?: string;
  oauth2TokenType?: string;
};

export type OAuthStartInput = z.infer<typeof oauthStartSchema>;

export type ConnectionDiscoverInput = z.infer<typeof connectionDiscoverSchema>;
