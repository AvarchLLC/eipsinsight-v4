import { redirect } from 'next/navigation';

/** Canonical Overview lives at /pq/overview (named like the other tabs). */
export default function PqIndexPage() {
  redirect('/pq/overview');
}
