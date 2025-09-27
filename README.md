Ini adalah dokumentasi cara menjalankan aplikasi backend Dashboard

## Clone dari Github

```shell
git clone https://github.com/pemkab-tapsel/bn-dashboard.git
```

Buat file `.env` berisi key sebagai berikut:

```
DATABASE_URL=
```

Jalankan web server

```bash
npm run dev
# or
pnpm dev
```

# Prisma

### Menambah field di tabel

```shell
npx prisma db push --force-reset
# atau kalau menggunakan prisma
pnpx prisma db push --force-reset
```

### Membuat Ulang Client Prisma

```shell
npx prisma generate
# atau kalau menggunakan prisma
pnpx prisma generate
```

Fungsinya: membuat ulang client Prisma (file @prisma/client) berdasarkan definisi schema.prisma.
Jadi setiap kali kamu ubah schema (tambah model, ubah field, relasi, dsb), kamu harus jalankan ini supaya Prisma Client di project TypeScript/JavaScript ikut update.

### Sinkronisasi Schema Prisma dengan Database

```shell
npx prisma db push
# atau kalau menggunakan prisma
pnpx prisma db push
```

Fungsinya: sinkronkan schema Prisma → database, tanpa bikin migration file.
Jadi db push langsung mengubah struktur tabel di database supaya sama dengan schema.prisma.
Cocok dipakai untuk development cepat atau kalau kamu tidak butuh riwayat migrasi.

## Cara Mengubah Package Manager dari npm menjadi pnpm

1. Install pnpm
1. Hapus file package-lock.json
1. Hapus folder node_modules

### Menginstall pnpm

```shell
npm install -g pnpm
```

### Menghapus folder node_modules

```shell
rmdir /s /q node_modules
```

Arti perintah diatas adalah `/s` untuk menghapus seluruh file dan subfolder. Sedangkan `/q` untuk tidak meminta konfirmasi.

Pada Linux atau MacOS

```shell
rm -rf node_modules
```

### Menghapus file package-lock.json

Di Windows

```shell
del package-lock.json
```

Pada Linux dan MacOS

```shell
rm -f package-lock.json
```

# Git

## Membuat branch baru

```shell
git fetch origin
git checkout <nama-branch>
```
# 1. Masuk ke direktori tujuan
cd /var/www

# 2. Clone menggunakan SSH (ini yang benar!)
git clone git@github.com:pemkab-tapsel/bn-dashboard.git

# 3. Masuk ke folder
cd bn-dashboard

# 4. Cek isi
ls -la

Cara Memberhentikan Port 3001 yang jalan

di linux

sudo ss -ltnp | grep 3001