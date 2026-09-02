'use client';

import { useSyncExternalStore } from 'react';

function subscribe(callback: () => void) {
  window.addEventListener('online', callback);
  window.addEventListener('offline', callback);
  return () => {
    window.removeEventListener('online', callback);
    window.removeEventListener('offline', callback);
  };
}

// useSyncExternalStore, not useState+useEffect: navigator.onLine is
// external mutable state (a browser API, not React state), and this avoids
// both the extra render-after-mount and a server/client mismatch (there's
// no `navigator` during SSR — getServerSnapshot always reports "online").
function isOffline(): boolean {
  return !navigator.onLine;
}

// §8 "offline handling" (lightweight): staff are on phones, sometimes with
// no signal (stairwells, basement plant rooms). Rather than a full
// offline-first rebuild, just make it unmistakable when a form submission
// won't go anywhere, instead of the button seeming to silently do nothing.
export function OfflineBanner() {
  const offline = useSyncExternalStore(subscribe, isOffline, () => false);

  if (!offline) return null;

  return (
    <div
      role="status"
      className="flex items-center justify-center gap-2 bg-amber-500 px-4 py-2 text-center text-sm font-medium text-white print:hidden"
    >
      📡 ไม่มีสัญญาณอินเทอร์เน็ต — การบันทึกจะไม่ทำงานจนกว่าจะเชื่อมต่อใหม่
    </div>
  );
}
