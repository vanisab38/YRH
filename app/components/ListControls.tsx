import type { ReactNode } from 'react';
import { RememberListPrefs } from './RememberListPrefs';

export type ListControlsValues = {
  q?: string;
  sort?: string;
  group?: string;
  mine?: boolean;
  special?: boolean;
  stalled7?: boolean;
  floor?: string;
};

// §3.1: "Build both [Today's pending list and Search] from the same
// component — a search box, a sort control, and filter chips." One form,
// reused on both screens; Search adds its own extra fields (status,
// category, group, worker, date range) as children inside the same form
// rather than a second implementation. `storageKey` scopes what gets
// remembered in localStorage (§3.1: "remember the last sort, grouping and
// filter choice per user") separately for Today vs. Search.
export function ListControls({
  action,
  storageKey,
  values,
  floorOptions,
  showMine,
  submitLabel,
  children,
}: {
  action: string;
  storageKey: string;
  values: ListControlsValues;
  floorOptions: number[];
  showMine: boolean;
  submitLabel: string;
  children?: ReactNode;
}) {
  return (
    <form action={action} className="flex flex-col gap-3">
      <RememberListPrefs storageKey={storageKey} values={values} />
      <input
        name="q"
        defaultValue={values.q ?? ''}
        placeholder="ค้นหาห้อง, เลขที่งาน, คำอธิบาย, ช่าง หรือหมวดหมู่"
        autoComplete="off"
        className="h-12 rounded-lg border border-zinc-300 px-4 text-base focus:border-zinc-500 focus:outline-none"
      />

      <div className="flex flex-wrap gap-2">
        <select name="sort" defaultValue={values.sort ?? 'stalled'} className="h-10 rounded-full border border-zinc-300 px-3 text-sm">
          <option value="stalled">ค้างนานสุดก่อน</option>
          <option value="oldest">เปิดก่อนสุดก่อน</option>
          <option value="room">ห้อง</option>
          <option value="category">หมวดหมู่</option>
          <option value="woNo">เลขที่งาน</option>
          <option value="recentlyUpdated">อัปเดตล่าสุด</option>
        </select>

        <select name="group" defaultValue={values.group ?? 'none'} className="h-10 rounded-full border border-zinc-300 px-3 text-sm">
          <option value="none">ไม่จัดกลุ่ม</option>
          <option value="room">จัดกลุ่มตามห้อง</option>
          <option value="floor">จัดกลุ่มตามชั้น</option>
        </select>

        <select name="floor" defaultValue={values.floor ?? ''} className="h-10 rounded-full border border-zinc-300 px-3 text-sm">
          <option value="">ทุกชั้น</option>
          {floorOptions.map((f) => (
            <option key={f} value={f}>
              ชั้น {f}
            </option>
          ))}
          <option value="other">พื้นที่ส่วนกลาง</option>
        </select>
      </div>

      <div className="flex flex-wrap gap-3 text-sm text-zinc-700">
        {showMine && (
          <label className="flex items-center gap-1.5">
            <input type="checkbox" name="mine" value="on" defaultChecked={values.mine} className="h-4 w-4" />
            งานของฉัน
          </label>
        )}
        <label className="flex items-center gap-1.5">
          <input type="checkbox" name="special" value="on" defaultChecked={values.special} className="h-4 w-4" />
          งานพิเศษ
        </label>
        <label className="flex items-center gap-1.5">
          <input type="checkbox" name="stalled7" value="on" defaultChecked={values.stalled7} className="h-4 w-4" />
          ค้างเกิน 7 วัน
        </label>
      </div>

      {children}

      <button type="submit" className="h-11 rounded-lg bg-zinc-900 text-sm font-medium text-white">
        {submitLabel}
      </button>
    </form>
  );
}
