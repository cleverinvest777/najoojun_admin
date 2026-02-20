'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';

// 종목 타입 정의
interface Stock {
  code: string;
  name: string;
  market: string;
}

interface AiSelection {
  id: number;
  date: string;
  pick1_stock_id: string | null; // code가 string이므로 string으로 변경
  pick1_stock_name: string | null;
  pick2_stock_id: string | null;
  pick2_stock_name: string | null;
  pick3_stock_id: string | null;
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
  
  // 검색 관련 상태
  const [searchInputs, setSearchInputs] = useState<Record<PickKey, string>>({
    pick1: '', pick2: '', pick3: ''
  });
  const [searchResults, setSearchResults] = useState<Record<PickKey, Stock[]>>({
    pick1: [], pick2: [], pick3: []
  });
  const [isSearching, setIsSearching] = useState<Record<PickKey, boolean>>({
    pick1: false, pick2: false, pick3: false
  });

  useEffect(() => {
    const todayStr = new Date().toLocaleDateString('sv-SE');
    setToday(todayStr);
    fetchTodaySelection(todayStr);
  }, []);

  // 검색 로직 (Debounce 적용 가능하지만 여기선 단순화)
  useEffect(() => {
    PICK_KEYS.forEach(key => {
      const query = searchInputs[key];
      if (query.trim().length >= 2) {
        searchStocks(query, key);
      } else {
        setSearchResults(prev => ({ ...prev, [key]: [] }));
      }
    });
  }, [searchInputs]);

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

  const searchStocks = async (query: string, key: PickKey) => {
    setIsSearching(prev => ({ ...prev, [key]: true }));
    const { data, error } = await supabase
      .from('stocks')
      .select('code, name, market')
      .or(`name.ilike.%${query}%,code.ilike.%${query}%`)
      .limit(10); // 관리자용이므로 상위 10개만 표시

    if (!error && data) {
      setSearchResults(prev => ({ ...prev, [key]: data }));
    }
    setIsSearching(prev => ({ ...prev, [key]: false }));
  };

  const handleSelectStock = async (pickKey: PickKey, stock: Stock) => {
    try {
      if (todaySelection) {
        const { error } = await supabase
          .from('aiselections')
          .update({
            [`${pickKey}_stock_name`]: stock.name,
            [`${pickKey}_stock_id`]: stock.code,
            updated_at: new Date().toISOString(),
          })
          .eq('id', todaySelection.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('aiselections')
          .insert({
            date: today,
            [`${pickKey}_stock_name`]: stock.name,
            [`${pickKey}_stock_id`]: stock.code,
            is_announced: false,
          });
        if (error) throw error;
      }

      await fetchTodaySelection(today);
      setSearchInputs(prev => ({ ...prev, [pickKey]: '' }));
      setSearchResults(prev => ({ ...prev, [pickKey]: [] }));
    } catch (err) {
      console.error('픽 저장 실패:', err);
    }
  };

  // ... (handleAnnounce, handleCancelPick 로직은 동일)

  const handleAnnounce = async () => {
    if (!todaySelection) return;
    const { error } = await supabase.from('aiselections').update({ is_announced: true }).eq('id', todaySelection.id);
    if (!error) fetchTodaySelection(today);
  };

  const handleCancelPick = async (pickKey: PickKey) => {
    if (!todaySelection) return;
    const { error } = await supabase
      .from('aiselections')
      .update({ [`${pickKey}_stock_name`]: null, [`${pickKey}_stock_id`]: null, updated_at: new Date().toISOString() })
      .eq('id', todaySelection.id);
    if (!error) fetchTodaySelection(today);
  };

  if (loading) return <div className="p-8 text-gray-400">로딩 중...</div>;

  const allPicked = todaySelection?.pick1_stock_name && todaySelection?.pick2_stock_name && todaySelection?.pick3_stock_name;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h2 className="text-2xl font-bold text-white mb-2">🤖 AI Pick 관리</h2>
      <p className="text-gray-400 text-sm mb-8">오늘({today})의 AI 추천주를 선택하세요.</p>

      {/* 상태 배너 (기존과 동일) */}
      {todaySelection?.is_announced ? (
        <div className="bg-emerald-900/30 border border-emerald-800 rounded-xl px-6 py-4 mb-8 flex items-center gap-3">
          <span className="text-emerald-400 font-medium">✅ 공개 완료</span>
        </div>
      ) : allPicked ? (
        <div className="bg-yellow-900/30 border border-yellow-800 rounded-xl px-6 py-4 mb-8 flex items-center justify-between">
          <p className="text-yellow-400 font-medium">3종목 선택 완료. 공개 가능합니다.</p>
          <button onClick={handleAnnounce} className="bg-emerald-500 text-black font-bold px-6 py-2 rounded-lg text-sm">공개하기</button>
        </div>
      ) : null}

      {/* 픽 카드 3개 렌더링 부분 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {PICK_KEYS.map((pickKey, index) => {
          const pickedName = todaySelection?.[`${pickKey}_stock_name`];
          const pickedId = todaySelection?.[`${pickKey}_stock_id`];
          const isAnnounced = todaySelection?.is_announced;

          return (
            <div key={pickKey} className="bg-gray-900 border border-gray-800 rounded-2xl p-6 relative">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-bold text-lg">Pick {index + 1}</h3>
                {pickedName && (
                  <span className="bg-emerald-500/20 text-emerald-400 text-[10px] px-2 py-1 rounded-full font-bold">SET</span>
                )}
              </div>

              {/* 1. 종목이 선택된 경우: 미선택 자리에 종목명 표시 */}
              {pickedName ? (
                <div className="bg-gray-800 border border-emerald-500/30 rounded-xl p-4 flex justify-between items-center animate-in fade-in duration-300">
                  <div>
                    <div className="text-white font-bold text-lg">{pickedName}</div>
                    <div className="text-gray-500 text-xs">{pickedId}</div>
                  </div>
                  {!isAnnounced && (
                    <button 
                      onClick={() => handleCancelPick(pickKey)} 
                      className="text-gray-500 hover:text-red-400 transition-colors p-2"
                      title="취소"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ) : (
                /* 2. 종목이 선택되지 않은 경우: 검색창 표시 */
                <div className="relative">
                  <input
                    type="text"
                    value={searchInputs[pickKey]}
                    onChange={(e) => setSearchInputs(prev => ({ ...prev, [pickKey]: e.target.value }))}
                    placeholder="종목명 또는 코드 검색"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-4 text-white focus:border-emerald-500 outline-none text-sm transition-all"
                  />
                  
                  {/* 검색 결과 드롭다운 (검색어가 있을 때만) */}
                  {searchInputs[pickKey].trim().length > 0 && searchResults[pickKey].length > 0 && (
                    <div className="absolute z-20 w-full mt-2 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto">
                      {searchResults[pickKey].map((stock) => (
                        <button
                          key={stock.code}
                          onClick={() => handleSelectStock(pickKey, stock)}
                          className="w-full text-left px-4 py-3 hover:bg-emerald-500/10 flex justify-between items-center border-b border-gray-700/50 last:border-0 group"
                        >
                          <div>
                            <div className="text-white text-sm font-bold group-hover:text-emerald-400">{stock.name}</div>
                            <div className="text-gray-500 text-xs">{stock.code}</div>
                          </div>
                          <span className="text-gray-600 text-[10px] font-mono">{stock.market}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  
                  {/* 검색 중일 때 로딩 표시 */}
                  {isSearching[pickKey] && (
                    <div className="absolute right-4 top-4">
                      <div className="animate-spin h-4 w-4 border-2 border-emerald-500 border-t-transparent rounded-full"></div>
                    </div>
                  )}
                  
                  {/* 검색어가 없을 때 보여줄 안내 문구 */}
                  {searchInputs[pickKey].length === 0 && (
                    <p className="mt-2 text-[11px] text-gray-600 px-1">검색 후 종목을 클릭하면 선택됩니다.</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}