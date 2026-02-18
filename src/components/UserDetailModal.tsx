'use client';

import { supabase } from '@/lib/supabase';

interface User {
  id: string;
  email: string;
  name: string;
  point: number;
  is_admin: boolean;
  phone_number: string | null;
  birth_date: string | null;
  gender: string | null;
  marketing_agreed: boolean;
  created_at: string;
}

interface Props {
  user: User;
  onClose: () => void;
  onUpdate: () => void;
}

export default function UserDetailModal({ user, onClose, onUpdate }: Props) {
  const toggleAdmin = async () => {
    const { error } = await supabase
      .from('users')
      .update({ is_admin: !user.is_admin })
      .eq('id', user.id);

    if (!error) onUpdate();
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 rounded-2xl border border-gray-800 w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="text-xl font-bold text-white">{user.name || '이름 없음'}</h3>
            <p className="text-gray-400 text-sm mt-1">{user.email}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white transition-colors text-xl"
          >
            ✕
          </button>
        </div>

        {/* 정보 */}
        <div className="space-y-3 mb-6">
          {[
            { label: '포인트', value: `${user.point}P` },
            { label: '전화번호', value: user.phone_number || '-' },
            { label: '생년월일', value: user.birth_date || '-' },
            { label: '성별', value: user.gender || '-' },
            { label: '마케팅 동의', value: user.marketing_agreed ? '동의' : '미동의' },
            { label: '가입일', value: new Date(user.created_at).toLocaleDateString('ko-KR') },
          ].map((item) => (
            <div key={item.label} className="flex justify-between items-center py-2 border-b border-gray-800">
              <span className="text-gray-400 text-sm">{item.label}</span>
              <span className="text-white text-sm font-medium">{item.value}</span>
            </div>
          ))}
        </div>

        {/* 관리자 승격/해제 버튼 */}
        <button
          onClick={toggleAdmin}
          className={`w-full py-3 rounded-xl font-bold text-sm transition-colors ${
            user.is_admin
              ? 'bg-red-900/30 text-red-400 hover:bg-red-900/50 border border-red-800'
              : 'bg-emerald-900/30 text-emerald-400 hover:bg-emerald-900/50 border border-emerald-800'
          }`}
        >
          {user.is_admin ? '🔻 관리자 권한 해제' : '🔺 관리자로 승격'}
        </button>
      </div>
    </div>
  );
}