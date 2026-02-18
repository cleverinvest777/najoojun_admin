'use client';

import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';

const menus = [
  { label: '사용자 관리', href: '/console/users', icon: '👥' },
  { label: 'AI Pick', href: '/console/aipick', icon: '🤖' },
  { label: '문의 관리', href: '/console/inquiries', icon: '📩' },
];

export default function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-gray-950 flex">
      {/* 사이드바 */}
      <aside className="w-60 bg-gray-900 border-r border-gray-800 flex flex-col">
        <div className="p-6 border-b border-gray-800">
          <h1 className="text-white font-bold text-lg">🤖 관리자</h1>
          <p className="text-gray-500 text-xs mt-1">나도 주식전문가</p>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {menus.map((menu) => (
            <button
              key={menu.href}
              onClick={() => router.push(menu.href)}
              className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                pathname === menu.href
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
            >
              {menu.icon} {menu.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-800">
          <button
            onClick={handleLogout}
            className="w-full text-left px-4 py-3 rounded-lg text-sm font-medium text-gray-400 hover:bg-gray-800 hover:text-red-400 transition-colors"
          >
            🚪 로그아웃
          </button>
        </div>
      </aside>

      {/* 메인 콘텐츠 */}
      <main className="flex-1 p-8 overflow-auto">
        {children}
      </main>
    </div>
  );
}