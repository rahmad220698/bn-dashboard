// app/tapsel/page.tsx
import Image from "next/image";

export default function TapselPage() {
    return (
        <div className="container">
            <div className="card" style={{ textAlign: "center" }}>
                <h2>Selamat datang</h2>
                <p className="small">Anda berhasil login</p>

                {/* Jika file ada di /public/tapsel-logo.png */}
                <div className="mt-3" style={{ display: "flex", justifyContent: "center" }}>
                    <Image
                        src="/tapsel-logo.png" // taruh file logo Anda di /public/tapsel-logo.png
                        alt="Logo Tapanuli Selatan"
                        width={240}
                        height={240}
                        priority
                    />
                </div>

                {/* Jika belum punya file lokal, bisa pakai URL eksternal (hapus blok di atas, ganti ini):
        <img src="https://example.com/logo-tapsel.png" alt="Logo Tapsel" width={240} height={240} />
        */}
            </div>
        </div>
    );
}