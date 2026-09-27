/**
 * Reasoning context — per-run state threaded through the engine.
 *
 * The context is an immutable value object: create a new one per run, or
 * derive a modified copy via `withSignal` / `withDeadline`.  No mutable
 * global state is kept here.
 */

import type { ProviderConfig } from "./contracts.js";

/**
 * Per-run reasoning context.
 */
export interface ReasoningContext {
  /** Resolved provider configuration. Never log the apiKey field. */
  readonly providerConfig: ProviderConfig;

  /**
   * Optional AbortSignal for the entire reasoning run.
   * The engine checks this before every stage attempt.
   */
  readonly signal?: AbortSignal;

  /**
   * Optional wall-clock deadline (epoch ms) for the entire run.
   * Used to compute per-request `deadlineMs` values.
   */
  readonly runDeadlineEpochMs?: number;

  /**
   * Run identifier for diagnostic tracing.
   * Never contains credentials.
   */
  readonly runId?: string;
}

/**
 * Derive a new context with a different AbortSignal.
 */
export function withSignal(
  ctx: ReasoningContext,
  signal: AbortSignal,
): ReasoningContext {
  return { ...ctx, signal };
}

/**
 * Derive a new context with a deadline set `durationMs` from now.
 */
export function withDeadline(
  ctx: ReasoningContext,
  durationMs: number,
): ReasoningContext {
  return { ...ctx, runDeadlineEpochMs: Date.now() + durationMs };
}

/**
 * Compute the deadline for a single request given the run context.
 *
 * If the run context has a deadline, return the remaining ms.
 * Otherwise return `undefined` (no deadline imposed by context).
 * Callers may additionally cap with a per-request maximum.
 */
export function remainingDeadlineMs(ctx: ReasoningContext): number | undefined {
  if (ctx.runDeadlineEpochMs === undefined) return undefined;
  const remaining = ctx.runDeadlineEpochMs - Date.now();
  // If already past, return 0 — the transport will reject immediately
  return Math.max(0, remaining);
}
