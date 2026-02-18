'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface AiSelection {
  id: number;
  date: string;
  pick1_stock_id: number | null;
  pick1_stock_name: string | null;
  pick2_stock_id: number | null;
  pick2_stock_name: string | null;
  pick3_stock_id: number | null;
  pick3_stock_name: string | null;
  is_announced: boolean;
  created_at: string;
}

const PICK_KEYS = ['pick1', 'pick2', 'pick3'] as const;
type PickKey = typeof PICK_KEYS[number];

export default function AiPickPage() {
  const [today, setToday] = useState('');
  const [todaySelection, setTodaySelection] = useState<AiSelection | null>(null);
  const [loading, setLoading] = useState(true);
  const [stockInput, setStockInput] = useState<Record<PickKey, string>>({
    pick1: '',
    pick2: '',
    pick3: '',
  });
  const [saving, setSaving] = useState<PickKey | null>(null);

  useEffect(() => {
    const todayStr = new Date().toLocaleDateString('sv-SE');
    setToday(todayStr);
    fetchTodaySelection(todayStr);
  }, []);

  const fetchTodaySelection = async (date: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from('aiselections')
      .select('*')
      .eq('date', date)
      .maybeSingle();

    if (!error) setTodaySelection(data);
    setLoading(false);
  };

  const handleSavePick = async (pickKey: PickKey) => {
    const stockName = stockInput[pickKey].trim();
    if (!stockName) return;

    try {
      setSaving(pickKey);

      if (todaySelection) {
        // 기존 row 업데이트
        const { error } = await supabase
          .from('aiselections')
          .update({
            [`${pickKey}_stock_name`]: stockName,
            [`${pickKey}_stock_id`]: null, // 나중에 stocks 테이블 연동 시 채움
            updated_at: new Date().toISOString(),
          })
          .eq('id', todaySelection.id);

        if (error) throw error;
      } else {
        // 새로운 row 생성
        const { error } = await supabase
          .from('aiselections')
          .insert({
            date: today,
            [`${pickKey}_stock_name`]: stockName,
            is_announced: false,
          });

        if (error) throw error;
      }

      await fetchTodaySelection(today);
      setStockInput((prev) => ({ ...prev, [pickKey]: '' }));
    } catch (err) {
      console.error('픽 저장 실패:', err);
    } finally {
      setSaving(null);
    }
  };

  const handleAnnounce = async () => {
    if (!todaySelection) return;

    const { error } = await supabase
      .from('aiselections')
      .update({ is_announced: true })
      .eq('id', todaySelection.id);

    if (!error) fetchTodaySelection(today);
  };

  const handleCancelPick = async (pickKey: PickKey) => {
    if (!todaySelection) return;

    const { error } = await supabase
      .from('aiselections')
      .update({
        [`${pickKey}_stock_name`]: null,
        [`${pickKey}_stock_id`]: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', todaySelection.id);

    if (!error) fetchTodaySelection(today);
  };

  if (loading) return <div className="text-gray-400">로딩 중...</div>;

  const allPicked =
    todaySelection?.pick1_stock_name &&
    todaySelection?.pick2_stock_name &&
    todaySelection?.pick3_stock_name;

  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-2">🤖 AI Pick 관리</h2>
      <p className="text-gray-400 text-sm mb-8">오늘({today}) 3종목을 하나씩 픽하세요</p>

      {/* 공개 여부 배너 */}
      {todaySelection?.is_announced ? (
        <div className="bg-emerald-900/30 border border-emerald-800 rounded-xl px-6 py-4 mb-8 flex items-center gap-3">
          <span className="text-emerald-400 text-lg">✅</span>
          <p className="text-emerald-400 font-medium">오늘의 AI픽이 공개되었습니다.</p>
        </div>
      ) : allPicked ? (
        <div className="bg-yellow-900/30 border border-yellow-800 rounded-xl px-6 py-4 mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-yellow-400 text-lg">⚠️</span>
            <p className="text-yellow-400 font-medium">3종목이 모두 선택되었습니다. 공개하시겠습니까?</p>
          </div>
          <button
            onClick={handleAnnounce}
            className="bg-emerald-500 hover:bg-emerald-400 text-black font-bold px-6 py-2 rounded-lg text-sm transition-colors"
          >
            공개하기
          </button>
        </div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-xl px-6 py-4 mb-8">
          <p className="text-gray-400 text-sm">3종목을 모두 선택하면 공개할 수 있습니다.</p>
        </div>
      )}

      {/* 픽 카드 3개 */}
      <div className="grid grid-cols-3 gap-6">
        {PICK_KEYS.map((pickKey, index) => {
          const pickedName = todaySelection?.[`${pickKey}_stock_name`];
          const isAnnounced = todaySelection?.is_announced;

          return (
            <div key={pickKey} className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-bold text-lg">Pick {index + 1}</h3>
                {pickedName && (
                  <span className="bg-emerald-500/20 text-emerald-400 text-xs px-2 py-1 rounded-full">선택됨</span>
                )}
              </div>

              {/* 선택된 종목 표시 */}
              {pickedName ? (
                <div className="mb-4">
                  <div className="bg-gray-800 rounded-xl px-4 py-4 flex items-center justify-between">
                    <span className="text-white font-bold text-lg">{pickedName}</span>
                    {!isAnnounced && (
                      <button
                        onClick={() => handleCancelPick(pickKey)}
                        className="text-gray-500 hover:text-red-400 transition-colors text-sm"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-gray-800/50 border border-dashed border-gray-700 rounded-xl px-4 py-6 mb-4 flex items-center justify-center">
                  <span className="text-gray-600 text-sm">미선택</span>
                </div>
              )}

              {/* 종목 입력 (공개 전, 미선택 시에만 표시) */}
              {!pickedName && !isAnnounced && (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={stockInput[pickKey]}
                    onChange={(e) => setStockInput((prev) => ({ ...prev, [pickKey]: e.target.value }))}
                    placeholder="종목명 입력"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 text-sm"
                    onKeyDown={(e) => e.key === 'Enter' && handleSavePick(pickKey)}
                  />
                  <button
                    onClick={() => handleSavePick(pickKey)}
                    disabled={saving === pickKey || !stockInput[pickKey].trim()}
                    className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-bold py-2 rounded-lg text-sm transition-colors"
                  >
                    {saving === pickKey ? '저장 중...' : '선택'}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}