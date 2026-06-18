import { NextRequest, NextResponse } from 'next/server';
import { SignJWT } from 'jose';

// Membaca API URL dari environment variable
const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL;

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { role, identifier, password } = body;

        // 1. Kirim request login ke backend API untuk verifikasi credentials
        const backendRes = await fetch(`${BACKEND_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ role, identifier, password }),
        });

        // Jika login di backend gagal, teruskan pesan error ke frontend
        if (!backendRes.ok) {
            const errorData = await backendRes.json().catch(() => ({}));
            return NextResponse.json(
                {
                    success: false,
                    message: errorData.message || 'Identitas atau kata sandi salah.',
                },
                { status: backendRes.status }
            );
        }

        const result = await backendRes.json();

        // Pastikan data user dikembalikan oleh backend
        if (!result.success || !result.data?.user) {
            return NextResponse.json(
                { success: false, message: result.message || 'Login gagal.' },
                { status: 400 }
            );
        }

        const user = result.data.user as { id: string; role: string; nama?: string };

        // 2. Generate JWT menggunakan JWT_SECRET frontend agar bisa divalidasi oleh Middleware Next.js
        const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
        const token = await new SignJWT({ userId: user.id, role: user.role })
            .setProtectedHeader({ alg: 'HS256' })
            .setExpirationTime('8h') // Token otomatis kedaluwarsa setelah 8 jam
            .sign(secret);

        // 3. Buat response JSON berisi data user dan jalur redirect
        const response = NextResponse.json({
            success: true,
            message: 'Login berhasil',
            data: {
                token,
                user,
                redirectTo: result.data.redirectTo || `/${user.role}/dashboard`,
            },
        });

        // 4. Set token sebagai HttpOnly cookie pada response
        response.cookies.set('auth_token', token, {
            httpOnly: true, // Mencegah akses via JavaScript (XSS Protection)
            secure: process.env.NODE_ENV === 'production', // Hanya HTTPS di production
            sameSite: 'lax', // Mencegah serangan CSRF dasar
            maxAge: 60 * 60 * 8, // Masa aktif cookie: 8 jam (sinkron dengan JWT)
            path: '/',
        });

        // Set cookie role (non-HttpOnly) agar client-side JS bisa mengetahuinya dengan mudah
        response.cookies.set('auth_role', user.role, {
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 8,
            path: '/',
        });

        return response;
    } catch (error) {
        console.error('Error in login API route:', error);
        return NextResponse.json(
            { success: false, message: 'Terjadi kesalahan internal pada server.' },
            { status: 500 }
        );
    }
}