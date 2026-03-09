'use client';

// app/admin/push/page.tsx
import { useEffect, useState } from 'react';

const API = '/api/admin/push';
const SCHEDULE_API = '/api/admin/push/schedules';
const DAILY_API = '/api/admin/push/daily';
const PAGE_SIZE = 10;

const SCREENS = [
  { value: 'Dashboard', label: '🏠 홈(대시보드)' },
  { value: 'MyPick', label: '📌 MyPick' },
  { value: 'AI픽', label: '🤖 AI픽' },
  { value: 'MyPage', label: '👤 마이페이지' },
  { value: 'Notification', label: '🔔 알림' },
];

interface PushLog {
  id: string; title: string; body: string; target: string;
  screen: string | null; sent_count: number; failed_count: number;
  status: string; created_at: string;
}
interface PushSchedule {
  id: string; title: string; body: string; target: string;
  screen: string | null; scheduled_at: string; status: string;
}
interface DailySchedule {
  id: string; title: string; body: string; target: string;
  screen: string | null; hour: number; minute: number; is_active: boolean;
}

// ── 페이징 버튼 ──────────────────────────────────────────────
const PageBtn = ({ active, disabled, onClick, children }: { active?: boolean; disabled?: boolean; onClick: () => void; children: React.ReactNode }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    style={{
      padding: '4px 12px', borderRadius: 8, cursor: disabled ? 'default' : 'pointer',
      fontSize: 12, fontWeight: 700, opacity: disabled ? 0.3 : 1,
      backgroundColor: active ? '#00FF9D18' : '#05070A',
      color: active ? '#00FF9D' : '#8B949E',
      border: `1px solid ${active ? '#00FF9D' : '#1F2937'}`,
    }}
  >{children}</button>
);

// ── 모달 ─────────────────────────────────────────────────────
const Modal = ({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) => {
  if (!open) return null;
  return (
    <div style={m.overlay} onClick={onClose}>
      <div style={m.modal} onClick={e => e.stopPropagation()}>
        <div style={m.modalHeader}>
          <h3 style={m.modalTitle}>{title}</h3>
          <button style={m.closeBtn} onClick={onClose}>✕</button>
        </div>
        <div style={m.modalBody}>{children}</div>
      </div>
    </div>
  );
};

export default function AdminPushPage() {
  // ── 즉시 발송
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [target, setTarget] = useState<'all' | 'marketing'>('all');
  const [screen, setScreen] = useState('Dashboard');
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<any>(null);

  // ── 예약 발송
  const [schedTitle, setSchedTitle] = useState('');
  const [schedBody, setSchedBody] = useState('');
  const [schedTarget, setSchedTarget] = useState<'all' | 'marketing'>('all');
  const [schedScreen, setSchedScreen] = useState('Dashboard');
  const [schedDate, setSchedDate] = useState('');
  const [schedAmPm, setSchedAmPm] = useState<'AM' | 'PM'>('AM');
  const [schedHour, setSchedHour] = useState('09');
  const [schedMinute, setSchedMinute] = useState('00');
  const [scheduling, setScheduling] = useState(false);

  // ── 매일반복
  const [dailyTitle, setDailyTitle] = useState('');
  const [dailyBody, setDailyBody] = useState('');
  const [dailyTarget, setDailyTarget] = useState<'all' | 'marketing'>('all');
  const [dailyScreen, setDailyScreen] = useState('Dashboard');
  const [dailyHour, setDailyHour] = useState('09');
  const [dailyMinute, setDailyMinute] = useState('00');
  const [dailySaving, setDailySaving] = useState(false);

  // ── 데이터
  const [logs, setLogs] = useState<PushLog[]>([]);
  const [schedules, setSchedules] = useState<PushSchedule[]>([]);
  const [dailySchedules, setDailySchedules] = useState<DailySchedule[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // ── 모달
  const [schedModalOpen, setSchedModalOpen] = useState(false);
  const [logModalOpen, setLogModalOpen] = useState(false);

  // ── 발송이력 페이징 + 필터
  const [logPage, setLogPage] = useState(1);
  const [logDateFrom, setLogDateFrom] = useState('');
  const [logDateTo, setLogDateTo] = useState('');

  // ── 예약목록 페이징 + 필터
  const [schedPage, setSchedPage] = useState(1);
  const [schedDateFrom, setSchedDateFrom] = useState('');
  const [schedDateTo, setSchedDateTo] = useState('');

  const fetchLogs = async () => {
    setLoadingLogs(true);
    const res = await fetch(API);
    const data = await res.json();
    setLogs(Array.isArray(data) ? data : []);
    setLoadingLogs(false);
  };
  const fetchSchedules = async () => {
    const res = await fetch(SCHEDULE_API);
    const data = await res.json();
    setSchedules(Array.isArray(data) ? data : []);
  };
  const fetchDailySchedules = async () => {
    const res = await fetch(DAILY_API);
    const data = await res.json();
    setDailySchedules(Array.isArray(data) ? data : []);
  };

  useEffect(() => { fetchSchedules(); fetchDailySchedules(); }, []);

  const openSchedModal = () => {
    setSchedPage(1); setSchedDateFrom(''); setSchedDateTo('');
    setSchedModalOpen(true);
  };
  const openLogModal = async () => {
    setLogPage(1); setLogDateFrom(''); setLogDateTo('');
    await fetchLogs();
    setLogModalOpen(true);
  };

  // ── 즉시 발송
  const handleSend = async () => {
    if (!title || !body) { alert('제목과 내용을 입력해주세요'); return; }
    if (!confirm(`${target === 'all' ? '전체' : '마케팅 동의'} 유저에게 푸시를 발송할까요?`)) return;
    setSending(true); setSendResult(null);
    try {
      const res = await fetch(API, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, body, target, screen }),
      });
      const data = await res.json();
      setSendResult(data);
      if (data.success) { setTitle(''); setBody(''); }
    } catch (e: any) { alert('발송 실패: ' + e.message); }
    finally { setSending(false); }
  };

  // ── 예약 등록
  const handleSchedule = async () => {
    if (!schedTitle || !schedBody || !schedDate) { alert('모든 항목을 입력해주세요'); return; }
    setScheduling(true);
    try {
      let hour24 = parseInt(schedHour);
      if (schedAmPm === 'AM' && hour24 === 12) hour24 = 0;
      if (schedAmPm === 'PM' && hour24 !== 12) hour24 += 12;
      const localDate = new Date(`${schedDate}T${String(hour24).padStart(2, '0')}:${schedMinute}:00`);
      const res = await fetch(SCHEDULE_API, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: schedTitle, body: schedBody, target: schedTarget, screen: schedScreen, scheduled_at: localDate.toISOString() }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setSchedTitle(''); setSchedBody(''); setSchedDate('');
      fetchSchedules();
      alert('예약이 등록되었습니다');
    } catch (e: any) { alert('예약 실패: ' + e.message); }
    finally { setScheduling(false); }
  };

  const handleCancelSchedule = async (id: string) => {
    if (!confirm('예약을 취소할까요?')) return;
    await fetch(`${SCHEDULE_API}?id=${id}`, { method: 'PATCH' });
    fetchSchedules();
  };

  // ── 매일반복
  const handleDailySave = async () => {
    if (!dailyTitle || !dailyBody) { alert('제목과 내용을 입력해주세요'); return; }
    if (!confirm(`매일 ${dailyHour}:${dailyMinute} (KST)에 자동 발송됩니다. 등록할까요?`)) return;
    setDailySaving(true);
    try {
      const res = await fetch(DAILY_API, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: dailyTitle, body: dailyBody, target: dailyTarget, screen: dailyScreen, hour: parseInt(dailyHour), minute: parseInt(dailyMinute) }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setDailyTitle(''); setDailyBody('');
      fetchDailySchedules();
      alert('매일반복 발송이 등록되었습니다');
    } catch (e: any) { alert('등록 실패: ' + e.message); }
    finally { setDailySaving(false); }
  };

  const handleDailyToggle = async (id: string, isActive: boolean) => {
    await fetch(`${DAILY_API}?id=${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ is_active: !isActive }) });
    fetchDailySchedules();
  };
  const handleDailyDelete = async (id: string) => {
    if (!confirm('삭제할까요?')) return;
    await fetch(`${DAILY_API}?id=${id}`, { method: 'DELETE' });
    fetchDailySchedules();
  };

  // ── 필터 + 페이징 계산
  const filteredLogs = logs.filter(log => {
    const d = log.created_at.split('T')[0];
    if (logDateFrom && d < logDateFrom) return false;
    if (logDateTo && d > logDateTo) return false;
    return true;
  });
  const logTotalPages = Math.max(1, Math.ceil(filteredLogs.length / PAGE_SIZE));
  const pagedLogs = filteredLogs.slice((logPage - 1) * PAGE_SIZE, logPage * PAGE_SIZE);

  const filteredScheds = schedules.filter(sch => {
    const d = sch.scheduled_at.split('T')[0];
    if (schedDateFrom && d < schedDateFrom) return false;
    if (schedDateTo && d > schedDateTo) return false;
    return true;
  });
  const schedTotalPages = Math.max(1, Math.ceil(filteredScheds.length / PAGE_SIZE));
  const pagedScheds = filteredScheds.slice((schedPage - 1) * PAGE_SIZE, schedPage * PAGE_SIZE);

  const statusColor = (status: string) => status === 'sent' ? '#00FF9D' : status === 'failed' ? '#FF4D4D' : status === 'pending' ? '#E3C16F' : '#8B949E';
  const screenLabel = (val: string | null) => SCREENS.find(sc => sc.value === val)?.label ?? '🏠 홈(대시보드)';
  const padZero = (n: number) => String(n).padStart(2, '0');

  // ── 날짜 필터 UI 공통 ────────────────────────────────────────
  const DateFilter = ({ from, to, onFrom, onTo, onReset, total }: any) => (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
      <span style={{ color: '#8B949E', fontSize: 12, fontWeight: 700 }}>날짜 필터</span>
      <input type="date" value={from} onChange={e => { onFrom(e.target.value); }}
        style={{ ...s.input, width: 140, colorScheme: 'dark' as any }} />
      <span style={{ color: '#555' }}>~</span>
      <input type="date" value={to} onChange={e => { onTo(e.target.value); }}
        style={{ ...s.input, width: 140, colorScheme: 'dark' as any }} />
      {(from || to) && (
        <button style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #1F2937', background: '#05070A', color: '#8B949E', cursor: 'pointer', fontSize: 11, fontWeight: 700 }} onClick={onReset}>초기화</button>
      )}
      <span style={{ color: '#555', fontSize: 11, marginLeft: 'auto' }}>총 {total}건</span>
    </div>
  );

  return (
    <div style={s.page}>
      <div style={s.inner}>
        <div style={s.pageHeader}>
          <h1 style={s.pageTitle}>푸시 알림 관리</h1>
          <p style={s.pageDesc}>유저에게 푸시 알림을 발송하고, 클릭 시 이동할 화면을 설정합니다.</p>
        </div>

        <div style={s.grid}>
          {/* ── 즉시 발송 ── */}
          <div style={s.card}>
            <h2 style={s.cardTitle}>📢 즉시 발송</h2>
            <label style={s.label}>제목</label>
            <input style={s.input} value={title} onChange={e => setTitle(e.target.value)} placeholder="푸시 알림 제목" />
            <label style={s.label}>내용</label>
            <textarea style={{ ...s.input, minHeight: 80, resize: 'vertical' }} value={body} onChange={e => setBody(e.target.value)} placeholder="푸시 알림 내용" />
            <label style={s.label}>발송 대상</label>
            <div style={s.chipRow}>
              <button style={target === 'all' ? s.chipActive : s.chip} onClick={() => setTarget('all')}>전체 유저</button>
              <button style={target === 'marketing' ? s.chipActive : s.chip} onClick={() => setTarget('marketing')}>마케팅 동의</button>
            </div>
            <label style={s.label}>클릭 시 이동 화면</label>
            <div style={{ ...s.chipRow, flexWrap: 'wrap' }}>
              {SCREENS.map(sc => <button key={sc.value} style={screen === sc.value ? s.chipActive : s.chip} onClick={() => setScreen(sc.value)}>{sc.label}</button>)}
            </div>
            <button style={{ ...s.sendBtn, opacity: sending ? 0.6 : 1 }} onClick={handleSend} disabled={sending}>
              {sending ? '발송 중...' : '🚀 즉시 발송'}
            </button>
            {sendResult && (
              <div style={{ ...s.resultBox, borderColor: sendResult.success ? '#00FF9D' : '#FF4D4D' }}>
                {sendResult.success ? `✅ 발송 완료 — 성공 ${sendResult.sent}건 / 실패 ${sendResult.failed}건` : `❌ 발송 실패: ${sendResult.error}`}
              </div>
            )}
          </div>

          {/* ── 예약 발송 ── */}
          <div style={s.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h2 style={{ ...s.cardTitle, marginBottom: 0 }}>⏰ 예약 발송</h2>
              <button style={s.viewBtn} onClick={openSchedModal}>
                📋 예약 목록
                {schedules.filter(sc => sc.status === 'pending').length > 0 && (
                  <span style={s.badge}>{schedules.filter(sc => sc.status === 'pending').length}</span>
                )}
              </button>
            </div>
            <label style={s.label}>제목</label>
            <input style={s.input} value={schedTitle} onChange={e => setSchedTitle(e.target.value)} placeholder="푸시 알림 제목" />
            <label style={s.label}>내용</label>
            <textarea style={{ ...s.input, minHeight: 80, resize: 'vertical' }} value={schedBody} onChange={e => setSchedBody(e.target.value)} placeholder="푸시 알림 내용" />
            <label style={s.label}>발송 대상</label>
            <div style={s.chipRow}>
              <button style={schedTarget === 'all' ? s.chipActive : s.chip} onClick={() => setSchedTarget('all')}>전체</button>
              <button style={schedTarget === 'marketing' ? s.chipActive : s.chip} onClick={() => setSchedTarget('marketing')}>마케팅 동의</button>
            </div>
            <label style={s.label}>클릭 시 이동 화면</label>
            <div style={{ ...s.chipRow, flexWrap: 'wrap' }}>
              {SCREENS.map(sc => <button key={sc.value} style={schedScreen === sc.value ? s.chipActive : s.chip} onClick={() => setSchedScreen(sc.value)}>{sc.label}</button>)}
            </div>
            <label style={s.label}>발송 날짜</label>
            <input style={{ ...s.input, colorScheme: 'dark' as any }} type="date" value={schedDate} onChange={e => setSchedDate(e.target.value)} min={new Date().toISOString().split('T')[0]} />
            <label style={s.label}>발송 시간 (KST)</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <select style={{ ...s.input, width: 80 }} value={schedAmPm} onChange={e => setSchedAmPm(e.target.value as 'AM' | 'PM')}>
                <option value="AM">오전</option>
                <option value="PM">오후</option>
              </select>
              <select style={{ ...s.input, width: 80 }} value={schedHour} onChange={e => setSchedHour(e.target.value)}>
                {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map(h => <option key={h} value={h}>{h}시</option>)}
              </select>
              <select style={{ ...s.input, width: 80 }} value={schedMinute} onChange={e => setSchedMinute(e.target.value)}>
                {['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'].map(mm => <option key={mm} value={mm}>{mm}분</option>)}
              </select>
            </div>
            <button style={{ ...s.schedBtn, opacity: scheduling ? 0.6 : 1 }} onClick={handleSchedule} disabled={scheduling}>
              {scheduling ? '등록 중...' : '📅 예약 등록'}
            </button>
          </div>
        </div>

        {/* ── 매일반복 발송 ── */}
        <div style={{ ...s.card, marginBottom: 32 }}>
          <h2 style={s.cardTitle}>🔁 매일 반복 발송 <span style={{ fontSize: 12, color: '#8B949E', fontWeight: 400 }}>매일 지정한 시간(KST)에 자동 발송</span></h2>
          <div style={s.grid}>
            <div>
              <label style={s.label}>제목</label>
              <input style={s.input} value={dailyTitle} onChange={e => setDailyTitle(e.target.value)} placeholder="매일 발송할 제목" />
              <label style={s.label}>내용</label>
              <textarea style={{ ...s.input, minHeight: 70, resize: 'vertical' }} value={dailyBody} onChange={e => setDailyBody(e.target.value)} placeholder="매일 발송할 내용" />
              <label style={s.label}>발송 대상</label>
              <div style={s.chipRow}>
                <button style={dailyTarget === 'all' ? s.chipActive : s.chip} onClick={() => setDailyTarget('all')}>전체</button>
                <button style={dailyTarget === 'marketing' ? s.chipActive : s.chip} onClick={() => setDailyTarget('marketing')}>마케팅 동의</button>
              </div>
              <label style={s.label}>클릭 시 이동 화면</label>
              <div style={{ ...s.chipRow, flexWrap: 'wrap' }}>
                {SCREENS.map(sc => <button key={sc.value} style={dailyScreen === sc.value ? s.chipActive : s.chip} onClick={() => setDailyScreen(sc.value)}>{sc.label}</button>)}
              </div>
              <label style={s.label}>발송 시간 (KST)</label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <select style={{ ...s.input, width: 80 }} value={dailyHour} onChange={e => setDailyHour(e.target.value)}>
                  {Array.from({ length: 24 }, (_, i) => <option key={i} value={padZero(i)}>{padZero(i)}시</option>)}
                </select>
                <select style={{ ...s.input, width: 80 }} value={dailyMinute} onChange={e => setDailyMinute(e.target.value)}>
                  {['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'].map(mm => <option key={mm} value={mm}>{mm}분</option>)}
                </select>
                <span style={{ color: '#8B949E', fontSize: 12 }}>매일 자동 발송</span>
              </div>
              <button style={{ ...s.dailyBtn, marginTop: 16, opacity: dailySaving ? 0.6 : 1 }} onClick={handleDailySave} disabled={dailySaving}>
                {dailySaving ? '등록 중...' : '🔁 매일반복 등록'}
              </button>
            </div>
            <div>
              <p style={{ color: '#8B949E', fontSize: 11, fontWeight: 700, marginBottom: 12, marginTop: 0 }}>등록된 매일반복 목록</p>
              {dailySchedules.length === 0 ? (
                <div style={{ color: '#555', fontSize: 13, textAlign: 'center', padding: '30px 0' }}>등록된 항목이 없습니다</div>
              ) : dailySchedules.map(d => (
                <div key={d.id} style={{ ...s.schedItem, alignItems: 'flex-start', padding: '12px 0' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 11, fontWeight: 800, padding: '2px 8px', borderRadius: 6, background: d.is_active ? '#00FF9D20' : '#1F2937', color: d.is_active ? '#00FF9D' : '#555', border: `1px solid ${d.is_active ? '#00FF9D40' : '#1F2937'}` }}>
                        {d.is_active ? '● 활성' : '○ 비활성'}
                      </span>
                      <span style={{ color: '#E3C16F', fontWeight: 900, fontSize: 14 }}>매일 {padZero(d.hour)}:{padZero(d.minute)}</span>
                    </div>
                    <p style={{ color: '#fff', fontWeight: 700, fontSize: 13, margin: '0 0 2px' }}>{d.title}</p>
                    <p style={{ color: '#8B949E', fontSize: 11, margin: 0 }}>{d.target === 'all' ? '전체' : '마케팅'} · {screenLabel(d.screen)}</p>
                  </div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
                    <button style={{ padding: '4px 10px', borderRadius: 8, border: `1px solid ${d.is_active ? '#FF4D4D' : '#00FF9D'}`, background: '#05070A', color: d.is_active ? '#FF4D4D' : '#00FF9D', cursor: 'pointer', fontSize: 11, fontWeight: 700 }} onClick={() => handleDailyToggle(d.id, d.is_active)}>
                      {d.is_active ? '비활성화' : '활성화'}
                    </button>
                    <button style={s.cancelSchedBtn} onClick={() => handleDailyDelete(d.id)}>삭제</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── 발송 이력 버튼 ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ color: '#fff', fontSize: 18, fontWeight: 800, margin: 0 }}>발송 이력</h2>
          <button style={s.viewBtn} onClick={openLogModal}>📊 발송 이력 보기</button>
        </div>
        <div style={s.emptyBox}>버튼을 눌러 발송 이력을 확인하세요</div>
      </div>

      {/* ── 예약 목록 모달 ── */}
      <Modal open={schedModalOpen} onClose={() => setSchedModalOpen(false)} title={`📋 예약 목록 (총 ${filteredScheds.length}건)`}>
        <DateFilter
          from={schedDateFrom} to={schedDateTo}
          onFrom={(v: string) => { setSchedDateFrom(v); setSchedPage(1); }}
          onTo={(v: string) => { setSchedDateTo(v); setSchedPage(1); }}
          onReset={() => { setSchedDateFrom(''); setSchedDateTo(''); setSchedPage(1); }}
          total={filteredScheds.length}
        />
        {filteredScheds.length === 0 ? (
          <div style={{ color: '#8B949E', textAlign: 'center', padding: '30px 0' }}>해당 기간에 예약 내역이 없습니다</div>
        ) : pagedScheds.map(sch => (
          <div key={sch.id} style={m.item}>
            <div style={{ flex: 1 }}>
              <p style={{ color: '#fff', fontWeight: 700, fontSize: 14, margin: '0 0 4px' }}>{sch.title}</p>
              <p style={{ color: '#8B949E', fontSize: 12, margin: '0 0 2px' }}>{sch.body}</p>
              <p style={{ color: '#555', fontSize: 11, margin: 0 }}>
                {new Date(sch.scheduled_at).toLocaleString('ko-KR')} · {sch.target === 'all' ? '전체' : '마케팅'} · {screenLabel(sch.screen)}
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
              <span style={{ color: statusColor(sch.status), fontSize: 11, fontWeight: 700 }}>
                {sch.status === 'pending' ? '⏳ 대기중' : sch.status === 'sent' ? '✅ 발송됨' : sch.status === 'cancelled' ? '🚫 취소됨' : sch.status}
              </span>
              {sch.status === 'pending' && (
                <button style={s.cancelSchedBtn} onClick={() => handleCancelSchedule(sch.id)}>취소</button>
              )}
            </div>
          </div>
        ))}
        {schedTotalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 20, paddingTop: 16, borderTop: '1px solid #1F2937' }}>
            <PageBtn disabled={schedPage === 1} onClick={() => setSchedPage(p => Math.max(1, p - 1))}>◀</PageBtn>
            {Array.from({ length: schedTotalPages }, (_, i) => i + 1).map(p => (
              <PageBtn key={p} active={p === schedPage} onClick={() => setSchedPage(p)}>{p}</PageBtn>
            ))}
            <PageBtn disabled={schedPage === schedTotalPages} onClick={() => setSchedPage(p => Math.min(schedTotalPages, p + 1))}>▶</PageBtn>
          </div>
        )}
      </Modal>

      {/* ── 발송 이력 모달 ── */}
      <Modal open={logModalOpen} onClose={() => setLogModalOpen(false)} title={`📊 발송 이력 (총 ${filteredLogs.length}건)`}>
        <DateFilter
          from={logDateFrom} to={logDateTo}
          onFrom={(v: string) => { setLogDateFrom(v); setLogPage(1); }}
          onTo={(v: string) => { setLogDateTo(v); setLogPage(1); }}
          onReset={() => { setLogDateFrom(''); setLogDateTo(''); setLogPage(1); }}
          total={filteredLogs.length}
        />
        {loadingLogs ? (
          <div style={{ color: '#8B949E', textAlign: 'center', padding: '30px 0' }}>불러오는 중...</div>
        ) : pagedLogs.length === 0 ? (
          <div style={{ color: '#8B949E', textAlign: 'center', padding: '30px 0' }}>해당 기간에 발송 이력이 없습니다</div>
        ) : pagedLogs.map(log => (
          <div key={log.id} style={m.item}>
            <div style={{ flex: 1 }}>
              <p style={{ color: '#fff', fontWeight: 700, fontSize: 14, margin: '0 0 4px' }}>{log.title}</p>
              <p style={{ color: '#8B949E', fontSize: 12, margin: '0 0 6px' }}>{log.body}</p>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <span style={s.tag}>{log.target === 'all' ? '전체' : '마케팅'}</span>
                <span style={s.tag}>{screenLabel(log.screen)}</span>
                <span style={s.tag}>성공 {log.sent_count}건</span>
                {log.failed_count > 0 && <span style={{ ...s.tag, color: '#FF4D4D' }}>실패 {log.failed_count}건</span>}
              </div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <span style={{ color: statusColor(log.status), fontSize: 12, fontWeight: 700 }}>
                {log.status === 'sent' ? '✅ 발송됨' : '❌ 실패'}
              </span>
              <p style={{ color: '#555', fontSize: 11, margin: '4px 0 0' }}>
                {new Date(log.created_at).toLocaleString('ko-KR')}
              </p>
            </div>
          </div>
        ))}
        {logTotalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 20, paddingTop: 16, borderTop: '1px solid #1F2937' }}>
            <PageBtn disabled={logPage === 1} onClick={() => setLogPage(p => Math.max(1, p - 1))}>◀</PageBtn>
            {Array.from({ length: logTotalPages }, (_, i) => i + 1).map(p => (
              <PageBtn key={p} active={p === logPage} onClick={() => setLogPage(p)}>{p}</PageBtn>
            ))}
            <PageBtn disabled={logPage === logTotalPages} onClick={() => setLogPage(p => Math.min(logTotalPages, p + 1))}>▶</PageBtn>
          </div>
        )}
      </Modal>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', backgroundColor: '#05070A', padding: '40px 16px', fontFamily: 'sans-serif' },
  inner: { maxWidth: 1000, margin: '0 auto' },
  pageHeader: { marginBottom: 28 },
  pageTitle: { color: '#fff', fontSize: 26, fontWeight: 900, margin: 0 },
  pageDesc: { color: '#8B949E', fontSize: 13, marginTop: 6 },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 },
  card: { backgroundColor: '#0F1218', border: '1px solid #1F2937', borderRadius: 14, padding: 24, display: 'flex', flexDirection: 'column', gap: 4 },
  cardTitle: { color: '#fff', fontSize: 16, fontWeight: 800, marginBottom: 12, marginTop: 0 },
  label: { color: '#8B949E', fontSize: 11, fontWeight: 700, marginBottom: 4, marginTop: 12 },
  input: { backgroundColor: '#05070A', border: '1px solid #1F2937', borderRadius: 8, padding: '10px 12px', color: '#fff', fontSize: 13, width: '100%', outline: 'none', boxSizing: 'border-box' },
  chipRow: { display: 'flex', gap: 8 },
  chip: { padding: '6px 14px', borderRadius: 8, border: '1px solid #1F2937', background: '#05070A', color: '#8B949E', cursor: 'pointer', fontSize: 12, fontWeight: 700 },
  chipActive: { padding: '6px 14px', borderRadius: 8, border: '1px solid #00FF9D', background: '#00FF9D18', color: '#00FF9D', cursor: 'pointer', fontSize: 12, fontWeight: 700 },
  sendBtn: { marginTop: 16, padding: '12px 0', borderRadius: 10, border: 'none', background: '#00FF9D', color: '#05070A', fontSize: 14, fontWeight: 900, cursor: 'pointer' },
  schedBtn: { marginTop: 16, padding: '12px 0', borderRadius: 10, border: 'none', background: '#E3C16F', color: '#05070A', fontSize: 14, fontWeight: 900, cursor: 'pointer' },
  dailyBtn: { padding: '12px 0', borderRadius: 10, border: 'none', background: '#7C6FF7', color: '#fff', fontSize: 14, fontWeight: 900, cursor: 'pointer', width: '100%' },
  resultBox: { marginTop: 12, padding: '10px 14px', borderRadius: 8, border: '1px solid', backgroundColor: '#0F1218', color: '#fff', fontSize: 13 },
  schedItem: { display: 'flex', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #1F2937' },
  cancelSchedBtn: { padding: '4px 10px', borderRadius: 6, border: '1px solid #FF4D4D', background: 'transparent', color: '#FF4D4D', fontSize: 11, cursor: 'pointer' },
  emptyBox: { backgroundColor: '#0F1218', border: '1px solid #1F2937', borderRadius: 12, padding: '40px 0', textAlign: 'center', color: '#8B949E' },
  tag: { padding: '2px 8px', borderRadius: 6, background: '#1F2937', color: '#8B949E', fontSize: 10, fontWeight: 600 },
  viewBtn: { padding: '8px 16px', borderRadius: 8, border: '1px solid #1F2937', background: '#0F1218', color: '#E3C16F', cursor: 'pointer', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 },
  badge: { background: '#FF4D4D', color: '#fff', borderRadius: 10, padding: '1px 6px', fontSize: 10, fontWeight: 800 },
};

const m: Record<string, React.CSSProperties> = {
  overlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 },
  modal: { backgroundColor: '#0F1218', border: '1px solid #1F2937', borderRadius: 16, width: '100%', maxWidth: 640, maxHeight: '80vh', display: 'flex', flexDirection: 'column' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #1F2937' },
  modalTitle: { color: '#fff', fontSize: 16, fontWeight: 800, margin: 0 },
  closeBtn: { background: 'none', border: 'none', color: '#8B949E', fontSize: 18, cursor: 'pointer', padding: '4px 8px' },
  modalBody: { padding: '16px 20px', overflowY: 'auto', flex: 1 },
  item: { display: 'flex', gap: 12, alignItems: 'flex-start', padding: '12px 0', borderBottom: '1px solid #1F2937' },
};