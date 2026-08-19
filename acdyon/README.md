# JOB Hunter — Resilient Job Ingestion Pipeline

A small full-stack job ingestion system built for the Acdyon Technologies Part 1 engineering challenge.

The application retrieves job listings from a public RSS source, normalizes the incoming data into a consistent schema, stores the results in MongoDB, and exposes them through a Node.js/Express API for a React frontend.

The project focuses on reliable ingestion and graceful failure handling rather than attempting to bypass protected platforms or their anti-bot mechanisms.

---

## Overview

The goal of this project is to demonstrate how a job ingestion pipeline can continue to provide useful data when an upstream source becomes slow, unavailable, changes its response, or temporarily fails.

Instead of directly scraping protected platforms such as LinkedIn or Indeed, this implementation uses a low-risk public job feed.

### Current pipeline

```text
Public RSS Source
       |
       v
RSS/XML Fetcher
       |
       v
XML Parser
       |
       v
Job Normalization
       |
       v
MongoDB
       |
       v
Express REST API
       |
       v
React Frontend

Features
Fetches jobs from a public RSS source
XML/RSS parsing
Normalizes source data into a common job schema
HTML tag and HTML entity cleanup
Request pacing
Request timeout handling
In-memory caching
Circuit breaker for repeated upstream failures
MongoDB persistence
Idempotent job storage using an external job identifier
API health endpoint
React frontend for displaying listings
Loading, error, and empty states
Responsive job listing interface
Graceful fallback when the upstream source is unavailable
Technology Stack
Frontend
React
Vite
CSS
Backend
Node.js
Express
CommonJS (.cjs)
Fast XML Parser
Mongoose
dotenv
CORS
Database
MongoDB Atlas
Source
Public Remotive RSS feed
Project Structure
acdyon/
│
├── src/
│   ├── App.jsx
│   ├── App.css
│   ├── index.css
│   └── main.jsx
│
├── server/
│   ├── server.cjs
│   ├── remotive.cjs
│   ├── circuitBreaker.cjs
│   ├── db.cjs
│   │
│   └── models/
│       └── Job.cjs
│
├── public/
│
├── .env.example
├── .gitignore
├── package.json
├── package-lock.json
├── README.md
└── DECISIONS.md
Getting Started
1. Clone the repository
git clone <YOUR_GITHUB_REPOSITORY_URL>
cd acdyon
2. Install dependencies
npm install
3. Configure environment variables

Create a .env file in the project root.

VITE_API_BASE_URL=http://localhost:5000


MONGODB_URI=your-mongodb-connection-string

Never commit the real .env file.

A safe example is provided in:

.env.example
4. Start the backend
npm run server

The backend runs on:

http://localhost:5000

Health check:

http://localhost:5000/api/health

Jobs endpoint:

http://localhost:5000/api/jobs
5. Start the frontend

Open another terminal:

npm run dev

Vite will provide the local frontend URL, normally:

http://localhost:5173
API
GET /api/health

Returns the current backend and circuit-breaker status.

Example:

{
  "status": "ok",
  "service": "acdyon-job-ingestion-api",
  "circuitBreaker": {
    "state": "CLOSED",
    "failureCount": 0,
    "failureThreshold": 3
  }
}
GET /api/jobs

Fetches the latest normalized job listings.

Example response:

{
  "success": true,
  "jobs": [],
  "source": {
    "name": "Remotive public RSS"
  },
  "fetchedAt": "2026-08-19T10:00:00.000Z",
  "cached": false
}
Data Flow

The ingestion process follows these steps:

1. Request pacing

The backend avoids making repeated requests to the upstream source too quickly.

2. Fetch

The RSS feed is requested with a timeout.

3. Parse

The XML response is parsed using fast-xml-parser.

4. Normalize

Source-specific fields are converted into a consistent job structure.

Example:

externalId
title
company
location
description
url
jobType
publishedAt
5. Clean descriptions

HTML tags are removed and HTML entities are decoded before the data reaches the frontend.

6. Persist

Normalized jobs are stored in MongoDB using their external source identifier.

Existing jobs are updated rather than inserted repeatedly.

7. Serve

The Express API returns the normalized data to the React frontend.

Resilience

The ingestion pipeline is designed to avoid silently failing when the upstream source has problems.

Timeout

Upstream requests have a fixed timeout.

If the source does not respond within the configured period, the request is treated as failed.

Empty response protection

An empty or unusable RSS response is treated as an ingestion failure rather than being interpreted as a successful result containing zero jobs.

Caching

Successful results are cached in memory for a short period.

This prevents every request to the frontend from immediately generating another upstream request.

Circuit breaker

Repeated upstream failures cause the circuit breaker to open temporarily.

CLOSED
  |
  | repeated failures
  v
OPEN
  |
  | reset timeout
  v
HALF_OPEN
  |
  | successful request
  v
CLOSED

This prevents continuously requesting a source that is already failing.

MongoDB persistence

Successfully ingested jobs are persisted in MongoDB.

This gives the application a durable copy of previously retrieved listings instead of depending entirely on the upstream source being available at every moment.

Duplicate Prevention

Jobs are stored using a source-specific external identifier.

The database uses this identifier as a unique key.

Repeated ingestion therefore behaves as an upsert:

Job does not exist
       |
       v
    INSERT


Job already exists
       |
       v
    UPDATE

This prevents repeated refreshes from creating duplicate database records.

Failure Handling Strategy

The system prioritizes previously known valid data over returning an apparently successful empty response.

The intended fallback order is:

Upstream source
      |
      | success
      v
Normalize + Store
      |
      v
MongoDB
      |
      v
API

If the source fails:

Upstream source
      |
      X
      |
      v
Memory cache
      |
      | unavailable
      v
MongoDB fallback

If no previous data is available, the API returns an explicit error rather than pretending the source returned valid data.

Ethical / Technical Boundary

This project intentionally uses a public, low-risk job source.

It does not attempt to:

bypass authentication
bypass CAPTCHA
defeat access controls
scrape a live authenticated account
circumvent platform restrictions
use stolen credentials
evade a deliberate platform block

The goal is to demonstrate the ingestion architecture and resilience pattern without attempting to defeat the protections of a production platform.

Local Testing

Check the backend:

npm run server

Check the health endpoint:

http://localhost:5000/api/health

Check the jobs endpoint:

http://localhost:5000/api/jobs

Then open the frontend with:

npm run dev

Test:

initial loading
manual refresh
empty response handling
source failure handling
cached responses
mobile width
desktop width
duplicate prevention
Environment Variables
Variable	Purpose
VITE_API_BASE_URL	Backend URL used by the React frontend
MONGODB_URI	MongoDB connection string used only by the backend

MONGODB_URI must never be exposed to the browser.

Production Deployment

The frontend and backend can be deployed separately.

React + Vite
     |
     v
Vercel


Node + Express
     |
     v
Render


MongoDB
     |
     v
MongoDB Atlas

The production frontend should use the deployed backend URL:

VITE_API_BASE_URL=https://your-backend-url

The backend should receive its MongoDB connection string through the hosting provider's environment variables.

Important Security Notes

Never commit:

.env

or credentials such as:

MONGODB_URI

to GitHub.

If a database credential is accidentally exposed, rotate it immediately.

Assessment Scope

This repository implements Part 1 of the Acdyon Technologies engineering challenge.

The implementation intentionally focuses on:

source ingestion
request pacing
normalization
persistence
caching
failure handling
circuit breaking
honest handling of platform restrictions

It does not attempt to bypass protected job platforms.

Author

Aareen Anand