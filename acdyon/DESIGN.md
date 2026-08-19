# AcdYon — Design Document

## 1. Overview

AcdYon is a job aggregation platform designed to collect, normalize, deduplicate, and display job opportunities from multiple public job sources through a single web application.

The system provides a centralized interface where users can browse remote job opportunities without manually visiting multiple job boards.

The current implementation combines jobs from:

* Remotive
* Arbeitnow

The backend aggregates the results, normalizes them into a common structure, removes duplicates, and exposes them through a REST API consumed by the React frontend.

---

## 2. Design Goals

The primary design goals of AcdYon are:

1. **Aggregate jobs from multiple sources**
2. **Avoid duplicate job listings**
3. **Provide a simple and responsive user interface**
4. **Separate frontend and backend responsibilities**
5. **Handle external API failures gracefully**
6. **Allow additional job sources to be integrated easily**
7. **Keep the application deployable as independent services**
8. **Provide a scalable foundation for future job filtering and pagination**

---

## 3. High-Level Architecture

```text
                    ┌─────────────────────┐
                    │      User           │
                    │    Web Browser      │
                    └──────────┬──────────┘
                               │
                               │ HTTP
                               ▼
                    ┌─────────────────────┐
                    │   React Frontend    │
                    │      Vite           │
                    └──────────┬──────────┘
                               │
                               │ GET /api/jobs
                               ▼
                    ┌─────────────────────┐
                    │   Express Backend   │
                    │      Node.js        │
                    └──────────┬──────────┘
                               │
                    ┌──────────┴──────────┐
                    │                     │
                    ▼                     ▼
          ┌─────────────────┐   ┌─────────────────┐
          │    Remotive     │   │    Arbeitnow    │
          │   Job Source    │   │   Job Source    │
          └────────┬────────┘   └────────┬────────┘
                   │                     │
                   └──────────┬──────────┘
                              ▼
                    ┌─────────────────────┐
                    │   Job Aggregator    │
                    │                     │
                    │ Normalize           │
                    │ Combine             │
                    │ Deduplicate         │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │      MongoDB        │
                    │                     │
                    │ Job Persistence     │
                    └─────────────────────┘
```

---

# 4. Technology Stack

## Frontend

| Technology | Purpose                         |
| ---------- | ------------------------------- |
| React      | User interface                  |
| Vite       | Frontend development/build tool |
| CSS        | Responsive styling              |
| JavaScript | Frontend logic                  |

## Backend

| Technology | Purpose                    |
| ---------- | -------------------------- |
| Node.js    | Backend runtime            |
| Express.js | REST API                   |
| CORS       | Cross-origin communication |
| dotenv     | Environment configuration  |

## Database

| Technology | Purpose                |
| ---------- | ---------------------- |
| MongoDB    | Persistent job storage |

## External Sources

| Source    | Purpose                 |
| --------- | ----------------------- |
| Remotive  | Remote job listings     |
| Arbeitnow | Additional job listings |

## Deployment

| Component | Platform |
| --------- | -------- |
| Frontend  | Vercel   |
| Backend   | Render   |
| Database  | MongoDB  |

---

# 5. Frontend Architecture

The frontend is responsible for presenting job information and interacting with the backend API.

```text
React Application
│
├── Header
│   ├── Brand
│   └── Refresh Jobs
│
├── Hero Section
│   ├── Application introduction
│   ├── Actions
│   └── API status information
│
├── Jobs Section
│   ├── Section heading
│   ├── Job count
│   ├── Loading state
│   ├── Error state
│   ├── Empty state
│   └── Job Grid
│       └── Job Cards
│
├── Architecture Section
│
└── Footer
```

---

# 6. Job Card Design

Each job is displayed using a consistent card structure.

```text
┌──────────────────────────────┐
│ Job Type             Date    │
│                              │
│ Job Title                    │
│                              │
│ Company                      │
│ Location                     │
│                              │
│ Short job description...     │
│ Short job description...     │
│ Short job description...     │
│                              │
│ View Listing →               │
└──────────────────────────────┘
```

The job description is intentionally truncated using CSS line clamping so that long external job descriptions do not make individual cards excessively large.

The desktop layout uses three columns, while the layout becomes two columns on tablets and one column on smaller screens.

---

# 7. Backend Architecture

The backend follows a modular structure.

```text
server/
│
├── server.cjs
│
├── db.cjs
│
├── remotive.cjs
│
├── arbeitnow.cjs
│
├── jobAggregator.cjs
│
├── circuitBreaker.cjs
│
└── models/
    └── Job.cjs
```

### Responsibilities

### `server.cjs`

Responsible for:

* Creating the Express application
* Configuring middleware
* Configuring CORS
* Connecting to MongoDB
* Exposing API endpoints
* Starting the HTTP server
* Handling global errors

### `remotive.cjs`

Responsible for:

* Fetching Remotive jobs
* Parsing the external response
* Normalizing Remotive job data

### `arbeitnow.cjs`

Responsible for:

* Fetching Arbeitnow jobs
* Parsing the external response
* Normalizing Arbeitnow job data

### `jobAggregator.cjs`

Responsible for:

* Calling multiple job sources
* Handling source failures independently
* Combining results
* Deduplicating jobs
* Returning a unified job collection

### `db.cjs`

Responsible for:

* Establishing the MongoDB connection

### `Job.cjs`

Responsible for:

* Defining the MongoDB job schema
* Structuring persisted job information

### `circuitBreaker.cjs`

Responsible for:

* Monitoring external service failures
* Preventing repeated calls to an unavailable service
* Allowing the service to recover after the reset period

---

# 8. Job Aggregation Flow

When the frontend requests jobs:

```text
GET /api/jobs
       │
       ▼
Express Server
       │
       ▼
fetchAllJobs()
       │
       ├───────────────┐
       ▼               ▼
   Remotive        Arbeitnow
       │               │
       ▼               ▼
  Normalize         Normalize
       │               │
       └───────┬───────┘
               ▼
          Combine Jobs
               │
               ▼
          Deduplicate
               │
               ▼
          Return JSON
               │
               ▼
            React
```

The sources are fetched independently using `Promise.allSettled()`.

This is important because failure of one source should not prevent jobs from another source from being displayed.

For example:

```text
Remotive       → 20 jobs
Arbeitnow      → 175 jobs
                       ↓
                 Aggregator
                       ↓
              195 total jobs
                       ↓
              Deduplication
                       ↓
              193 unique jobs
```

The current API response confirms that the system can return 193 aggregated jobs.

---

# 9. Data Normalization

Different job providers return different field names and structures.

AcdYon converts them into a common job structure.

The normalized structure is conceptually:

```js
{
  externalId,
  source,
  title,
  company,
  location,
  description,
  url,
  publishedAt,
  remote,
  tags
}
```

This allows the frontend to work with a single format regardless of the original source.

For example:

```text
Remotive
    ↓
Remotive-specific response
    ↓
       Normalize
    ↓
Common Job Object
```

and:

```text
Arbeitnow
    ↓
Arbeitnow-specific response
    ↓
       Normalize
    ↓
Common Job Object
```

---

# 10. Deduplication Strategy

Duplicate jobs can occur when multiple job sources contain the same listing.

AcdYon therefore performs deduplication before returning the aggregated collection.

The primary deduplication key is the job URL when available.

Conceptually:

```js
const uniqueJobs = new Map();

for (const job of jobs) {
  const key =
    job.url ||
    `${job.source}:${job.externalId}`;

  if (!uniqueJobs.has(key)) {
    uniqueJobs.set(key, job);
  }
}
```

This provides two levels of identification:

```text
Primary:
job.url

Fallback:
source + externalId
```

The result is a unique set of jobs for the frontend.

---

# 11. API Design

## Health Check

```http
GET /api/health
```

Example response:

```json
{
  "status": "ok",
  "service": "acdyon-job-ingestion-api",
  "circuitBreaker": {},
  "timestamp": "..."
}
```

This endpoint is useful for deployment platforms and service monitoring.

---

## Get Jobs

```http
GET /api/jobs
```

Example response:

```json
{
  "success": true,
  "count": 193,
  "jobs": []
}
```

The endpoint:

1. Calls the job aggregator
2. Fetches jobs from configured sources
3. Combines the results
4. Removes duplicates
5. Returns normalized jobs

---

# 12. Error Handling

AcdYon uses multiple levels of error handling.

## Source-Level Errors

Each external source is handled independently.

Using:

```js
Promise.allSettled()
```

means:

```text
Remotive succeeds
+
Arbeitnow fails

        ↓

Remotive jobs are still returned
```

Similarly:

```text
Remotive fails
+
Arbeitnow succeeds

        ↓

Arbeitnow jobs are still returned
```

This prevents one external source from becoming a single point of failure.

---

## API-Level Errors

If the aggregation process itself fails, the backend returns:

```json
{
  "success": false,
  "message": "Failed to fetch jobs",
  "jobs": []
}
```

with an appropriate HTTP error status.

---

## Frontend Error State

The frontend displays an error banner when the backend request fails.

The user can retry the operation instead of receiving a blank page.

---

# 13. Circuit Breaker

AcdYon includes a circuit breaker to protect the backend from repeatedly calling an unavailable external service.

Current configuration:

```js
{
  failureThreshold: 3,
  resetTimeout: 30000
}
```

The basic behavior is:

```text
External API
     │
     ▼
Request
     │
     ├── Success → Continue
     │
     └── Failure
          │
          ▼
     Failure Counter
          │
          ▼
     Threshold Reached
          │
          ▼
       OPEN
          │
          ▼
     Stop requests
          │
          ▼
     Wait 30 seconds
          │
          ▼
       HALF-OPEN
          │
       ┌──┴──┐
       ▼     ▼
   Success  Failure
      │        │
   CLOSED     OPEN
```

This improves resilience when external job providers temporarily become unavailable.

---

# 14. Caching Strategy

The external job APIs may return the same jobs between requests.

Caching can therefore be used to reduce unnecessary external requests.

The cache should be treated as an optimization rather than as the source of truth.

The desired behavior is:

```text
Frontend Refresh
       │
       ▼
Backend
       │
       ▼
Fetch latest available jobs
       │
       ▼
Normalize
       │
       ▼
Deduplicate
       │
       ▼
Return latest dataset
```

Refreshing does not guarantee that every job will be different.

A job remains in the result while it is still available from the external provider.

---

# 15. Refresh Behavior

The Refresh Jobs button should **replace** the current job collection rather than append another copy.

Correct:

```js
setJobs(data.jobs);
```

Incorrect:

```js
setJobs(prev => [
  ...prev,
  ...data.jobs
]);
```

The intended behavior is:

```text
Initial load
     ↓
193 jobs

Refresh
     ↓
Latest aggregated jobs
     ↓
193 jobs
```

rather than:

```text
Initial load
     ↓
193 jobs

Refresh
     ↓
386 jobs

Refresh
     ↓
579 jobs
```

The refresh operation retrieves the latest available data; it is not intended to create a permanent history of every previous API response.

---

# 16. Responsive Design

AcdYon uses a responsive CSS Grid layout.

## Desktop

```text
┌─────────┐ ┌─────────┐ ┌─────────┐
│  Job    │ │  Job    │ │  Job    │
└─────────┘ └─────────┘ └─────────┘
```

Three columns are displayed.

## Tablet

```text
┌─────────┐ ┌─────────┐
│  Job    │ │  Job    │
└─────────┘ └─────────┘
```

Two columns are displayed.

## Mobile

```text
┌─────────────┐
│     Job     │
└─────────────┘

┌─────────────┐
│     Job     │
└─────────────┘
```

One column is displayed.

The layout also uses:

```css
minmax(0, 1fr)
```

to prevent long job descriptions, titles, or URLs from expanding grid columns beyond their intended width.

---

# 17. Performance Considerations

Several design decisions improve performance and reliability:

### Parallel Source Requests

Multiple job providers are queried concurrently instead of sequentially.

```js
Promise.allSettled([
  fetchRemotiveJobs(),
  fetchArbeitnowJobs()
]);
```

### Deduplication Before Rendering

Duplicate records are removed on the backend instead of sending unnecessary duplicate data to the frontend.

### Description Truncation

Long job descriptions are visually limited using CSS line clamping.

### Responsive Grid

The frontend adapts the number of columns according to viewport size.

### Graceful Failure

A failure from one external source does not automatically remove jobs from the other source.

---

# 18. Security Considerations

The backend keeps external API communication on the server side where appropriate.

Environment-specific configuration is handled using environment variables.

Sensitive values should not be committed to GitHub.

Example:

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
```

The `.env` file should remain excluded from version control.

---

# 19. Deployment Architecture

The application is deployed as separate frontend and backend services.

```text
                   Internet
                      │
          ┌───────────┴───────────┐
          │                       │
          ▼                       ▼
      Vercel                   Render
          │                       │
          │ React                 │ Express
          │                       │
          └───────────┬───────────┘
                      │
                      ▼
                   MongoDB
```

### Frontend

The React application is deployed using Vercel.

### Backend

The Node.js/Express API is deployed using Render.

### Database

MongoDB is used for persistent job data.

---

# 20. Extensibility

The aggregation architecture is designed so that additional job sources can be added without rewriting the frontend.

For example:

```text
Current:

Remotive
Arbeitnow
    ↓
Aggregator


Future:

Remotive
Arbeitnow
Adzuna
Other API
    ↓
Aggregator
```

A new source only needs to:

1. Fetch the external data
2. Normalize it into the common job structure
3. Register the source with the aggregator

The frontend continues to consume:

```http
GET /api/jobs
```

without needing to know which external providers generated the jobs.

---

# 21. Future Improvements

The following improvements can be added as the application evolves.

## 21.1 Pagination

Instead of rendering every job at once:

```text
Page 1 → 30 jobs
Page 2 → 30 jobs
Page 3 → 30 jobs
```

or:

```text
Load More
```

This will improve frontend performance.

---

## 21.2 Search

Allow users to search:

```text
"React Developer"
"Backend Developer"
"Java"
"Node.js"
```

---

## 21.3 Filters

Potential filters include:

* Location
* Remote/onsite
* Job type
* Company
* Source
* Technology
* Experience level

---

## 21.4 Sorting

Potential sorting options:

```text
Newest
Oldest
Relevance
```

---

## 21.5 More Job Sources

Additional providers such as Adzuna can be integrated to increase job coverage.

The aggregator architecture already allows this without changing the frontend contract.

---

## 21.6 Persistent Job History

MongoDB can be used to retain jobs independently of the external providers.

This would allow:

```text
External APIs
      ↓
Ingestion
      ↓
MongoDB
      ↓
Frontend
```

instead of requiring every frontend request to depend directly on external job providers.

---

# 22. Design Principles

AcdYon follows these core principles:

### Separation of Concerns

Frontend, backend, external integrations, aggregation, and database responsibilities are separated.

### Resilience

The failure of one external provider should not bring down the entire application.

### Normalization

Different external formats are converted into a consistent internal representation.

### Deduplication

Duplicate listings are removed before they reach the frontend.

### Extensibility

New job providers can be integrated without redesigning the frontend.

### Responsive Design

The interface works across desktop, tablet, and mobile devices.

### User Experience

The UI prioritizes readable job cards, clear actions, loading states, error states, and responsive behavior.

---

# 23. Current System Summary

The current AcdYon system provides:

```text
                    ACdYON
                       │
        ┌──────────────┴──────────────┐
        │                             │
     Frontend                      Backend
      React                       Node.js
        │                             │
        │                        Express API
        │                             │
        │                   ┌─────────┴─────────┐
        │                   │                   │
        │                Remotive           Arbeitnow
        │                   │                   │
        │                   └─────────┬─────────┘
        │                             │
        │                       Aggregator
        │                             │
        │                       Deduplication
        │                             │
        │                          MongoDB
        │                             │
        └──────────── API ────────────┘
```

The result is a modular job aggregation platform capable of combining listings from multiple sources while maintaining a consistent user experience.

---

# 24. Conclusion

AcdYon is designed as a resilient and extensible job aggregation platform rather than a simple frontend consuming a single job API.

The multi-source architecture allows the system to continue providing jobs even when one provider is unavailable. Normalization creates a consistent data structure, while deduplication prevents repeated listings from different sources.

The architecture also provides a foundation for future improvements such as pagination, advanced search, filtering, additional job providers, persistent job history, and more intelligent job discovery.
