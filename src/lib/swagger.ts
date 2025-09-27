import { createSwaggerSpec } from "next-swagger-doc";
import "server-only";

export const getApiDocs = async () => {
    const spec = createSwaggerSpec({
        apiFolder: "app/api",
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