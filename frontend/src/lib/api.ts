import axios from 'axios';
import { API_URL } from '@/config/env';

export const api = axios.create({
  baseURL: `${API_URL}/api`,
  withCredentials: true,
});

export default api;
