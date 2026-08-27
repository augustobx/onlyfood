export function getPlatformHostname(baseUrl: string | undefined): string | null {
  if (!baseUrl) return null;
  try {
    return new URL(baseUrl).hostname.trim().toLowerCase().replace(/\.$/, "") || null;
  } catch {
    return null;
  }
}

export function isPlatformHostname(domain: string, baseDomain: string | undefined, baseUrl: string | undefined): boolean {
  const cleanDomain = domain.trim().toLowerCase().replace(/\.$/, "");
  const cleanBaseDomain = (baseDomain || "").trim().toLowerCase().replace(/\.$/, "");
  const platformHostname = getPlatformHostname(baseUrl);
  return Boolean(cleanDomain && ((cleanBaseDomain && cleanDomain === cleanBaseDomain) || cleanDomain === platformHostname));
}
