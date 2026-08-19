const { decode } = require("he");
const { XMLParser } = require("fast-xml-parser");

const SOURCE_URL =
  "https://remotive.com/remote-jobs/feed";

const REQUEST_TIMEOUT = 10_000;

const CACHE_TTL = 5 * 60 * 1000;

let cache = {
  jobs: [],
  fetchedAt: null,
  expiresAt: 0,
};

let lastRequestTime = 0;

const MIN_REQUEST_INTERVAL = 2_000;

async function waitForPacing() {
  const now = Date.now();

  const elapsed = now - lastRequestTime;

  if (elapsed < MIN_REQUEST_INTERVAL) {
    const waitTime =
      MIN_REQUEST_INTERVAL - elapsed;

    await new Promise((resolve) =>
      setTimeout(resolve, waitTime)
    );
  }

  lastRequestTime = Date.now();
}

/*
 * Fetch the RSS feed with a timeout.
 */
async function fetchSource() {
  await waitForPacing();

  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, REQUEST_TIMEOUT);

  try {
    const response = await fetch(SOURCE_URL, {
      method: "GET",
      headers: {
        Accept: "application/rss+xml, application/xml, text/xml",
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(
        `Source returned HTTP ${response.status}`
      );
    }

    const xml = await response.text();

    if (!xml.trim()) {
      throw new Error("Source returned an empty response.");
    }

    return xml;
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error(
        "Source request timed out."
      );
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

// Convert RSS XML into our application's normalized job format.
function normalizeJob(item, index) {
  const description =
    item.description || "";

  return {
    id:
      item.guid ||
      item.link ||
      `job-${index}`,

    title:
      item.title ||
      "Untitled job",

    company:
      item["dc:creator"] ||
      item.creator ||
      "Unknown company",

    location:
      item["job:location"] ||
      "Remote",

    description: cleanDescription(
      description
    ),

    url:
      item.link ||
      "#",

    jobType:
      item["job:type"] ||
      "Job",

    publishedAt:
      item.pubDate ||
      null,
  };
}

/*
 * Remove HTML from RSS descriptions.
 */
function cleanDescription(value) {
  const withoutHtml = String(value)
    .replace(/<[^>]*>/g, " ");

  return decode(withoutHtml)
    .replace(/\s+/g, " ")
    .trim();
}

/*
 * Parse RSS XML.
 */
function parseJobs(xml) {
  const parser = new XMLParser({
    ignoreAttributes: false,
    trimValues: true,
  });

  const parsed = parser.parse(xml);

  const items =
    parsed?.rss?.channel?.item || [];

  const normalizedItems = Array.isArray(items)
    ? items
    : [items];

  return normalizedItems
    .filter(Boolean)
    .map(normalizeJob);
}

/*
 * Main ingestion function.
 */
async function fetchJobs() {
  /*
   * Return cached data if it is still fresh.
   */
  if (
    cache.jobs.length > 0 &&
    Date.now() < cache.expiresAt
  ) {
    return {
      jobs: cache.jobs,
      source: {
        name: "Remotive public RSS",
        url: SOURCE_URL,
      },
      fetchedAt: cache.fetchedAt,
      cached: true,
    };
  }

  try {
    const xml = await fetchSource();

    const jobs = parseJobs(xml);

    /*
     * An empty response is treated as a failure.
     *
     * This prevents a source markup/API change from
     * silently making the application look successful
     * while returning zero jobs.
     */
    if (jobs.length === 0) {
      throw new Error(
        "Source returned no usable job listings."
      );
    }

    /*
     * Update cache only after successful ingestion.
     */
    cache = {
      jobs,
      fetchedAt: new Date().toISOString(),
      expiresAt:
        Date.now() + CACHE_TTL,
    };

    return {
      jobs,
      source: {
        name: "Remotive public RSS",
        url: SOURCE_URL,
      },
      fetchedAt: cache.fetchedAt,
      cached: false,
    };
  } catch (error) {
    /*
     * If upstream fails but we have older data,
     * return that data instead of failing completely.
     */
    if (cache.jobs.length > 0) {
      console.warn(
        "Using stale cached jobs because source failed."
      );

      return {
        jobs: cache.jobs,
        source: {
          name: "Remotive public RSS",
          url: SOURCE_URL,
        },
        fetchedAt: cache.fetchedAt,
        cached: true,
      };
    }

    /*
     * Nothing in cache, so let server.js handle
     * the failure.
     */
    throw error;
  }
}

module.exports = { fetchJobs };