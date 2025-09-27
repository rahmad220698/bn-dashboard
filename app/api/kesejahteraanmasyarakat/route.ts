import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * @swagger
 * /api/kesejahteraanmasyarakat:
 *   get:
 *     summary: Ambil data kesejahteraan masyarakat (daya saing)
 *     description: http://36.66.156.116:3001/api/kesejahteraanmasyarakat
 *     tags:
 *       - Sasaran 4 - Kesejahteraan Masyarakat
 *     responses:
 *       200:
 *         description: Data berhasil diambil
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       tahun:
 *                         type: string
 *                         example: "2024"
 *                       nilaimiskin:
 *                         type: number
 *                         nullable: true
 *                         example: 71.35
 *                       nilaiinflasi:
 *                         type: number
 *                         nullable: true
 *                         example: 6.92
 *                       nilainganggur:
 *                         type: number
 *                         nullable: true
 *                         example: 3.41
 *       500:
 *         description: Gagal mengambil data
 */
export async function GET() {
    try {
        // ⚠️ Samakan dengan dokumentasi: 1011, 1012, 1013 (atau ubah doc bila memang 1016–1018)
        const kdikuList = ["1011", "1012", "1013"];

        const rows = await prisma.tbltargetindikator.findMany({
            where: { kdiku: { in: kdikuList } },
            select: { kdiku: true, tahun: true, target: true },
            orderBy: { tahun: "asc" },
        });

        // Kelompokkan per tahun
        const result = rows.reduce((acc: any[], item) => {
            const tahunStr = item.tahun?.toString?.() ?? String(item.tahun);

            let row = acc.find((r) => r.tahun === tahunStr);
            if (!row) {
                row = {
                    tahun: tahunStr,
                    nilaimiskin: null,
                    nilaiinflasi: null,
                    nilainganggur: null,
                };
                acc.push(row);
            }

            // Map kdiku -> field
            if (item.kdiku === "1011") row.nilaimiskin = Number(item.target);
            if (item.kdiku === "1012") row.nilaiinflasi = Number(item.target);
            if (item.kdiku === "1013") row.nilainganggur = Number(item.target);

            return acc;
        }, []);
        // 👉 langsung return array
        return NextResponse.json(result);
    } catch (error) {
        console.error("Error fetching data:", error);
        return NextResponse.json(
            { message: "Gagal mengambil data" },
            { status: 500 }
        );
    }
}
