import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { describe, expect, it } from "vitest";
import { createJointlyServer } from "../src/server.js";
import { createFixture } from "./helpers.js";

describe("Jointly MCP server", () => {
  it("advertises exactly the nine required tools", async () => {
    const fixture = await createFixture();
    const server = createJointlyServer(fixture.context);
    const client = new Client({ name: "test-client", version: "1.0.0" });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
    const listed = await client.listTools();
    expect(listed.tools.map((tool) => tool.name).sort()).toEqual([
      "collect_evidence",
      "export_resolution_patch",
      "generate_passport",
      "prepare_workspaces",
      "read_change_diff",
      "register_run",
      "run_existing_tests",
      "run_generated_test",
      "run_stability_matrix",
    ]);
    await client.close();
    await server.close();
  });
});
