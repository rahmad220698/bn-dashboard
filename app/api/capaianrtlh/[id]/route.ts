import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

// 🔑 Cek API Key dari header
function apiuserch(req: NextRequest): boolean {
    const apiKey = req.headers.get("x-api-key");
    return apiKey === process.env.API_KEY_USERS;
}

// Mapping kdiku → nama field output
const kdikuMapping = {
    "15": "harapanlamasekolah",
    "16": "rata2lamasekolah",
    "17": "ipm",
} as const;

type MetricKey = typeof kdikuMapping[keyof typeof kdikuMapping];

// Respons: wajib 'tahun', opsional salah satu metric
type RtlhResponse = { tahun: string } & Partial<Record<MetricKey, number>>;

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    // validasi akses
    if (!apiuserch(request)) {
        return NextResponse.json({ error: "Di Perlukan Akses" }, { status: 401 });
    }

    try {
        // id dari segmen dinamis [...]/[id]
        const { id } = await params;
        const idNum = Number(id);
        if (!Number.isFinite(idNum) || idNum <= 0) {
            return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
        }

        const row = await prisma.tblkualitassdm.findUnique({
            where: { id_data: idNum },
        });

        if (!row) {
            return NextResponse.json({ error: "Data tidak ditemukan" }, { status: 404 });
        }

        const result: RtlhResponse = { tahun: String(row.tahun) };
        const colName = kdikuMapping[row.kdiku as keyof typeof kdikuMapping];
        if (colName) {
            result[colName] = Number(row.nilai);
        }

        return NextResponse.json(result);
    } catch (e: unknown) {
        console.error("❌ Prisma/Route error:", e);
        const msg = e instanceof Error ? e.message : "Failed to fetch capaian RTLH";
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
