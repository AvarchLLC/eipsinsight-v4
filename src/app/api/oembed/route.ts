import { NextRequest, NextResponse } from 'next/server';

const ALLOWED_PROVIDERS = [
  'https://publish.twitter.com/oembed',
];

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');
  if (!url) {
    return NextResponse.json({ error: 'Missing url param' }, { status: 400 });
  }

  let oembedEndpoint: string;
  if (/https?:\/\/(www\.)?(twitter\.com|x\.com)\/\w+\/status\/\d+/i.test(url)) {
    oembedEndpoint = `https://publish.twitter.com/oembed?url=${encodeURIComponent(url)}&omit_script=1&dnt=1`;
  } else {
    return NextResponse.json({ error: 'Unsupported URL' }, { status: 400 });
  }

  try {
    const res = await fetch(oembedEndpoint, {
      headers: { 'User-Agent': 'EIPsInsight/1.0' },
      next: { revalidate: 3600 },
    });
    if (!res.ok) throw new Error(`oEmbed fetch failed: ${res.status}`);
    const data = await res.json() as Record<string, unknown>;
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch embed' }, { status: 502 });
  }
}
