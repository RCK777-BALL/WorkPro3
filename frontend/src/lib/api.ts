import axios from 'axios';

const baseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5010').replace(/\/+$/, '');
const base = `${baseUrl}/api`;

export const api = axios.create({
  baseURL: base,
  withCredentials: true,
});

export default api;
