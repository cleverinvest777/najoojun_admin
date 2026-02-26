'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Siren, MailQuestion, Bot, Users, BarChart3, SquarePlus} from 'lucide-react';

const menus = [
  { label: '사용자 관리', href: '/console/users', icon: <Users size={20} /> },
  { label: 'AI Pick', href: '/console/aipick', icon: <Bot size={20} /> },  
  { label: '문의 관리', href: '/console/inquiries', icon: <MailQuestion size={20} /> },
  { label: '신고 관리', href: '/console/reports', icon: <Siren size={20} /> },
  { label: '팝업 관리', href: '/console/popup', icon: <SquarePlus size={20} /> },
  { label: 'AI 주간픽(현재안씀)', href: '/console/swing_pick/', icon: <BarChart3 size={20} /> },
];

export default function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-gray-950 flex">
      {/* 사이드바 */}
      <aside
        className={`${
          collapsed ? 'w-16' : 'w-60'
        } bg-gray-900 border-r border-gray-800 flex flex-col transition-all duration-300`}
      >
        {/* 헤더 */}
        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
          {!collapsed && (
            <div>
              <h1 className="text-white font-bold text-lg">🤖 관리자</h1>
              <p className="text-gray-500 text-xs mt-1">나도 주식전문가</p>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="text-gray-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-gray-800 ml-auto"
          >
            {collapsed ? '▶' : '◀'}
          </button>
        </div>

        {/* 메뉴 */}
        <nav className="flex-1 p-2 space-y-1">
          {menus.map((menu) => (
            <button
              key={menu.href}
              onClick={() => router.push(menu.href)}
              className={`w-full text-left px-3 py-3 rounded-lg text-sm font-medium transition-colors flex items-center gap-3 ${
                pathname === menu.href
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
              title={collapsed ? menu.label : ''}
            >
              <span className="text-lg">{menu.icon}</span>
              {!collapsed && <span>{menu.label}</span>}
            </button>
          ))}
        </nav>

        {/* 로그아웃 */}
        <div className="p-2 border-t border-gray-800">
          <button
            onClick={handleLogout}
            className="w-full text-left px-3 py-3 rounded-lg text-sm font-medium text-gray-400 hover:bg-gray-800 hover:text-red-400 transition-colors flex items-center gap-3"
            title={collapsed ? '로그아웃' : ''}
          >
            <span className="text-lg">🚪</span>
            {!collapsed && <span>로그아웃</span>}
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