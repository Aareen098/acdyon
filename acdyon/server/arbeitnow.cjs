// server/arbeitnow.cjs

const ARBEITNOW_URL =
  "https://www.arbeitnow.com/api/job-board-api";

async function fetchArbeitnowJobs() {
  try {
    const response = await fetch(ARBEITNOW_URL, {
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(
        `Arbeitnow API returned ${response.status}`
      );
    }

    const data = await response.json();

    const jobs = Array.isArray(data.data)
      ? data.data
      : [];

    return jobs.map((job) => ({
      externalId: String(job.slug || job.url),
      source: "arbeitnow",

      title: job.title || "Untitled Job",

      company:
        job.company_name ||
        job.company ||
        "Unknown Company",

      location:
        job.location ||
        "Remote",

      description:
        job.description || "",

      url: job.url,

      publishedAt:
        job.created_at ||
        job.created ||
        new Date().toISOString(),

      remote:
        job.remote === true ||
        job.remote === 1,

      tags: Array.isArray(job.tags)
        ? job.tags
        : [],
    }));
  } catch (error) {
    console.error(
      "Arbeitnow fetch failed:",
      error.message
    );

    return [];
  }
}

module.exports = {
  fetchArbeitnowJobs,
};