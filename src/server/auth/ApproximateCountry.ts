import geoipCountry from "geoip-country";
import { isIP } from "node:net";

export function normalizeIpAddress(address: string): string | undefined {
  const candidate = address.trim().replace(/^::ffff:/i, "");
  return isIP(candidate) ? candidate : undefined;
}

function isReservedIpv4(address: string): boolean {
  const octets = address.split(".").map(Number);
  if (octets.length !== 4 || octets.some((value) => !Number.isInteger(value))) {
    return true;
  }
  const [a, b, c] = octets;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 0 && (c === 0 || c === 2)) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    (a === 198 && b === 51 && c === 100) ||
    (a === 203 && b === 0 && c === 113) ||
    a >= 224
  );
}

function isReservedIpv6(address: string): boolean {
  const lower = address.toLowerCase();
  const first = Number.parseInt(lower.split(":", 1)[0] || "0", 16);
  return (
    lower === "::" ||
    lower === "::1" ||
    lower.startsWith("2001:db8:") ||
    (first & 0xfe00) === 0xfc00 ||
    (first & 0xffc0) === 0xfe80 ||
    (first & 0xff00) === 0xff00
  );
}

export function countryCodeForAddress(address: string): string | undefined {
  const normalized = normalizeIpAddress(address);
  if (!normalized) return undefined;
  const kind = isIP(normalized);
  if (
    (kind === 4 && isReservedIpv4(normalized)) ||
    (kind === 6 && isReservedIpv6(normalized))
  ) {
    return undefined;
  }
  const code = geoipCountry.lookup(normalized)?.country?.toUpperCase();
  return code && /^[A-Z]{2}$/.test(code) ? code : undefined;
}

/** Accept only Express's trusted-proxy-resolved req.ip value. */
export function observeApproximateCountry(
  requestIp: string | undefined,
): string | undefined {
  return requestIp ? countryCodeForAddress(requestIp) : undefined;
}
