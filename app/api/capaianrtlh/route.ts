import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Bentuk baris hasil raw query
type RawRow = {
  id: string | number | bigint;
  tahun: number | bigint;
  target: number | bigint | null;
  capaian: number | bigint | null;
};

// Bentuk respons akhir (string utk 2 desimal)
type RowOut = {
  id: string;
  tahun: number;
  target: string | null;   // "12.34" atau null
  capaian: string | null;  // "56.78" atau null
};

export async function GET() {
  try {
    const data = await prisma.$queryRawUnsafe<RawRow[]>(`
      SELECT
        z.id,
        z.tahun,
        SUM(z.target) AS target,
        ROUND(SUM(z.capaian), 2) AS capaian
      FROM (
        SELECT
          kdiku AS id,
          nmiku AS indikator,
          tahun,
          target,
          0 AS capaian
        FROM tbltargetindikator
        UNION
        SELECT
          '1026' AS id,
          'RLTH (Rumah Tidak Layak Huni)' AS indikator,
          tahun,
          0 AS target,
          SUM(jlrtlh) / SUM(jltotalrt) * 100 AS capaian
        FROM tblrtlhkec
        GROUP BY tahun
      ) AS z
      WHERE z.id = '1026'
      GROUP BY z.id, z.tahun;
    `);

    const toNumber = (v: number | bigint | null | undefined): number | null => {
      if (v === null || v === undefined) return null;
      return typeof v === "bigint" ? Number(v) : v;
    };

    const serialized: RowOut[] = data.map((row) => {
      const id = String(row.id);
      const tahun = typeof row.tahun === "bigint" ? Number(row.tahun) : row.tahun;

      const targetNum = toNumber(row.target);
      const capaianNum = toNumber(row.capaian);

      return {
        id,
        tahun,
        target: targetNum !== null && Number.isFinite(targetNum) ? targetNum.toFixed(2) : null,
        capaian: capaianNum !== null && Number.isFinite(capaianNum) ? capaianNum.toFixed(2) : null,
      };
    });

    return NextResponse.json(serialized);
  } catch (error) {
    // error bertipe unknown → aman untuk lint
    console.error("❌ Error query capaian RTLH:", error);
    return NextResponse.json({ message: "Gagal mengambil data" }, { status: 500 });
  }
}
