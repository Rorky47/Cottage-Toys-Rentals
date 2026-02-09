import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import prisma from "~/db.server";

/**
 * Health check endpoint for monitoring services.
 * Returns 200 if app and database are healthy, 503 otherwise.
 */
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const start = Date.now();
  
  try {
    // Check database connectivity with a simple query
    await prisma.$queryRaw`SELECT 1`;
    
    const duration = Date.now() - start;
    
    return json(
      {
        status: "healthy",
        timestamp: new Date().toISOString(),
        database: "connected",
        responseTime: `${duration}ms`,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[health] Health check failed:", error);
    
    return json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        database: "disconnected",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 503 }
    );
  }
};
