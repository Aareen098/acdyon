const {
  fetchJobs: fetchRemotiveJobs,
} = require("./remotive.cjs");

const {
  fetchArbeitnowJobs,
} = require("./arbeitnow.cjs");


async function fetchAllJobs() {
  const results = await Promise.allSettled([
    fetchRemotiveJobs(),
    fetchArbeitnowJobs(),
  ]);

  // -----------------------------
  // Remotive
  // -----------------------------
  let remotiveJobs = [];

  if (results[0].status === "fulfilled") {
    const result = results[0].value;

    console.log(
      "Raw Remotive result:",
      result
    );

    /*
     * Remotive may return:
     *
     * 1. [...]
     *
     * OR
     *
     * 2. { jobs: [...] }
     */

    if (Array.isArray(result)) {
      remotiveJobs = result;
    } else if (
      result &&
      Array.isArray(result.jobs)
    ) {
      remotiveJobs = result.jobs;
    }
  } else {
    console.error(
      "Remotive failed:",
      results[0].reason
    );
  }


  // -----------------------------
  // Arbeitnow
  // -----------------------------
  let arbeitnowJobs = [];

  if (results[1].status === "fulfilled") {
    const result = results[1].value;

    if (Array.isArray(result)) {
      arbeitnowJobs = result;
    }
  } else {
    console.error(
      "Arbeitnow failed:",
      results[1].reason
    );
  }


  // -----------------------------
  // Logs
  // -----------------------------

  console.log(
    "Remotive:",
    remotiveJobs.length
  );

  console.log(
    "Arbeitnow:",
    arbeitnowJobs.length
  );


  // -----------------------------
  // Combine
  // -----------------------------

  const allJobs = [
    ...remotiveJobs,
    ...arbeitnowJobs,
  ];

  console.log(
    "Total before deduplication:",
    allJobs.length
  );


  // -----------------------------
  // Deduplicate
  // -----------------------------

  const uniqueJobs =
    deduplicateJobs(allJobs);

  console.log(
    "Total after deduplication:",
    uniqueJobs.length
  );


  return uniqueJobs;
}


// --------------------------------
// Remove duplicate jobs
// --------------------------------

function deduplicateJobs(jobs) {
  const uniqueJobs = new Map();

  for (const job of jobs) {
    const key = createJobKey(job);

    if (!uniqueJobs.has(key)) {
      uniqueJobs.set(key, job);
    }
  }

  return Array.from(
    uniqueJobs.values()
  );
}


// --------------------------------
// Create unique job key
// --------------------------------

function createJobKey(job) {
  if (job.url) {
    return job.url
      .trim()
      .toLowerCase();
  }

  return [
    job.source || "unknown",
    job.externalId ||
      job.id ||
      "",
  ]
    .join(":")
    .toLowerCase();
}


module.exports = {
  fetchAllJobs,
};