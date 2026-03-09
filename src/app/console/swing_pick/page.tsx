'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Search, Save, History, X, Check, Filter } from 'lucide-react';

interface AiPickHistory {
  id: string;
  stock_id: string;
  stock_name: string;
  date: string;
  pick_slot: number | null;
  opening_price: number | null;
  high_price: number | null;
  return_rate: number | null;
  buy_price_low: number | null;
  buy_price_high: number | null;
  target_price: number | null;
  is_active: boolean;
}

export default function AiPickHistoryPage() {
  const [picks, setPicks] = useState<AiPickHistory[]>([]);
  const [loading, setLoading] = useState(true);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    buy_price_low: '',
    buy_price_high: '',
    target_price: '',
  });

  const getDefaultStartDate = () => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toLocaleDateString('sv-SE');
  };
  const [filterDate, setFilterDate] = useState({ start: getDefaultStartDate(), end: '' });
  const [filterName, setFilterName] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'hidden'>('all');

  useEffect(() => { fetchPicks(); }, []);

  const fetchPicks = async () => {
    setLoading(true);
    let query = supabase
      .from('ai_pick_history')
      .select('id, stock_id, stock_name, date, pick_slot, opening_price, high_price, return_rate, buy_price_low, buy_price_high, target_price, is_active')
      .order('date', { ascending: false })
      .order('pick_slot', { ascending: true });

    if (filterDate.start) query = query.gte('date', filterDate.start);
    if (filterDate.end) query = query.lte('date', filterDate.end);
    if (filterName) query = query.ilike('stock_name', `%${filterName}%`);
    if (filterStatus === 'active') query = query.eq('is_active', true);
    if (filterStatus === 'hidden') query = query.eq('is_active', false);

    const { data, error } = await query;
    if (!error) setPicks(data || []);
    setLoading(false);
  };

  const startEditing = (pick: AiPickHistory) => {
    setEditingId(pick.id);
    setEditForm({
      buy_price_low: pick.buy_price_low?.toString() || '',
      buy_price_high: pick.buy_price_high?.toString() || '',
      target_price: pick.target_price?.toString() || '',
    });
  };

  const handleUpdate = async (pick: AiPickHistory) => {
    const { error } = await supabase
      .from('ai_pick_history')
      .update({
        buy_price_low: editForm.buy_price_low ? Number(editForm.buy_price_low) : null,
        buy_price_high: editForm.buy_price_high ? Number(editForm.buy_price_high) : null,
        target_price: editForm.target_price ? Number(editForm.target_price) : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', pick.id);

    if (!error) {
      setEditingId(null);
      fetchPicks();
    } else {
      alert('업데이트 실패: ' + error.message);
    }
  };

  const toggleActive = async (e: React.MouseEvent, id: string, current: boolean) => {
    e.stopPropagation();
    await supabase.from('ai_pick_history').update({ is_active: !current }).eq('id', id);
    fetchPicks();
  };

  const rateColor = (rate: number | null) => {
    if (rate === null) return 'text-gray-600';
    return rate >= 0 ? 'text-emerald-400' : 'text-red-400';
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <header>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <History className="text-emerald-400" size={24} />
          AI 픽 히스토리 관리
        </h1>
        <p className="text-gray-500 text-sm mt-1">행을 클릭해 매수 구간과 목표가를 설정하세요.</p>
      </header>

      <section className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-white font-semibold flex items-center gap-2">
            <Save size={18} /> 히스토리 목록
          </h2>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-gray-500" size={14} />
              <input
                type="text"
                placeholder="종목명 검색"
                className="bg-gray-800 border border-gray-700 rounded-lg pl-9 pr-4 py-1.5 text-xs text-white focus:border-emerald-500 outline-none w-40"
                value={filterName}
                onChange={e => setFilterName(e.target.value)}
              />
            </div>
            <select
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-emerald-500 cursor-pointer"
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value as any)}
            >
              <option value="all">전체 상태</option>
              <option value="active">활성</option>
              <option value="hidden">비활성</option>
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
              className="bg-emerald-500 hover:bg-emerald-600 text-black px-4 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
            >
              <Filter size={14} /> 적용
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-gray-500 text-xs uppercase border-b border-gray-800">
                <th className="pb-4 px-2">날짜 / 종목</th>
                <th className="pb-4 px-2">시가 / 수익률</th>
                <th className="pb-4 px-2">매수 추천 구간</th>
                <th className="pb-4 px-2">목표가</th>
                <th className="pb-4 px-2">상태</th>
                <th className="pb-4 px-2 text-right">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {loading ? (
                <tr><td colSpan={6} className="py-12 text-center text-gray-500">로딩 중...</td></tr>
              ) : picks.length === 0 ? (
                <tr><td colSpan={6} className="py-12 text-center text-gray-500">데이터가 없습니다.</td></tr>
              ) : picks.map(pick => {
                const isEditing = editingId === pick.id;
                return (
                  <tr
                    key={pick.id}
                    onClick={() => !isEditing && startEditing(pick)}
                    className={`text-sm group transition-colors cursor-pointer ${
                      isEditing ? 'bg-emerald-500/5' : 'hover:bg-gray-800/50'
                    }`}
                  >
                    {/* 날짜 / 종목 */}
                    <td className="py-4 px-2">
                      <div className="text-gray-400 text-xs mb-0.5">
                        {pick.date}
                        {pick.pick_slot && <span className="ml-2 text-gray-600">Pick {pick.pick_slot}</span>}
                      </div>
                      <div className="text-white font-bold">{pick.stock_name}</div>
                      <div className="text-gray-500 text-xs">{pick.stock_id}</div>
                    </td>

                    {/* 시가 / 수익률 */}
                    <td className="py-4 px-2">
                      <div className="text-gray-300 text-xs">
                        {pick.opening_price ? `${pick.opening_price.toLocaleString()}원` : '—'}
                      </div>
                      <div className={`font-mono font-bold ${rateColor(pick.return_rate)}`}>
                        {pick.return_rate !== null
                          ? `${pick.return_rate >= 0 ? '+' : ''}${pick.return_rate.toFixed(2)}%`
                          : '—'}
                      </div>
                    </td>

                    {/* 매수 추천 구간 */}
                    <td className="py-4 px-2">
                      {isEditing ? (
                        <div className="space-y-1.5" onClick={e => e.stopPropagation()}>
                          <input
                            type="number"
                            placeholder="하단가"
                            className="block w-full bg-gray-800 border border-emerald-500/50 rounded px-2 py-1.5 text-xs text-white outline-none"
                            value={editForm.buy_price_low}
                            onChange={e => setEditForm({ ...editForm, buy_price_low: e.target.value })}
                          />
                          <input
                            type="number"
                            placeholder="상단가"
                            className="block w-full bg-gray-800 border border-emerald-500/50 rounded px-2 py-1.5 text-xs text-white outline-none"
                            value={editForm.buy_price_high}
                            onChange={e => setEditForm({ ...editForm, buy_price_high: e.target.value })}
                          />
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
                          <input
                            type="number"
                            placeholder="목표가"
                            className="block w-full bg-gray-800 border border-yellow-500/40 rounded px-2 py-1.5 text-xs text-white outline-none"
                            value={editForm.target_price}
                            onChange={e => setEditForm({ ...editForm, target_price: e.target.value })}
                          />
                          {editForm.buy_price_high && editForm.target_price && (
                            <div className="text-yellow-600 text-[10px] mt-1">
                              +{(((Number(editForm.target_price) - Number(editForm.buy_price_high)) / Number(editForm.buy_price_high)) * 100).toFixed(1)}% 예상
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-yellow-500 font-mono font-bold text-sm">
                          {pick.target_price
                            ? `${pick.target_price.toLocaleString()}원`
                            : <span className="text-gray-700 font-normal">미입력</span>}
                        </div>
                      )}
                    </td>

                    {/* 상태 */}
                    <td className="py-4 px-2">
                      <button
                        onClick={e => toggleActive(e, pick.id, pick.is_active)}
                        className={`px-2 py-1 rounded text-[10px] font-bold ${
                          pick.is_active ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'
                        }`}
                      >
                        {pick.is_active ? '활성' : '비활성'}
                      </button>
                    </td>

                    {/* 관리 */}
                    <td className="py-4 px-2 text-right">
                      {isEditing && (
                        <div className="flex justify-end gap-2" onClick={e => e.stopPropagation()}>
                          <button
                            onClick={() => handleUpdate(pick)}
                            className="p-1.5 bg-emerald-500 text-black rounded hover:bg-emerald-400"
                          >
                            <Check size={14} />
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="p-1.5 bg-gray-700 text-white rounded hover:bg-gray-600"
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