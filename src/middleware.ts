import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isApiOrRpc = pathname.startsWith('/api/') || pathname.startsWith('/rpc/');
  if (!isApiOrRpc) return NextResponse.next();

  const exemptPaths = [
    '/api/auth/',
    '/api/validate-eip',
    '/api/analytics/revalidate',
    '/rpc/',  // 👈 exempt RPC — procedures handle their own auth and rate limiting
  ];
  const isExempt = exemptPaths.some(path => pathname.startsWith(path));
  if (isExempt) return NextResponse.next();

  // Note: Rate limiting is handled in API routes and RPC procedures
  // Middleware in Edge Runtime cannot use ioredis
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*', '/rpc/:path*'],
};