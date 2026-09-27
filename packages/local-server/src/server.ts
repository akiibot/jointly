import { randomBytes, timingSafeEqual } from "node:crypto";
import { lstat, readFile, realpath } from "node:fs/promises";
import path from "node:path";
import Fastify, { type FastifyReply } from "fastify";
import { z } from "zod";
import { loadConfig, resolveRef, runDoctor } from "@jointly/core";
import { FakeReplayDriver, LOCAL_STAGES, LocalRunCoordinator, type StageDriver } from "./orchestrator.js";

function localAuthority(value: string | undefined): boolean {
  if (!value) return false;
  const host = (value.startsWith("[")
    ? value.slice(1, value.indexOf("]"))
    : value.split(":")[0]
  )?.toLowerCase();
  return host === "localhost" || host === "127.0.0.1" || host === "::1";
}

function sameAuthority(origin: string, host: string | undefined): boolean {
  if (!host) return false;
  try {
    const parsed = new URL(origin);
    return localAuthority(parsed.host) && parsed.host.toLowerCase() === host.toLowerCase();
  } catch {
    return false;
  }
}

function cookieValue(header: string | undefined, name: string): string | undefined {
  return header?.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${name}=`))?.slice(name.length + 1);
}

function tokensEqual(left: string | undefined, right: string): boolean {
  if (!left) return false;
  const leftBytes = Buffer.from(left);
  const rightBytes = Buffer.from(right);
  return leftBytes.length === rightBytes.length && timingSafeEqual(leftBytes, rightBytes);
}

export async function buildLocalServer(options: {
  repositoryRoot: string;
  sessionToken?: string;
  driver?: StageDriver;
  dashboardRoot?: string;
}) {
  const sessionToken = options.sessionToken ?? randomBytes(32).toString("hex");
  const coordinator = new LocalRunCoordinator(options.repositoryRoot, options.driver ?? new FakeReplayDriver());
  await coordinator.recover();
  const app = Fastify({ logger: false, bodyLimit: 64 * 1024 });

  app.addHook("onRequest", async (request, reply) => {
    try {
      const decodedPath = decodeURIComponent((request.raw.url ?? request.url).split("?", 1)[0] ?? "");
      if (decodedPath.split("/").some((segment) => segment === "." || segment === "..")) {
        return reply.code(404).send({ error: "path is not available" });
      }
    } catch {
      return reply.code(400).send({ error: "invalid request path" });
    }
    if (!localAuthority(request.headers.host)) return reply.code(403).send({ error: "non-loopback Host is forbidden" });
    const origin = request.headers.origin;
    if (origin && !sameAuthority(origin, request.headers.host)) {
      return reply.code(403).send({ error: "cross-site Origin is forbidden" });
    }
    const pathname = request.url.split("?", 1)[0];
    const publicPath = !pathname?.startsWith("/api/") || ["/api/capabilities", "/api/health", "/api/session"].includes(pathname);
    const headerToken = Array.isArray(request.headers["x-jointly-session"])
      ? request.headers["x-jointly-session"][0]
      : request.headers["x-jointly-session"];
    const cookieToken = cookieValue(request.headers.cookie, "jointly-local-session");
    if (!publicPath && !tokensEqual(headerToken, sessionToken) && !tokensEqual(cookieToken, sessionToken)) {
      return reply.code(403).send({ error: "invalid local session token" });
    }
  });

  app.get("/api/capabilities", async () => ({
    schemaVersion: "1",
    fakeReplay: true,
    realInference: false,
    generatedCodeExecution: false,
    isolationProfile: "unavailable",
    blockers: ["Bob Task B1 real watsonx transport", "credential-separated executor isolation"],
  }));
  app.get("/api/health", async () => ({ schemaVersion: "1", status: "ok", mode: "local" }));
  app.post("/api/session", async (request, reply) => {
    if (!request.headers.origin || !sameAuthority(request.headers.origin, request.headers.host)) {
      return reply.code(403).send({ error: "same-origin browser bootstrap is required" });
    }
    const fetchSite = request.headers["sec-fetch-site"];
    if (fetchSite && fetchSite !== "same-origin") return reply.code(403).send({ error: "cross-site session bootstrap is forbidden" });
    return reply
      .header("cache-control", "no-store")
      .header("x-content-type-options", "nosniff")
      .header("set-cookie", `jointly-local-session=${sessionToken}; HttpOnly; SameSite=Strict; Path=/api`)
      .send({ schemaVersion: "1", authenticated: true });
  });
  app.get("/api/preflight", async () => runDoctor(options.repositoryRoot));
  app.get("/api/refs", async () => {
    const config = await loadConfig(`${options.repositoryRoot}/jointly.yaml`);
    return {
      schemaVersion: "1",
      base: { ref: config.base.ref, commit: await resolveRef(options.repositoryRoot, config.base.ref) },
      changes: await Promise.all(config.changes.map(async (change) => ({
        id: change.id,
        ref: change.ref,
        commit: await resolveRef(options.repositoryRoot, change.ref),
        promptFile: change.promptFile,
      }))),
    };
  });
  app.post("/api/runs", async (request, reply) => {
    const body = z.object({ profile: z.literal("checkout-fixture"), mode: z.literal("fake-replay") }).strict().safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: "only the labeled checkout-fixture fake-replay profile is available" });
    try { return reply.code(202).send(await coordinator.create()); }
    catch (error) { return reply.code(409).send({ error: error instanceof Error ? error.message : String(error) }); }
  });
  app.get<{ Params: { runId: string } }>("/api/runs/:runId", async (request, reply) => {
    const state = coordinator.get(request.params.runId);
    return state ?? reply.code(404).send({ error: "run not found" });
  });
  app.get("/api/runs", async () => coordinator.list());
  app.get<{ Params: { runId: string }; Querystring: { after?: string } }>("/api/runs/:runId/events", async (request, reply) => {
    const lastEventId = request.headers["last-event-id"];
    const cursor = request.query.after ?? (Array.isArray(lastEventId) ? lastEventId[0] : lastEventId);
    const after = z.coerce.number().int().nonnegative().catch(0).parse(cursor ?? 0);
    try {
      const events = await coordinator.events(request.params.runId, after);
      const body = events.map((event) => `id: ${event.sequence}\nevent: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`).join("");
      return reply.type("text/event-stream; charset=utf-8")
        .header("cache-control", "no-store")
        .header("x-accel-buffering", "no")
        .header("x-content-type-options", "nosniff")
        .send(body);
    }
    catch { return reply.code(404).send({ error: "run not found" }); }
  });
  app.post<{ Params: { runId: string } }>("/api/runs/:runId/cancel", async (request, reply) => {
    try { return await coordinator.cancel(request.params.runId); }
    catch (error) { return reply.code(409).send({ error: error instanceof Error ? error.message : String(error) }); }
  });
  app.post<{ Params: { runId: string } }>("/api/runs/:runId/resume", async (request, reply) => {
    try { return reply.code(202).send(await coordinator.resume(request.params.runId)); }
    catch (error) { return reply.code(409).send({ error: error instanceof Error ? error.message : String(error) }); }
  });
  app.post<{ Params: { runId: string } }>("/api/runs/:runId/resolutions", async (request, reply) => {
    try { return await coordinator.recordResolution(request.params.runId, request.body); }
    catch (error) { return reply.code(400).send({ error: error instanceof Error ? error.message : String(error) }); }
  });
  app.get<{ Params: { runId: string } }>("/api/runs/:runId/passport", async (request, reply) => {
    try {
      const artifact = await coordinator.readArtifact(request.params.runId, "passport");
      return reply.type("application/json").send(artifact.content);
    } catch (error) {
      return reply.code(409).send({ error: error instanceof Error ? error.message : String(error) });
    }
  });
  app.get<{ Params: { runId: string; artifactId: string } }>("/api/runs/:runId/artifacts/:artifactId", async (request, reply) => {
    const artifactId = z.enum(LOCAL_STAGES).safeParse(request.params.artifactId);
    if (!artifactId.success) return reply.code(404).send({ error: "artifact is not registered" });
    try {
      const artifact = await coordinator.readArtifact(request.params.runId, artifactId.data);
      return reply.type("application/json").send(artifact.content);
    } catch (error) {
      return reply.code(404).send({ error: error instanceof Error ? error.message : String(error) });
    }
  });

  if (options.dashboardRoot) {
    const dashboardRoot = await realpath(options.dashboardRoot);
    const sendDashboardFile = async (relative: string, reply: FastifyReply) => {
      if (path.isAbsolute(relative) || relative.split(/[\\/]/).some((segment) => segment === "" || segment === "." || segment === "..")) {
        return reply.code(404).send({ error: "dashboard asset not found" });
      }
      const candidate = path.join(dashboardRoot, relative);
      try {
        const [resolved, details] = await Promise.all([realpath(candidate), lstat(candidate)]);
        if (details.isSymbolicLink() || path.relative(dashboardRoot, resolved).startsWith("..")) throw new Error("invalid dashboard path");
        const contentType = relative.endsWith(".html") ? "text/html; charset=utf-8"
          : relative.endsWith(".js") ? "text/javascript; charset=utf-8"
            : relative.endsWith(".css") ? "text/css; charset=utf-8"
              : "application/json; charset=utf-8";
        return reply.type(contentType).header("x-content-type-options", "nosniff").send(await readFile(resolved));
      } catch {
        return reply.code(404).send({ error: "dashboard asset not found" });
      }
    };
    app.get("/", async (_request, reply) => sendDashboardFile("index.html", reply));
    app.get("/index.html", async (_request, reply) => sendDashboardFile("index.html", reply));
    app.get("/passport.json", async (_request, reply) => sendDashboardFile("passport.json", reply));
    app.get<{ Params: { "*": string } }>("/assets/*", async (request, reply) => sendDashboardFile(path.join("assets", request.params["*"]), reply));
  }
  return { app, coordinator, sessionToken };
}

export async function listenLocal(options: { repositoryRoot: string; port?: number }) {
  const built = await buildLocalServer({ ...options, dashboardRoot: path.join(options.repositoryRoot, "packages", "dashboard", "dist") });
  const address = await built.app.listen({ host: "127.0.0.1", port: options.port ?? 0 });
  return { ...built, address };
}
