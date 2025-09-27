"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

// Dynamic import Swagger UI React dengan no SSR
const SwaggerUI = dynamic(() => import("swagger-ui-react"), {
    ssr: false,
    loading: () => <div className="flex items-center justify-center h-screen">Loading API Documentation...</div>,
});

// Import Swagger UI CSS
import "swagger-ui-react/swagger-ui.css";

export default function ApiDocsPage() {
    const [spec, setSpec] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Fetch OpenAPI spec dari API
        fetch("/api/swagger")
            .then((res) => {
                if (!res.ok) {
                    throw new Error(`HTTP error! status: ${res.status}`);
                }
                return res.json();
            })
            .then((data) => {
                setSpec(data);
                setLoading(false);
            })
            .catch((err) => {
                console.error("Error loading OpenAPI spec:", err);
                setError(err.message);
                setLoading(false);
            });
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading API Documentation...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50">
                <div className="text-center">
                    <div className="text-red-600 text-xl mb-2">⚠️ Error</div>
                    <p className="text-gray-700">Failed to load API documentation</p>
                    <p className="text-sm text-gray-500 mt-2">{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white">
            <div className="container mx-auto px-4 py-8">

                {spec && (
                    <SwaggerUI
                        spec={spec}
                        docExpansion="list"
                        defaultModelsExpandDepth={1}
                        defaultModelExpandDepth={1}
                        displayRequestDuration={true}
                        filter={true}
                        showExtensions={true}
                        showCommonExtensions={true}
                        tryItOutEnabled={true}
                        persistAuthorization={true}
                        displayOperationId={false}
                        deepLinking={true}
                    />
                )}
            </div>
        </div>
    );
}