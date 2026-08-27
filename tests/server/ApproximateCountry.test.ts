// @vitest-environment node

import { describe, expect, test } from "vitest";
import {
  countryCodeForAddress,
  normalizeIpAddress,
  observeApproximateCountry,
} from "../../src/server/auth/ApproximateCountry";

describe("ApproximateCountry", () => {
  test("normalizes IPv4-mapped Express addresses", () => {
    expect(normalizeIpAddress("::ffff:8.8.8.8")).toBe("8.8.8.8");
  });

  test.each([
    "127.0.0.1",
    "::1",
    "0.0.0.0",
    "10.0.0.4",
    "100.64.0.1",
    "169.254.1.1",
    "172.18.0.2",
    "192.0.2.1",
    "192.168.1.5",
    "224.0.0.1",
    "fc00::1",
    "fe80::1",
    "2001:db8::1",
  ])("does not geolocate private or reserved address %s", (ip) => {
    expect(countryCodeForAddress(ip)).toBeUndefined();
  });

  test("returns only the country code for a public address", () => {
    expect(countryCodeForAddress("8.8.8.8")).toBe("US");
  });

  test("observes only a sanitized ISO code from Express req.ip", () => {
    expect(observeApproximateCountry("::ffff:8.8.8.8")).toBe("US");
    expect(observeApproximateCountry("not-an-address")).toBeUndefined();
  });
});
