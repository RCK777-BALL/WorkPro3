/*
 * SPDX-License-Identifier: MIT
 */

export const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:5010";
export const SOCKET_PATH = import.meta.env.VITE_SOCKET_PATH ?? "/socket.io";
export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? API_URL;
