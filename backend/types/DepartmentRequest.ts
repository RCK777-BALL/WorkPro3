/*
 * SPDX-License-Identifier: MIT
 */

export interface StationInput {
  name: string;
}

export interface LineInput {
  name: string;
  stations: StationInput[];
}

export interface DepartmentInput {
  name: string;
  lines: LineInput[];
}
