import propertyConfig from "@/config/property.json";

export type Unit = {
  id: string;
  ssid: string;
  hospitableListingId: string;
};

export type PropertyConfig = {
  property: { name: string };
  units: Unit[];
  wholePropertyListingIds: string[];
};

const config = propertyConfig as PropertyConfig;

export function resolveUnitBySsid(ssid: string | null | undefined): Unit | null {
  if (!ssid) return null;
  return config.units.find((unit) => unit.ssid === ssid) ?? null;
}

export function allowedListingIdsForUnit(unit: Unit): string[] {
  return [unit.hospitableListingId, ...config.wholePropertyListingIds];
}

export function isWholePropertyListing(listingId: string): boolean {
  return config.wholePropertyListingIds.includes(listingId);
}

export function propertyName(): string {
  return config.property.name;
}
