// app/api/admin/push/schedules/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET: 예약 목록
export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('push_schedules')
    .select('*')
    .order('scheduled_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST: 예약 등록
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { title, body: msgBody, target = 'all', screen = 'Dashboard', scheduled_at } = body;

  if (!title || !msgBody || !scheduled_at) {
    return NextResponse.json({ error: '제목, 내용, 예약 시간을 입력해주세요' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('push_schedules')
    .insert({ title, body: msgBody, target, screen, scheduled_at })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// PATCH: 예약 취소
export async function PATCH(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from('push_schedules')
    .update({ status: 'cancelled' })
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}