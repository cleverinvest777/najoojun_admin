// src/middleware.ts
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  let response = NextResponse.next({ request: req })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return req.cookies.get(name)?.value },
        set(name: string, value: string, options: CookieOptions) {
          req.cookies.set({ name, value, ...options })
          response = NextResponse.next({ request: req })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          req.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({ request: req })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  // ⚠️ 반드시 getUser()를 호출해야 세션이 서버 측에서 인식되고 갱신됩니다.
  const { data: { user } } = await supabase.auth.getUser()

  const { pathname } = req.nextUrl

  // 1. 관리자 페이지 접근 제어
  if (pathname.startsWith('/console')) {
    if (!user) {
      return NextResponse.redirect(new URL('/', req.url))
    }

    // 관리자 여부 재검증 (보안)
    const { data: userData } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (!userData?.is_admin) {
      await supabase.auth.signOut() // 강제 로그아웃
      return NextResponse.redirect(new URL('/', req.url))
    }
  }

  // 2. 이미 로그인했는데 로그인 페이지로 가려는 경우
  if (pathname === '/' && user) {
    return NextResponse.redirect(new URL('/console', req.url))
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}