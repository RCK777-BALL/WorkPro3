import http from '../lib/http';

export const searchAssets = (q: string) =>
  http.get('/assets/search', { params: { q } }).then((res) => res.data);

