export interface Territory {
  code: string;
  region: string;
  currency: string;
}

export interface LocalizedTerritory extends Territory {
  name: string;
}

export interface LocalizedTerritoryMap {
  [code: string]: LocalizedTerritory;
}

export interface LocalizedRegionMap {
  [region: string]: LocalizedTerritory[];
}
