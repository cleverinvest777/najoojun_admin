// app/api/admin/push/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const FCM_URL = 'https://fcm.googleapis.com/v1/projects/stock-battle-34f1e/messages:send';

const sendToToken = async (token: string, title: string, body: string, screen: string, accessToken: string): Promise<boolean> => {
  try {
    const res = await fetch(FCM_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({
        message: {
          token,
          notification: { title, body },
          data: { screen },               // ✅ 클릭 시 이동 화면
          android: { priority: 'high' },
          apns: { payload: { aps: { sound: 'default' } } },
        },
      }),
    });
    return res.ok;
  } catch { return false; }
};

const getAccessToken = async (): Promise<string> => {
  const admin = require('firebase-admin');
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
  }
  const token = await admin.app().options.credential.getAccessToken();
  return token.access_token;
};

export async function POST(req: NextRequest) {
  try {
    const { title, body, target = 'all', screen = 'Dashboard' } = await req.json();

    if (!title || !body) return NextResponse.json({ error: '제목과 내용을 입력해주세요' }, { status: 400 });

    let query = supabaseAdmin.from('push_tokens').select('token, user_id');

    if (target === 'marketing') {
      const { data: marketingUsers } = await supabaseAdmin.from('users').select('id').eq('marketing_agreed', true);
      const userIds = marketingUsers?.map(u => u.id) ?? [];
      if (userIds.length === 0) return NextResponse.json({ message: '마케팅 동의 유저가 없습니다', sent: 0 });
      query = query.in('user_id', userIds);
    }

    const { data: tokens, error } = await query;
    if (error) throw error;
    if (!tokens || tokens.length === 0) return NextResponse.json({ message: '발송할 토큰이 없습니다', sent: 0 });

    const accessToken = await getAccessToken();
    const results = await Promise.allSettled(
      tokens.map(t => sendToToken(t.token, title, body, screen, accessToken))
    );

    const sentCount = results.filter(r => r.status === 'fulfilled' && r.value).length;
    const failedCount = results.length - sentCount;

    // ✅ notifications 테이블에 유저별 알림 저장
    if (tokens.length > 0) {
      await supabaseAdmin.from('notifications').insert(
        tokens.map(t => ({ user_id: t.user_id, title, body, screen, is_read: false }))
      );
    }

    // 발송 이력
    await supabaseAdmin.from('push_logs').insert({
      title, body, target, screen,
      sent_count: sentCount, failed_count: failedCount,
      status: sentCount > 0 ? 'sent' : 'failed',
    });

    return NextResponse.json({ success: true, total: tokens.length, sent: sentCount, failed: failedCount });

  } catch (e: any) {
    console.error('푸시 발송 실패:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('push_logs').select('*').order('created_at', { ascending: false }).limit(50);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}