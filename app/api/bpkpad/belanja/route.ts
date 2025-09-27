// app/api/keuangan/route.ts
import { NextResponse } from "next/server";
import { mysqlPool } from "@/lib/db";
import type { RowDataPacket } from "mysql2";

type KeuanganRow = RowDataPacket & {
  kd_skpd: string;
  nm_skpd: string;
  rek: string;
  nmrek: string;
  pagu: number;
  capaian: number;
  persen: number;
  tahun: string;
};

export async function GET(request: Request) {
  try {

    const url = new URL(request.url);
    const tahun = url.searchParams.get("tahun") ?? "2025";
    const kd_skpd = url.searchParams.get("kd_skpd") ?? undefined;
    const rek = url.searchParams.get("rek") ?? undefined;

    // Bangun filter opsional untuk outer query
    const filters: string[] = [];
    const params: Array<string | number> = [tahun, tahun]; // untuk dua tempat '? AS tahun'

    if (kd_skpd) {
      filters.push("a.kd_skpd = ?");
      params.push(kd_skpd);
    }
    if (rek) {
      filters.push("a.rek = ?");
      params.push(rek);
    }

    const whereOuter = filters.length ? `WHERE ${filters.join(" AND ")}` : "";

    // Raw SQL sesuai yang kamu kirim, sedikit perbaikan:
    // - pakai placeholder untuk tahun
    // - pakai NULLIF agar tidak div by zero
    // - UNION (sesuai query kamu; bisa jadi UNION ALL untuk perf bila aman)
    const sql = `
SELECT
  a.kd_skpd,
  (SELECT nm_skpd FROM sitarida2025.ms_skpd WHERE kd_skpd = a.kd_skpd) AS nm_skpd,
  a.rek,
  a.nmrek,
  SUM(a.pagu)     AS pagu,
  SUM(a.capaian)  AS capaian,
  ROUND((SUM(a.capaian) / NULLIF(SUM(a.pagu), 0) * 100), 2) AS persen,
  a.tahun
FROM (
  SELECT
    kd_skpd,
    kd_sub_kegiatan,
    nm_sub_kegiatan,
    LEFT(kd_rek6, 6) AS rek,
    (SELECT nm_rek3 FROM sitarida2025.ms_rek3 WHERE kd_rek3 = LEFT(trdrka.kd_rek6, 6)) AS nmrek,
    SUM(nilai_ubah) AS pagu,
    0 AS capaian,
    ? AS tahun
  FROM sitarida2025.trdrka
  WHERE LEFT(kd_rek6, 1) = '5'
  GROUP BY kd_skpd, kd_sub_kegiatan, LEFT(kd_rek6, 6)

  UNION
  SELECT
    kd_skpd,
    kd_sub_kegiatan,
    nm_sub_kegiatan,
    LEFT(kd_rek6, 6) AS rek,
    (SELECT nm_rek3 FROM sitarida2025.ms_rek3 WHERE kd_rek3 = LEFT(trdmaping_skpd.kd_rek6, 6)) AS nmrek,
    0 AS pagu,
    SUM(debet - kredit) AS capaian,
    ? AS tahun
  FROM sitarida2025.trdmaping_skpd
  WHERE LEFT(kd_rek6, 1) = '5'
  GROUP BY kd_skpd, kd_sub_kegiatan, LEFT(kd_rek6, 6)
) AS a
${whereOuter}
GROUP BY a.kd_skpd, a.rek, a.tahun
ORDER BY a.kd_skpd
    `.trim();

    const [rows] = await mysqlPool.query<KeuanganRow[]>(sql, params);

    return NextResponse.json(rows);
  } catch (err: unknown) {
    if (err instanceof Error) {
      console.error("GET /api/keuangan error:", err.message);
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
    console.error("GET /api/keuangan unknown error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
