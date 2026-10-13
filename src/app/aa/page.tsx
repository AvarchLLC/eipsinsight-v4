import { redirect } from 'next/navigation';

/** Canonical Overview lives at /aa/overview (named like the other hub tabs). */
export default function AaIndexPage() {
  redirect('/aa/overview');
}
