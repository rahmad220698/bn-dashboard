import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * (Swagger comment block tetap sama pun OK)
 */

// Bentuk baris mentah dari SQL
type RawRow = {
  id: string | number | bigint;
  indikator: string;
  tahun: number | string | bigint;
  target: number | bigint | null;
  capaian: number | bigint | null;
};

// Bentuk keluaran akhir
type RowOut = {
  id: string;
  indikator: string;
  tahun: number;
  target: number | null;
  capaian: number | null;
};

const toNum = (v: number | bigint | null | undefined): number | null =>
  v == null ? null : typeof v === "bigint" ? Number(v) : v;

/**
 * @swagger
 * components:
 *   schemas:
 *     Indicator:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: Unique identifier for the indicator
 *         indikator:
 *           type: string
 *           description: Name of the indicator
 *         tahun:
 *           type: integer
 *           description: Year of the indicator data
 *         target:
 *           type: number
 *           description: Target percentage for the indicator
 *         capaian:
 *           type: number
 *           description: Achievement percentage for the indicator
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         error:
 *           type: string
 *           description: Error message
 *         status:
 *           type: integer
 *           description: HTTP status code
 */

/**
 * @swagger
 * /api/infrastuktur:
 *   get:
 *     summary: Retrieve infrastructure indicators data
 *     description: |
 *       Fetch data for specific infrastructure indicators based on query parameters.
 *       You can filter by `id`, `tahun`, or `indikator`.
 *     tags: ["1 Infrastruktur iku 1 Infrastruktur"] 
 *     parameters:
 *       - in: query
 *         name: id
 *         schema:
 *           type: string
 *         description: ID of the indicator (optional)
 *       - in: query
 *         name: tahun
 *         schema:
 *           type: integer
 *         description: Year of the indicator data (optional)
 *     responses:
 *       200:
 *         description: List of infrastructure indicator data
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Indicator'
 *       400:
 *         description: Bad request (invalid query parameters)
 *       500:
 *         description: Internal server error
 */
export async function GET() {
  try {
    const data = await prisma.$queryRawUnsafe<RawRow[]>(`
      select k.id,k.indikator,k.tahun,sum(k.target) as target,round(sum(k.capaian),2) as capaian
      from (
        select a.kdiku as id,a.nmiku as indikator,a.tahun,a.target,0 as capaian
        from tbltargetindikator a
        where a.kdiku in ('1001','1002','1003','1004','1005','1006','1007')
				union
				select id,indikator,tahun,target,capaian from vwindikatorinfrastrukturtahunan
        union 
        select '1002' as id,'Jaringan Jalan Mantap' as indikator,z.tahun as tahun,0 as target,
               round(case when z.panjangjalan = 0 then 0 else z.kondisibaik/z.panjangjalan * 100 end,2) as capaian
        from (select sum(a.panjangruas) as panjangjalan,sum(b.kondisibaik) as kondisibaik,b.tahun
              from tblruasjalan a
              inner join tbljalankondisi b on a.noruas = b.noruas group by b.tahun) as z
				union
				select '1003' AS id,'Jembatan' AS indikator,x.tahun AS tahun,0 AS target,round((case when ((x.totaljembatan is null) or (x.totaljembatan = 0)) then 0 else ((x.konbaik / x.totaljembatan) * 100) end),2) AS capaian from (select b.tahun AS tahun,sum(b.total_jembatan) AS totaljembatan,sum(b.jembatan_baik) AS konbaik from vwjembatankecamatantahun b group by b.tahun) x
				union
        select '1004' as id,'Irigasi' as indikator,x.tahun as tahun,0 as target,
               x.konbaik/x.luasirigasi * 100 as capaian
        from (select b.tahun,sum(b.luas) as luasirigasi,sum(b.konirigasibaik) as konbaik
              from refirigasi a inner join tblirigasi b on a.kdirigasi = b.kdirigasi
							group by b.tahun) as x
							union 
select '1005' AS id,'Air Minum' AS indikator,x.tahun AS tahun,0 AS target,round((case when ((x.jmlpenduduk is null) or (x.jmlpenduduk = 0)) then 0 else ((x.jmlairminumlayak / x.jmlpenduduk) * 100) end),2) AS capaian from (select b.tahun AS tahun,sum(b.jmlpenduduk) AS jmlpenduduk,sum(b.jmlairminumlayak) AS jmlairminumlayak from tblaksesairminum b group by b.tahun) x
union 
select '1006' AS id,'Listrik' AS indikator,x.tahun AS tahun,0 AS target,round((case when ((x.dayatersedia is null) or (x.dayatersedia = 0)) then 0 else ((x.dayadibutuhkan / x.dayatersedia) * 100) end),2) AS capaian from (select b.tahun AS tahun,sum(b.dayatersedia) AS dayatersedia,sum(b.dayadibutuhkan) AS dayadibutuhkan from tbldayalistrik b group by b.tahun) x
							union
				select '1007' as id,'Telekomunikasi' as indikator,z.tahun as tahun,0 as target,
               round(case when z.totaldesa = 0 then 0 else z.desaterlayani/z.totaldesa * 100 end,2) as capaian
        from (select sum(a.totaldesa) as totaldesa,sum(a.desaterlayani) as desaterlayani,a.tahun
				from tblikucakupantelekomunikasi a group by a.tahun) as z
							
      ) as k
      group by k.id, k.indikator, k.tahun
      order by k.id;
    `);

    const serialized: RowOut[] = data.map((row) => ({
      id: String(row.id),
      indikator: row.indikator,
      tahun:
        typeof row.tahun === "bigint"
          ? Number(row.tahun)
          : typeof row.tahun === "string"
            ? Number(row.tahun)
            : row.tahun,
      target: toNum(row.target),
      capaian: toNum(row.capaian),
    }));

    return NextResponse.json(serialized);
  } catch (e: unknown) {
    console.error("❌ Error query infrastruktur:", e);
    return NextResponse.json({ message: "Gagal mengambil data" }, { status: 500 });
  }
}
