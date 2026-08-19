import { useCallback, useEffect, useMemo, useState } from "react";
import "./App.css";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

function App() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sourceStatus, setSourceStatus] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

 const fetchJobs = async () => {
  try {
    setLoading(true);

    const response = await fetch(
      `${API_BASE_URL}/api/jobs`
    );

    if (!response.ok) {
      throw new Error("Failed to fetch jobs");
    }

    const data = await response.json();

    console.log("Jobs received:", data.count);

    // IMPORTANT:
    // Replace existing jobs instead of appending
    setJobs(
      Array.isArray(data.jobs)
        ? data.jobs
        : []
    );

  } catch (error) {
    console.error(
      "Failed to load jobs:",
      error
    );
  } finally {
    setLoading(false);
  }
};

  useEffect(() => {
  fetchJobs();
}, []);

  const jobCount = useMemo(() => jobs.length, [jobs]);

  return (
    <div className="app">
      <header className="header">
        <div className="container nav">
          <div className="brand">
            <div className="brand-mark">JH</div>

            <div>
              <h1>JOB Hunter</h1>
              <span>Job ingestion demo</span>
            </div>
          </div>

          <button
            className="refresh-button"
            onClick={fetchJobs}
            disabled={loading}
          >
            {loading ? "Refreshing..." : "Refresh jobs"}
          </button>
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="container hero-content">
            <div className="hero-copy">
              <span className="eyebrow">
                Public-source ingestion pipeline
              </span>

              <h2>
                Job data without pretending
                <span> protected platforms are APIs.</span>
              </h2>

              <p>
                A small resilient ingestion pipeline that retrieves public
                job listings, normalizes them, caches successful results,
                and gracefully handles source failures.
              </p>

              <div className="hero-actions">
                <button
                  className="primary-button"
                  onClick={fetchJobs}
                  disabled={loading}
                >
                  {loading ? "Loading..." : "Load live jobs"}
                </button>

                <a
                  href="#architecture"
                  className="secondary-button"
                >
                  How it works
                </a>
              </div>
            </div>

            <div className="status-card">
              <div className="status-header">
                <span>Pipeline status</span>

                <span
                  className={`status-dot ${
                    error ? "offline" : "online"
                  }`}
                />
              </div>

              <div className="status-value">
                {error ? "Degraded" : "Operational"}
              </div>

              <div className="status-details">
                <div>
                  <span>Listings</span>
                  <strong>{jobCount}</strong>
                </div>

                <div>
                  <span>Source</span>
                  <strong>
                    {sourceStatus?.name || "Public RSS"}
                  </strong>
                </div>
              </div>

              {lastUpdated && (
                <p className="updated">
                  Updated{" "}
                  {new Date(lastUpdated).toLocaleTimeString()}
                </p>
              )}
            </div>
          </div>
        </section>

        <section className="jobs-section">
          <div className="container">
            <div className="section-heading">
              <div>
                <span className="eyebrow">Latest listings</span>
                <h3>Jobs pulled from the source</h3>
              </div>

              <span className="job-count">
                {jobCount} listings
              </span>
            </div>

            {error && (
              <div className="error-banner">
                <strong>Source unavailable.</strong>
                <span>{error}</span>
                <button onClick={fetchJobs}>
                  Try again
                </button>
              </div>
            )}

            {loading ? (
              <div className="loading-grid">
                {[1, 2, 3].map((item) => (
                  <div className="job-card skeleton" key={item}>
                    <div className="skeleton-line short" />
                    <div className="skeleton-line" />
                    <div className="skeleton-line medium" />
                    <div className="skeleton-line" />
                  </div>
                ))}
              </div>
            ) : jobs.length === 0 ? (
              <div className="empty-state">
                <h4>No listings available</h4>
                <p>
                  The source returned no jobs. Try refreshing the
                  pipeline.
                </p>
              </div>
            ) : (
              <div className="jobs-grid">
                {jobs.map((job) => (
                  <article className="job-card" key={job.id}>
                    <div className="job-card-top">
                      <span className="job-type">
                        {job.jobType || "Job"}
                      </span>

                      {job.publishedAt && (
                        <time>
                          {new Date(
                            job.publishedAt
                          ).toLocaleDateString()}
                        </time>
                      )}
                    </div>

                    <h4>{job.title}</h4>

                    <p className="company">
                      {job.company || "Unknown company"}
                    </p>

                    <p className="location">
                      {job.location || "Remote"}
                    </p>

                    <p className="description">
                      {job.description ||
                        "No description available."}
                    </p>

                    <a
                      href={job.url}
                      target="_blank"
                      rel="noreferrer"
                      className="job-link"
                    >
                      View listing →
                    </a>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>

        <section id="architecture" className="architecture-section">
          <div className="container">
            <div className="section-heading">
              <div>
                <span className="eyebrow">Ingestion design</span>
                <h3>Built to fail gracefully</h3>
              </div>
            </div>

            <div className="architecture-grid">
              <div className="architecture-card">
                <span>01</span>
                <h4>Public source</h4>
                <p>
                  The demo consumes a public job feed instead of
                  attempting to bypass authentication, CAPTCHA, or
                  platform restrictions.
                </p>
              </div>

              <div className="architecture-card">
                <span>02</span>
                <h4>Pacing & caching</h4>
                <p>
                  Requests are paced and successful responses are
                  cached so repeated visitors do not continuously
                  hit the upstream source.
                </p>
              </div>

              <div className="architecture-card">
                <span>03</span>
                <h4>Failure handling</h4>
                <p>
                  Timeouts, empty responses, upstream failures and
                  circuit-breaker states are surfaced instead of
                  silently returning broken data.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="container">
          <p>
            Acdyon frontend challenge · Public-source ingestion
            demo
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;