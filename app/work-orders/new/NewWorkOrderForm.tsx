'use client';

import { useActionState, useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createWorkOrder, type CreateWorkOrderState } from '@/lib/actions/work-orders';
import { uploadAttachments } from '@/lib/actions/attachments';
import { resizeImageForUpload } from '@/lib/client-image';

type Location = { id: string; code: string; type: string };
type Category = { id: string; nameTh: string; isSpecial: boolean; colour: string | null; helpText: string | null };
type Worker = { id: string; name: string; type: string };

const MAX_PHOTOS = 5;

type StagedPhoto = { file: File; previewUrl: string };

// §3.4: the work order doesn't exist yet on this screen, so photos can't
// reference a work_order_id the normal way. Sequence instead: hold resized
// files in browser state with thumbnails (so a mis-tap can be undone before
// saving anything), save the work order first, then upload the held photos
// against the id it returns, then navigate — never blocking the job itself
// on whether the photo step succeeds.
export function NewWorkOrderForm({
  locations,
  categories,
  workers,
  photosEnabled,
}: {
  locations: Location[];
  categories: Category[];
  workers: Worker[];
  // §3.5: "if storage isn't configured, hide the photo section entirely" —
  // decided server-side (env vars), not discovered by a failed upload.
  photosEnabled: boolean;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState<CreateWorkOrderState, FormData>(createWorkOrder, undefined);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const selectedCategory = categories.find((c) => c.id === selectedCategoryId);

  const [photos, setPhotos] = useState<StagedPhoto[]>([]);
  const [resizing, setResizing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Guards the effect below so it fires exactly once per successful save,
  // even though it depends on `photos` (which is stable by the time
  // `state.success` is true — the form is submitting/navigating away, not
  // still being edited).
  const handledRef = useRef(false);
  const isSavingPhotos = !!(state && 'success' in state && state.success);

  async function handlePhotoPick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).filter((f) => f.type.startsWith('image/'));
    e.target.value = ''; // allow picking the same file again after removing it
    if (!files.length) return;

    const room = MAX_PHOTOS - photos.length;
    if (room <= 0) return;

    setResizing(true);
    try {
      const toAdd = files.slice(0, room);
      const resized = await Promise.all(toAdd.map(resizeImageForUpload));
      setPhotos((prev) => [...prev, ...resized.map((file) => ({ file, previewUrl: URL.createObjectURL(file) }))]);
    } finally {
      setResizing(false);
    }
  }

  function removePhoto(index: number) {
    setPhotos((prev) => {
      URL.revokeObjectURL(prev[index].previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  }

  // Runs once, right when createWorkOrder succeeds: attach any staged
  // photos to the new id, then navigate regardless of whether that upload
  // worked. If it failed, the job is already saved; the detail page's own
  // "add photo" form (already built) is the retry path, since the picked
  // files themselves don't survive the navigation to hand back to a retry
  // button.
  useEffect(() => {
    if (!isSavingPhotos || handledRef.current) return;
    handledRef.current = true;
    const { id } = state as { success: true; id: string; woNo: string };

    const upload = photos.length
      ? (() => {
          const uploadData = new FormData();
          uploadData.set('workOrderId', id);
          for (const p of photos) uploadData.append('photos', p.file);
          return uploadAttachments(undefined, uploadData);
        })()
      : Promise.resolve();

    upload.finally(() => router.push(`/work-orders/${id}`));
  }, [isSavingPhotos, state, photos, router]);

  return (
    <form action={action} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="locationCode" className="text-sm font-medium text-zinc-700">
          ห้อง / พื้นที่
        </label>
        <input
          id="locationCode"
          name="locationCode"
          list="location-options"
          required
          autoComplete="off"
          placeholder="เช่น 1408 หรือ สวนชั้น5"
          className="h-12 rounded-lg border border-zinc-300 px-4 text-base focus:border-zinc-500 focus:outline-none"
        />
        <datalist id="location-options">
          {locations.map((loc) => (
            <option key={loc.id} value={loc.code} />
          ))}
        </datalist>
      </div>

      <fieldset className="flex flex-col gap-1.5">
        <legend className="text-sm font-medium text-zinc-700">หมวดหมู่</legend>
        <div className="flex max-h-64 flex-col gap-1 overflow-y-auto rounded-lg border border-zinc-300 p-2">
          {categories.map((cat) => (
            <label
              key={cat.id}
              className="flex items-center gap-2 rounded-md px-2 py-2 text-sm has-checked:bg-zinc-100"
            >
              <input
                type="radio"
                name="categoryId"
                value={cat.id}
                required
                className="accent-zinc-900"
                onChange={() => setSelectedCategoryId(cat.id)}
              />
              {cat.isSpecial && cat.colour && (
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: cat.colour }} />
              )}
              <span>{cat.nameTh}</span>
              {cat.isSpecial && <span className="text-xs text-zinc-400">(พิเศษ)</span>}
            </label>
          ))}
        </div>
        {/* §9.1: "one sentence [the owner] can state, shown as help text
            under the category dropdown, so whoever keys the row picks the
            same category she would" — set per category in /admin/categories. */}
        {selectedCategory?.helpText && (
          <p className="rounded-md bg-zinc-50 p-2 text-xs text-zinc-600">💡 {selectedCategory.helpText}</p>
        )}
      </fieldset>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="description" className="text-sm font-medium text-zinc-700">
          รายละเอียดงาน
        </label>
        <textarea
          id="description"
          name="description"
          required
          rows={3}
          className="rounded-lg border border-zinc-300 p-3 text-base focus:border-zinc-500 focus:outline-none"
        />
      </div>

      <fieldset className="flex flex-col gap-1.5">
        <legend className="text-sm font-medium text-zinc-700">มอบหมายให้ (ถ้ามี)</legend>
        <div className="flex flex-wrap gap-2">
          {workers.map((w) => (
            <label
              key={w.id}
              className="flex items-center gap-1.5 rounded-full border border-zinc-300 px-3 py-1.5 text-sm has-checked:border-zinc-900 has-checked:bg-zinc-900 has-checked:text-white"
            >
              <input type="checkbox" name="workerIds" value={w.id} className="hidden" />
              {w.name}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="priority" className="text-sm font-medium text-zinc-700">
          ความเร่งด่วน
        </label>
        <select
          id="priority"
          name="priority"
          defaultValue="normal"
          className="h-12 rounded-lg border border-zinc-300 px-4 text-base focus:border-zinc-500 focus:outline-none"
        >
          <option value="normal">ปกติ</option>
          <option value="urgent">ด่วน</option>
        </select>
      </div>

      {photosEnabled && (
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-zinc-700">รูปถ่าย (ถ้ามี)</span>
          {photos.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {photos.map((p, i) => (
                <div key={p.previewUrl} className="relative h-20 w-20 overflow-hidden rounded-lg border border-zinc-200">
                  {/* eslint-disable-next-line @next/next/no-img-element -- local blob: preview URL, not a next/image-compatible remote asset */}
                  <img src={p.previewUrl} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removePhoto(i)}
                    aria-label="ลบรูป"
                    className="absolute top-0.5 right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-xs text-white"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
          {photos.length < MAX_PHOTOS && (
            <label className="flex h-11 cursor-pointer items-center justify-center rounded-lg border border-dashed border-zinc-300 text-sm font-medium text-zinc-600 hover:border-zinc-500">
              {resizing ? 'กำลังเตรียมรูป…' : '📷 เพิ่มรูป'}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                multiple
                disabled={resizing}
                onChange={handlePhotoPick}
                className="hidden"
              />
            </label>
          )}
        </div>
      )}

      {state && 'error' in state && (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending || isSavingPhotos}
        className="h-14 rounded-xl bg-zinc-900 text-base font-semibold text-white disabled:opacity-50"
      >
        {isSavingPhotos ? 'กำลังบันทึกรูป…' : pending ? 'กำลังบันทึก…' : 'เปิดงาน'}
      </button>
    </form>
  );
}
