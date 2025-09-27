# OpenAPI dan Swagger

OpenAPI adalah standar global untuk menulis dokumentasi API Restful. Awalnya OpenAPI dikenal sebagai spesifikasi Swagger. Namun karena kepopuleran Swagger, sehingga Swagger diadopsi sebagai standar terbuka bernama OpenAPI.

Swagger mendefinisikan cara membuat spesifikasi dokumentasi untuk manusia dan komputer. Swagger juga terdiri dari beberapa alat yaitu Swagger UI.

## Ekosistem

Ekosistem Swagger terdiri dari Swagger UI dan Swagger Editor.

Saat ini SmartBear sebagai pencipta Swagger belum memperbaharui library Swagger UI supaya _compatible_ dengan Next.js 15. Untuk itu kita perlu menggunakan _package manager_ yang berbeda yaitu **pnpm**.

Cara mengubah _package manager_ dari **npm** menjadi **pnpm** dapat dibaca di [README](README.md#cara-mengubah-package-manager-dari-npm-menjadi-pnpm)

# Prosedur Instalasi Swagger UI

1. Instal paket `next-swagger-doc`.
1. Buat file Swagger Spec

## Install package yang dibutuhkan

```shell
pnpm install next-swagger-doc swagger-ui-react server-only
pnpm install -D @types/swagger-ui-react
```

## Buat Swagger Spec

Swagger Spec berfungsi untuk membaca bagian komentar/comment yang ada di kode sumber untuk menjadi dokumentasi Swagger.

> Lokasi `src/lib`
>
> Nama file `swagger.ts`

```typescript
import { createSwaggerSpec } from "next-swagger-doc";
import "server-only";

export const getApiDocs = async () => {
  const spec = createSwaggerSpec({
    apiFolder: "src/app/api",
    definition: {
      openapi: "3.0.0",
      info: {
        title: "Dokumentasi API Backend Dashboard",
        description: "Dokumentasi API untuk Backend Dashboard",
        version: "1.0.0",
      },
      components: {
        securitySchemes: {
          apiKey: {
            type: "apiKey",
            in: "header",
            name: "Authorization",
          },
        },
      },
      security: [{ apiKey: [] }],
    },
  });

  return spec;
};
```

## Tambahkan komentar di route.ts

Tambahkan komentar pada `route.ts`, contohnya sebagai berikut:

```typescript
import { NextResponse } from "next/server";
import prisma from "@/app/bpkpad/api/prisma";

export type PosAnggaran = {
  id: number;
  tahun: number;
  nama: string;
  jumlah: number;
};

/**
 * @swagger
 * /api/anggaran:
 *   get:
 *     summary: Membaca semua objek anggaran
 *     responses:
 *       200:
 *         description: Kalau data pos anggaran tersedia
 *       404:
 *         description: pos anggaran tidak ditemukan
 *
 */
export async function GET() {
  const data: PosAnggaran[] = await prisma.anggaran.findMany({});
  return NextResponse.json(data);
}

/**
 * @swagger
 * /api/anggaran:
 *   post:
 *     summary: Membuat pos anggaran baru
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               tahun:
 *                 type: integer
 *                 example: 2025
 *               nama:
 *                 type: string
 *                 example: "Pengadaan Barang"
 *               jumlah:
 *                 type: number
 *                 example: 1000000
 *     responses:
 *       201:
 *         description: pos anggaran berhasil dibuat
 *       500:
 *         description: gagal membuat pos anggaran
 */
export async function POST(request: Request) {
  const dataAnggaran: PosAnggaran = await request.json();

  const dataAnggaranFromDb = await prisma.anggaran.create({
    data: dataAnggaran,
  });

  return NextResponse.json(dataAnggaranFromDb);
}
```

## Buat file untuk halaman dokumentasi API

Jika kita akan menaruhnya di lokasi `http://localhost:3000/apidocs`, maka buat folder baru dengan nama `apidocs` di dalam `src/app`.

Kemudian buat file:

> Lokasi: `src/app/apidocs`
>
> Nama file: `page.tsx`

Dengan isi sebagai berikut:

```typescript
import { getApiDocs } from "@/lib/swagger";
import SwaggerUI from "swagger-ui-react";
import "swagger-ui-react/swagger-ui.css";

export default async function Page() {
  const spec = await getApiDocs();
  return <SwaggerUI spec={spec} />;
}
```

Jalankan

```shell
pnpm dev
```

Kemudian buka halaman web diatas di lokasi

> http://localhost:3000/apidocs

# Referensi

Halaman github [Next.js-Swagger](https://github.com/jellydn/next-swagger-doc?tab=readme-ov-file)
