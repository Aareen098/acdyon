const express = require("express");
const cors = require("cors");
require("dotenv").config();

(async () => {
  const { connectDatabase } = await import("./db.cjs");
  const { fetchJobs } = await import("./remotive.cjs");
  const { CircuitBreaker } = await import("./circuitBreaker.cjs");

  const app = express();

const PORT = process.env.PORT || 5000;

const circuitBreaker = new CircuitBreaker({
  failureThreshold: 3,
  resetTimeout: 30_000,
});

app.use(
  cors({
    origin: "*",
  })
);

app.use(express.json());

/*
 * Health check
 *
 * Used by Render or another hosting platform to determine
 * whether the backend is alive.
 */
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    service: "acdyon-job-ingestion-api",
    circuitBreaker: circuitBreaker.getState(),
    timestamp: new Date().toISOString(),
  });
});

/*
 * Get jobs
 *
 * The frontend calls:
 *
 * GET /api/jobs
 *
 * The backend then:
 * 1. Checks the circuit breaker
 * 2. Fetches jobs from the public source
 * 3. Returns normalized jobs
 * 4. Uses cached data if the source fails
 */
app.get("/api/jobs", async (req, res) => {
  try {
    const result = await circuitBreaker.execute(() =>
      fetchJobs()
    );

    res.json({
      success: true,
      jobs: result.jobs,
      source: result.source,
      fetchedAt: result.fetchedAt,
      cached: result.cached,
      circuitBreaker: circuitBreaker.getState(),
    });
  } catch (error) {
    console.error("Job ingestion failed:", error.message);

    res.status(502).json({
      success: false,
      error: error.message || "Unable to fetch job listings.",
      jobs: [],
      source: {
        name: "Remotive public RSS",
      },
      circuitBreaker: circuitBreaker.getState(),
    });
  }
});

/*
 * Global error handler
 */
app.use((error, req, res, next) => {
  console.error("Unhandled server error:", error);

  res.status(500).json({
    success: false,
    error: "Internal server error.",
  });
});

/*
 * Start server
 */
async function startServer() {
  try {
    await connectDatabase();

    app.listen(PORT, () => {
      console.log(
        `Server running on port ${PORT}`
      );
    });
  } catch (error) {
    console.error(
      "Failed to start server:",
      error.message
    );

    process.exit(1);
  }
}

startServer();

})().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});