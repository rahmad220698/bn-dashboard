import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * @swagger
 * /api/perkapita:
 *   get:
 *     summary: Ambil daftar target indikator (JSON)
 *     description: http://36.66.156.116:3001/api/perkapita
 *     tags:
 *       - Sasaran 2 Pendapatan Perkapita Masyarakat
 *     responses:
 *       200:
 *         description: Data target indikator berhasil diambil
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   tahun:
 *                     type: string
 *                     example: "2024"
 *                   pert_ekonomi:
 *                     type: string
 *                     nullable: true
 *                     example: "5.12"
 *                   target_pert_ekonomi:
 *                     type: string
 *                     nullable: true
 *                     example: "7"
 *                   pdrb_perkapita:
 *                     type: string
 *                     nullable: true
 *                     example: "67.23"
 *                   kontribusi_kabupaten:
 *                     type: string
 *                     nullable: true
 *                     example: "1.80"
 *       500:
 *         description: Gagal mengambil data target indikator
 */
export async function GET() {
  try {
    const kdikuList = ["1008", "1009", "1010"];

    const rows = await prisma.tbltargetindikator.findMany({
      where: { kdiku: { in: kdikuList } },
      select: {
        kdiku: true,
        nmiku: true,
        tahun: true,
        target: true,   // diasumsikan berisi angka string/decimal
        satuan: true,
      },
      orderBy: { tahun: "asc" },
    });

    // Kelompokkan per tahun
    const result = rows.reduce((acc: any[], item) => {
      const tahunStr = item.tahun?.toString?.() ?? String(item.tahun);

      let row = acc.find((r) => r.tahun === tahunStr);
      if (!row) {
        row = {
          tahun: tahunStr,
          pert_ekonomi: null,
          pdrb_perkapita: null,
          kontribusi_kabupaten: null,
        };
        acc.push(row);
      }

      // Normalisasi nilai jadi string seperti contoh output
      const valStr =
        typeof item.target === "bigint"
          ? String(item.target)
          : item.target != null
            ? String(item.target)
            : null;

      if (item.kdiku === "1008") row.pert_ekonomi = valStr;
      if (item.kdiku === "1009") row.pdrb_perkapita = valStr;
      if (item.kdiku === "1010") row.kontribusi_kabupaten = valStr;

      return acc;
    }, []);

    // TODO (opsional): jika punya sumber 'target_pert_ekonomi' (misal kdiku lain / tabel lain),
    // gabungkan di sini. Contoh pola pengisian:
    // const targetRows = await prisma.tbltargetindikator.findMany({ where: { kdiku: '1008T' }, ... });
    // ...merge ke result berdasarkan tahun → set row.target_pert_ekonomi = nilaiTarget;

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching tbltargetindikator:", error);
    return NextResponse.json({ message: "Gagal mengambil data" }, { status: 500 });
  }
}
