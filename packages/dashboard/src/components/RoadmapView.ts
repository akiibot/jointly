export function roadmapView(): string {
  return `<section class="screen roadmap-screen" id="roadmap">
    <div class="section-heading"><p class="kicker">Roadmap</p><h2>Keep the proof. Expand the reach.</h2></div>
    <p class="roadmap-intro">Jointly grows by extending the same verification core—not by replacing evidence with model confidence. Current capabilities and future work stay visibly separate.</p>
    <div class="roadmap-grid">
      <article class="roadmap-card current">
        <div class="roadmap-label"><span>01</span><strong>Working now</strong></div>
        <h3>Bob + MCP investigation</h3>
        <p>Two-change analysis, generated interaction tests, isolated repair verification, and an evidence passport for an approved synthetic repository.</p>
        <ul><li>Trusted local workflow</li><li>Deterministic verification core</li><li>Inspectable evidence dashboard</li></ul>
      </article>
      <article class="roadmap-card next">
        <div class="roadmap-label"><span>02</span><strong>Next milestone</strong></div>
        <h3>Authorized hosted workflow</h3>
        <p>Connect live watsonx reasoning and GitHub selection to the same verification services, with credential-separated execution and explicit publication approval.</p>
        <ul><li>Canary-tested isolation</li><li>Per-user authorization</li><li>Review before one integration PR</li></ul>
      </article>
      <article class="roadmap-card later">
        <div class="roadmap-label"><span>03</span><strong>Later expansion</strong></div>
        <h3>Organization-scale evidence</h3>
        <p>Extend interaction analysis across additional languages, frameworks, repositories, and multi-change graphs while retaining auditable proof.</p>
        <ul><li>Repository adapters</li><li>Policy and audit retention</li><li>Measured collision precision</li></ul>
      </article>
    </div>
    <div class="roadmap-rule"><strong>Non-negotiable</strong><span>No automatic merge. No generated-code claim without execution. No hosted release without isolation and authorization.</span></div>
  </section>`;
}
