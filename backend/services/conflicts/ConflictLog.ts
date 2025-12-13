/*
 * SPDX-License-Identifier: MIT
 */

import type { ResolutionMetadata } from '../../src/modules/mobile/conflictResolution';

export type ConflictEntry = ResolutionMetadata;

class ConflictLog {
  private conflicts: ConflictEntry[] = [];

  add(entry: ConflictEntry): void {
    this.conflicts.push(entry);
  }

  all(): ConflictEntry[] {
    return this.conflicts;
  }

  byEntity(entityType: string, entityId: string): ConflictEntry[] {
    return this.conflicts.filter((conflict) => conflict.entityType === entityType && conflict.entityId === entityId);
  }
}

export default ConflictLog;
