'use client';

// app/admin/quiz/page.tsx
import { useEffect, useState } from 'react';

const API = '/api/admin/quiz';

const CATEGORIES = ['주식', '경제', '투자', '금융', '시사'];

interface Quiz {
  id: string;
  question: string;
  options: string[];
  answer: number;
  explanation: string | null;
  category: string;
  is_active: boolean;
  created_at: string;
}

export default function AdminQuizPage() {
  // ── 등록 폼
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '', '', '']);
  const [answer, setAnswer] = useState<number | null>(null);
  const [explanation, setExplanation] = useState('');
  const [category, setCategory] = useState('주식');
  const [saving, setSaving] = useState(false);

  // ── 목록
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<string | null>(null);

  // ── 오늘의 퀴즈 인덱스 계산
  const todayIndex = (() => {
    const activeQuizzes = quizzes.filter(q => q.is_active);
    if (activeQuizzes.length === 0) return null;
    const dayIndex = Math.floor(Date.now() / 86400000);
    return dayIndex % activeQuizzes.length;
  })();

  const fetchQuizzes = async () => {
    setLoading(true);
    const res = await fetch(API);
    const data = await res.json();
    setQuizzes(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => { fetchQuizzes(); }, []);

  const resetForm = () => {
    setQuestion(''); setOptions(['', '', '', '']);
    setAnswer(null); setExplanation(''); setCategory('주식');
    setEditId(null);
  };

  const handleOptionChange = (idx: number, val: string) => {
    const updated = [...options];
    updated[idx] = val;
    setOptions(updated);
  };

  const handleSave = async () => {
    if (!question.trim()) { alert('문제를 입력해주세요'); return; }
    if (options.some(o => !o.trim())) { alert('보기 4개를 모두 입력해주세요'); return; }
    if (answer === null) { alert('정답을 선택해주세요'); return; }

    setSaving(true);
    try {
      const body = { question, options, answer, explanation, category };
      const res = await fetch(editId ? `${API}?id=${editId}` : API, {
        method: editId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      resetForm();
      fetchQuizzes();
      alert(editId ? '수정되었습니다' : '퀴즈가 등록되었습니다');
    } catch (e: any) {
      alert('저장 실패: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (quiz: Quiz) => {
    setEditId(quiz.id);
    setQuestion(quiz.question);
    setOptions([...quiz.options]);
    setAnswer(quiz.answer);
    setExplanation(quiz.explanation ?? '');
    setCategory(quiz.category);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleToggle = async (id: string, isActive: boolean) => {
    await fetch(`${API}?id=${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !isActive }),
    });
    fetchQuizzes();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('퀴즈를 삭제할까요?')) return;
    await fetch(`${API}?id=${id}`, { method: 'DELETE' });
    fetchQuizzes();
  };

  const activeQuizzes = quizzes.filter(q => q.is_active);

  return (
    <div style={s.page}>
      <div style={s.inner}>
        <div style={s.pageHeader}>
          <h1 style={s.pageTitle}>🧠 퀴즈 관리</h1>
          <p style={s.pageDesc}>매일 퀴즈를 등록하고 관리합니다. 날짜 기준으로 자동 순환 출제됩니다.</p>
        </div>

        <div style={s.grid}>
          {/* ── 등록/수정 폼 ── */}
          <div style={s.card}>
            <h2 style={s.cardTitle}>{editId ? '✏️ 퀴즈 수정' : '➕ 퀴즈 등록'}</h2>

            <label style={s.label}>카테고리</label>
            <div style={s.chipRow}>
              {CATEGORIES.map(cat => (
                <button key={cat}
                  style={category === cat ? s.chipActive : s.chip}
                  onClick={() => setCategory(cat)}>{cat}</button>
              ))}
            </div>

            <label style={s.label}>문제</label>
            <textarea
              style={{ ...s.input, minHeight: 80, resize: 'vertical' }}
              value={question}
              onChange={e => setQuestion(e.target.value)}
              placeholder="퀴즈 문제를 입력하세요"
            />

            <label style={s.label}>보기 (정답 선택 클릭)</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {options.map((opt, idx) => (
                <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button
                    style={{
                      width: 32, height: 32, borderRadius: 16, flexShrink: 0,
                      border: `2px solid ${answer === idx ? '#00FF9D' : '#1F2937'}`,
                      background: answer === idx ? '#00FF9D' : '#05070A',
                      color: answer === idx ? '#05070A' : '#8B949E',
                      fontWeight: 900, fontSize: 13, cursor: 'pointer',
                    }}
                    onClick={() => setAnswer(idx)}
                  >{idx + 1}</button>
                  <input
                    style={{ ...s.input, flex: 1 }}
                    value={opt}
                    onChange={e => handleOptionChange(idx, e.target.value)}
                    placeholder={`보기 ${idx + 1}`}
                  />
                  {answer === idx && (
                    <span style={{ color: '#00FF9D', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>✓ 정답</span>
                  )}
                </div>
              ))}
            </div>
            {answer === null && (
              <p style={{ color: '#FF4D4D', fontSize: 11, marginTop: 4 }}>번호 버튼을 클릭해 정답을 선택하세요</p>
            )}

            <label style={s.label}>해설 (선택)</label>
            <textarea
              style={{ ...s.input, minHeight: 60, resize: 'vertical' }}
              value={explanation}
              onChange={e => setExplanation(e.target.value)}
              placeholder="정답 해설을 입력하세요 (선택사항)"
            />

            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button
                style={{ ...s.saveBtn, flex: 1, opacity: saving ? 0.6 : 1 }}
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? '저장 중...' : editId ? '✏️ 수정 완료' : '➕ 퀴즈 등록'}
              </button>
              {editId && (
                <button style={s.cancelBtn} onClick={resetForm}>취소</button>
              )}
            </div>
          </div>

          {/* ── 오늘의 퀴즈 미리보기 ── */}
          <div style={s.card}>
            <h2 style={s.cardTitle}>📅 오늘의 퀴즈 미리보기</h2>
            <div style={{ ...s.infoBadge, marginBottom: 16 }}>
              <span>활성 퀴즈 {activeQuizzes.length}개 · 오늘 인덱스 #{todayIndex !== null ? todayIndex + 1 : '-'}</span>
            </div>

            {activeQuizzes.length === 0 ? (
              <div style={s.emptyBox}>
                <p style={{ color: '#555', margin: 0 }}>활성화된 퀴즈가 없습니다</p>
              </div>
            ) : (() => {
              const todayQuiz = todayIndex !== null ? activeQuizzes[todayIndex] : null;
              if (!todayQuiz) return null;
              return (
                <div>
                  <div style={s.categoryBadge}>{todayQuiz.category}</div>
                  <div style={s.previewQuestion}>{todayQuiz.question}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {todayQuiz.options.map((opt, idx) => (
                      <div key={idx} style={{
                        ...s.previewOption,
                        ...(idx === todayQuiz.answer ? s.previewOptionAnswer : {}),
                      }}>
                        <span style={s.previewNum}>{idx + 1}</span>
                        <span style={{ flex: 1, color: '#fff', fontSize: 13 }}>{opt}</span>
                        {idx === todayQuiz.answer && <span style={{ color: '#00FF9D', fontSize: 11, fontWeight: 700 }}>✓ 정답</span>}
                      </div>
                    ))}
                  </div>
                  {todayQuiz.explanation && (
                    <div style={s.explanationBox}>
                      💡 {todayQuiz.explanation}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>

        {/* ── 퀴즈 목록 ── */}
        <div style={{ marginTop: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ color: '#fff', fontSize: 18, fontWeight: 800, margin: 0 }}>
              전체 퀴즈 목록 <span style={{ color: '#8B949E', fontSize: 14, fontWeight: 400 }}>({quizzes.length}개)</span>
            </h2>
          </div>

          {loading ? (
            <div style={s.emptyBox}>불러오는 중...</div>
          ) : quizzes.length === 0 ? (
            <div style={s.emptyBox}>등록된 퀴즈가 없습니다</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {quizzes.map((quiz, listIdx) => (
                <div key={quiz.id} style={s.quizItem}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flex: 1 }}>
                    <div style={{ ...s.quizIndex, background: quiz.is_active ? '#00FF9D18' : '#1F2937', color: quiz.is_active ? '#00FF9D' : '#555', border: `1px solid ${quiz.is_active ? '#00FF9D40' : '#1F2937'}` }}>
                      #{listIdx + 1}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <span style={s.categoryBadge}>{quiz.category}</span>
                        {!quiz.is_active && <span style={{ ...s.categoryBadge, background: '#1F2937', color: '#555', border: '1px solid #1F2937' }}>비활성</span>}
                      </div>
                      <p style={{ color: '#fff', fontWeight: 700, fontSize: 14, margin: '0 0 8px' }}>{quiz.question}</p>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {quiz.options.map((opt, idx) => (
                          <span key={idx} style={{
                            fontSize: 11, padding: '2px 8px', borderRadius: 6,
                            background: idx === quiz.answer ? '#00FF9D18' : '#1F2937',
                            color: idx === quiz.answer ? '#00FF9D' : '#8B949E',
                            border: `1px solid ${idx === quiz.answer ? '#00FF9D40' : 'transparent'}`,
                            fontWeight: idx === quiz.answer ? 700 : 400,
                          }}>
                            {idx + 1}. {opt}{idx === quiz.answer ? ' ✓' : ''}
                          </span>
                        ))}
                      </div>
                      {quiz.explanation && (
                        <p style={{ color: '#8B949E', fontSize: 11, margin: '6px 0 0' }}>💡 {quiz.explanation}</p>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'flex-start' }}>
                    <button
                      style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid #1F2937', background: '#05070A', color: '#E3C16F', cursor: 'pointer', fontSize: 11, fontWeight: 700 }}
                      onClick={() => handleEdit(quiz)}
                    >수정</button>
                    <button
                      style={{ padding: '5px 10px', borderRadius: 6, border: `1px solid ${quiz.is_active ? '#FF4D4D' : '#00FF9D'}`, background: '#05070A', color: quiz.is_active ? '#FF4D4D' : '#00FF9D', cursor: 'pointer', fontSize: 11, fontWeight: 700 }}
                      onClick={() => handleToggle(quiz.id, quiz.is_active)}
                    >{quiz.is_active ? '비활성화' : '활성화'}</button>
                    <button
                      style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid #FF4D4D', background: 'transparent', color: '#FF4D4D', cursor: 'pointer', fontSize: 11, fontWeight: 700 }}
                      onClick={() => handleDelete(quiz.id)}
                    >삭제</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
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
  chipRow: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  chip: { padding: '6px 14px', borderRadius: 8, border: '1px solid #1F2937', background: '#05070A', color: '#8B949E', cursor: 'pointer', fontSize: 12, fontWeight: 700 },
  chipActive: { padding: '6px 14px', borderRadius: 8, border: '1px solid #00FF9D', background: '#00FF9D18', color: '#00FF9D', cursor: 'pointer', fontSize: 12, fontWeight: 700 },
  saveBtn: { padding: '12px 0', borderRadius: 10, border: 'none', background: '#00FF9D', color: '#05070A', fontSize: 14, fontWeight: 900, cursor: 'pointer' },
  cancelBtn: { padding: '12px 20px', borderRadius: 10, border: '1px solid #1F2937', background: '#05070A', color: '#8B949E', fontSize: 14, fontWeight: 700, cursor: 'pointer' },
  emptyBox: { backgroundColor: '#0F1218', border: '1px solid #1F2937', borderRadius: 12, padding: '40px 0', textAlign: 'center', color: '#8B949E' },
  infoBadge: { backgroundColor: '#1F2937', borderRadius: 8, padding: '6px 12px', color: '#8B949E', fontSize: 12 },
  categoryBadge: { display: 'inline-block', background: '#00FF9D15', border: '1px solid #00FF9D30', borderRadius: 6, padding: '2px 8px', color: '#00FF9D', fontSize: 11, fontWeight: 700 },
  previewQuestion: { color: '#fff', fontSize: 14, fontWeight: 700, lineHeight: 1.6, backgroundColor: '#05070A', borderRadius: 10, padding: 14, marginBottom: 12, border: '1px solid #1F2937' },
  previewOption: { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, border: '1px solid #1F2937', background: '#05070A' },
  previewOptionAnswer: { border: '1px solid #00FF9D40', background: '#00FF9D10' },
  previewNum: { width: 22, height: 22, borderRadius: 11, background: '#1F2937', color: '#8B949E', fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  explanationBox: { marginTop: 12, padding: '10px 14px', borderRadius: 8, background: '#1F2937', color: '#8B949E', fontSize: 12, lineHeight: 1.6 },
  quizItem: { backgroundColor: '#0F1218', border: '1px solid #1F2937', borderRadius: 12, padding: '16px', display: 'flex', gap: 12, alignItems: 'flex-start' },
  quizIndex: { padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 800, flexShrink: 0 },
};