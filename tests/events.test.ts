import { describe, it, expect, vi, beforeEach } from "vitest";
import { InvoanceClient } from "../src/index.js";

const BASE = "http://localhost:8080/v1";

function mockClient() {
  return new InvoanceClient({ apiKey: "inv_test_key", baseUrl: BASE });
}

describe("EventsResource", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("ingest sends correct body and parses response", async () => {
    const mockResp = {
      event_id: "aaaa-bbbb-cccc",
      ingested_at: "2026-03-14T00:00:00Z",
    };

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(mockResp), { status: 201 }),
    );

    const client = mockClient();
    const result = await client.events.ingest({
      eventType: "user.login",
      payload: { user_id: "u_1" },
    });

    expect(result.event_id).toBe("aaaa-bbbb-cccc");

    const call = vi.mocked(fetch).mock.calls[0];
    expect(call[0]).toBe(`${BASE}/v1/events`);
    expect(call[1]?.method).toBe("POST");

    const body = JSON.parse(call[1]?.body as string);
    expect(body.event_type).toBe("user.login");
    expect(body.payload.user_id).toBe("u_1");
  });

  it("list sends query params", async () => {
    const mockResp = {
      events: [],
      page: 2,
      limit: 10,
      total: 0,
      has_more: false,
    };

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(mockResp), { status: 200 }),
    );

    const client = mockClient();
    const result = await client.events.list({ page: 2, limit: 10 });

    expect(result.page).toBe(2);

    const url = vi.mocked(fetch).mock.calls[0][0] as string;
    expect(url).toContain("page=2");
    expect(url).toContain("limit=10");
  });

  it("verify passes payload_hash", async () => {
    const hash = "a".repeat(64);
    const mockResp = {
      event_id: "e1",
      match_result: true,
      matched_field: "payload_hash",
      anchored_hash: hash,
      submitted_hash: hash,
      anchored_at: "2026-03-14T00:00:00Z",
      method: "hash",
    };

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(mockResp), { status: 200 }),
    );

    const client = mockClient();
    const result = await client.events.verify("e1", {
      payloadHash: hash,
    });

    expect(result.match_result).toBe(true);
    expect(result.matched_field).toBe("payload_hash");
  });
});
