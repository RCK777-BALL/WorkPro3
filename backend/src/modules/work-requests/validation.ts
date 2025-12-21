/*
 * SPDX-License-Identifier: MIT
 */

import type { Express } from 'express';

import { WorkRequestError } from './errors';

const MAX_TITLE_LENGTH = 200;
const MAX_DESCRIPTION_LENGTH = 5000;
const MAX_TAGS = 10;
const MAX_TAG_LENGTH = 32;
const MAX_ATTACHMENTS = 10;

export const assertContactMethod = (email?: string, phone?: string) => {
  if (!email?.trim() && !phone?.trim()) {
    throw new WorkRequestError('Please provide an email or phone number so we can reach you.', 400);
  }
};

export const enforceLengthLimits = (title: string, description?: string) => {
  if (title.trim().length > MAX_TITLE_LENGTH) {
    throw new WorkRequestError(`Title cannot exceed ${MAX_TITLE_LENGTH} characters.`, 400);
  }
  if (description && description.trim().length > MAX_DESCRIPTION_LENGTH) {
    throw new WorkRequestError(`Description cannot exceed ${MAX_DESCRIPTION_LENGTH} characters.`, 400);
  }
};

export const validateTags = (tags?: string[]) => {
  if (!tags) return;
  if (tags.length > MAX_TAGS) {
    throw new WorkRequestError(`Use at most ${MAX_TAGS} tags.`, 400);
  }
  const invalid = tags.find((tag) => !tag.trim() || tag.trim().length > MAX_TAG_LENGTH);
  if (invalid) {
    throw new WorkRequestError('Tags must be non-empty and under 32 characters.', 400);
  }
};

export const validateAttachments = (files: Express.Multer.File[]) => {
  if (files.length > MAX_ATTACHMENTS) {
    throw new WorkRequestError(`Attach no more than ${MAX_ATTACHMENTS} files.`, 400);
  }
};

export const ensureRequiredFields = (input: Record<string, unknown>, requiredFields: string[]) => {
  if (!requiredFields.length) return;
  const missing = requiredFields.filter((field) => {
    const value = input[field];
    if (value === undefined || value === null) return true;
    if (typeof value === 'string' && !value.trim()) return true;
    return false;
  });
  if (missing.length) {
    throw new WorkRequestError(`Missing required fields: ${missing.join(', ')}`, 400);
  }
};
