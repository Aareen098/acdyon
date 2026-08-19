Author

Aareen Anand

Built as part of the Acdyon Technologies Engineering Challenge.

# `DECISIONS.md`

# Engineering Decisions


## 1. Why this ingestion strategy?


I chose a public RSS job feed as the live ingestion source instead of directly scraping protected platforms such as LinkedIn, Indeed, or Naukri.


The assessment specifically allows a low-risk public job-board RSS/API or a sandbox source. This approach lets me demonstrate the actual ingestion and resilience architecture without attempting to bypass authentication, CAPTCHA, access controls, or platform restrictions.


The pipeline is:


```text
Public RSS
    ↓
Fetch + timeout
    ↓
XML parsing
    ↓
Normalization
    ↓
MongoDB
    ↓
Express API
    ↓
React

I added request pacing, timeout handling, caching, and a circuit breaker so the application does not continuously hit an unhealthy upstream source.

MongoDB provides persistent storage for successfully ingested jobs. Jobs use the source's external identifier so repeated ingestion can be handled as an upsert instead of creating duplicate records.

I rejected direct browser automation as the primary approach because it would introduce a larger detection surface, require more infrastructure, and move the project toward defeating protections rather than demonstrating a maintainable ingestion pipeline.

2. Trade-off made under the time limit

The main trade-off was using one public RSS source rather than implementing multiple independent sources.

A production system would benefit from multiple adapters, for example:

Source A ─┐
Source B ─┼→ Normalized schema → MongoDB
Source C ─┘

This would make the system less dependent on one upstream source and provide a stronger fallback when a source changes or disappears.

Given the assessment time limit, I focused on making one source work end-to-end and making the ingestion layer resilient.

With a real week, I would add:

a source adapter interface
additional low-risk public sources
source-specific health metrics
persistent ingestion scheduling
better observability and structured logging
automated tests for parser/schema changes
stronger data freshness and deduplication rules
3. AI usage and personal verification

I used AI tools during development for code scaffolding, debugging ideas, CSS responsiveness, error diagnosis, and reviewing implementation approaches.

I did not treat generated code as automatically correct.

I personally ran and tested the application locally, verified the frontend-to-backend data flow, checked the API responses, tested the refresh behavior, fixed HTML entity decoding in job descriptions, investigated duplicate React keys, and adjusted the responsive layout after testing at mobile width.

I also verified the architecture against the actual assessment requirements and kept the implementation within the low-risk public-source boundary.

The final implementation is therefore based on code that I ran, debugged, and can explain rather than code copied without verification.



