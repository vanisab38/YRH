import Link from 'next/link';
import { verifySession } from '@/lib/dal';
import { getAllLocationsForPicker, getLocationByCode, getRoomWorkOrders, getRoomCategoryCounts } from '@/lib/queries/rooms';
import { formatThaiDate } from '@/lib/dates';
import { CategoryBadge } from '@/app/components/CategoryBadge';
import { StatusPill } from '@/app/components/StatusPill';

// Room history (§3): "pick a room, see every work order ever raised on it,
// newest first, with per-category counts." What the owner opens when a
// guest complains something keeps breaking.
export default async function RoomHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  await verifySession();
  const { code } = await searchParams;
  const [locationsList, location] = await Promise.all([
    getAllLocationsForPicker(),
    code ? getLocationByCode(code) : Promise.resolve(null),
  ]);

  const [workOrdersList, categoryCounts] = location
    ? await Promise.all([getRoomWorkOrders(location.id), getRoomCategoryCounts(location.id)])
    : [[], []];

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-6">
      <header className="flex items-center gap-3">
        <Link href="/" className="text-zinc-500 hover:text-zinc-900" aria-label="กลับ">
          ←
        </Link>
        <h1 className="text-lg font-semibold text-zinc-900">ประวัติห้อง / พื้นที่</h1>
      </header>

      <form className="flex gap-2">
        <input
          name="code"
          list="room-options"
          defaultValue={code ?? ''}
          autoComplete="off"
          placeholder="ค้นหาห้อง เช่น 1408"
          className="h-12 flex-1 rounded-lg border border-zinc-300 px-4 text-base focus:border-zinc-500 focus:outline-none"
        />
        <datalist id="room-options">
          {locationsList.map((loc) => (
            <option key={loc.id} value={loc.code} />
          ))}
        </datalist>
        <button type="submit" className="h-12 rounded-lg bg-zinc-900 px-5 text-base font-medium text-white">
          ค้นหา
        </button>
      </form>

      {code && !location && (
        <p className="text-sm text-zinc-500">ไม่พบห้อง/พื้นที่ &quot;{code}&quot;</p>
      )}

      {location && (
        <>
          <section className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold text-zinc-700">
              {location.code} — ทั้งหมด {workOrdersList.length} งาน
            </h2>
            {categoryCounts.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {categoryCounts.map((c) => (
                  <span
                    key={c.categoryName}
                    className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2.5 py-1 text-xs text-zinc-700"
                  >
                    {c.categoryName} × {c.count}
                  </span>
                ))}
              </div>
            )}
          </section>

          <section className="flex flex-col gap-2">
            {workOrdersList.map((wo) => (
              <Link
                key={wo.id}
                href={`/work-orders/${wo.id}`}
                className="flex flex-col gap-1.5 rounded-lg border border-zinc-200 p-3 hover:border-zinc-400"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-sm text-zinc-500">{wo.woNo}</span>
                  <StatusPill status={wo.status} />
                </div>
                <CategoryBadge name={wo.categoryName} colour={wo.categoryColour} isSpecial={wo.categoryIsSpecial} />
                <p className="line-clamp-2 text-sm text-zinc-600">{wo.description}</p>
                <p className="text-xs text-zinc-400">{formatThaiDate(wo.openedDate)}</p>
              </Link>
            ))}
          </section>
        </>
      )}
    </div>
  );
}
