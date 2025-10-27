import request from "supertest";
import app from "../server";
import { describe, it } from "vitest";

describe("API Health", () => {
  it("should return 200 OK", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
  });
});
