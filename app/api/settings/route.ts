import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Settings from '@/models/Settings';

export async function GET() {
  try {
    await connectDB();
    const settings = await Settings.findOne().lean();
    return NextResponse.json({ settings: settings ?? {} });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const settings = await Settings.findOneAndUpdate(
      {},
      { ...body, updated_at: new Date() },
      { upsert: true, new: true }
    ).lean();
    return NextResponse.json({ settings });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
