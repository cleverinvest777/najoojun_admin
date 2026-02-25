'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { ShieldCheck, ShieldOff, MessageSquare, Layout, Siren } from 'lucide-react';

interface Report {
  id: number;
  reporter_id: string;
  target_type: 'post' | 'comment';
  target_id: number;
  reason: string;
  created_at: string;
  // 조인을 통해 가져올 데이터
  target_status?: boolean; 
}

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    setLoading(true);
    // 1. 신고 내역 가져오기
    const { data: reportData, error: reportError } = await supabase
      .from('reports')
      .select('*')
      .order('created_at', { ascending: false });

    if (reportError) {
      console.error('신고 내역 로드 실패:', reportError);
      return;
    }

    // 2. 각 신고 대상의 현재 활성화 상태(is_active) 가져오기
    const reportsWithStatus = await Promise.all(
      reportData.map(async (report) => {
        const table = report.target_type === 'post' ? 'posts' : 'comments';
        const { data: targetData } = await supabase
          .from(table)
          .select('is_active')
          .eq('id', report.target_id)
          .single();
        
        return { ...report, target_status: targetData?.is_active };
      })
    );

    setReports(reportsWithStatus);
    setLoading(false);
  };

  // 활성화 상태 토글 함수 (숨기기 / 복구하기)
  const toggleActiveStatus = async (report: Report) => {
    const table = report.target_type === 'post' ? 'posts' : 'comments';
    const newStatus = !report.target_status;

    const { error } = await supabase
      .from(table)
      .update({ is_active: newStatus })
      .eq('id', report.target_id);

    if (error) {
      alert('상태 변경 실패: ' + error.message);
    } else {
      // 로컬 상태 업데이트
      setReports(prev => 
        prev.map(r => r.target_id === report.target_id && r.target_type === report.target_type
          ? { ...r, target_status: newStatus } 
          : r
        )
      );
    }
  };

  if (loading) return <div className="p-8 text-white">신고 내역 로딩 중...</div>;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Siren className="text-red-500" /> 신고 관리 시스템
        </h1>
        <p className="text-gray-400 text-sm mt-2">사용자가 신고한 콘텐츠를 검토하고 노출 여부를 결정합니다.</p>
      </header>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-800/50 text-gray-400 text-xs uppercase">
              <th className="px-6 py-4 font-medium">유형</th>
              <th className="px-6 py-4 font-medium">신고 사유</th>
              <th className="px-6 py-4 font-medium">신고 일시</th>
              <th className="px-6 py-4 font-medium">현재 상태</th>
              <th className="px-6 py-4 font-medium text-right">관리 액션</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {reports.map((report) => (
              <tr key={report.id} className="hover:bg-gray-800/30 transition-colors">
                <td className="px-6 py-4">
                  <span className={`flex items-center gap-1.5 text-sm font-medium ${report.target_type === 'post' ? 'text-blue-400' : 'text-purple-400'}`}>
                    {report.target_type === 'post' ? <Layout size={14} /> : <MessageSquare size={14} />}
                    {report.target_type.toUpperCase()}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <p className="text-white text-sm leading-relaxed">{report.reason}</p>
                  <p className="text-gray-500 text-[11px] mt-1">ID: {report.target_id}</p>
                </td>
                <td className="px-6 py-4 text-gray-400 text-sm">
                  {format(new Date(report.created_at), 'yyyy-MM-dd HH:mm')}
                </td>
                <td className="px-6 py-4">
                  {report.target_status ? (
                    <span className="bg-emerald-500/10 text-emerald-500 text-[11px] px-2 py-1 rounded-full border border-emerald-500/20">노출 중</span>
                  ) : (
                    <span className="bg-red-500/10 text-red-500 text-[11px] px-2 py-1 rounded-full border border-red-500/20">숨김 처리됨</span>
                  )}
                </td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => toggleActiveStatus(report)}
                    className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                      report.target_status 
                        ? 'bg-red-500 hover:bg-red-600 text-white' 
                        : 'bg-emerald-500 hover:bg-emerald-600 text-black'
                    }`}
                  >
                    {report.target_status ? (
                      <><ShieldOff size={14} /> 즉시 숨기기</>
                    ) : (
                      <><ShieldCheck size={14} /> 노출 복구</>
                    )}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {reports.length === 0 && (
          <div className="p-20 text-center text-gray-500 text-sm">접수된 신고 내역이 없습니다.</div>
        )}
      </div>
    </div>
  );
}