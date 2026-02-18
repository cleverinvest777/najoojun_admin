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

const PAGE_SIZE = 50;

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  const fetchUsers = async (pageNum: number = 0, reset: boolean = false) => {
    if (pageNum === 0) setLoading(true);
    else setLoadingMore(true);

    const from = pageNum * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let query = supabase
      .from('users')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    if (search.trim()) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const { data, error, count } = await query;

    if (!error) {
      if (reset || pageNum === 0) {
        setUsers(data || []);
      } else {
        setUsers((prev) => [...prev, ...(data || [])]);
      }
      setTotalCount(count || 0);
      setHasMore((data || []).length === PAGE_SIZE);
    }

    setLoading(false);
    setLoadingMore(false);
  };

  // 검색어 변경 시 초기화
  useEffect(() => {
    setPage(0);
    fetchUsers(0, true);
  }, [search]);

  // 스크롤 감지
  useEffect(() => {
    const handleScroll = () => {
      const scrolledToBottom =
        window.innerHeight + window.scrollY >= document.body.offsetHeight - 200;

      if (scrolledToBottom && hasMore && !loadingMore && !loading) {
        const nextPage = page + 1;
        setPage(nextPage);
        fetchUsers(nextPage);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [hasMore, loadingMore, loading, page]);

  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-6">
        👥 사용자 관리
        <span className="text-gray-500 text-sm font-normal ml-3">총 {totalCount}명</span>
      </h2>

      {/* 검색 */}
      <div className="mb-6">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="이름 또는 이메일로 검색..."
          className="w-full max-w-sm bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 text-sm"
        />
      </div>

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
            {loading ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                  로딩 중...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                  검색 결과가 없습니다
                </td>
              </tr>
            ) : (
              users.map((user) => (
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
              ))
            )}
          </tbody>
        </table>

        {/* 하단 로딩 */}
        {loadingMore && (
          <div className="px-6 py-4 text-center text-gray-500 text-sm border-t border-gray-800">
            불러오는 중...
          </div>
        )}
        {!hasMore && users.length > 0 && (
          <div className="px-6 py-4 text-center text-gray-600 text-sm border-t border-gray-800">
            전체 {totalCount}명 표시 완료
          </div>
        )}
      </div>

      {selectedUser && (
        <UserDetailModal
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onUpdate={() => {
            fetchUsers(0, true);
            setSelectedUser(null);
          }}
        />
      )}
    </div>
  );
}