import axios from 'axios';

const base = (import.meta.env.VITE_API_URL || 'http://localhost:5010/api').replace(/\/+$/, '');

export const http = axios.create({
  baseURL: base,
  withCredentials: true,
});

export default http;
