'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import InquiryDetailModal from '@/components/InquiryDetailModal';

interface Inquiry {
  id: string;
  user_id: string;
  title: string;
  content: string;
  is_answered: boolean;
  answer: string | null;
  answered_at: string | null;
  created_at: string;
  users: {
    name: string;
    email: string;
  } | null;
}

export default function InquiriesPage() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null);
  const [filter, setFilter] = useState<'all' | 'answered' | 'unanswered'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchInquiries = async () => {
    const { data, error } = await supabase
      .from('inquiries')
      .select('*, users(name, email)')
      .order('created_at', { ascending: false });

    if (!error) setInquiries(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchInquiries();
  }, []);

  const filtered = inquiries.filter((i) => {
    if (filter === 'answered' && !i.is_answered) return false;
    if (filter === 'unanswered' && i.is_answered) return false;

    const createdDate = i.created_at.split('T')[0];
    if (startDate && createdDate < startDate) return false;
    if (endDate && createdDate > endDate) return false;

    return true;
  });

  if (loading) return <div className="text-gray-400">로딩 중...</div>;

  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-6">
        📩 문의 관리
        <span className="text-gray-500 text-sm font-normal ml-3">총 {inquiries.length}건</span>
      </h2>

      {/* 필터 영역 */}
      <div className="flex flex-wrap gap-3 mb-6 items-center">
        {/* 상태 필터 */}
        <div className="flex gap-2">
          {[
            { label: '전체', value: 'all' },
            { label: '미답변', value: 'unanswered' },
            { label: '답변완료', value: 'answered' },
          ].map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value as any)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === f.value
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-800'
                  : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* 날짜 필터 */}
        <div className="flex items-center gap-2 ml-4">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
          />
          <span className="text-gray-500">~</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
          />
          {(startDate || endDate) && (
            <button
              onClick={() => { setStartDate(''); setEndDate(''); }}
              className="text-gray-400 hover:text-white text-sm px-3 py-2 bg-gray-800 rounded-lg"
            >
              초기화
            </button>
          )}
        </div>
      </div>

      {/* 문의 목록 */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="text-left text-gray-400 text-sm font-medium px-6 py-4">상태</th>
              <th className="text-left text-gray-400 text-sm font-medium px-6 py-4">이름</th>
              <th className="text-left text-gray-400 text-sm font-medium px-6 py-4">이메일</th>
              <th className="text-left text-gray-400 text-sm font-medium px-6 py-4">제목</th>
              <th className="text-left text-gray-400 text-sm font-medium px-6 py-4">접수일</th>
              <th className="text-left text-gray-400 text-sm font-medium px-6 py-4">답변일</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length > 0 ? filtered.map((inquiry) => (
              <tr
                key={inquiry.id}
                onClick={() => setSelectedInquiry(inquiry)}
                className="border-b border-gray-800 hover:bg-gray-800/50 cursor-pointer transition-colors"
              >
                <td className="px-6 py-4">
                  {inquiry.is_answered ? (
                    <span className="bg-emerald-500/20 text-emerald-400 text-xs px-2 py-1 rounded-full">답변완료</span>
                  ) : (
                    <span className="bg-yellow-500/20 text-yellow-400 text-xs px-2 py-1 rounded-full">미답변</span>
                  )}
                </td>
                <td className="px-6 py-4 text-white font-medium">
                  {inquiry.users?.name || '-'}
                </td>
                <td className="px-6 py-4 text-gray-400 text-sm">
                  {inquiry.users?.email || '-'}
                </td>
                <td className="px-6 py-4 text-white">{inquiry.title}</td>
                <td className="px-6 py-4 text-gray-400 text-sm">
                  {new Date(inquiry.created_at).toLocaleDateString('ko-KR')}
                </td>
                <td className="px-6 py-4 text-gray-400 text-sm">
                  {inquiry.answered_at
                    ? new Date(inquiry.answered_at).toLocaleDateString('ko-KR')
                    : '-'}
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                  문의가 없습니다
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedInquiry && (
        <InquiryDetailModal
          inquiry={selectedInquiry}
          onClose={() => setSelectedInquiry(null)}
          onUpdate={() => {
            fetchInquiries();
            setSelectedInquiry(null);
          }}
        />
      )}
    </div>
  );
}