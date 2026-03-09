// app/api/admin/push/daily/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET: 매일반복 목록
export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('daily_push_schedules')
    .select('*')
    .order('hour', { ascending: true })
    .order('minute', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST: 매일반복 등록
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { title, body: msgBody, target = 'all', screen = 'Dashboard', hour, minute } = body;

  if (!title || !msgBody || hour === undefined || minute === undefined) {
    return NextResponse.json({ error: '모든 항목을 입력해주세요' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('daily_push_schedules')
    .insert({ title, body: msgBody, target, screen, hour, minute, is_active: true })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// PATCH: 활성/비활성 토글
export async function PATCH(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const { is_active } = await req.json();

  const { data, error } = await supabaseAdmin
    .from('daily_push_schedules')
    .update({ is_active })
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// DELETE: 삭제
export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const { error } = await supabaseAdmin
    .from('daily_push_schedules')
    .delete()
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}