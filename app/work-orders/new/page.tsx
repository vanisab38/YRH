import Link from 'next/link';
import { verifySession } from '@/lib/dal';
import { getLocationsForPicker, getActiveCategories, getActiveWorkers } from '@/lib/queries/work-orders';
import { isPhotoStorageConfigured } from '@/lib/storage';
import { NewWorkOrderForm } from './NewWorkOrderForm';

// New work order (§3): created_by and opened_date fill automatically from
// the session / server clock — canCreateWorkOrder() is true for every role
// (admin, office, worker), so there's no permission gate here, only auth.
export default async function NewWorkOrderPage() {
  await verifySession();
  const [locations, categories, workers] = await Promise.all([
    getLocationsForPicker(),
    getActiveCategories(),
    getActiveWorkers(),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-6">
      <header className="flex items-center gap-3">
        <Link href="/" className="text-zinc-500 hover:text-zinc-900" aria-label="กลับ">
          ←
        </Link>
        <h1 className="text-lg font-semibold text-zinc-900">เปิดงานใหม่</h1>
      </header>
      <NewWorkOrderForm
        locations={locations}
        categories={categories}
        workers={workers}
        photosEnabled={isPhotoStorageConfigured()}
      />
    </div>
  );
}
