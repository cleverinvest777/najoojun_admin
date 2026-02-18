'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import UserDetailModal from '@/components/UserDetailModal';

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

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error) setUsers(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  if (loading) return <div className="text-gray-400">로딩 중...</div>;

  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-6">
        👥 사용자 관리
        <span className="text-gray-500 text-sm font-normal ml-3">총 {users.length}명</span>
      </h2>

      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="text-left text-gray-400 text-sm font-medium px-6 py-4">이름</th>
              <th className="text-left text-gray-400 text-sm font-medium px-6 py-4">이메일</th>
              <th className="text-left text-gray-400 text-sm font-medium px-6 py-4">포인트</th>
              <th className="text-left text-gray-400 text-sm font-medium px-6 py-4">가입일</th>
              <th className="text-left text-gray-400 text-sm font-medium px-6 py-4">권한</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr
                key={user.id}
                onClick={() => setSelectedUser(user)}
                className="border-b border-gray-800 hover:bg-gray-800/50 cursor-pointer transition-colors"
              >
                <td className="px-6 py-4 text-white font-medium">{user.name || '-'}</td>
                <td className="px-6 py-4 text-gray-400 text-sm">{user.email}</td>
                <td className="px-6 py-4 text-emerald-400 font-bold">{user.point}P</td>
                <td className="px-6 py-4 text-gray-400 text-sm">
                  {new Date(user.created_at).toLocaleDateString('ko-KR')}
                </td>
                <td className="px-6 py-4">
                  {user.is_admin ? (
                    <span className="bg-emerald-500/20 text-emerald-400 text-xs px-2 py-1 rounded-full">관리자</span>
                  ) : (
                    <span className="bg-gray-700 text-gray-400 text-xs px-2 py-1 rounded-full">일반</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedUser && (
        <UserDetailModal
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onUpdate={() => {
            fetchUsers();
            setSelectedUser(null);
          }}
        />
      )}
    </div>
  );
}