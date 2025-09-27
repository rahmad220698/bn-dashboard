import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

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
