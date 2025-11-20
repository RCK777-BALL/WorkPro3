/*
 * SPDX-License-Identifier: MIT
 */

import type { Server as SocketIOServer } from 'socket.io';
import { messagingService, messagingTopics } from '../services/messaging';

export const producer = messagingService.getProducer();

export const initKafka = async (io?: SocketIOServer) => {
  await messagingService.start(io);
};

export const sendKafkaEvent = async (topic: string, payload: unknown) => {
  await messagingService.publish(topic, payload);
};

export { messagingTopics };
