import http from '@/lib/http';

interface AssetSearchResult {
  _id: string;
  name: string;
  location?: string;
}

export const searchAssets = async (q: string) => {
  const res = await http.get<AssetSearchResult[]>('/assets/search', { params: { q } });
  return res.data.map(({ _id, name, location }) => ({
    id: _id,
    name: location ? `${name} (${location})` : name,
  }));
};

