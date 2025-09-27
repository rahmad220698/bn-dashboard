import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";


/**
 * @swagger
 * /api/lingkunganhidup:
 *   get:
 *     summary: Get data indikator infrastruktur
 *     description: http://36.66.156.116:3001/api/lingkunganhidup
 *     tags:
 *       - Sasaran 8 IKLH (Lingkungan Hidup)
 *     responses:
 *       200:
 *         description: Data indikator berhasil diambil
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
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         example: "1002"
 *                       indikator:
 *                         type: string
 *                         example: "Jaringan Jalan Mantap"
 *                       tahun:
 *                         type: integer
 *                         example: 2025
 *                       target:
 *                         type: number
 *                         format: float
 *                         example: 59.97
 *                       capaian:
 *                         type: number
 *                         format: float
 *                         example: 36.62
 *       500:
 *         description: Gagal mengambil data dari database
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
        const data = await prisma.$queryRawUnsafe<any[]>(`
      SELECT 
    tahun,
    SUM(target_iklh) AS target_iklh,
    SUM(iklh) AS iklh,
    SUM(target_penurunan_intensitas) AS target_penurunan_intensitas,
    SUM(penurunan_intensitas) AS penurunan_intensitas
FROM (
    -- Target dari tbltargetindikator
    SELECT 
        tahun,
        CASE WHEN kdiku = '1024' THEN target ELSE 0 END AS target_iklh,
        0 AS iklh,
        CASE WHEN kdiku = '1025' THEN target ELSE 0 END AS target_penurunan_intensitas,
        0 AS penurunan_intensitas
    FROM tbltargetindikator 
    WHERE kdiku IN ('1024','1025')

    UNION ALL

    -- Realisasi dari tblrealikhk
    SELECT 
        tahun,
        0 AS target_iklh,
        CASE WHEN kdiku = '1024' THEN capaian ELSE 0 END AS iklh,
        0 AS target_penurunan_intensitas,
        CASE WHEN kdiku = '1025' THEN capaian ELSE 0 END AS penurunan_intensitas
    FROM tblrealikhk
    WHERE kdiku IN ('1024','1025')
) AS z
GROUP BY tahun
ORDER BY tahun;

    `);

        // ✅ Fix BigInt -> Number
        const serialized = data.map((row: any) =>
            Object.fromEntries(
                Object.entries(row).map(([key, value]) => [
                    key,
                    typeof value === "bigint" ? Number(value) : value,
                ])
            )
        );

        // ✅ Langsung return array, tanpa success & data
        return NextResponse.json(serialized);
    } catch (error) {
        console.error("❌ Error query jaringan jalan:", error);
        return NextResponse.json(
            { message: "Gagal mengambil data" },
            { status: 500 }
        );
    }
}