declare module "geoip-country" {
  export interface CountryLookup {
    country: string;
  }

  const geoipCountry: {
    lookup(ip: string): CountryLookup | null;
  };

  export default geoipCountry;
}
