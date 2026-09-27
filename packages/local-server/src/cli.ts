import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { listenLocal } from "./server.js";

const packageDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const defaultRepositoryRoot = path.resolve(packageDirectory, "..", "..");
const repositoryRoot = path.resolve(process.argv[2] ?? defaultRepositoryRoot);
const configuredPort = process.env.JOINTLY_LOCAL_PORT;
const port = configuredPort === undefined ? 4317 : Number.parseInt(configuredPort, 10);

if (!Number.isInteger(port) || port < 0 || port > 65_535) {
  throw new Error("JOINTLY_LOCAL_PORT must be an integer from 0 to 65535.");
}

const local = await listenLocal({ repositoryRoot, port });
process.stdout.write(`Jointly local dashboard: ${local.address}/?mode=local\n`);
process.stdout.write("The browser session token is kept in an HttpOnly same-origin cookie and is not printed.\n");

const close = async () => {
  await local.app.close();
  process.exitCode = 0;
};
process.once("SIGINT", close);
process.once("SIGTERM", close);
