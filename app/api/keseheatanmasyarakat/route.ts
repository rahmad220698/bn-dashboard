import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * @swagger
 * /api/kesehatanmasyarakat:
 *   get:
 *     summary: Ambil data indikator kesehatan masyarakat
 *     description: http://36.66.156.116:3001/api/kesehatanmasyarakat
 *     tags:
 *       - Sasaran 6 Kesehatan Masyarakat
 *     responses:
 *       200:
 *         description: Data berhasil diambil
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
 *                   nilaiusia:
 *                     type: number
 *                     nullable: true
 *                     example: 71.35
 *                   nilaistunting:
 *                     type: number
 *                     nullable: true
 *                     example: 6.92
 *                   nilaitbc:
 *                     type: number
 *                     nullable: true
 *                     example: 3.41
 *       500:
 *         description: Gagal mengambil data
 */
export async function GET() {
    try {
        const kdikuList = ["1018", "1019", "1020"]; // 1018: UHH, 1019: Stunting, 1020: TBC

        const data = await prisma.tbltargetindikator.findMany({
            where: { kdiku: { in: kdikuList } },
            select: { kdiku: true, tahun: true, target: true },
            orderBy: { tahun: "asc" },
        });

        // Transform -> [{ tahun, nilaiusia, nilaistunting, nilaitbc }]
        const result = data.reduce((acc: any[], item) => {
            const tahunStr = item.tahun?.toString?.() ?? String(item.tahun);

            let row = acc.find((r) => r.tahun === tahunStr);
            if (!row) {
                row = { tahun: tahunStr, nilaiusia: null, nilaistunting: null, nilaitbc: null };
                acc.push(row); // <-- Wajib!
            }

            const val = Number(item.target);
            if (item.kdiku === "1018") row.nilaiusia = val;
            if (item.kdiku === "1019") row.nilaistunting = val;
            if (item.kdiku === "1020") row.nilaitbc = val;

            return acc;
        }, []);

        // Kembalikan array langsung
        return NextResponse.json(result);
    } catch (error) {
        console.error("Error fetching data:", error);
        return NextResponse.json({ message: "Gagal mengambil data" }, { status: 500 });
    }
}
