'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { format, isBefore, parseISO } from 'date-fns';
import { CalendarDays, Search, Trash2, Save, History, X, Check, Filter } from 'lucide-react';

interface SwingPick {
  id: string;
  stock_id: string;
  stock_name: string;
  buy_price: number;
  sell_price: number | null;
  recommend_date: string;
  exit_date: string | null;
  is_active: boolean;
}

export default function SwingPickPage() {
  const [picks, setPicks] = useState<SwingPick[]>([]);
  const [loading, setLoading] = useState(true);
  
  // 수정 모드 상태
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ sell_price: '', exit_date: '' });

  // 신규 등록 및 검색 상태
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{code: string, name: string}[]>([]);
  const [newPick, setNewPick] = useState({
    stock_id: '',
    stock_name: '',
    buy_price: '',
    recommend_date: format(new Date(), 'yyyy-MM-dd')
  });
  const [filterDate, setFilterDate] = useState({ start: '', end: '' });
  const [filterName, setFilterName] = useState(''); // 종목명 검색어
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'hidden'>('all'); // 상태 필터

  useEffect(() => { fetchPicks(); }, []);

  const fetchPicks = async () => {
    setLoading(true);
    let query = supabase.from('swing_picks').select('*').order('recommend_date', { ascending: false });

    // 1. 기간 필터
    if (filterDate.start) query = query.gte('recommend_date', filterDate.start);
    if (filterDate.end) query = query.lte('recommend_date', filterDate.end);

    // 2. 종목명 검색 (부분 일치)
    if (filterName) query = query.ilike('stock_name', `%${filterName}%`);

    // 3. 상태 필터
    if (filterStatus === 'active') query = query.eq('is_active', true);
    if (filterStatus === 'hidden') query = query.eq('is_active', false);

    const { data, error } = await query;
    if (!error) setPicks(data || []);
    setLoading(false);
  };

  const handleAddPick = async () => {
    if (!newPick.stock_id || !newPick.buy_price) return alert('모든 값을 입력해주세요.');
    const { error } = await supabase.from('swing_picks').insert([{
      ...newPick,
      buy_price: Number(newPick.buy_price),
      is_active: true
    }]);
    if (!error) {
      alert('등록 완료');
      setNewPick({ stock_id: '', stock_name: '', buy_price: '', recommend_date: format(new Date(), 'yyyy-MM-dd') });
      setSearchQuery('');
      fetchPicks();
    }
  };

  // 수정 시작
  const startEditing = (pick: SwingPick) => {
    setEditingId(pick.id);
    setEditForm({
      sell_price: pick.sell_price?.toString() || '',
      exit_date: pick.exit_date || format(new Date(), 'yyyy-MM-dd')
    });
  };

  // 수정 저장
  const handleUpdatePick = async (pick: SwingPick) => {
    // 날짜 유효성 검사
    if (editForm.exit_date && isBefore(parseISO(editForm.exit_date), parseISO(pick.recommend_date))) {
      return alert('매도 날짜는 추천 날짜보다 빠를 수 없습니다.');
    }

    const { error } = await supabase
      .from('swing_picks')
      .update({
        sell_price: editForm.sell_price ? Number(editForm.sell_price) : null,
        exit_date: editForm.exit_date || null,
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
    e.stopPropagation(); // 행 클릭 이벤트 전파 방지
    await supabase.from('swing_picks').update({ is_active: !current }).eq('id', id);
    fetchPicks();
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('정말 삭제하시겠습니까?')) return;
    await supabase.from('swing_picks').delete().eq('id', id);
    fetchPicks();
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <header><h1 className="text-2xl font-bold text-white flex items-center gap-2"><CalendarDays className="text-emerald-400" /> AI 주간 스윙픽 관리</h1></header>

      {/* 신규 등록 섹션 (기존과 동일) */}
      <section className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
        <h2 className="text-white font-semibold mb-4 flex items-center gap-2"><Save size={18}/> 신규 추천주 등록</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <input className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white text-sm" placeholder="종목명/코드 검색" value={searchQuery} onChange={(e) => {setSearchQuery(e.target.value); if(e.target.value.length >= 2) { const q = e.target.value; supabase.from('stocks').select('code, name').or(`name.ilike.%${q}%,code.ilike.%${q}%`).limit(5).then(({data}) => setSearchResults(data || [])) }}} />
            {searchResults.length > 0 && searchQuery && (
              <div className="absolute z-10 w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl">
                {searchResults.map(s => ( <div key={s.code} className="p-2 hover:bg-emerald-500/10 cursor-pointer text-sm text-white" onClick={() => { setNewPick({...newPick, stock_id: s.code, stock_name: s.name}); setSearchQuery(s.name); setSearchResults([]); }}>{s.name} ({s.code})</div> ))}
              </div>
            )}
          </div>
          <input type="number" placeholder="매수가" className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white text-sm" value={newPick.buy_price} onChange={e => setNewPick({...newPick, buy_price: e.target.value})} />
          <input type="date" className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white text-sm" value={newPick.recommend_date} onChange={e => setNewPick({...newPick, recommend_date: e.target.value})} />
          <button onClick={handleAddPick} className="bg-emerald-500 hover:bg-emerald-600 text-black font-bold rounded-lg py-2 transition-colors">등록하기</button>
        </div>
      </section>

      {/* 리스트 섹션 */}
      <section className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-white font-semibold flex items-center gap-2"><History size={18}/> 추천 이력 관리 <span className="text-xs text-gray-500 font-normal">(행을 클릭하여 매도 정보를 수정하세요)</span></h2>
          <div className="flex flex-wrap items-center gap-3">
            {/* 종목명 검색 */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-gray-500" size={14} />
              <input 
                type="text" 
                placeholder="종목명 검색" 
                className="bg-gray-800 border border-gray-700 rounded-lg pl-9 pr-4 py-1.5 text-xs text-white focus:border-emerald-500 outline-none w-40"
                value={filterName}
                onChange={(e) => setFilterName(e.target.value)}
              />
            </div>

            {/* 상태 필터 */}
            <select 
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-emerald-500 cursor-pointer"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
            >
              <option value="all">전체 상태</option>
              <option value="active">노출 중</option>
              <option value="hidden">숨김 처리</option>
            </select>

            {/* 기간 필터 */}
            <div className="flex items-center gap-1 bg-gray-800 border border-gray-700 rounded-lg px-2 py-1">
              <input type="date" className="bg-transparent text-xs text-white outline-none" value={filterDate.start} onChange={e => setFilterDate({...filterDate, start: e.target.value})} />
              <span className="text-gray-600">~</span>
              <input type="date" className="bg-transparent text-xs text-white outline-none" value={filterDate.end} onChange={e => setFilterDate({...filterDate, end: e.target.value})} />
            </div>

            {/* 검색 버튼 */}
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
                <th className="pb-4 px-2">종목</th>
                <th className="pb-4 px-2">추천(매수) 정보</th>
                <th className="pb-4 px-2">매도 정보</th>
                <th className="pb-4 px-2">상태</th>
                <th className="pb-4 px-2 text-right">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {picks.map(pick => {
                const isEditing = editingId === pick.id;
                return (
                  <tr 
                    key={pick.id} 
                    onClick={() => !isEditing && startEditing(pick)}
                    className={`text-sm group transition-colors cursor-pointer ${isEditing ? 'bg-emerald-500/5' : 'hover:bg-gray-800/50'}`}
                  >
                    <td className="py-4 px-2">
                      <div className="text-white font-bold">{pick.stock_name}</div>
                      <div className="text-gray-500 text-xs">{pick.stock_id}</div>
                    </td>
                    <td className="py-4 px-2">
                      <div className="text-gray-300 text-xs">{pick.recommend_date}</div>
                      <div className="text-emerald-400 font-mono font-bold">{pick.buy_price.toLocaleString()}원</div>
                    </td>
                    <td className="py-4 px-2">
                      {isEditing ? (
                        <div className="space-y-2" onClick={e => e.stopPropagation()}>
                          <input 
                            type="date" 
                            className="block w-full bg-gray-800 border border-emerald-500/50 rounded px-2 py-1 text-xs text-white"
                            value={editForm.exit_date}
                            onChange={e => setEditForm({...editForm, exit_date: e.target.value})}
                          />
                          <input 
                            type="number" 
                            placeholder="매도가 입력"
                            className="block w-full bg-gray-800 border border-emerald-500/50 rounded px-2 py-1 text-xs text-white"
                            value={editForm.sell_price}
                            onChange={e => setEditForm({...editForm, sell_price: e.target.value})}
                          />
                        </div>
                      ) : (
                        <>
                          <div className="text-gray-400 text-xs">{pick.exit_date || '-'}</div>
                          <div className={`font-mono font-bold ${pick.sell_price ? 'text-red-400' : 'text-gray-600'}`}>
                            {pick.sell_price ? `${pick.sell_price.toLocaleString()}원` : '미입력'}
                          </div>
                        </>
                      )}
                    </td>
                    <td className="py-4 px-2">
                      <button onClick={(e) => toggleActive(e, pick.id, pick.is_active)} className={`px-2 py-1 rounded text-[10px] font-bold ${pick.is_active ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                        {pick.is_active ? '노출중' : '숨김'}
                      </button>
                    </td>
                    <td className="py-4 px-2 text-right">
                      {isEditing ? (
                        <div className="flex justify-end gap-2" onClick={e => e.stopPropagation()}>
                          <button onClick={() => handleUpdatePick(pick)} className="p-1.5 bg-emerald-500 text-black rounded hover:bg-emerald-400"><Check size={14}/></button>
                          <button onClick={() => setEditingId(null)} className="p-1.5 bg-gray-700 text-white rounded hover:bg-gray-600"><X size={14}/></button>
                        </div>
                      ) : (
                        <button onClick={(e) => handleDelete(e, pick.id)} className="p-2 text-gray-600 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={16}/></button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {picks.length === 0 && <div className="p-10 text-center text-gray-500">데이터가 없습니다.</div>}
        </div>
      </section>
    </div>
  );
}