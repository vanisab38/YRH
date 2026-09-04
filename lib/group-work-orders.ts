// §3.1: "group by room and group by floor, worth more than any sort" — a
// worker going to 1504 does every job there in one trip instead of finding
// the second one next week. Groups preserve the incoming sort order both
// for which group comes first (the position of its first/most-urgent job)
// and for the jobs within a group, so switching sort still reorders a
// grouped view meaningfully instead of only reordering within each bucket.
export type Groupable = { locationCode: string; locationFloor?: number | null };

export function groupWorkOrders<T extends Groupable>(
  rows: T[],
  group: 'none' | 'room' | 'floor'
): { key: string; label: string; items: T[] }[] {
  if (group === 'none') return [];

  const order: string[] = [];
  const buckets = new Map<string, { label: string; items: T[] }>();

  for (const row of rows) {
    const key = group === 'room' ? row.locationCode : String(row.locationFloor ?? 'other');
    const label =
      group === 'room' ? row.locationCode : row.locationFloor != null ? `ชั้น ${row.locationFloor}` : 'พื้นที่ส่วนกลาง';

    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = { label, items: [] };
      buckets.set(key, bucket);
      order.push(key);
    }
    bucket.items.push(row);
  }

  return order.map((key) => ({ key, ...buckets.get(key)! }));
}
