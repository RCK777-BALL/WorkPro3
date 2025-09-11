/*
 * SPDX-License-Identifier: MIT
 */

import { io } from "socket.io-client";
import { SOCKET_URL, SOCKET_PATH } from "@/config/env";

export const socket = io(SOCKET_URL, {
  path: SOCKET_PATH,
  withCredentials: true,
});
