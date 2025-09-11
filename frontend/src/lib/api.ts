/*
 * SPDX-License-Identifier: MIT
 */

import { API_URL } from '@/config/env';
import axios from 'axios';


export const api = axios.create({
  baseURL: `${API_URL}/api`,
  withCredentials: true,
});

export default api;
