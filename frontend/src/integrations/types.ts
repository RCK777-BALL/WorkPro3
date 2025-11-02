/*
 * SPDX-License-Identifier: MIT
 */

export interface IntegrationHook {
  _id: string;
  name: string;
  type: string;
  url: string;
  events: string[];
}
