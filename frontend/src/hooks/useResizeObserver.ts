/*
 * SPDX-License-Identifier: MIT
 */

import { RefObject, useEffect, useState } from 'react';

interface Size {
  width: number;
  height: number;
}

export default function useResizeObserver<T extends HTMLElement>(
  ref: RefObject<T>,
): Size {
  const [size, setSize] = useState<Size>({ width: 0, height: 0 });

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      setSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [ref]);

  return size;
}

