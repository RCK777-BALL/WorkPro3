/*
 * SPDX-License-Identifier: MIT
 */

import dotenv from 'dotenv';

dotenv.config();

export const DEFAULT_TENANT_ID = process.env.DEFAULT_TENANT_ID;
export const PREDICTIVE_MODEL = process.env.PREDICTIVE_MODEL;
export const LABOR_RATE = Number(process.env.LABOR_RATE ?? '50');
export const EXECUTIVE_REPORT_CRON = process.env.EXECUTIVE_REPORT_CRON ?? '0 * * * *';
