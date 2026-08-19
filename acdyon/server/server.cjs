const express = require("express");
const cors = require("cors");
require("dotenv").config();

(async () => {
  const { connectDatabase } = await import("./db.cjs");
  const { fetchAllJobs } = await import("./jobAggregator.cjs");
  const { CircuitBreaker } = await import(
    "./circuitBreaker.cjs"
  );

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
   */
  app.get("/api/jobs", async (req, res) => {
    try {
      const jobs = await fetchAllJobs();

      res.json({
        success: true,
        count: jobs.length,
        jobs,
      });
    } catch (error) {
      console.error("Jobs API error:", error);

      res.status(500).json({
        success: false,
        message: "Failed to fetch jobs",
        jobs: [],
      });
    }
  });

  /*
   * Global error handler
   */
  app.use((error, req, res, next) => {
    console.error(
      "Unhandled server error:",
      error
    );

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
  console.error(
    "Failed to start server:",
    error
  );

  process.exit(1);
});