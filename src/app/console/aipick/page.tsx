'use client';

import { useEffect, useState } from 'react';
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
  pick1_stock_id: string | null;
  pick1_stock_name: string | null;
  pick2_stock_id: string | null;
  pick2_stock_name: string | null;
  pick3_stock_id: string | null;
  pick3_stock_name: string | null;
  is_announced: boolean;
  created_at: string;
  updated_at?: string;
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
  const [editingPick, setEditingPick] = useState<PickKey | null>(null);

  useEffect(() => {
    const todayStr = new Date().toLocaleDateString('sv-SE');
    setToday(todayStr);
    fetchTodaySelection(todayStr);
  }, []);

  // 검색 로직
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
      .limit(10);

    if (!error && data) {
      setSearchResults(prev => ({ ...prev, [key]: data }));
    }
    setIsSearching(prev => ({ ...prev, [key]: false }));
  };

  const handleSelectStock = async (pickKey: PickKey, stock: Stock) => {
    try {
      if (todaySelection) {
        // 기존 선택 업데이트
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
        // 신규 선택 생성
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
      setEditingPick(null);
    } catch (err) {
      console.error('픽 저장 실패:', err);
      alert('저장 실패: ' + (err as Error).message);
    }
  };

  const handleAnnounce = async () => {
    if (!todaySelection) return;
    const { error } = await supabase
      .from('aiselections')
      .update({ 
        is_announced: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', todaySelection.id);
    
    if (!error) {
      alert('공개 완료!');
      fetchTodaySelection(today);
    } else {
      alert('공개 실패: ' + error.message);
    }
  };

  const handleEditPick = (pickKey: PickKey) => {
    setEditingPick(pickKey);
    setSearchInputs(prev => ({ ...prev, [pickKey]: '' }));
  };

  const handleCancelEdit = (pickKey: PickKey) => {
    setEditingPick(null);
    setSearchInputs(prev => ({ ...prev, [pickKey]: '' }));
    setSearchResults(prev => ({ ...prev, [pickKey]: [] }));
  };

  const handleDeletePick = async (pickKey: PickKey) => {
    if (!todaySelection) return;
    if (!confirm(`Pick ${pickKey.slice(-1)}를 삭제하시겠습니까?`)) return;

    const { error } = await supabase
      .from('aiselections')
      .update({ 
        [`${pickKey}_stock_name`]: null, 
        [`${pickKey}_stock_id`]: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', todaySelection.id);
    
    if (!error) {
      fetchTodaySelection(today);
      setEditingPick(null);
    } else {
      alert('삭제 실패: ' + error.message);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <div className="text-gray-400">로딩 중...</div>
      </div>
    );
  }

  const allPicked = todaySelection?.pick1_stock_name && 
                    todaySelection?.pick2_stock_name && 
                    todaySelection?.pick3_stock_name;
  const isAnnounced = todaySelection?.is_announced;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h2 className="text-2xl font-bold text-white mb-2">🤖 AI Pick 관리</h2>
      <p className="text-gray-400 text-sm mb-8">오늘({today})의 AI 추천주를 선택하세요.</p>

      {/* 상태 배너 */}
      {isAnnounced ? (
        <div className="bg-emerald-900/30 border border-emerald-800 rounded-xl px-6 py-4 mb-8 flex items-center gap-3">
          <span className="text-emerald-400 font-medium">✅ 공개 완료</span>
          <span className="text-gray-500 text-sm">사용자에게 노출 중입니다.</span>
        </div>
      ) : allPicked ? (
        <div className="bg-yellow-900/30 border border-yellow-800 rounded-xl px-6 py-4 mb-8 flex items-center justify-between">
          <p className="text-yellow-400 font-medium">3종목 선택 완료. 공개 가능합니다.</p>
          <button 
            onClick={handleAnnounce} 
            className="bg-emerald-500 hover:bg-emerald-600 text-black font-bold px-6 py-2 rounded-lg text-sm transition-colors"
          >
            공개하기
          </button>
        </div>
      ) : (
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl px-6 py-4 mb-8">
          <p className="text-gray-500 text-sm">3개 종목을 모두 선택해야 공개할 수 있습니다.</p>
        </div>
      )}

      {/* 픽 카드 3개 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {PICK_KEYS.map((pickKey, index) => {
          const pickedName = todaySelection?.[`${pickKey}_stock_name`];
          const pickedCode = todaySelection?.[`${pickKey}_stock_id`];
          const isEditing = editingPick === pickKey;

          return (
            <div 
              key={pickKey} 
              className="bg-gray-900 border border-gray-800 rounded-2xl p-6 relative transition-all hover:border-gray-700"
            >
              {/* 카드 헤더 */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-bold text-lg">Pick {index + 1}</h3>
                {pickedName && !isEditing && (
                  <span className="bg-emerald-500/20 text-emerald-400 text-[10px] px-2 py-1 rounded-full font-bold">
                    선택됨
                  </span>
                )}
              </div>

              {/* 선택된 종목 표시 영역 */}
              <div className="mb-4 min-h-[60px] flex items-center">
                {pickedName && !isEditing ? (
                  <div className="w-full bg-gray-800/50 border border-emerald-500/30 rounded-lg px-4 py-3">
                    <div className="text-emerald-400 font-bold text-lg">{pickedName}</div>
                    <div className="text-gray-500 text-xs mt-1">{pickedCode}</div>
                  </div>
                ) : (
                  <div className="w-full bg-gray-800/30 border border-gray-700 border-dashed rounded-lg px-4 py-3 flex items-center justify-center">
                    <span className="text-gray-600 text-sm">미선택</span>
                  </div>
                )}
              </div>

              {/* 검색 또는 액션 버튼 */}
              {isAnnounced ? (
                // 공개 완료 상태: 수정 불가
                <div className="text-center">
                  <p className="text-gray-600 text-xs">공개된 픽은 수정할 수 없습니다.</p>
                </div>
              ) : isEditing || !pickedName ? (
                // 검색 모드
                <div className="relative">
                  <input
                    type="text"
                    value={searchInputs[pickKey]}
                    onChange={(e) => setSearchInputs(prev => ({ ...prev, [pickKey]: e.target.value }))}
                    placeholder="종목명 또는 코드 검색"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white text-sm focus:border-emerald-500 focus:outline-none transition-all"
                    autoFocus={isEditing}
                  />
                  
                  {/* 검색 중 로딩 */}
                  {isSearching[pickKey] && (
                    <div className="absolute right-3 top-3">
                      <div className="animate-spin h-4 w-4 border-2 border-emerald-500 border-t-transparent rounded-full"></div>
                    </div>
                  )}

                  {/* 검색 결과 드롭다운 */}
                  {searchInputs[pickKey].trim().length >= 2 && searchResults[pickKey].length > 0 && (
                    <div className="absolute z-20 w-full mt-2 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto">
                      {searchResults[pickKey].map((stock) => (
                        <button
                          key={stock.code}
                          onClick={() => handleSelectStock(pickKey, stock)}
                          className="w-full text-left px-4 py-3 hover:bg-emerald-500/10 flex justify-between items-center border-b border-gray-700/50 last:border-0 group transition-colors"
                        >
                          <div>
                            <div className="text-white text-sm font-bold group-hover:text-emerald-400 transition-colors">
                              {stock.name}
                            </div>
                            <div className="text-gray-500 text-xs">{stock.code}</div>
                          </div>
                          <span className="text-gray-600 text-[10px] font-mono bg-gray-900 px-2 py-1 rounded">
                            {stock.market}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* 검색 안내 또는 취소 버튼 */}
                  <div className="mt-3 flex items-center justify-between">
                    <p className="text-[11px] text-gray-600">
                      {searchInputs[pickKey].length === 0 
                        ? '2글자 이상 입력하세요' 
                        : searchResults[pickKey].length === 0 
                        ? '검색 결과 없음' 
                        : `${searchResults[pickKey].length}개 결과`}
                    </p>
                    {isEditing && (
                      <button
                        onClick={() => handleCancelEdit(pickKey)}
                        className="text-gray-500 hover:text-white text-xs transition-colors"
                      >
                        취소
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                // 선택 완료 상태: 수정/삭제 버튼
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEditPick(pickKey)}
                    className="flex-1 bg-gray-800 hover:bg-gray-700 text-white text-sm font-medium py-2 rounded-lg transition-colors"
                  >
                    수정
                  </button>
                  <button
                    onClick={() => handleDeletePick(pickKey)}
                    className="flex-1 bg-red-900/30 hover:bg-red-900/50 text-red-400 text-sm font-medium py-2 rounded-lg transition-colors"
                  >
                    삭제
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