import { NextResponse } from "next/server";

// Interface untuk standard response
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string | Record<string, string[]>;
  metadata?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

/**
 * Success response
 */
export function ok<T = any>(
  data: T,
  message?: string,
  metadata?: ApiResponse["metadata"]
): NextResponse<ApiResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      message,
      metadata,
    },
    { status: 200 }
  );
}

/**
 * Created response (201)
 */
export function created<T = any>(
  data: T,
  message: string = "Data berhasil dibuat"
): NextResponse<ApiResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      message,
    },
    { status: 201 }
  );
}

/**
 * Error response
 */
export function fail(
  message: string,
  status: number = 400,
  error?: string
): NextResponse<ApiResponse> {
  return NextResponse.json(
    {
      success: false,
      message,
      error,
    },
    { status }
  );
}

/**
 * Not found response
 */
export function notFound(message: string = "Data tidak ditemukan"): NextResponse<ApiResponse> {
  return NextResponse.json(
    {
      success: false,
      message,
    },
    { status: 404 }
  );
}

/**
 * Unauthorized response
 */
export function unauthorized(
  message: string = "Unauthorized"
): NextResponse<ApiResponse> {
  return NextResponse.json(
    {
      success: false,
      message,
    },
    { status: 401 }
  );
}

/**
 * Forbidden response
 */
export function forbidden(
  message: string = "Forbidden: Akses ditolak"
): NextResponse<ApiResponse> {
  return NextResponse.json(
    {
      success: false,
      message,
    },
    { status: 403 }
  );
}

/**
 * Validation error response
 */
export function validationError(
  errors: Record<string, string[]> | string
): NextResponse<ApiResponse> {
  return NextResponse.json(
    {
      success: false,
      message: "Validation error",
      error: errors,
    },
    { status: 422 }
  );
}

/**
 * Server error response
 */
export function serverError(
  message: string = "Internal server error",
  error?: string
): NextResponse<ApiResponse> {
  // Log error di server tapi jangan expose ke client
  if (error && process.env.NODE_ENV === "development") {
    console.error("Server Error:", error);
  }
  
  return NextResponse.json(
    {
      success: false,
      message,
      error: process.env.NODE_ENV === "development" ? error : undefined,
    },
    { status: 500 }
  );
}

/**
 * Handle Prisma errors
 */
export function handlePrismaError(error: any): NextResponse<ApiResponse> {
  // Unique constraint violation
  if (error.code === "P2002") {
    return fail("Data sudah ada", 409);
  }
  
  // Record not found
  if (error.code === "P2025") {
    return notFound();
  }
  
  // Foreign key constraint violation
  if (error.code === "P2003") {
    return fail("Tidak dapat menghapus data karena masih digunakan", 409);
  }
  
  // Generic database error
  return serverError("Database error", error.message);
}