import geoip from "geoip-country";

export function detectCountry(ip: string): string | undefined {
  return geoip.lookup(ip)?.country ?? undefined;
}
