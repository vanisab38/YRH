'use client';

import { useActionState } from 'react';
import { uploadAttachments, type UploadState } from '@/lib/actions/attachments';

// §2/§3 "photos" — capture="environment" opens the rear camera directly on
// a phone rather than the file picker, since staff are usually standing in
// the room when they'd want to attach a photo.
export function PhotoUploadForm({ workOrderId }: { workOrderId: string }) {
  const [state, action, pending] = useActionState<UploadState, FormData>(uploadAttachments, undefined);

  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="workOrderId" value={workOrderId} />
      <label className="flex h-11 cursor-pointer items-center justify-center rounded-lg border border-dashed border-zinc-300 text-sm font-medium text-zinc-600 hover:border-zinc-500">
        📷 เพิ่มรูป
        <input
          type="file"
          name="photos"
          accept="image/*"
          capture="environment"
          multiple
          className="hidden"
          onChange={(e) => e.currentTarget.form?.requestSubmit()}
        />
      </label>
      {pending && <p className="text-xs text-zinc-400">กำลังอัปโหลด…</p>}
      {state?.error && (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      )}
    </form>
  );
}
