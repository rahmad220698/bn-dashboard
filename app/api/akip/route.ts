import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

/**
 * @swagger
 * /api/akip:
 *   get:
 *     summary: Ambil daftar target indikator (KD IKU 1021, 1022, 1023)
 *     description: http://36.66.156.116:3001/api/akip
 *     tags: [7 AKIP]
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/TargetIndikator'
 *             examples:
 *               contohBerhasil:
 *                 summary: Contoh respons sukses
 *                 value:
 *                   success: true
 *                   data:
 *                     - kdiku: "1021"
 *                       nmiku: "Persentase Capaian IKU A"
 *                       tahun: 2024
 *                       target: 90
 *                       satuan: "%"
 *                     - kdiku: "1021"
 *                       nmiku: "Persentase Capaian IKU A"
 *                       tahun: 2025
 *                       target: 92
 *                       satuan: "%"
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Gagal mengambil data"
 */
export async function GET() {
  try {
    const kdikuList = ["1021", "1022", "1023"];

    const data = await prisma.tbltargetindikator.findMany({
      where: { kdiku: { in: kdikuList } },
      select: { kdiku: true, nmiku: true, tahun: true, target: true, satuan: true },
      orderBy: { tahun: "asc" },
    });

    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Gagal mengambil data";
    console.error("Error fetching tbltargetindikator:", error);
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}


export async function POST(request: Request) {
  try {
    const raw: unknown = await request.json();

    type AkipCreate = {
      kdiku: unknown;
      nmiku: unknown;
      tahun: unknown;
      target: unknown;
      satuan: unknown;
    };

    const b = raw as AkipCreate;

    // Validasi ringan tipe & isi
    if (
      typeof b?.kdiku !== "string" ||
      typeof b?.nmiku !== "string" ||
      (typeof b?.tahun !== "number" && typeof b?.tahun !== "string") ||
      (typeof b?.target !== "number" && typeof b?.target !== "string") ||
      typeof b?.satuan !== "string"
    ) {
      return NextResponse.json({ error: "Semua field wajib diisi dengan tipe yang benar" }, { status: 400 });
    }

    const tahunNum = Number(b.tahun);
    if (!Number.isFinite(tahunNum)) {
      return NextResponse.json({ error: "tahun harus berupa angka" }, { status: 400 });
    }

    const kdiku = b.kdiku.trim();
    const nmiku = b.nmiku.trim();
    const satuan = b.satuan.trim();
    const target = String(b.target); // schema kolom target bertipe string

    if (!kdiku || !nmiku || !satuan) {
      return NextResponse.json({ error: "kdiku, nmiku, satuan tidak boleh kosong" }, { status: 400 });
    }

    const akip = await prisma.tbltargetindikator.create({
      data: { kdiku, nmiku, tahun: tahunNum, target, satuan },
    });

    return NextResponse.json(akip, { status: 201 });
  } catch (err: unknown) {
    // Tangani error Prisma & generic
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === "P2002") {
        return NextResponse.json({ error: "Data duplikat (nilai unik sudah digunakan)" }, { status: 409 });
      }
    }
    console.error("Error creating AKIP:", err);
    const msg = err instanceof Error ? err.message : "Gagal menambahkan data AKIP";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
