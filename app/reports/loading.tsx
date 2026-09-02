import { LoadingScreen } from '@/app/components/LoadingScreen';

// Wraps /reports and every nested report page (special-work, worker-
// activity, ageing, rooms) in one Suspense boundary — see loading.js docs:
// "will automatically wrap the page.js file and any children below."
export default function Loading() {
  return <LoadingScreen />;
}
