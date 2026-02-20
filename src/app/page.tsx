// middleware.ts
import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  let res = NextResponse.next({ request: req });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return req.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => req.cookies.set(name, value));
          res = NextResponse.next({ request: req });
          cookiesToSet.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
        },
      },
    }
  );

  // 세션 정보 가져오기
  const { data: { user } } = await supabase.auth.getUser();
  const url = req.nextUrl.clone();
  const { pathname } = url;

  // 1. 비로그인 상태에서 관리자 페이지 접근 시 -> 로그인 페이지로
  if (!user && pathname.startsWith('/console') && pathname !== '/console/login') {
    url.pathname = '/console/login';
    return NextResponse.redirect(url);
  }

  // 2. 로그인 상태 관리
  if (user) {
    // 관리자 여부 확인
    const { data: userData } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    // 2-1. 관리자가 아닌데 /console에 접근한 경우 -> 메인으로 (루프 방지 중요)
    if (pathname.startsWith('/console') && !userData?.is_admin) {
        // 이미 메인 페이지라면 리다이렉트 하지 않음 (루프 방지)
        return NextResponse.redirect(new URL('/', req.url));
    }

    // 2-2. 관리자가 로그인 페이지에 접근한 경우 -> 관리자 메인으로
    if (pathname === '/console/login' && userData?.is_admin) {
      url.pathname = '/console';
      return NextResponse.redirect(url);
    }
  }

  return res;
}

export const config = {
  // static 파일이나 api 경로는 미들웨어를 태우지 않도록 제외하는 것이 안전합니다.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};