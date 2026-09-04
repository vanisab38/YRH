'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { ListControlsValues } from './ListControls';

const TRACKED_KEYS = ['sort', 'group', 'mine', 'special', 'stalled7', 'floor'] as const;

// §3.1: "remember the last sort, grouping and filter choice per user, so
// the person who always wants 'my jobs by room' sees it on open." Per
// browser/device rather than truly per account (no server-side prefs
// table for this) — close enough for a small team on their own phones.
// If the URL already carries any of these params, someone (a link, a
// bookmark, a deliberate change) set them explicitly — save that as the
// new remembered state. If the URL carries none of them, this is a bare
// visit to the page — apply whatever was last remembered, if anything.
export function RememberListPrefs({ storageKey, values }: { storageKey: string; values: ListControlsValues }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const hasAnyTracked = TRACKED_KEYS.some((k) => searchParams.has(k));

    if (hasAnyTracked) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(values));
      } catch {
        // Private browsing / storage disabled — remembering is a nicety, not required.
      }
      return;
    }

    try {
      const saved = localStorage.getItem(storageKey);
      if (!saved) return;
      const prefs = JSON.parse(saved) as ListControlsValues;
      const params = new URLSearchParams(searchParams.toString());
      let changed = false;
      if (prefs.sort) { params.set('sort', prefs.sort); changed = true; }
      if (prefs.group) { params.set('group', prefs.group); changed = true; }
      if (prefs.mine) { params.set('mine', 'on'); changed = true; }
      if (prefs.special) { params.set('special', 'on'); changed = true; }
      if (prefs.stalled7) { params.set('stalled7', 'on'); changed = true; }
      if (prefs.floor) { params.set('floor', prefs.floor); changed = true; }
      if (changed) router.replace(`?${params.toString()}`);
    } catch {
      // Corrupt/blocked storage — just show the page's normal defaults.
    }
    // Only ever apply remembered prefs once, right after a bare page load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
