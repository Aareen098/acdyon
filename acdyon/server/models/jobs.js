import mongoose from "mongoose";

const jobSchema = new mongoose.Schema(
  {
    externalId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    company: {
      type: String,
      default: "Unknown company",
      trim: true,
    },

    location: {
      type: String,
      default: "Remote",
      trim: true,
    },

    description: {
      type: String,
      default: "",
    },

    url: {
      type: String,
      required: true,
    },

    jobType: {
      type: String,
      default: "Job",
    },

    publishedAt: {
      type: Date,
      default: null,
    },

    source: {
      type: String,
      required: true,
      default: "Remotive",
    },

    lastSeenAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

export const Job = mongoose.model("Job", jobSchema);