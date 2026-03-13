'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getServerTime } from '@/app/utils/TimeUtils';

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

  const [searchInputs, setSearchInputs] = useState<Record<PickKey, string>>({ pick1: '', pick2: '', pick3: '' });
  const [searchResults, setSearchResults] = useState<Record<PickKey, Stock[]>>({ pick1: [], pick2: [], pick3: [] });
  const [isSearching, setIsSearching] = useState<Record<PickKey, boolean>>({ pick1: false, pick2: false, pick3: false });
  const [editingPick, setEditingPick] = useState<PickKey | null>(null);

  const [openingPrices, setOpeningPrices] = useState<Record<PickKey, string>>({ pick1: '', pick2: '', pick3: '' });
  const [existingOpeningPrices, setExistingOpeningPrices] = useState<Record<PickKey, number | null>>({ pick1: null, pick2: null, pick3: null });
  const [savingPrice, setSavingPrice] = useState<Record<PickKey, boolean>>({ pick1: false, pick2: false, pick3: false });
  const [priceMessage, setPriceMessage] = useState<Record<PickKey, { type: 'success' | 'error'; text: string } | null>>({ pick1: null, pick2: null, pick3: null });

  // 날짜별 조회 상태
  const [historyDate, setHistoryDate] = useState('');
  const [historySelection, setHistorySelection] = useState<AiSelection | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyNotFound, setHistoryNotFound] = useState(false);
  const [historyOpeningPrices, setHistoryOpeningPrices] = useState<Record<PickKey, string>>({ pick1: '', pick2: '', pick3: '' });
  const [historyExistingPrices, setHistoryExistingPrices] = useState<Record<PickKey, number | null>>({ pick1: null, pick2: null, pick3: null });
  const [historySavingPrice, setHistorySavingPrice] = useState<Record<PickKey, boolean>>({ pick1: false, pick2: false, pick3: false });
  const [historyPriceMessage, setHistoryPriceMessage] = useState<Record<PickKey, { type: 'success' | 'error'; text: string } | null>>({ pick1: null, pick2: null, pick3: null });

  useEffect(() => {
    const initPage = async () => {
      setLoading(true);
      try {
        const serverDate = await getServerTime();
        const todayStr = serverDate.toLocaleDateString('sv-SE');
        setToday(todayStr);
        setHistoryDate(todayStr);
        await fetchTodaySelection(todayStr);
      } catch (err) {
        console.error('초기화 에러:', err);
      } finally {
        setLoading(false);
      }
    };
    initPage();
  }, []);

  useEffect(() => {
    PICK_KEYS.forEach(key => {
      const query = searchInputs[key];
      if (query.trim().length >= 2) searchStocks(query, key);
      else setSearchResults(prev => ({ ...prev, [key]: [] }));
    });
  }, [searchInputs]);

  const fetchTodaySelection = async (date: string) => {
    setLoading(true);
    const { data, error } = await supabase.from('aiselections').select('*').eq('date', date).maybeSingle();
    if (!error) setTodaySelection(data);
    setLoading(false);
  };

  const fetchExistingOpeningPrices = async (selection: AiSelection, date: string, setter: typeof setExistingOpeningPrices) => {
    const stockIds = [selection.pick1_stock_id, selection.pick2_stock_id, selection.pick3_stock_id].filter(Boolean) as string[];
    if (stockIds.length === 0) return;
    const { data } = await supabase.from('stock_daily_prices').select('stock_id, opening_price').in('stock_id', stockIds).eq('date', date);
    const map: Record<string, number> = {};
    data?.forEach(row => { map[row.stock_id] = row.opening_price; });
    setter({
      pick1: selection.pick1_stock_id ? (map[selection.pick1_stock_id] ?? null) : null,
      pick2: selection.pick2_stock_id ? (map[selection.pick2_stock_id] ?? null) : null,
      pick3: selection.pick3_stock_id ? (map[selection.pick3_stock_id] ?? null) : null,
    });
  };

  useEffect(() => {
    if (todaySelection && today) fetchExistingOpeningPrices(todaySelection, today, setExistingOpeningPrices);
  }, [todaySelection, today]);

  const searchStocks = async (query: string, key: PickKey) => {
    setIsSearching(prev => ({ ...prev, [key]: true }));
    const { data, error } = await supabase.from('stocks').select('code, name, market').or(`name.ilike.%${query}%,code.ilike.%${query}%`).limit(10);
    if (!error && data) setSearchResults(prev => ({ ...prev, [key]: data }));
    setIsSearching(prev => ({ ...prev, [key]: false }));
  };

  const handleSelectStock = async (pickKey: PickKey, stock: Stock) => {
    try {
      const { error } = await supabase.from('aiselections').upsert({
        ...(todaySelection?.id ? { id: todaySelection.id } : {}),
        date: today,
        [`${pickKey}_stock_name`]: stock.name,
        [`${pickKey}_stock_id`]: stock.code,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'date' });
      if (error) throw error;
      await fetchTodaySelection(today);
      setSearchInputs(prev => ({ ...prev, [pickKey]: '' }));
      setSearchResults(prev => ({ ...prev, [pickKey]: [] }));
      setEditingPick(null);
    } catch (err) {
      alert('저장 실패: ' + (err as Error).message);
    }
  };

  const handleAnnounce = async () => {
    if (!todaySelection) return;
    const { error } = await supabase.from('aiselections').update({ is_announced: true, updated_at: new Date().toISOString() }).eq('id', todaySelection.id);
    if (!error) { alert('공개 완료!'); fetchTodaySelection(today); }
    else alert('공개 실패: ' + error.message);
  };

  const handleEditPick = (pickKey: PickKey) => { setEditingPick(pickKey); setSearchInputs(prev => ({ ...prev, [pickKey]: '' })); };
  const handleCancelEdit = (pickKey: PickKey) => { setEditingPick(null); setSearchInputs(prev => ({ ...prev, [pickKey]: '' })); setSearchResults(prev => ({ ...prev, [pickKey]: [] })); };

  const handleDeletePick = async (pickKey: PickKey) => {
    if (!todaySelection || !confirm(`Pick ${pickKey.slice(-1)}를 삭제하시겠습니까?`)) return;
    const { error } = await supabase.from('aiselections').update({ [`${pickKey}_stock_name`]: null, [`${pickKey}_stock_id`]: null, updated_at: new Date().toISOString() }).eq('id', todaySelection.id);
    if (!error) { fetchTodaySelection(today); setEditingPick(null); }
    else alert('삭제 실패: ' + error.message);
  };

  const makeSaveHandler = (
    getStockId: (key: PickKey) => string | null | undefined,
    date: string,
    prices: Record<PickKey, string>,
    setPrices: typeof setOpeningPrices,
    setExisting: typeof setExistingOpeningPrices,
    setSaving: typeof setSavingPrice,
    setMsg: typeof setPriceMessage,
  ) => async (pickKey: PickKey) => {
    const stockId = getStockId(pickKey);
    const price = Number(prices[pickKey].replace(/,/g, ''));
    if (!stockId) return;
    if (!price || price <= 0) { setMsg(prev => ({ ...prev, [pickKey]: { type: 'error', text: '올바른 가격을 입력하세요' } })); return; }
    setSaving(prev => ({ ...prev, [pickKey]: true }));
    setMsg(prev => ({ ...prev, [pickKey]: null }));
    try {
      const { error } = await supabase.from('stock_daily_prices').upsert({ stock_id: stockId, date, opening_price: price }, { onConflict: 'stock_id,date' });
      if (error) throw error;
      setExisting(prev => ({ ...prev, [pickKey]: price }));
      setPrices(prev => ({ ...prev, [pickKey]: '' }));
      setMsg(prev => ({ ...prev, [pickKey]: { type: 'success', text: `${price.toLocaleString()}원 저장 완료` } }));
      setTimeout(() => setMsg(prev => ({ ...prev, [pickKey]: null })), 3000);
    } catch (err) {
      setMsg(prev => ({ ...prev, [pickKey]: { type: 'error', text: '저장 실패: ' + (err as Error).message } }));
    } finally {
      setSaving(prev => ({ ...prev, [pickKey]: false }));
    }
  };

  const handleSaveOpeningPrice = makeSaveHandler(
    key => todaySelection?.[`${key}_stock_id`], today,
    openingPrices, setOpeningPrices, setExistingOpeningPrices, setSavingPrice, setPriceMessage
  );

  const handleHistorySearch = async () => {
    if (!historyDate) return;
    setHistoryLoading(true);
    setHistorySelection(null);
    setHistoryNotFound(false);
    setHistoryExistingPrices({ pick1: null, pick2: null, pick3: null });
    setHistoryOpeningPrices({ pick1: '', pick2: '', pick3: '' });
    setHistoryPriceMessage({ pick1: null, pick2: null, pick3: null });
    const { data, error } = await supabase.from('aiselections').select('*').eq('date', historyDate).maybeSingle();
    if (!error && data) {
      setHistorySelection(data);
      await fetchExistingOpeningPrices(data, historyDate, setHistoryExistingPrices);
    } else {
      setHistoryNotFound(true);
    }
    setHistoryLoading(false);
  };

  const handleSaveHistoryOpeningPrice = makeSaveHandler(
    key => historySelection?.[`${key}_stock_id`], historyDate,
    historyOpeningPrices, setHistoryOpeningPrices, setHistoryExistingPrices, setHistorySavingPrice, setHistoryPriceMessage
  );

  const OpeningPriceGrid = ({
    selection, existingPrices, prices, setPrices, savingMap, messages, onSave,
  }: {
    selection: AiSelection;
    existingPrices: Record<PickKey, number | null>;
    prices: Record<PickKey, string>;
    setPrices: (fn: (prev: Record<PickKey, string>) => Record<PickKey, string>) => void;
    savingMap: Record<PickKey, boolean>;
    messages: Record<PickKey, { type: 'success' | 'error'; text: string } | null>;
    onSave: (key: PickKey) => void;
  }) => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {PICK_KEYS.map((pickKey, index) => {
        const stockId = selection[`${pickKey}_stock_id`];
        const stockName = selection[`${pickKey}_stock_name`];
        const existing = existingPrices[pickKey];
        const msg = messages[pickKey];
        const isSaving = savingMap[pickKey];
        if (!stockId) {
          return (
            <div key={pickKey} className="bg-gray-800/30 border border-gray-700/50 border-dashed rounded-xl p-4 flex items-center justify-center">
              <span className="text-gray-600 text-sm">Pick {index + 1} 미선택</span>
            </div>
          );
        }
        return (
          <div key={pickKey} className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
            <div className="mb-3">
              <div className="text-white font-bold text-sm">{stockName}</div>
              <div className="text-gray-500 text-xs">{stockId}</div>
            </div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-gray-500 text-xs">현재 등록된 시초가</span>
              {existing !== null
                ? <span className="text-emerald-400 text-xs font-bold">{existing.toLocaleString()}원 ✓</span>
                : <span className="text-amber-400 text-xs font-bold">미등록</span>}
            </div>
            <div className="flex gap-2">
              <input
                type="number"
                value={prices[pickKey]}
                onChange={(e) => setPrices(prev => ({ ...prev, [pickKey]: e.target.value }))}
                onKeyDown={(e) => { if (e.key === 'Enter') onSave(pickKey); }}
                placeholder={existing !== null ? `${existing.toLocaleString()}` : '시초가 입력'}
                className="flex-1 bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:border-emerald-500 focus:outline-none transition-all placeholder:text-gray-600"
              />
              <button
                onClick={() => onSave(pickKey)}
                disabled={isSaving || !prices[pickKey]}
                className="bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-700 disabled:text-gray-500 text-black font-bold px-4 py-2 rounded-lg text-sm transition-colors whitespace-nowrap"
              >
                {isSaving ? '저장중' : '저장'}
              </button>
            </div>
            {msg && (
              <p className={`text-xs mt-2 font-medium ${msg.type === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>
                {msg.type === 'success' ? '✓ ' : '✗ '}{msg.text}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );

  if (loading) {
    return <div className="p-8 flex items-center justify-center min-h-screen"><div className="text-gray-400">로딩 중...</div></div>;
  }

  const allPicked = todaySelection?.pick1_stock_name && todaySelection?.pick2_stock_name && todaySelection?.pick3_stock_name;
  const isAnnounced = todaySelection?.is_announced;
  const hasPicks = todaySelection?.pick1_stock_id || todaySelection?.pick2_stock_id || todaySelection?.pick3_stock_id;

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
          <button onClick={handleAnnounce} className="bg-emerald-500 hover:bg-emerald-600 text-black font-bold px-6 py-2 rounded-lg text-sm transition-colors">공개하기</button>
        </div>
      ) : (
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl px-6 py-4 mb-8">
          <p className="text-gray-500 text-sm">3개 종목을 모두 선택해야 공개할 수 있습니다.</p>
        </div>
      )}

      {/* 픽 카드 3개 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        {PICK_KEYS.map((pickKey, index) => {
          const pickedName = todaySelection?.[`${pickKey}_stock_name`];
          const pickedCode = todaySelection?.[`${pickKey}_stock_id`];
          const isEditing = editingPick === pickKey;
          return (
            <div key={pickKey} className="bg-gray-900 border border-gray-800 rounded-2xl p-6 relative transition-all hover:border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-bold text-lg">Pick {index + 1}</h3>
                {pickedName && !isEditing && <span className="bg-emerald-500/20 text-emerald-400 text-[10px] px-2 py-1 rounded-full font-bold">선택됨</span>}
              </div>
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
              {isAnnounced ? (
                <div className="text-center"><p className="text-gray-600 text-xs">공개된 픽은 수정할 수 없습니다.</p></div>
              ) : isEditing || !pickedName ? (
                <div className="relative">
                  <input
                    type="text"
                    value={searchInputs[pickKey]}
                    onChange={(e) => setSearchInputs(prev => ({ ...prev, [pickKey]: e.target.value }))}
                    placeholder="종목명 또는 코드 검색"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white text-sm focus:border-emerald-500 focus:outline-none transition-all"
                    autoFocus={isEditing}
                  />
                  {isSearching[pickKey] && <div className="absolute right-3 top-3"><div className="animate-spin h-4 w-4 border-2 border-emerald-500 border-t-transparent rounded-full"></div></div>}
                  {searchInputs[pickKey].trim().length >= 2 && searchResults[pickKey].length > 0 && (
                    <div className="absolute z-20 w-full mt-2 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto">
                      {searchResults[pickKey].map((stock) => (
                        <button key={stock.code} onClick={() => handleSelectStock(pickKey, stock)} className="w-full text-left px-4 py-3 hover:bg-emerald-500/10 flex justify-between items-center border-b border-gray-700/50 last:border-0 group transition-colors">
                          <div>
                            <div className="text-white text-sm font-bold group-hover:text-emerald-400 transition-colors">{stock.name}</div>
                            <div className="text-gray-500 text-xs">{stock.code}</div>
                          </div>
                          <span className="text-gray-600 text-[10px] font-mono bg-gray-900 px-2 py-1 rounded">{stock.market}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="mt-3 flex items-center justify-between">
                    <p className="text-[11px] text-gray-600">
                      {searchInputs[pickKey].length === 0 ? '2글자 이상 입력하세요' : searchResults[pickKey].length === 0 ? '검색 결과 없음' : `${searchResults[pickKey].length}개 결과`}
                    </p>
                    {isEditing && <button onClick={() => handleCancelEdit(pickKey)} className="text-gray-500 hover:text-white text-xs transition-colors">취소</button>}
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button onClick={() => handleEditPick(pickKey)} className="flex-1 bg-gray-800 hover:bg-gray-700 text-white text-sm font-medium py-2 rounded-lg transition-colors">수정</button>
                  <button onClick={() => handleDeletePick(pickKey)} className="flex-1 bg-red-900/30 hover:bg-red-900/50 text-red-400 text-sm font-medium py-2 rounded-lg transition-colors">삭제</button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 오늘 시초가 입력 */}
      {hasPicks && todaySelection && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-10">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-white font-bold text-lg">📈 시초가 입력</h3>
            <span className="bg-amber-500/20 text-amber-400 text-[10px] px-2 py-1 rounded-full font-bold">9시 이후 픽 대비용</span>
          </div>
          <p className="text-gray-500 text-xs mb-6">
            장 시작 이후 픽한 경우 <code className="text-gray-400 bg-gray-800 px-1 rounded">stock_daily_prices</code>에 시초가가 없을 수 있습니다. 직접 입력하면 실시간 수익률 계산에 반영됩니다.
          </p>
          <OpeningPriceGrid
            selection={todaySelection}
            existingPrices={existingOpeningPrices}
            prices={openingPrices}
            setPrices={setOpeningPrices}
            savingMap={savingPrice}
            messages={priceMessage}
            onSave={handleSaveOpeningPrice}
          />
        </div>
      )}

      {/* 날짜별 픽 조회 / 시초가 수정 */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-2">
          <h3 className="text-white font-bold text-lg">🗓 날짜별 픽 조회 / 시초가 수정</h3>
        </div>
        <p className="text-gray-500 text-xs mb-6">날짜를 선택해 해당일의 AI 픽을 조회하고, 시초가를 직접 입력·수정할 수 있습니다.</p>

        <div className="flex gap-3 mb-6">
          <input
            type="date"
            value={historyDate}
            onChange={(e) => setHistoryDate(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleHistorySearch(); }}
            className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white text-sm focus:border-emerald-500 focus:outline-none transition-all"
          />
          <button
            onClick={handleHistorySearch}
            disabled={historyLoading || !historyDate}
            className="bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-700 disabled:text-gray-500 text-black font-bold px-6 py-2 rounded-lg text-sm transition-colors flex items-center gap-2"
          >
            {historyLoading
              ? <><div className="animate-spin h-4 w-4 border-2 border-black border-t-transparent rounded-full"></div>조회 중</>
              : '조회'}
          </button>
        </div>

        {historyNotFound && (
          <div className="bg-gray-800/30 border border-gray-700/50 border-dashed rounded-xl px-6 py-8 flex items-center justify-center">
            <span className="text-gray-500 text-sm">해당 날짜({historyDate})의 AI 픽이 없습니다.</span>
          </div>
        )}

        {historySelection && (
          <>
            {/* 픽 요약 */}
            <div className="bg-gray-800/40 border border-gray-700 rounded-xl p-4 mb-5">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-white font-bold text-sm">{historySelection.date} 픽</span>
                {historySelection.is_announced
                  ? <span className="bg-emerald-500/20 text-emerald-400 text-[10px] px-2 py-1 rounded-full font-bold">공개됨</span>
                  : <span className="bg-yellow-500/20 text-yellow-400 text-[10px] px-2 py-1 rounded-full font-bold">미공개</span>}
              </div>
              <div className="grid grid-cols-3 gap-3">
                {PICK_KEYS.map((pickKey, index) => {
                  const name = historySelection[`${pickKey}_stock_name`];
                  const code = historySelection[`${pickKey}_stock_id`];
                  return (
                    <div key={pickKey} className={`rounded-lg px-3 py-2 text-sm ${name ? 'bg-emerald-900/20 border border-emerald-800/40' : 'bg-gray-800/30 border border-gray-700/30'}`}>
                      <div className="text-gray-500 text-[10px] mb-1">Pick {index + 1}</div>
                      {name ? (
                        <><div className="text-emerald-400 font-bold text-sm">{name}</div><div className="text-gray-500 text-xs">{code}</div></>
                      ) : (
                        <div className="text-gray-600 text-xs">미선택</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 시초가 수정 */}
            <p className="text-gray-500 text-xs mb-4">
              <code className="text-gray-400 bg-gray-800 px-1 rounded">stock_daily_prices</code> 테이블의{' '}
              <span className="text-white font-bold">{historyDate}</span> 시초가를 수정합니다.
            </p>
            <OpeningPriceGrid
              selection={historySelection}
              existingPrices={historyExistingPrices}
              prices={historyOpeningPrices}
              setPrices={setHistoryOpeningPrices}
              savingMap={historySavingPrice}
              messages={historyPriceMessage}
              onSave={handleSaveHistoryOpeningPrice}
            />
          </>
        )}
      </div>
    </div>
  );
}