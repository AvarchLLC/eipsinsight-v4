import { redirect } from 'next/navigation';

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function StandardsRedirectPage({ searchParams }: Props) {
  const sp = await searchParams;
  const params = new URLSearchParams();
  params.set('tab', 'proposals');
  for (const [k, v] of Object.entries(sp)) {
    if (k === 'tab' || v == null) continue;
    if (Array.isArray(v)) {
      v.forEach((val) => params.append(k, val));
    } else {
      params.set(k, v);
    }
  }
  redirect(`/explore?${params.toString()}`);
}
