import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

// 🔑 Fungsi cek API Key
function apiuserch(req: NextRequest): boolean {
    const apiKey = req.headers.get("x-api-key");
    return apiKey === process.env.API_KEY_USERS;
}

// Mapping kdiku → nama kolom di JSON
const kdikuMapping: Record<string, string> = {
    "15": "harapanlamasekolah",
    "16": "rata2lamasekolah",
    "17": "ipm",
};

// Helper ambil id integer
function parseId(params: { id: string }) {
    const id = Number(params.id);
    if (Number.isNaN(id) || id <= 0) {
        throw new Error("Invalid id");
    }
    return id;
}


export async function GET(request: NextRequest) {
    if (!apiuserch(request)) {
        return NextResponse.json({ error: "Di Perlukan Akses" }, { status: 401 });
    }

    try {
        // Ambil ID dari URL
        const idParam = request.nextUrl.searchParams.get("id");
        if (!idParam || Number.isNaN(Number(idParam))) {
            return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
        }
        const id = Number(idParam);

        // Ambil data tblkesma + relasi tblindikator berdasarkan ID
        const tblkualitassdm = await prisma.tblkualitassdm.findUnique({
            where: { id_data: id },
        });

        if (!tblkualitassdm) {
            return NextResponse.json({ error: "Data tidak ditemukan" }, { status: 404 });
        }

        // Transform menjadi JSON sesuai mapping kdiku
        const result: Record<string, any> = { tahun: tblkualitassdm.tahun.toString() };
        const colName = kdikuMapping[tblkualitassdm.kdiku];
        if (colName) {
            result[colName] = Number(tblkualitassdm.nilai);
        }

        return NextResponse.json(result);
    } catch (err: any) {
        console.error("❌ Prisma error:", err);
        return NextResponse.json({ error: "Failed to fetch Kesma" }, { status: 500 });
    }
}
