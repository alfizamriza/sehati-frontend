// app/api/leaderboard/export/route.ts
//
// Proxy route: browser hit /api/leaderboard/export (same-origin, no CORS),
// lalu server Next.js forward request ke backend NestJS dengan token JWT.
//
import { NextRequest, NextResponse } from 'next/server';

// Pastikan NEXT_PUBLIC_API_URL di .env sudah benar, contoh:
//   NEXT_PUBLIC_API_URL=http://192.168.100.225:3001/api
const API_BASE =
    process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

// Hilangkan trailing /api jika ada, karena controller NestJS sudah prefix 'api/leaderboard'
// Contoh: "http://192.168.100.225:3001/api" → "http://192.168.100.225:3001"
const BACKEND_ORIGIN = API_BASE.replace(/\/api\/?$/, '');

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);

    // Forward hanya param yang dikenal
    const query = new URLSearchParams();
    (['type', 'kelas_id', 'jenjang'] as const).forEach((key) => {
        const val = searchParams.get(key);
        if (val) query.set(key, val);
    });

    // Ambil token JWT dari header Authorization yang dikirim oleh exportLeaderboardPdf()
    const authHeader = req.headers.get('authorization') ?? '';

    let backendRes: Response;
    try {
        backendRes = await fetch(
            `${BACKEND_ORIGIN}/api/leaderboard/export?${query.toString()}`,
            {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    ...(authHeader ? { Authorization: authHeader } : {}),
                },
            },
        );
    } catch (err) {
        console.error('[leaderboard/export proxy] fetch error:', err);
        return NextResponse.json(
            { error: 'Gagal menghubungi server backend.' },
            { status: 502 },
        );
    }

    if (!backendRes.ok) {
        const text = await backendRes.text();
        return NextResponse.json(
            { error: text },
            { status: backendRes.status },
        );
    }

    const buffer = await backendRes.arrayBuffer();
    const type = searchParams.get('type') ?? 'export';

    return new NextResponse(buffer, {
        status: 200,
        headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="leaderboard_${type}.pdf"`,
        },
    });
}