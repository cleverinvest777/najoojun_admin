'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

interface Inquiry {
  id: string;
  user_id: string;
  title: string;
  content: string;
  is_answered: boolean;
  answer: string | null;
  answered_at: string | null;
  created_at: string;
  users:{
    name: string;
    email: string;
  }|null;
}

interface Props {
  inquiry: Inquiry;
  onClose: () => void;
  onUpdate: () => void;
}

export default function InquiryDetailModal({ inquiry, onClose, onUpdate }: Props) {
  const [answer, setAnswer] = useState(inquiry.answer || '');
  const [loading, setLoading] = useState(false);

  const handleSubmitAnswer = async () => {
    if (!answer.trim()) return;

    try {
      setLoading(true);
      const { error } = await supabase
        .from('inquiries')
        .update({
          answer,
          is_answered: true,
          answered_at: new Date().toISOString(),
        })
        .eq('id', inquiry.id);

      if (error) throw error;
      onUpdate();
    } catch (err) {
      console.error('답변 등록 실패:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 rounded-2xl border border-gray-800 w-full max-w-lg p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-3">
            <h3 className="text-xl font-bold text-white">{inquiry.title}</h3>
            <p className="text-gray-400 text-sm mt-1">
                {inquiry.users?.name || '-'} · {inquiry.users?.email || '-'}
            </p>
            {inquiry.is_answered ? (
              <span className="bg-emerald-500/20 text-emerald-400 text-xs px-2 py-1 rounded-full">답변완료</span>
            ) : (
              <span className="bg-yellow-500/20 text-yellow-400 text-xs px-2 py-1 rounded-full">미답변</span>
            )}
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-xl">✕</button>
        </div>

        {/* 문의 내용 */}
        <div className="bg-gray-800 rounded-xl p-4 mb-6">
          <p className="text-gray-400 text-xs mb-2">
            {new Date(inquiry.created_at).toLocaleDateString('ko-KR')}
          </p>
          <p className="text-white text-sm leading-relaxed">{inquiry.content}</p>
        </div>

        {/* 답변 입력 */}
        <div className="mb-4">
          <label className="text-gray-400 text-sm font-medium mb-2 block">
            {inquiry.is_answered ? '등록된 답변' : '답변 작성'}
          </label>
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="답변을 입력하세요..."
            rows={5}
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 text-sm resize-none"
          />
        </div>

        <button
          onClick={handleSubmitAnswer}
          disabled={loading || !answer.trim()}
          className="w-full py-3 rounded-xl font-bold text-sm bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black transition-colors"
        >
          {loading ? '등록 중...' : inquiry.is_answered ? '답변 수정' : '답변 등록'}
        </button>
      </div>
    </div>
  );
}