'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface User {
  id: string;
  email: string;
  username: string;
  name: string;
  point: number;
  is_admin: boolean;
  is_suspended: boolean;
  suspended_reason: string | null;
  phone_number: string | null;
  birth_date: string | null;
  gender: string | null;
  marketing_agreed: boolean;
  created_at: string;
  suspicious_flags?: string[];
}

interface Props {
  user: User;
  onClose: () => void;
  onUpdate: () => void;
}

interface PointHistoryItem {
  id: string;
  amount: number;
  balance: number;
  reason: string;
  meta: Record<string, any> | null;
  created_at: string;
}

export default function UserDetailModal({ user, onClose, onUpdate }: Props) {
  const [saving, setSaving] = useState(false);
  const [suspendReason, setSuspendReason] = useState(user.suspended_reason ?? '');
  const [pointHistory, setPointHistory] = useState<PointHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  const reasonLabelMap: Record<string, string> = {
    attendance: '출석 체크',
    attendance_bonus: '연속 출석 보너스',
    quiz: '퀴즈',
    pick_win: '픽 승리',
    streak_bonus: '연승 보너스',
    referral_given: '추천인 지급',
    referral_received: '추천 가입 보상',
    admin: '관리자 지급',
    reward_use: '쿠폰 교환',
    reward_refund: '쿠폰 환불',
  };

  const reasonClassMap: Record<string, string> = {
    attendance: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20',
    attendance_bonus: 'text-yellow-300 bg-yellow-500/10 border-yellow-500/20',
    quiz: 'text-sky-300 bg-sky-500/10 border-sky-500/20',
    pick_win: 'text-green-300 bg-green-500/10 border-green-500/20',
    streak_bonus: 'text-amber-300 bg-amber-500/10 border-amber-500/20',
    referral_given: 'text-violet-300 bg-violet-500/10 border-violet-500/20',
    referral_received: 'text-fuchsia-300 bg-fuchsia-500/10 border-fuchsia-500/20',
    admin: 'text-red-300 bg-red-500/10 border-red-500/20',
    reward_use: 'text-orange-300 bg-orange-500/10 border-orange-500/20',
    reward_refund: 'text-cyan-300 bg-cyan-500/10 border-cyan-500/20',
  };

  const suspiciousLabels = useMemo(() => {
    const labelMap: Record<string, string> = {
      daily_300: '24시간 300P 이상',
      hourly_10: '1시간 내 10회 이상',
      single_200: '단건 200P 초과',
    };
    return (user.suspicious_flags ?? []).map((flag) => labelMap[flag] ?? flag);
  }, [user.suspicious_flags]);

  useEffect(() => {
    let mounted = true;

    const fetchPointHistory = async () => {
      setHistoryLoading(true);
      const { data, error } = await supabase
        .from('point_history')
        .select('id, amount, balance, reason, meta, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (!mounted) return;

      if (error) {
        console.error('포인트 히스토리 조회 실패:', error);
        setPointHistory([]);
      } else {
        setPointHistory((data ?? []) as PointHistoryItem[]);
      }

      setHistoryLoading(false);
    };

    fetchPointHistory();

    return () => {
      mounted = false;
    };
  }, [user.id]);

  const toggleAdmin = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('users')
      .update({ is_admin: !user.is_admin })
      .eq('id', user.id);

    setSaving(false);
    if (error) {
      window.alert(error.message);
      return;
    }
    onUpdate();
  };

  const toggleSuspension = async () => {
    if (!user.is_suspended && !suspendReason.trim()) {
      window.alert('정지 사유를 입력해주세요.');
      return;
    }

    setSaving(true);
    const { error } = await supabase.rpc('set_user_suspension', {
      p_target_user_id: user.id,
      p_is_suspended: !user.is_suspended,
      p_reason: !user.is_suspended ? suspendReason.trim() : null,
    });
    setSaving(false);

    if (error) {
      window.alert(error.message);
      return;
    }
    onUpdate();
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
            <p className="text-gray-400 text-sm mt-1">{user.username}</p>
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
            { label: '계정 상태', value: user.is_suspended ? '정지' : '정상' },
            { label: '가입일', value: new Date(user.created_at).toLocaleDateString('ko-KR') },
          ].map((item) => (
            <div key={item.label} className="flex justify-between items-center py-2 border-b border-gray-800">
              <span className="text-gray-400 text-sm">{item.label}</span>
              <span className="text-white text-sm font-medium">{item.value}</span>
            </div>
          ))}
        </div>

        {suspiciousLabels.length > 0 && (
          <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
            <div className="text-amber-300 text-sm font-bold mb-2">의심 신호</div>
            <div className="flex flex-wrap gap-2">
              {suspiciousLabels.map((label) => (
                <span key={label} className="rounded-full bg-amber-500/15 px-2 py-1 text-xs text-amber-200">
                  {label}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="mb-6">
          <label className="block text-sm text-gray-400 mb-2">정지 사유</label>
          <textarea
            value={suspendReason}
            onChange={(e) => setSuspendReason(e.target.value)}
            placeholder="정지 사유를 입력하세요"
            rows={3}
            className="w-full rounded-xl border border-gray-800 bg-gray-950 px-4 py-3 text-sm text-white outline-none focus:border-amber-500"
          />
        </div>

        <div className="mb-6">
          <div className="mb-3 flex items-center justify-between">
            <h4 className="text-sm font-bold text-white">포인트 히스토리</h4>
            <span className="text-xs text-gray-500">최근 20건</span>
          </div>

          <div className="max-h-72 space-y-3 overflow-y-auto rounded-xl border border-gray-800 bg-gray-950 p-3">
            {historyLoading ? (
              <div className="py-8 text-center text-sm text-gray-500">불러오는 중...</div>
            ) : pointHistory.length === 0 ? (
              <div className="py-8 text-center text-sm text-gray-500">포인트 변동 내역이 없습니다.</div>
            ) : (
              pointHistory.map((item) => (
                <div key={item.id} className="rounded-xl border border-gray-800 bg-gray-900 p-3">
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full border px-2 py-1 text-xs font-semibold ${reasonClassMap[item.reason] ?? 'text-gray-300 bg-gray-800 border-gray-700'}`}>
                        {reasonLabelMap[item.reason] ?? item.reason}
                      </span>
                      <span className={`text-sm font-bold ${item.amount > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {item.amount > 0 ? `+${item.amount}` : item.amount}P
                      </span>
                    </div>
                    <div className="text-right text-xs text-gray-500">
                      {new Date(item.created_at).toLocaleString('ko-KR')}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">잔액</span>
                    <span className="font-medium text-white">{item.balance.toLocaleString()}P</span>
                  </div>

                  {/* {item.meta && Object.keys(item.meta).length > 0 && (
                    <div className="mt-2 rounded-lg bg-black/20 px-3 py-2 text-xs text-gray-400">
                      <pre className="whitespace-pre-wrap break-all">{JSON.stringify(item.meta, null, 2)}</pre>
                    </div>
                  )} */}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3">
          <button
            onClick={toggleSuspension}
            disabled={saving}
            className={`w-full py-3 rounded-xl font-bold text-sm transition-colors ${
              user.is_suspended
                ? 'bg-emerald-900/30 text-emerald-400 hover:bg-emerald-900/50 border border-emerald-800'
                : 'bg-red-900/30 text-red-400 hover:bg-red-900/50 border border-red-800'
            } ${saving ? 'opacity-60 cursor-not-allowed' : ''}`}
          >
            {user.is_suspended ? '계정 정지 해제' : '계정 정지'}
          </button>

          <button
            onClick={toggleAdmin}
            disabled={saving}
            className={`w-full py-3 rounded-xl font-bold text-sm transition-colors ${
              user.is_admin
                ? 'bg-red-900/30 text-red-400 hover:bg-red-900/50 border border-red-800'
                : 'bg-emerald-900/30 text-emerald-400 hover:bg-emerald-900/50 border border-emerald-800'
            } ${saving ? 'opacity-60 cursor-not-allowed' : ''}`}
          >
            {user.is_admin ? '관리자 권한 해제' : '관리자로 승격'}
          </button>
        </div>
      </div>
    </div>
  );
}
