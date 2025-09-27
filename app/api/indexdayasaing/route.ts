import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

// ====== Types untuk hasil SELECT mentah ======
type RawRow = {
    id: string | number | bigint;
    indikator: string | null;
    kdiku: string;
    nmiku: string | null;
    tahun: number | bigint;
    target: number | bigint | null;
    capaian: number | bigint | null;
};

// Bentuk keluaran final (BigInt -> Number)
type RowOut = {
    id: string;
    indikator: string | null;
    kdiku: string;
    nmiku: string | null;
    tahun: number;
    target: number | null;
    capaian: number | null;
};

// Util konversi aman BigInt -> Number
const toNum = (v: number | bigint | null | undefined): number | null => {
    if (v === null || v === undefined) return null;
    return typeof v === "bigint" ? Number(v) : v;
};

// ====== GET /api/indexdayasaing ======
export async function GET() {
    try {
        const data = await prisma.$queryRawUnsafe<RawRow[]>(`
      SELECT
        ANY_VALUE(iddys) AS id,
        ANY_VALUE(nmdys) AS indikator,
        kdiku,
        ANY_VALUE(nmiku) AS nmiku,
        MAX(tahun) AS tahun,
        SUM(target) AS target,
        SUM(capaian) AS capaian
      FROM tbltargetdayasaing
      GROUP BY ANY_VALUE(iddys), tahun, kdiku;
    `);

        const serialized: RowOut[] = data.map((row) => ({
            id: String(row.id),
            indikator: row.indikator,
            kdiku: row.kdiku,
            nmiku: row.nmiku,
            tahun: typeof row.tahun === "bigint" ? Number(row.tahun) : row.tahun,
            target: toNum(row.target),
            capaian: toNum(row.capaian),
        }));

        return NextResponse.json(serialized);
    } catch (e: unknown) {
        console.error("❌ Error query index daya saing:", e);
        return NextResponse.json({ message: "Gagal mengambil data" }, { status: 500 });
    }
}

// ====== Helpers validasi body ======
type PostBody = {
    id: string | number;
    indikator: string;
    kdiku: string;
    nmiku: string;
    tahun: number | string;
    target: number | string;
    capaian: number | string;
};
function isPostBody(x: unknown): x is PostBody {
    if (!x || typeof x !== "object") return false;
    const o = x as Record<string, unknown>;
    return (
        typeof o.indikator === "string" &&
        typeof o.kdiku === "string" &&
        typeof o.nmiku === "string" &&
        ("id" in o) &&
        ("tahun" in o) &&
        ("target" in o) &&
        ("capaian" in o)
    );
}

type PutBody = {
    kdiku: string;
    tahun: number | string;
    target?: number | string;
    capaian?: number | string;
};
function isPutBody(x: unknown): x is PutBody {
    if (!x || typeof x !== "object") return false;
    const o = x as Record<string, unknown>;
    return typeof o.kdiku === "string" && "tahun" in o;
}

// ====== POST /api/indexdayasaing ======
export async function POST(req: Request) {
    try {
        const raw: unknown = await req.json();
        if (!isPostBody(raw)) {
            return NextResponse.json(
                { message: "Body tidak valid. Wajib { id, indikator, kdiku, nmiku, tahun, target, capaian }" },
                { status: 400 }
            );
        }

        const tahunNum = typeof raw.tahun === "string" ? Number(raw.tahun) : raw.tahun;
        const targetNum = typeof raw.target === "string" ? Number(raw.target) : raw.target;
        const capaianNum = typeof raw.capaian === "string" ? Number(raw.capaian) : raw.capaian;

        if (!Number.isFinite(tahunNum) || !Number.isFinite(targetNum) || !Number.isFinite(capaianNum)) {
            return NextResponse.json(
                { message: "tahun/target/capaian harus numerik." },
                { status: 400 }
            );
        }

        const newData = await prisma.tbltargetdayasaing.create({
            data: {
                iddys: typeof raw.id === "string" ? raw.id : String(raw.id),
                nmdys: raw.indikator,
                kdiku: raw.kdiku,
                nmiku: raw.nmiku,
                tahun: tahunNum,
                target: targetNum,
                capaian: capaianNum,
            },
        });

        return NextResponse.json(
            { message: "Data berhasil ditambahkan", data: newData },
            { status: 201 }
        );
    } catch (e: unknown) {
        console.error("❌ Error saat menambahkan data:", e);
        return NextResponse.json(
            { message: "Gagal menambahkan data. Periksa log server." },
            { status: 500 }
        );
    }
}

// ====== PUT /api/indexdayasaing ======
export async function PUT(req: Request) {
    try {
        const raw: unknown = await req.json();
        if (!isPutBody(raw)) {
            return NextResponse.json(
                { message: "Body tidak valid. Minimal { kdiku, tahun }" },
                { status: 400 }
            );
        }

        const tahunNum = typeof raw.tahun === "string" ? Number(raw.tahun) : raw.tahun;
        if (!Number.isFinite(tahunNum)) {
            return NextResponse.json({ message: "tahun harus numerik." }, { status: 400 });
        }

        const dataUpdate: { target?: number; capaian?: number } = {};

        if (raw.target !== undefined) {
            const t = typeof raw.target === "string" ? Number(raw.target) : raw.target;
            if (!Number.isFinite(t)) {
                return NextResponse.json({ message: "target harus numerik." }, { status: 400 });
            }
            dataUpdate.target = t;
        }

        if (raw.capaian !== undefined) {
            const c = typeof raw.capaian === "string" ? Number(raw.capaian) : raw.capaian;
            if (!Number.isFinite(c)) {
                return NextResponse.json({ message: "capaian harus numerik." }, { status: 400 });
            }
            dataUpdate.capaian = c;
        }

        if (!("target" in dataUpdate) && !("capaian" in dataUpdate)) {
            return NextResponse.json(
                { message: "Tidak ada field yang diperbarui. Sertakan 'target' atau 'capaian'." },
                { status: 400 }
            );
        }

        const updatedData = await prisma.tbltargetdayasaing.update({
            where: {
                kdiku_tahun: {
                    kdiku: raw.kdiku,
                    tahun: tahunNum,
                },
            },
            data: dataUpdate,
        });

        return NextResponse.json(
            { message: "Data berhasil diperbarui", data: updatedData },
            { status: 200 }
        );
    } catch (e: unknown) {
        console.error("❌ Error saat memperbarui data:", e);

        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
            return NextResponse.json({ message: "Data tidak ditemukan." }, { status: 404 });
        }

        return NextResponse.json(
            { message: "Gagal memperbarui data. Periksa log server." },
            { status: 500 }
        );
    }
}
