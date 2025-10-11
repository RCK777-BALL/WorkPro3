/*
 * SPDX-License-Identifier: MIT
 */

import type { Options as MailOptions } from 'nodemailer/lib/mailer';
import { sendKafkaEvent } from './kafka';

export const enqueueEmailRetry = async (mailOptions: MailOptions) => {
  await sendKafkaEvent('emailRetries', mailOptions);
};

export default enqueueEmailRetry;
