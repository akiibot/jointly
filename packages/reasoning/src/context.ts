import { sha256 } from "./contracts.js";

const SECRET = /\b(?:WATSONX|IBM_CLOUD|GITHUB|NPM|AWS|AZURE|GOOGLE)[A-Z0-9_]*(?:KEY|TOKEN|SECRET|PASSWORD)?\s*[:=]\s*[^\s]+/gi;

export interface ContextInput {
  id: string;
  label: string;
  content: string;
  classification: "prompt" | "source" | "diff" | "evidence" | "policy" | "oracle";
}

export function buildBoundedContext(inputs: ContextInput[], maxBytes: number) {
  const included = [];
  const omissions: Array<{ id: string; reason: string }> = [];
  let usedBytes = 0;
  for (const input of inputs) {
    if (input.classification === "oracle") {
      omissions.push({ id: input.id, reason: "oracle context is forbidden" });
      continue;
    }
    const content = input.content.replace(SECRET, "[REDACTED_SECRET]");
    const bytes = Buffer.byteLength(content);
    if (usedBytes + bytes > maxBytes) {
      omissions.push({ id: input.id, reason: "context byte budget exceeded" });
      continue;
    }
    usedBytes += bytes;
    included.push({
      id: input.id,
      label: input.label,
      content,
      classification: input.classification,
      digest: sha256(content),
    });
  }
  return {
    included,
    omissions,
    usedBytes,
    digest: sha256(JSON.stringify(included.map(({ id, digest }) => ({ id, digest })))),
  };
}
