import { redirect } from 'next/navigation';

// Overview and Dashboard merged into the /aa dashboard.
export default function AaDashboardRedirect() {
  redirect('/aa');
}
