// // middleware.ts
// import { createServerClient } from '@supabase/ssr';
// import { NextResponse } from 'next/server';
// import type { NextRequest } from 'next/server';

// export async function middleware(req: NextRequest) {
//   let res = NextResponse.next({
//     request: req,
//   });

//   // 1. 미들웨어용 Supabase 클라이언트 생성
//   const supabase = createServerClient(
//     process.env.NEXT_PUBLIC_SUPABASE_URL!,
//     process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
//     {
//       cookies: {
//         getAll() {
//           return req.cookies.getAll();
//         },
//         setAll(cookiesToSet) {
//           cookiesToSet.forEach(({ name, value, options }) => {
//             req.cookies.set(name, value);
//           });
//           res = NextResponse.next({
//             request: req,
//           });
//           cookiesToSet.forEach(({ name, value, options }) => {
//             res.cookies.set(name, value, options);
//           });
//         },
//       },
//     }
//   );

//   // 2. 세션 확인
//   const { data: { user } } = await supabase.auth.getUser();

//   // 3. /console 경로 
//   const isConsolePath = req.nextUrl.pathname.startsWith('/console');
//   const isLoginPage = req.nextUrl.pathname === '/console/login';
//   if (!user && isConsolePath && !isLoginPage) {
//     return NextResponse.redirect(new URL('/console/login', req.url));
//   }

//   // 4. (선택) 관리자 권한 체크 추가
//   if (user && req.nextUrl.pathname.startsWith('/console')) {
//     // 로그인은 했지만 관리자가 아닌 경우
//     const { data: userData } = await supabase
//       .from('users')
//       .select('is_admin')
//       .eq('id', user.id)
//       .single();

//     if (!userData?.is_admin) {
//       // 관리자가 아니면 메인 페이지로 리다이렉트
//       return NextResponse.redirect(new URL('/', req.url));
//     }
//   }

//   // 5. 로그인한 상태에서 /console/login 접근 시 대시보드로 리다이렉트
//   if (user && req.nextUrl.pathname === '/console/login') {
//     return NextResponse.redirect(new URL('/console', req.url));
//   }

//   return res;
// }

// export const config = {
//   matcher: ['/console/:path*'],
// };