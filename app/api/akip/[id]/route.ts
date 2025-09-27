import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

// 🔑 Cek API Key dari header
function apiuserch(req: NextRequest): boolean {
    const apiKey = req.headers.get("x-api-key");
    return apiKey === process.env.API_KEY_USERS;
}

// Mapping kdiku → nama kolom di JSON
const kdikuMapping = {
    "15": "harapanlamasekolah",
    "16": "rata2lamasekolah",
    "17": "ipm",
} as const;

type KdikuKey = typeof kdikuMapping[keyof typeof kdikuMapping];

// Bentuk respons: wajib ada 'tahun', opsional salah satu kolom ter-mapping
type AkipResponse = { tahun: string } & Partial<Record<KdikuKey, number>>;

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    // validasi API key lebih dulu
    if (!apiuserch(request)) {
        return NextResponse.json({ error: "Di Perlukan Akses" }, { status: 401 });
    }

    try {
        // Ambil id dari segmen dinamis [...]/[id]
        const { id } = await params;
        const idNum = Number(id);
        if (!Number.isFinite(idNum) || idNum <= 0) {
            return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
        }

        // Query data sesuai id
        const row = await prisma.tblkualitassdm.findUnique({
            where: { id_data: idNum },
        });

        if (!row) {
            return NextResponse.json({ error: "Data tidak ditemukan" }, { status: 404 });
        }

        // Susun hasil tanpa 'any'
        const result: AkipResponse = { tahun: String(row.tahun) };
        const colName = kdikuMapping[row.kdiku as keyof typeof kdikuMapping];
        if (colName) {
            result[colName] = Number(row.nilai);
        }

        return NextResponse.json(result);
    } catch (e: unknown) {
        // Hindari 'any' di error: pakai unknown + narrowing
        console.error("❌ Prisma/Route error:", e);
        const message = e instanceof Error ? e.message : "Failed to fetch AKIP";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
