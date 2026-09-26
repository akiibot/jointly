import { section } from "./shared";

const steps = [
  {
    number: "01",
    actor: "IBM Bob",
    title: "Capture intent",
    copy: "Turn each independent prompt into observable requirements, entities, side effects, and invariants.",
    signal: "Intent contracts",
  },
  {
    number: "02",
    actor: "Jointly",
    title: "Isolate and test",
    copy: "Freeze the refs, create four Git workspaces, and prove that both changes pass independently and together.",
    signal: "4 workspaces",
  },
  {
    number: "03",
    actor: "Bob + Jointly",
    title: "Expose the collision",
    copy: "Rank shared-risk hypotheses, generate one focused interaction test, and preserve the failing evidence.",
    signal: "Executable proof",
  },
  {
    number: "04",
    actor: "Verified loop",
    title: "Repair and prove",
    copy: "Patch only the combined workspace, rerun every test, check stability, and issue a gated merge passport.",
    signal: "Safe verdict",
  },
] as const;

export function howItWorks(): string {
  const cards = steps.map((step) => `<article class="workflow-step">
    <div class="workflow-meta"><span>${step.number}</span><small>${step.actor}</small></div>
    <div class="workflow-icon" aria-hidden="true">${step.number === "01" ? "◎" : step.number === "02" ? "◇" : step.number === "03" ? "⚡" : "✓"}</div>
    <h3>${step.title}</h3>
    <p>${step.copy}</p>
    <strong>${step.signal}<span aria-hidden="true"> →</span></strong>
  </article>`).join("");

  return section(
    "how-it-works",
    "The workflow",
    "From two prompts to one defensible decision.",
    `<p class="workflow-intro">Bob supplies the reasoning. Jointly supplies the isolation, execution, and evidence trail. Neither can declare a merge safe alone.</p>
    <div class="workflow-grid">${cards}</div>
    <div class="workflow-contract"><span>Prompts</span><i>→</i><span>Requirements</span><i>→</i><span>Interaction test</span><i>→</i><span>Verified repair</span><i>→</i><span>Passport</span></div>`,
  );
}
