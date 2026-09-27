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

  it("preserves the Bob IDE workflow through the MCP protocol and shared core", async () => {
    const fixture = await createFixture();
    const server = createJointlyServer(fixture.context);
    const client = new Client({ name: "bob-workflow-regression", version: "1.0.0" });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
    const json = (result: Awaited<ReturnType<typeof client.callTool>>) => {
      const text = result.content.find((entry) => entry.type === "text");
      if (!text || text.type !== "text") throw new Error("MCP tool did not return JSON text");
      return JSON.parse(text.text) as Record<string, any>;
    };

    const registration = json(await client.callTool({
      name: "register_run",
      arguments: { baseRef: fixture.input.baseRef, changes: fixture.input.changes },
    }));
    expect(registration.runId).toEqual(expect.any(String));
    expect(registration.changes).toHaveLength(2);

    const prepared = json(await client.callTool({ name: "prepare_workspaces", arguments: { runId: registration.runId } }));
    expect(prepared.workspaces.map((workspace: { name: string }) => workspace.name)).toEqual([
      "base", "change-a", "change-b", "combined",
    ]);
    expect(prepared.textualConflict).toBeNull();

    const diff = json(await client.callTool({ name: "read_change_diff", arguments: { runId: registration.runId, changeId: "a" } }));
    expect(diff.files).toEqual(["a.txt"]);
    const existing = json(await client.callTool({
      name: "run_existing_tests",
      arguments: { runId: registration.runId, workspace: "combined", evidenceLabel: "before-repair" },
    }));
    expect(existing).toMatchObject({ exitCode: 0, timedOut: false, testCounts: { total: 1, passed: 1, failed: 0 } });

    await client.close();
    await server.close();
  });
});
