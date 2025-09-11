/*
 * SPDX-License-Identifier: MIT
 */

import { useRef } from 'react';
export default function useOnce(fn: () => void) {
  const did = useRef(false);
  if (!did.current) {
    did.current = true;
    fn();
  }
}
