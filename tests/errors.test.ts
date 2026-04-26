import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  InvoanceClient,
  AuthenticationError,
  NotFoundError,
  QuotaExceededError,
} from "../src/index.js";

const BASE = "http://localhost:8080/v1";

function mockClient() {
  return new InvoanceClient({ apiKey: "inv_test_key", baseUrl: BASE });
}

describe("Error handling", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("401 throws AuthenticationError", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({ error: "unauthorized", message: "Invalid API key." }),
        { status: 401 },
      ),
    );

    const client = mockClient();
    await expect(client.events.get("bad-id")).rejects.toThrow(
      AuthenticationError,
    );
  });

  it("404 throws NotFoundError", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          error: "event_not_found",
          message: "Event not found.",
        }),
        { status: 404 },
      ),
    );

    const client = mockClient();
    await expect(client.events.get("missing")).rejects.toThrow(NotFoundError);
  });

  it("429 throws QuotaExceededError", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          error: "quota_exceeded",
          message: "Verification quota exceeded.",
        }),
        { status: 429 },
      ),
    );

    const client = mockClient();
    await expect(
      client.events.verify("e1", { payloadHash: "a".repeat(64) }),
    ).rejects.toThrow(QuotaExceededError);
  });

  it("error exposes statusCode, errorCode, and body", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          error: "bad_request",
          message: "event_type is required.",
        }),
        { status: 400 },
      ),
    );

    const client = mockClient();
    try {
      await client.events.ingest({
        eventType: "",
        payload: {},
      });
      expect.unreachable("Should have thrown");
    } catch (e: any) {
      expect(e.statusCode).toBe(400);
      expect(e.errorCode).toBe("bad_request");
      expect(e.body?.message).toBe("event_type is required.");
    }
  });
});
