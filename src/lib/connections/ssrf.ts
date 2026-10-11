import { lookup } from "dns/promises";
import { isIP } from "net";

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "localhost.localdomain",
  "metadata.google.internal",
]);

function isPrivateIpv4(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p))) return true;
  const [a, b] = parts;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  return false;
}

function isPrivateIpv6(ip: string): boolean {
  const normalized = ip.toLowerCase();
  if (normalized === "::1") return true;
  if (normalized.startsWith("fe80:")) return true;
  if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true;
  return false;
}

function isBlockedIp(ip: string): boolean {
  if (isIP(ip) === 4) return isPrivateIpv4(ip);
  if (isIP(ip) === 6) return isPrivateIpv6(ip);
  return true;
}

export type SsrfCheckResult =
  | { ok: true; hostname: string }
  | { ok: false; error: string };

export async function assertSafeOutboundUrl(
  rawUrl: string,
): Promise<SsrfCheckResult> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return { ok: false, error: "Invalid URL." };
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { ok: false, error: "Only http and https URLs are allowed." };
  }

  const hostname = parsed.hostname.replace(/^\[|\]$/g, "");
  if (BLOCKED_HOSTNAMES.has(hostname.toLowerCase())) {
    return { ok: false, error: "That host is not allowed for outbound requests." };
  }

  if (isIP(hostname)) {
    if (isBlockedIp(hostname)) {
      return {
        ok: false,
        error: "Private or local network addresses are blocked.",
      };
    }
    return { ok: true, hostname };
  }

  try {
    const records = await lookup(hostname, { all: true });
    for (const rec of records) {
      if (isBlockedIp(rec.address)) {
        return {
          ok: false,
          error: "Target resolves to a private or local network address.",
        };
      }
    }
  } catch {
    return { ok: false, error: "Could not resolve hostname." };
  }

  return { ok: true, hostname };
}
