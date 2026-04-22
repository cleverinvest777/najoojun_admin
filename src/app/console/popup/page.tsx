'use client';

// pages/admin/popups.tsx  또는  app/admin/popups/page.tsx
import { useEffect, useState, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ── 타입 ─────────────────────────────────────────────────────
interface Popup {
  id: string;
  title: string | null;
  content: string | null;
  image_url: string | null;
  hide_days: number;
  is_active: boolean;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
}

const EMPTY_FORM = {
  title: '',
  content: '',
  image_url: '',
  hide_days: 7,
  is_active: true,
  start_date: '',
  end_date: '',
};

// ── 메인 페이지 ───────────────────────────────────────────────
export default function AdminPopupsPage() {
  const [popups, setPopups] = useState<Popup[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── 목록 조회 ──────────────────────────────────────────────
  const fetchPopups = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('popups')
      .select('*')
      .order('created_at', { ascending: false });
    setPopups(data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchPopups(); }, []);

  const resizeImage = (file: File, targetWidth: number, targetHeight: number): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject('Canvas 실패');
        
        // 원본 비율 유지하면서 cover 방식으로 크롭
        const srcRatio = img.width / img.height;
        const dstRatio = targetWidth / targetHeight;
        
        let sx = 0, sy = 0, sw = img.width, sh = img.height;
        
        if (srcRatio > dstRatio) {
          // 원본이 더 넓음 → 좌우 크롭
          sw = img.height * dstRatio;
          sx = (img.width - sw) / 2;
        } else {
          // 원본이 더 높음 → 상하 크롭
          sh = img.width / dstRatio;
          sy = (img.height - sh) / 2;
        }
        
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, targetWidth, targetHeight);
        URL.revokeObjectURL(url);
        
        canvas.toBlob(
          blob => blob ? resolve(blob) : reject('Blob 변환 실패'),
          'image/jpeg',
          0.85  // 품질 85%
        );
      };
      
      img.onerror = () => reject('이미지 로드 실패');
      img.src = url;
    });
  };

  // ── 이미지 업로드 ──────────────────────────────────────────
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 미리보기
    setPreviewUrl(URL.createObjectURL(file));
    setUploading(true);

    try {
      const resizedBlob = await resizeImage(file, 1080, 607);
      const resizedFile = new File([resizedBlob], file.name, { type: 'image/jpeg' });
      const fileName = `popup_${Date.now()}_${file.name}`;
      const { error } = await supabase.storage
        .from('popup-image')
        .upload(fileName, file, { upsert: true });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('popup-image')
        .getPublicUrl(fileName);

      setForm(p => ({ ...p, image_url: urlData.publicUrl }));
      setPreviewUrl(URL.createObjectURL(resizedBlob));
    } catch (e) {
      alert('이미지 업로드 실패: ' + e);
      setPreviewUrl('');
    } finally {
      setUploading(false);
    }
  };

  const handleImageRemove = () => {
    setForm(p => ({ ...p, image_url: '' }));
    setPreviewUrl('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ── 저장 ───────────────────────────────────────────────────
  const handleSave = async () => {
    if (!form.title && !form.content && !form.image_url) {
      alert('제목, 내용, 이미지 중 하나는 입력해주세요.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: form.title || null,
        content: form.content || null,
        image_url: form.image_url || null,
        hide_days: Number(form.hide_days) || 7,
        is_active: form.is_active,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
      };

      if (editingId) {
        await supabase.from('popups').update(payload).eq('id', editingId);
      } else {
        await supabase.from('popups').insert(payload);
      }

      setForm(EMPTY_FORM);
      setPreviewUrl('');
      setEditingId(null);
      fetchPopups();
    } catch (e) {
      alert('저장 실패: ' + e);
    } finally {
      setSaving(false);
    }
  };

  // ── 수정 시작 ──────────────────────────────────────────────
  const handleEdit = (popup: Popup) => {
    setEditingId(popup.id);
    setForm({
      title: popup.title ?? '',
      content: popup.content ?? '',
      image_url: popup.image_url ?? '',
      hide_days: popup.hide_days,
      is_active: popup.is_active,
      start_date: popup.start_date ?? '',
      end_date: popup.end_date ?? '',
    });
    setPreviewUrl(popup.image_url ?? '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ── 삭제 ───────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    if (!confirm('정말 삭제할까요?')) return;
    await supabase.from('popups').delete().eq('id', id);
    if (editingId === id) { setForm(EMPTY_FORM); setEditingId(null); setPreviewUrl(''); }
    fetchPopups();
  };

  // ── 활성화 토글 ────────────────────────────────────────────
  const handleToggle = async (id: string, current: boolean) => {
    await supabase.from('popups').update({ is_active: !current }).eq('id', id);
    fetchPopups();
  };

  // ── 취소 ───────────────────────────────────────────────────
  const handleCancel = () => {
    setForm(EMPTY_FORM);
    setPreviewUrl('');
    setEditingId(null);
  };

  // ── 렌더 ───────────────────────────────────────────────────
  return (
    <div style={s.page}>
      <div style={s.inner}>

        {/* 헤더 */}
        <div style={s.pageHeader}>
          <h1 style={s.pageTitle}>팝업 관리</h1>
          <p style={s.pageDesc}>앱 실행 시 표시되는 팝업을 등록·수정·삭제합니다.</p>
        </div>

        {/* ── 작성 / 수정 폼 ── */}
        <div style={s.card}>
          <h2 style={s.cardTitle}>{editingId ? '✏️ 팝업 수정' : '➕ 새 팝업 등록'}</h2>

          {/* 제목 */}
          <label style={s.label}>제목 (선택)</label>
          <input
            style={s.input}
            value={form.title}
            onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
            placeholder="팝업 제목을 입력하세요"
          />

          {/* 본문 */}
          <label style={s.label}>본문 내용</label>
          <textarea
            style={{ ...s.input, minHeight: 120, resize: 'vertical' }}
            value={form.content}
            onChange={e => setForm(p => ({ ...p, content: e.target.value }))}
            placeholder="팝업에 표시될 내용을 입력하세요"
          />

          {/* 이미지 */}
          <label style={s.label}>이미지 (선택)</label>
          {previewUrl || form.image_url ? (
            <div style={s.imagePreviewBox}>
              <img
                src={previewUrl || form.image_url}
                alt="preview"
                style={s.imagePreview}
              />
              <button style={s.removeImgBtn} onClick={handleImageRemove}>
                ✕ 이미지 제거
              </button>
            </div>
          ) : (
            <div
              style={s.imageDropZone}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading
                ? <span style={{ color: '#00FF9D' }}>업로드 중...</span>
                : <span style={{ color: '#8B949E' }}>클릭하여 이미지 선택</span>}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleImageUpload}
              />
            </div>
          )}

          {/* 숨김 기간 */}
          <label style={s.label}>숨김 기간 (일)</label>
          <div style={s.chipRow}>
            {[1, 3, 7, 14, 30].map(day => (
              <button
                key={day}
                style={form.hide_days === day ? s.chipActive : s.chip}
                onClick={() => setForm(p => ({ ...p, hide_days: day }))}
              >
                {day}일
              </button>
            ))}
            <input
              style={{ ...s.input, width: 72, marginBottom: 0 }}
              type="number"
              min={1}
              value={form.hide_days}
              onChange={e => setForm(p => ({ ...p, hide_days: Number(e.target.value) }))}
              placeholder="직접"
            />
          </div>

          {/* 표시 기간 */}
          <label style={s.label}>표시 기간 (선택)</label>
          <div style={s.dateRow}>
            <input
              style={{ ...s.input, flex: 1, marginBottom: 0 }}
              type="date"
              value={form.start_date}
              onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))}
            />
            <span style={{ color: '#8B949E', padding: '0 8px' }}>~</span>
            <input
              style={{ ...s.input, flex: 1, marginBottom: 0 }}
              type="date"
              value={form.end_date}
              onChange={e => setForm(p => ({ ...p, end_date: e.target.value }))}
            />
          </div>

          {/* 활성화 */}
          <label style={{ ...s.label, display: 'flex', alignItems: 'center', gap: 10, marginTop: 16 }}>
            활성화
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={e => setForm(p => ({ ...p, is_active: e.target.checked }))}
              style={{ width: 18, height: 18, accentColor: '#00FF9D' }}
            />
            <span style={{ color: form.is_active ? '#00FF9D' : '#8B949E', fontSize: 12, fontWeight: 700 }}>
              {form.is_active ? 'ON' : 'OFF'}
            </span>
          </label>

          {/* 버튼 */}
          <div style={s.btnRow}>
            {editingId && (
              <button style={s.cancelBtn} onClick={handleCancel}>취소</button>
            )}
            <button
              style={{ ...s.saveBtn, opacity: saving ? 0.6 : 1 }}
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? '저장 중...' : editingId ? '수정 저장' : '팝업 등록'}
            </button>
          </div>
        </div>

        {/* ── 팝업 목록 ── */}
        <h2 style={{ color: '#fff', fontSize: 18, fontWeight: 800, marginBottom: 16 }}>
          등록된 팝업 목록
        </h2>

        {loading ? (
          <p style={{ color: '#8B949E', textAlign: 'center', padding: '40px 0' }}>불러오는 중...</p>
        ) : popups.length === 0 ? (
          <div style={s.emptyBox}>등록된 팝업이 없습니다</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {popups.map(popup => (
              <div key={popup.id} style={s.popupItem}>
                {/* 이미지 썸네일 */}
                {popup.image_url && (
                  <img src={popup.image_url} alt="thumb" style={s.thumbnail} />
                )}

                {/* 정보 */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <span style={{ color: '#fff', fontWeight: 800, fontSize: 15, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {popup.title || '(제목 없음)'}
                    </span>
                    {/* 활성화 토글 */}
                    <label style={s.toggleLabel}>
                      <input
                        type="checkbox"
                        checked={popup.is_active}
                        onChange={() => handleToggle(popup.id, popup.is_active)}
                        style={{ accentColor: '#00FF9D', width: 16, height: 16 }}
                      />
                      <span style={{ color: popup.is_active ? '#00FF9D' : '#8B949E', fontSize: 11, fontWeight: 700 }}>
                        {popup.is_active ? 'ON' : 'OFF'}
                      </span>
                    </label>
                  </div>

                  {popup.content && (
                    <p style={{ color: '#8B949E', fontSize: 13, marginBottom: 8, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' } as any}>
                      {popup.content}
                    </p>
                  )}

                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <span style={s.tag}>{popup.hide_days}일 숨김</span>
                    {popup.start_date && (
                      <span style={s.tag}>{popup.start_date} ~ {popup.end_date ?? '∞'}</span>
                    )}
                    <span style={{ ...s.tag, background: popup.is_active ? '#00FF9D22' : undefined, color: popup.is_active ? '#00FF9D' : undefined }}>
                      {popup.is_active ? '활성' : '비활성'}
                    </span>
                    <span style={{ ...s.tag, color: '#555' }}>
                      {new Date(popup.created_at).toLocaleDateString('ko-KR')}
                    </span>
                  </div>
                </div>

                {/* 액션 버튼 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <button style={s.editBtn} onClick={() => handleEdit(popup)}>수정</button>
                  <button style={s.deleteBtn} onClick={() => handleDelete(popup.id)}>삭제</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── 인라인 스타일 ─────────────────────────────────────────────
const s: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', backgroundColor: '#05070A', padding: '40px 16px', fontFamily: 'sans-serif' },
  inner: { maxWidth: 720, margin: '0 auto' },
  pageHeader: { marginBottom: 28 },
  pageTitle: { color: '#fff', fontSize: 26, fontWeight: 900, margin: 0 },
  pageDesc: { color: '#8B949E', fontSize: 13, marginTop: 6 },

  card: {
    backgroundColor: '#0F1218',
    border: '1px solid #1F2937',
    borderRadius: 14,
    padding: 24,
    marginBottom: 32,
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  cardTitle: { color: '#fff', fontSize: 16, fontWeight: 800, marginBottom: 16, marginTop: 0 },

  label: { color: '#8B949E', fontSize: 11, fontWeight: 700, marginBottom: 6, marginTop: 14 },
  input: {
    backgroundColor: '#05070A',
    border: '1px solid #1F2937',
    borderRadius: 8,
    padding: '10px 12px',
    color: '#fff',
    fontSize: 13,
    width: '100%',
    outline: 'none',
    marginBottom: 4,
    boxSizing: 'border-box',
  },

  imageDropZone: {
    border: '1px dashed #1F2937',
    borderRadius: 8,
    padding: '32px 0',
    textAlign: 'center',
    cursor: 'pointer',
    fontSize: 13,
  },
  imagePreviewBox: { display: 'flex', flexDirection: 'column', gap: 8 },
  imagePreview: { width: '100%', maxHeight: 240, objectFit: 'cover', borderRadius: 8 },
  removeImgBtn: {
    alignSelf: 'flex-start',
    background: '#FF4D4D22',
    border: 'none',
    color: '#FF4D4D',
    padding: '6px 14px',
    borderRadius: 8,
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: 700,
  },

  chipRow: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  chip: {
    padding: '6px 14px',
    borderRadius: 8,
    border: '1px solid #1F2937',
    background: '#05070A',
    color: '#8B949E',
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: 700,
  },
  chipActive: {
    padding: '6px 14px',
    borderRadius: 8,
    border: '1px solid #00FF9D',
    background: '#00FF9D18',
    color: '#00FF9D',
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: 700,
  },

  dateRow: { display: 'flex', alignItems: 'center' },

  btnRow: { display: 'flex', gap: 10, marginTop: 20 },
  cancelBtn: {
    flex: 1,
    padding: '12px 0',
    borderRadius: 10,
    border: '1px solid #1F2937',
    background: 'transparent',
    color: '#8B949E',
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
  },
  saveBtn: {
    flex: 2,
    padding: '12px 0',
    borderRadius: 10,
    border: 'none',
    background: '#00FF9D',
    color: '#05070A',
    fontSize: 13,
    fontWeight: 900,
    cursor: 'pointer',
  },

  emptyBox: {
    backgroundColor: '#0F1218',
    border: '1px solid #1F2937',
    borderRadius: 12,
    padding: '48px 0',
    textAlign: 'center',
    color: '#8B949E',
    fontSize: 13,
  },

  popupItem: {
    backgroundColor: '#0F1218',
    border: '1px solid #1F2937',
    borderRadius: 12,
    padding: 16,
    display: 'flex',
    gap: 14,
    alignItems: 'flex-start',
  },
  thumbnail: { width: 80, height: 80, objectFit: 'cover', borderRadius: 8, flexShrink: 0 },
  toggleLabel: { display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' },
  tag: {
    padding: '2px 8px',
    borderRadius: 6,
    background: '#1F2937',
    color: '#8B949E',
    fontSize: 10,
    fontWeight: 600,
  },
  editBtn: {
    padding: '6px 16px',
    borderRadius: 8,
    border: '1px solid #00FF9D',
    background: 'transparent',
    color: '#00FF9D',
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  deleteBtn: {
    padding: '6px 16px',
    borderRadius: 8,
    border: '1px solid #FF4D4D',
    background: 'transparent',
    color: '#FF4D4D',
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
};