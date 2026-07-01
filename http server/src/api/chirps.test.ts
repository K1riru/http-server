import type { Request } from "express";
import { describe, expect, it } from "vitest";

import { getSortOrder, sortChirpsByCreatedAt } from "./chirps.js";

describe("getSortOrder", () => {
  it("defaults to asc when sort is missing", () => {
    const req = { query: {} } as unknown as Request;
    expect(getSortOrder(req)).toBe("asc");
  });

  it("returns desc when requested", () => {
    const req = { query: { sort: "desc" } } as unknown as Request;
    expect(getSortOrder(req)).toBe("desc");
  });

  it("falls back to asc for any other value", () => {
    const req = { query: { sort: "something-else" } } as unknown as Request;
    expect(getSortOrder(req)).toBe("asc");
  });
});

describe("sortChirpsByCreatedAt", () => {
  const chirps = [
    {
      id: "2",
      createdAt: new Date("2024-01-02T00:00:00.000Z"),
      updatedAt: new Date("2024-01-02T00:00:00.000Z"),
      body: "second",
      userId: "user-1",
    },
    {
      id: "1",
      createdAt: new Date("2024-01-01T00:00:00.000Z"),
      updatedAt: new Date("2024-01-01T00:00:00.000Z"),
      body: "first",
      userId: "user-1",
    },
  ];

  it("sorts chirps in ascending order", () => {
    expect(sortChirpsByCreatedAt(chirps, "asc").map((chirp) => chirp.id)).toEqual(["1", "2"]);
  });

  it("sorts chirps in descending order", () => {
    expect(sortChirpsByCreatedAt(chirps, "desc").map((chirp) => chirp.id)).toEqual(["2", "1"]);
  });
});
