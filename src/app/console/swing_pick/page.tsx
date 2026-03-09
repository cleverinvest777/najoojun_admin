'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Search, Save, Plus, X, Check, Filter, TrendingUp, ChevronDown } from 'lucide-react';

// ─── 타입 ───────────────────────────────────────────────────
interface Stock {
  id: number;
  name: string;
  code: string;
}

interface SwingPick {
  id: string;
  stock_id: string;
  stock_name: string;
  buy_price: number | null;
  buy_price_low: number | null;
  buy_price_high: number | null;
  target_price: number | null;
  sell_price: number | null;
  comment: string | null;
  recommend_date: string;
  exit_date: string | null;
  is_active: boolean;
  created_at: string;
}

// ─── 유틸 ────────────────────────────────────────────────────
const today = () => new Date().toLocaleDateString('sv-SE');

const getDefaultStart = () => {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return d.toLocaleDateString('sv-SE');
};

const rateColor = (rate: number | null) => {
  if (rate === null) return 'text-gray-600';
  return rate >= 0 ? 'text-emerald-400' : 'text-red-400';
};

const fmtPrice = (v: number | null) =>
  v != null ? v.toLocaleString() + '원' : null;

// ─── 종목 검색 드롭다운 ──────────────────────────────────────
function StockSearchInput({
  value,
  onSelect,
}: {
  value: Stock | null;
  onSelect: (s: Stock) => void;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Stock[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from('stocks')
        .select('id, name, code')
        .or(`name.ilike.%${query}%,code.ilike.%${query}%`)
        .limit(10);
      setResults(data || []);
      setOpen(true);
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-2.5 text-gray-500" size={14} />
        <input
          type="text"
          placeholder="종목명 또는 코드 검색"
          className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:border-emerald-500 outline-none"
          value={value ? `${value.name} (${value.code})` : query}
          onChange={e => { setQuery(e.target.value); onSelect(null as any); }}
          onFocus={() => { if (results.length > 0) setOpen(true); }}
        />
        {value && (
          <button
            className="absolute right-2 top-2 text-gray-500 hover:text-white"
            onClick={() => { setQuery(''); onSelect(null as any); }}
          >
            <X size={14} />
          </button>
        )}
      </div>
      {open && results.length > 0 && (
        <ul className="absolute z-50 w-full mt-1 bg-gray-900 border border-gray-700 rounded-lg overflow-hidden shadow-xl">
          {results.map(s => (
            <li
              key={s.code}
              className="px-4 py-2.5 text-sm text-white hover:bg-gray-800 cursor-pointer flex justify-between items-center"
              onMouseDown={() => { onSelect(s); setQuery(''); setOpen(false); }}
            >
              <span className="font-semibold">{s.name}</span>
              <span className="text-gray-500 text-xs">{s.code}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── 메인 페이지 ─────────────────────────────────────────────
export default function SwingPicksPage() {
  const [picks, setPicks] = useState<SwingPick[]>([]);
  const [loading, setLoading] = useState(true);

  // 필터
  const [filterDate, setFilterDate] = useState({ start: getDefaultStart(), end: '' });
  const [filterName, setFilterName] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'closed'>('all');

  // 인라인 편집
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    buy_price: '', buy_price_low: '', buy_price_high: '',
    target_price: '', sell_price: '', comment: '',
  });

  // 신규 입력 폼
  const [addOpen, setAddOpen] = useState(false);
  const [addStock, setAddStock] = useState<Stock | null>(null);
  const [addForm, setAddForm] = useState({
    recommend_date: today(),
    buy_price: '',
    target_price: '',
    comment: '',
  });
  const [addLoading, setAddLoading] = useState(false);

  // ── fetch ──────────────────────────────────────────────────
  const fetchPicks = async () => {
    setLoading(true);
    let query = supabase
      .from('swing_picks')
      .select('id, stock_id, stock_name, buy_price, buy_price_low, buy_price_high, target_price, sell_price, comment, recommend_date, exit_date, is_active, created_at')
      .order('recommend_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (filterDate.start) query = query.gte('recommend_date', filterDate.start);
    if (filterDate.end) query = query.lte('recommend_date', filterDate.end);
    if (filterName) query = query.ilike('stock_name', `%${filterName}%`);
    if (filterStatus === 'active') query = query.eq('is_active', true);
    if (filterStatus === 'closed') query = query.eq('is_active', false);

    const { data, error } = await query;
    if (!error) setPicks(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchPicks(); }, []);

  // ── 신규 upsert ──────────────────────────────────────────
  const handleAdd = async () => {
    if (!addStock) return alert('종목을 선택해주세요.');
    if (!addForm.recommend_date) return alert('매수 날짜를 입력해주세요.');
    setAddLoading(true);
    const { error } = await supabase.from('swing_picks').insert({
      stock_id: addStock.code,
      stock_name: addStock.name,
      recommend_date: addForm.recommend_date,
      buy_price: addForm.buy_price ? Number(addForm.buy_price) : null,
      target_price: addForm.target_price ? Number(addForm.target_price) : null,
      comment: addForm.comment || null,
      is_active: true,
    });
    setAddLoading(false);
    if (error) return alert('등록 실패: ' + error.message);
    setAddStock(null);
    setAddForm({ recommend_date: today(), buy_price: '', target_price: '', comment: '' });
    setAddOpen(false);
    fetchPicks();
  };

  // ── 인라인 편집 시작 ─────────────────────────────────────
  const startEditing = (pick: SwingPick) => {
    setEditingId(pick.id);
    setEditForm({
      buy_price: pick.buy_price?.toString() || '',
      buy_price_low: pick.buy_price_low?.toString() || '',
      buy_price_high: pick.buy_price_high?.toString() || '',
      target_price: pick.target_price?.toString() || '',
      sell_price: pick.sell_price?.toString() || '',
      comment: pick.comment || '',
    });
  };

  // ── 인라인 저장 ──────────────────────────────────────────
  const handleUpdate = async (pick: SwingPick) => {
    const { error } = await supabase
      .from('swing_picks')
      .update({
        buy_price: editForm.buy_price ? Number(editForm.buy_price) : null,
        buy_price_low: editForm.buy_price_low ? Number(editForm.buy_price_low) : null,
        buy_price_high: editForm.buy_price_high ? Number(editForm.buy_price_high) : null,
        target_price: editForm.target_price ? Number(editForm.target_price) : null,
        sell_price: editForm.sell_price ? Number(editForm.sell_price) : null,
        comment: editForm.comment || null,
      })
      .eq('id', pick.id);

    if (error) return alert('업데이트 실패: ' + error.message);
    setEditingId(null);
    fetchPicks();
  };

  // ── 활성/종료 토글 ──────────────────────────────────────
  const toggleActive = async (e: React.MouseEvent, id: string, current: boolean) => {
    e.stopPropagation();
    await supabase.from('swing_picks').update({ is_active: !current }).eq('id', id);
    fetchPicks();
  };

  // ── 수익률 계산 (buy_price → sell_price) ─────────────────
  const calcReturn = (pick: SwingPick) => {
    if (!pick.sell_price || !pick.buy_price || pick.buy_price <= 0) return null;
    return ((pick.sell_price - pick.buy_price) / pick.buy_price) * 100;
  };

  const numField = (
    label: string,
    key: keyof typeof editForm,
    accent = 'emerald',
  ) => (
    <div>
      <div className="text-[10px] text-gray-500 mb-0.5">{label}</div>
      <input
        type="number"
        placeholder="—"
        className={`w-full bg-gray-800 border border-${accent}-500/40 rounded px-2 py-1.5 text-xs text-white outline-none focus:border-${accent}-500`}
        value={editForm[key]}
        onChange={e => setEditForm({ ...editForm, [key]: e.target.value })}
        onClick={e => e.stopPropagation()}
      />
    </div>
  );

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* ── 헤더 ──────────────────────────────────────────── */}
      <header>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <TrendingUp className="text-emerald-400" size={24} />
          스윙 픽 관리
        </h1>
        <p className="text-gray-500 text-sm mt-1">AI 스윙 추천 종목을 등록하고 관리하세요.</p>
      </header>

      {/* ── 신규 등록 패널 ──────────────────────────────────── */}
      <section className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        <button
          className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-800/50 transition-colors"
          onClick={() => setAddOpen(v => !v)}
        >
          <span className="text-white font-semibold flex items-center gap-2">
            <Plus size={18} className="text-emerald-400" />
            신규 종목 등록
          </span>
          <ChevronDown
            size={18}
            className={`text-gray-500 transition-transform ${addOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {addOpen && (
          <div className="px-6 pb-6 border-t border-gray-800">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-5">
              {/* 종목 검색 */}
              <div className="lg:col-span-2">
                <label className="text-xs text-gray-400 font-semibold mb-1.5 block">종목 선택 *</label>
                <StockSearchInput value={addStock} onSelect={setAddStock} />
                {addStock && (
                  <div className="mt-1.5 text-xs text-emerald-400 font-mono">
                    ✓ {addStock.name} ({addStock.code})
                  </div>
                )}
              </div>

              {/* 매수 날짜 */}
              <div>
                <label className="text-xs text-gray-400 font-semibold mb-1.5 block">매수 날짜 *</label>
                <input
                  type="date"
                  style={{ colorScheme: 'dark' }}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
                  value={addForm.recommend_date}
                  onChange={e => setAddForm({ ...addForm, recommend_date: e.target.value })}
                />
              </div>

              {/* 매수가 */}
              <div>
                <label className="text-xs text-gray-400 font-semibold mb-1.5 block">매수가</label>
                <input
                  type="number"
                  placeholder="0"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
                  value={addForm.buy_price}
                  onChange={e => setAddForm({ ...addForm, buy_price: e.target.value })}
                />
              </div>

              {/* 목표가 */}
              <div>
                <label className="text-xs text-gray-400 font-semibold mb-1.5 block">목표가</label>
                <input
                  type="number"
                  placeholder="0"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-yellow-500"
                  value={addForm.target_price}
                  onChange={e => setAddForm({ ...addForm, target_price: e.target.value })}
                />
                {addForm.buy_price && addForm.target_price && (
                  <div className="mt-1 text-yellow-600 text-[10px]">
                    예상 수익률: {(((Number(addForm.target_price) - Number(addForm.buy_price)) / Number(addForm.buy_price)) * 100).toFixed(1)}%
                  </div>
                )}
              </div>

              {/* 코멘트 */}
              <div className="lg:col-span-3">
                <label className="text-xs text-gray-400 font-semibold mb-1.5 block">AI 코멘트</label>
                <textarea
                  rows={2}
                  placeholder="AI 분석 코멘트 (선택)"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-emerald-500 resize-none"
                  value={addForm.comment}
                  onChange={e => setAddForm({ ...addForm, comment: e.target.value })}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => setAddOpen(false)}
                className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleAdd}
                disabled={addLoading || !addStock}
                className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-black px-5 py-2 rounded-lg text-sm font-bold transition-colors flex items-center gap-2"
              >
                <Plus size={15} />
                {addLoading ? '등록 중...' : '등록'}
              </button>
            </div>
          </div>
        )}
      </section>

      {/* ── 목록 ──────────────────────────────────────────────── */}
      <section className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
        {/* 필터 헤더 */}
        <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
          <h2 className="text-white font-semibold flex items-center gap-2">
            <Save size={18} className="text-gray-400" /> 스윙 픽 목록
            <span className="text-gray-600 text-sm font-normal ml-1">({picks.length}건)</span>
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-gray-500" size={13} />
              <input
                type="text"
                placeholder="종목명 검색"
                className="bg-gray-800 border border-gray-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white focus:border-emerald-500 outline-none w-36"
                value={filterName}
                onChange={e => setFilterName(e.target.value)}
              />
            </div>
            <select
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-emerald-500 cursor-pointer"
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value as any)}
            >
              <option value="all">전체</option>
              <option value="active">활성화</option>
              <option value="closed">숨김</option>
            </select>
            <div className="flex items-center gap-1 bg-gray-800 border border-gray-700 rounded-lg px-2 py-1">
              <input
                type="date"
                style={{ colorScheme: 'dark' }}
                className="bg-transparent text-xs text-white outline-none"
                value={filterDate.start}
                onChange={e => setFilterDate({ ...filterDate, start: e.target.value })}
              />
              <span className="text-gray-600">~</span>
              <input
                type="date"
                style={{ colorScheme: 'dark' }}
                className="bg-transparent text-xs text-white outline-none"
                value={filterDate.end}
                onChange={e => setFilterDate({ ...filterDate, end: e.target.value })}
              />
            </div>
            <button
              onClick={fetchPicks}
              className="bg-emerald-500 hover:bg-emerald-600 text-black px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
            >
              <Filter size={13} /> 적용
            </button>
          </div>
        </div>

        {/* 테이블 */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-gray-500 text-xs uppercase border-b border-gray-800">
                <th className="pb-3 px-2">날짜 / 종목</th>
                <th className="pb-3 px-2">매수가</th>
                <th className="pb-3 px-2">매수 구간 (하단~상단)</th>
                <th className="pb-3 px-2">목표가</th>
                <th className="pb-3 px-2">매도가 / 수익률</th>
                <th className="pb-3 px-2">코멘트</th>
                <th className="pb-3 px-2">상태</th>
                <th className="pb-3 px-2 text-right">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60">
              {loading ? (
                <tr><td colSpan={8} className="py-12 text-center text-gray-500 text-sm">로딩 중...</td></tr>
              ) : picks.length === 0 ? (
                <tr><td colSpan={8} className="py-12 text-center text-gray-500 text-sm">데이터가 없습니다.</td></tr>
              ) : picks.map(pick => {
                const isEditing = editingId === pick.id;
                const returnRate = calcReturn(pick);

                return (
                  <tr
                    key={pick.id}
                    onClick={() => !isEditing && startEditing(pick)}
                    className={`text-sm transition-colors cursor-pointer ${
                      isEditing ? 'bg-emerald-500/5 border-l-2 border-l-emerald-500' : 'hover:bg-gray-800/40'
                    }`}
                  >
                    {/* 날짜 / 종목 */}
                    <td className="py-4 px-2">
                      <div className="text-gray-400 text-xs mb-0.5">{pick.recommend_date}</div>
                      <div className="text-white font-bold">{pick.stock_name}</div>
                      <div className="text-gray-500 text-xs">{pick.stock_id}</div>
                    </td>

                    {/* 매수가 */}
                    <td className="py-4 px-2">
                      {isEditing ? (
                        <div onClick={e => e.stopPropagation()}>
                          {numField('매수가', 'buy_price')}
                        </div>
                      ) : (
                        <div className="text-white font-mono font-semibold text-sm">
                          {fmtPrice(pick.buy_price) ?? <span className="text-gray-700">미입력</span>}
                        </div>
                      )}
                    </td>

                    {/* 매수 구간 */}
                    <td className="py-4 px-2">
                      {isEditing ? (
                        <div className="space-y-1.5" onClick={e => e.stopPropagation()}>
                          {numField('하단', 'buy_price_low')}
                          {numField('상단', 'buy_price_high')}
                        </div>
                      ) : (
                        <div className="text-emerald-400 font-mono text-sm">
                          {pick.buy_price_low || pick.buy_price_high ? (
                            <>
                              {pick.buy_price_low?.toLocaleString() ?? '—'}
                              <span className="text-gray-600 mx-1">~</span>
                              {pick.buy_price_high?.toLocaleString() ?? '—'}
                              <span className="text-gray-500 text-xs ml-1">원</span>
                            </>
                          ) : (
                            <span className="text-gray-700">미입력</span>
                          )}
                        </div>
                      )}
                    </td>

                    {/* 목표가 */}
                    <td className="py-4 px-2">
                      {isEditing ? (
                        <div onClick={e => e.stopPropagation()}>
                          {numField('목표가', 'target_price', 'yellow')}
                          {editForm.buy_price && editForm.target_price && (
                            <div className="text-yellow-600 text-[10px] mt-1">
                              +{(((Number(editForm.target_price) - Number(editForm.buy_price)) / Number(editForm.buy_price)) * 100).toFixed(1)}%
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-yellow-500 font-mono font-bold text-sm">
                          {fmtPrice(pick.target_price) ?? <span className="text-gray-700 font-normal">미입력</span>}
                        </div>
                      )}
                    </td>

                    {/* 매도가 / 수익률 */}
                    <td className="py-4 px-2">
                      {isEditing ? (
                        <div onClick={e => e.stopPropagation()}>
                          {numField('매도가', 'sell_price', 'red')}
                          {editForm.buy_price && editForm.sell_price && (
                            <div className={`text-[10px] mt-1 ${Number(editForm.sell_price) >= Number(editForm.buy_price) ? 'text-emerald-500' : 'text-red-500'}`}>
                              {(((Number(editForm.sell_price) - Number(editForm.buy_price)) / Number(editForm.buy_price)) * 100).toFixed(2)}%
                            </div>
                          )}
                        </div>
                      ) : (
                        <div>
                          <div className="text-gray-300 font-mono text-sm">
                            {fmtPrice(pick.sell_price) ?? <span className="text-gray-700">미입력</span>}
                          </div>
                          {returnRate !== null && (
                            <div className={`font-mono font-bold text-xs ${rateColor(returnRate)}`}>
                              {returnRate >= 0 ? '+' : ''}{returnRate.toFixed(2)}%
                            </div>
                          )}
                        </div>
                      )}
                    </td>

                    {/* 코멘트 */}
                    <td className="py-4 px-2 max-w-[180px]">
                      {isEditing ? (
                        <div onClick={e => e.stopPropagation()}>
                          <textarea
                            rows={2}
                            placeholder="코멘트"
                            className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-xs text-white outline-none focus:border-emerald-500 resize-none"
                            value={editForm.comment}
                            onChange={e => setEditForm({ ...editForm, comment: e.target.value })}
                          />
                        </div>
                      ) : (
                        <div className="text-gray-400 text-xs line-clamp-2">
                          {pick.comment ?? <span className="text-gray-700">—</span>}
                        </div>
                      )}
                    </td>

                    {/* 상태 */}
                    <td className="py-4 px-2">
                      <button
                        onClick={e => toggleActive(e, pick.id, pick.is_active)}
                        className={`px-2 py-1 rounded text-[10px] font-bold whitespace-nowrap ${
                          pick.is_active
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : 'bg-gray-700/50 text-gray-400'
                        }`}
                      >
                        {pick.is_active ? '활성화' : '숨김'}
                      </button>
                    </td>

                    {/* 관리 버튼 */}
                    <td className="py-4 px-2 text-right">
                      {isEditing && (
                        <div className="flex justify-end gap-2" onClick={e => e.stopPropagation()}>
                          <button
                            onClick={() => handleUpdate(pick)}
                            className="p-1.5 bg-emerald-500 text-black rounded hover:bg-emerald-400 transition-colors"
                            title="저장"
                          >
                            <Check size={14} />
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="p-1.5 bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors"
                            title="취소"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}