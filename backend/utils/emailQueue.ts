/*
 * SPDX-License-Identifier: MIT
 */

import type { SendMailOptions } from 'nodemailer';
import { sendKafkaEvent } from './kafka';

export const enqueueEmailRetry = async (mailOptions: SendMailOptions) => {
  await sendKafkaEvent('emailRetries', mailOptions);
};

export default enqueueEmailRetry;
