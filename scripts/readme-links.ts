// scripts/readme-links.ts
/**
 * The online link check's classification of one fetched response.
 *
 * npmjs.com answers a burst of fetches with Cloudflare's challenge page: a 403
 * that says nothing about the link itself. A 403 from npmjs.com that carries
 * the challenge — `cf-mitigated: challenge`, or a challenge served by
 * `server: cloudflare` — is unverifiable: neither a pass nor a failure, and
 * counted apart. Any other 403, and a 403 from any other host, fails.
 */

export type LinkVerdict = "ok" | "unverifiable" | "failed";

/** The hosts npm's own pages are served from. */
const NPM_HOSTS = new Set(["npmjs.com", "www.npmjs.com"]);

/** True when the link is an npmjs.com URL, the only host the challenge excuses. */
function isNpmUrl(url: string): boolean {
  try {
    return NPM_HOSTS.has(new URL(url).hostname);
  } catch {
    return false;
  }
}

/** True when the response carries Cloudflare's challenge. */
function isCloudflareChallenge(status: number, headers: Headers): boolean {
  if (status !== 403) return false;
  return headers.get("cf-mitigated")?.toLowerCase() === "challenge"
    || headers.get("server")?.toLowerCase() === "cloudflare";
}

/** 200 passes; a challenged npmjs.com 403 is unverifiable; everything else fails. */
export function classifyLink(url: string, status: number, headers: Headers): LinkVerdict {
  if (status === 200) return "ok";
  if (isNpmUrl(url) && isCloudflareChallenge(status, headers)) return "unverifiable";
  return "failed";
}
