"use client";

type OpenAPIObject = {
    info?: { title?: string; version?: string; description?: string };
    servers?: Array<{ url: string; description?: string }>;
};

export default function DocsTopbar({
    spec,
    stats: _stats, // sengaja tidak dipakai agar tidak muncul Paths/Ops/Tags
}: {
    spec: OpenAPIObject;
    stats: { paths: number; ops: number; tags: number };
}) {
    return (
        <div className="bg-gradient-to-r from-emerald-700 to-green-600 shadow">
            <div className="max-w-7xl mx-auto px-6 py-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                {/* Kiri: logo / judul */}
                <div className="flex items-center gap-3">
                    <div>{/* Logo Tapsel */}</div>
                    {/* (opsional) judul dari spec */}
                    {/* <h1 className="text-white font-semibold">{spec?.info?.title ?? "API Documentation"}</h1> */}
                </div>

                {/* Kanan: (opsional) tombol download saja */}
                <div className="flex items-center gap-2">
                    <a
                        href="/api/swagger"
                        download
                        className="ml-2 inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white/90 text-emerald-900 font-medium border border-white hover:bg-white transition"
                        title="Download OpenAPI spec"
                    >

                    </a>
                </div>
            </div>
        </div>
    );
}