import api from '../lib/api';

export const searchAssets = (q: string) =>
  api.get('/assets/search', { params: { q } }).then((res) => res.data);

