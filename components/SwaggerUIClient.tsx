"use client";

import SwaggerUI from "swagger-ui-react";
import "swagger-ui-react/swagger-ui.css";
import type { OpenAPIV3 } from "openapi-types";

type Props = { spec: OpenAPIV3.Document };

export default function SwaggerUIClient({ spec }: Props) {
    return (
        <div style={{ height: "100vh" }}>
            <SwaggerUI spec={spec} />
        </div>
    );
}
