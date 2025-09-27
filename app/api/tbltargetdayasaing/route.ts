import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

// 🔑 Fungsi cek API Key
function apiuserch(req: NextRequest): boolean {
    const apiKey = req.headers.get("x-api-key");
    return apiKey === process.env.API_KEY_USERS;
}

// ✅ GET /api/users?search=abc
export async function GET(request: NextRequest) {
    // 🔐 Validasi API Key
    if (!apiuserch(request)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const search = request.nextUrl.searchParams.get("search") || undefined;

        const users = await prisma.user.findMany({
            where: search
                ? {
                    OR: [
                        { username: { contains: search } },
                        { nama: { contains: search } },
                        { email: { contains: search } },
                    ],
                }
                : undefined,
            orderBy: { createdAt: "desc" },
        });

        return NextResponse.json(users);
    } catch (err: any) {
        console.error(err);
        return NextResponse.json(
            { error: "Failed to fetch users" },
            { status: 500 }
        );
    }
}

// ✅ POST /api/users
// Body JSON: { "username": "Sendy", "password": "123", "nama": "Sendy", "email": "sendy@example.com" }
export async function POST(request: NextRequest) {
    // 🔐 Validasi API Key
    if (!apiuserch(request)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { username, password, nama, email, level, idgroup } = body ?? {};

        if (!nama || !email) {
            return NextResponse.json(
                { error: "nama & email are required" },
                { status: 400 }
            );
        }

        const User = await prisma.user.create({
            data: {
                username,
                password,
                nama,
                email,
                level: level ?? 1,
                idgroup: idgroup ?? null,
            },
        });

        return NextResponse.json(User, { status: 201 });
    } catch (err: any) {
        console.error(err);

        if (err.code === "P2002") {
            return NextResponse.json(
                { error: "Email already exists" },
                { status: 409 }
            );
        }

        return NextResponse.json(
            { error: "Failed to create user" },
            { status: 500 }
        );
    }
}
