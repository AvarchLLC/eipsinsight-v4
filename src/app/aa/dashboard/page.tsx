import { redirect } from 'next/navigation';

// Overview and Dashboard merged into the canonical /aa/overview dashboard.
export default function AaDashboardRedirect() {
  redirect('/aa/overview');
}
