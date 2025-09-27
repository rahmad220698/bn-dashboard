import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
/**
 * @swagger
 * /api/kualitassdm:
 *   get:
 *     summary: Ambil daftar target indikator tertentu
 *     tags:
 *       - Sasaran 5 - Kualitas SDM
 *     responses:
 *       200:
 *         description: http://36.66.156.116:3001/api/kualitassdm
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
 *                         description: Kode indikator (kdiku)
 *                         example: "1001"
 *                       indikator:
 *                         type: string
 *                         description: Nama indikator (nmiku)
 *                         example: "Persentase penduduk miskin"
 *                       tahun:
 *                         type: integer
 *                         description: Tahun target indikator
 *                         example: 2024
 *                       target:
 *                         type: number
 *                         description: Target indikator
 *                         example: 75.5
 *                       capaian:
 *                         type: string
 *                         description: Satuan atau capaian indikator
 *                         example: "%"
 *       500:
 *         description: Gagal mengambil data target indikator
 */
export async function GET() {
    try {
        const data = await prisma.$queryRawUnsafe<any[]>(`
    SELECT right(tahun,2) as id,
    tahun,
    SUM(targetharapanlamasekolah) AS targetharapanlamasekolah,
    SUM(harapanlamasekolah) AS harapanlamasekolah,
    SUM(targetrata2lamasekolah) AS targetrata2lamasekolah,
    SUM(rata2lamasekolah) AS rata2lamasekolah,
    SUM(targetipm) AS targetipm,
    SUM(ipm) AS ipm
FROM (
    -- Target dari tbltargetindikator
    SELECT 
        tahun,
        CASE WHEN kdiku = '1015' THEN target ELSE 0 END AS targetharapanlamasekolah,
        0 AS harapanlamasekolah,
        CASE WHEN kdiku = '1016' THEN target ELSE 0 END AS targetrata2lamasekolah,
        0 AS rata2lamasekolah,
        CASE WHEN kdiku = '1017' THEN target ELSE 0 END AS targetipm,
        0 AS ipm
    FROM tbltargetindikator 
    WHERE kdiku IN ('1015','1016','1017')
    UNION ALL

    -- Realisasi dari tblrealikhk
    SELECT 
        tahun,
        0 AS targetharapanlamasekolah,
        CASE WHEN kdiku = '1015' THEN capaian ELSE 0 END AS harapanlamasekolah,
        0 AS target_penurunan_intensitas,
        CASE WHEN kdiku = '1016' THEN capaian ELSE 0 END AS rata2lamasekolah,
        0 AS targetipm,
        CASE WHEN kdiku = '1017' THEN capaian ELSE 0 END AS ipm
    FROM tblrealikhk
    WHERE kdiku IN ('1015','1016','1017')
) AS z
GROUP BY id,tahun
ORDER BY id,tahun;

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