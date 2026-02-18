import { LocalizedRegionMap, LocalizedTerritory, LocalizedTerritoryMap, Territory } from "./helperTypes";

const BASE_TERRITORIES: Territory[] = [
  { code: "US", region: "North America", currency: "USD" },
  { code: "CA", region: "North America", currency: "CAD" },
  { code: "GB", region: "Europe", currency: "GBP" },
  { code: "DE", region: "Europe", currency: "EUR" },
  { code: "AU", region: "Oceania", currency: "AUD" },
];

function resolveDisplayName(code: string, locale: string): string {
  try {
    const displayNames = new Intl.DisplayNames([locale], { type: "region" });
    const localized = displayNames.of(code);
    if (localized) {
      return localized;
    }
  } catch {
    // Intl may not support the locale; fall back to code below.
  }
  return code;
}

function localizeTerritories(locale = "en-US"): LocalizedTerritory[] {
  return BASE_TERRITORIES.map((territory) => ({
    ...territory,
    name: resolveDisplayName(territory.code, locale),
  }));
}

export function getLocalTerritories(locale = "en-US"): LocalizedTerritory[] {
  return localizeTerritories(locale);
}

export function getLocalAll(locale = "en-US"): LocalizedTerritoryMap {
  return localizeTerritories(locale).reduce<LocalizedTerritoryMap>((map, territory) => {
    map[territory.code] = territory;
    return map;
  }, {});
}

export function getLocalAllRegion(locale = "en-US"): LocalizedRegionMap {
  return localizeTerritories(locale).reduce<LocalizedRegionMap>((regions, territory) => {
    if (!regions[territory.region]) {
      regions[territory.region] = [];
    }
    regions[territory.region].push(territory);
    return regions;
  }, {});
}

export type HelperLocalTerritories = ReturnType<typeof getLocalTerritories>;
export type HelperLocalAll = ReturnType<typeof getLocalAll>;
export type HelperLocalAllRegion = ReturnType<typeof getLocalAllRegion>;
