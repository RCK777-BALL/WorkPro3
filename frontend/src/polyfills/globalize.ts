/*
 * SPDX-License-Identifier: MIT
 */

import Globalize from 'globalize';

type GlobalizeType = typeof Globalize;

if (typeof window !== 'undefined') {
  const globalizeInstance = Globalize as GlobalizeType;
  const win = window as Window & { Globalize?: GlobalizeType };

  if (!win.Globalize) {
    win.Globalize = globalizeInstance;
  }
}

export {};
