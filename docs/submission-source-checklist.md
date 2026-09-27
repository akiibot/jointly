# Submission assets and source-linked final checks

**Public-source check:** 2026-09-27 (Asia/Dhaka)
**Rule:** an existing file is inventory, not proof that it is current, authentic for Revision 5, accepted by the platform, or suitable for publication.

## Source status

| Topic | Source | What is currently supportable | Remaining participant check |
| --- | --- | --- | --- |
| Event identity and timing | [Public IBM Bob 2.0 event page](https://lablab.ai/ai-hackathons/ibm-bob-2-hackathon) | The public response identifies the event as online, with a 48-hour build period on September 25–27, 2026. | Confirm the exact submission deadline and time zone while signed in. |
| Detailed event technology guidance | [IBM Bob 2.0 hackathon guide](https://lablab-ibm-bob-2-hackathon-guide.s3.us-cloud-object-storage.appdomain.cloud/index.html) | Earlier review recorded Bob IDE as mandatory and watsonx.ai as an allowed inference option. The guide URL could not be fetched by the current verification tool, so this is retained as previously inspected rather than freshly verified. | Open the guide in the participant browser and record any changed technology, evidence, or media requirement. |
| Bob API-key behavior | [Official IBM Bob API-key documentation](https://bob.ibm.com/docs/shell/account/api-keys) | Bob keys are scoped to a user/subscription; general and inference keys have different inference context requirements. This is Bob tooling information, not proof of watsonx project/model access. | Verify the actual Bob account/team used for B1/B2 and retain no key values in evidence. |
| Bob Shell setup | [Official Bob Shell installation/authentication](https://bob.ibm.com/docs/shell/getting-started/install-and-setup) | The current documentation uses `BOB_API_KEY` for Bob Shell automation. Bob Shell remains optional here and is not the website's watsonx transport. | Record installed Bob version and authenticated task IDs only if Shell is actually used. |
| watsonx access inputs | [IBM watsonx developer quick start](https://www.ibm.com/watsonx/developer/get-started/quick-start) | The public search response describes project/space ID, regional endpoint, IBM Cloud API key, and IAM bearer-token authentication. Direct fetch was blocked during this check. | B1 must verify the current official SDK/API, selected region/model, project or space, API version, IAM behavior, and account entitlement. |
| Submission fields and limits | Signed-in lablab submission form | The public event response did not expose exact video duration, working-demo minimum, accepted format, narration, statement limits, slide/cover fields, repository visibility, or receipt status. Existing values in older notes are unverified. | Transcribe each final field/limit from the signed-in form; the live platform controls if it conflicts with repository notes. |

## Repository asset inventory

| Asset | Current repository state | Completion rule |
| --- | --- | --- |
| Historical Bob screenshots | 31 PNG files are present under `bob_sessions/`, plus its README. | Review readability, secrets, provenance, and relevance. Do not relabel them as B1/B2 evidence. |
| Revision 5 Bob B1 evidence | Not present or claimed. | Complete B1 in Bob IDE and record the authentic task/session ID, starting commit, resulting diff/commit, tests, and limitations. |
| Revision 5 Bob B2 evidence | Not present or claimed. | Perform only after both supported workflows share the deterministic path; retain findings, fixes, and tests. |
| Three rehearsals | Table exists in `docs/rehearsal-checklist.md`; entries remain pending. | Execute and record each applicable lane from a clean/disposable setup. |
| Backup run archive | No current Revision 5 archive is inventoried here. | Archive the chosen real run, hash it, inspect it for secrets, and store it in two authorized locations. |
| Demo video | No project demo video was found in the repository inventory. | Record genuine working footage after final platform media rules are confirmed; keep the original outside Git unless requested. |
| Slides and cover | No PPTX/PDF/cover asset was found in the repository inventory. | Create only after the final story, architecture, and platform dimensions are confirmed. |
| Public repository | Repository URL is documented, but current visibility and final submitted revision were not changed or verified by this pass. | Verify visibility, license, final commit, clean secrets scan, and platform linkage. |
| Demo deployment | A historical Vercel URL is documented but current health/build identity is not claimed. | Verify the final deployment, HTTPS, auth boundaries, provider access, and exact build before recording/submission. |
| Integration PR | None created or claimed by this pass. | Publish once only after exact-candidate approval, current access/ref revalidation, and all verification gates. |
| Submission receipt | Not present. | Save the final submitted status/receipt and timestamp after every field is reviewed. |

## Final signed-in platform transcription

Record these values without guessing:

- submission deadline, time zone, and edit window;
- video maximum and minimum working-solution footage;
- accepted video format, hosting, narration, and accessibility requirements;
- problem, solution, Bob-usage, and other statement limits;
- slide-deck and cover-image dimensions/file limits;
- repository visibility, license, application URL, and demo URL fields;
- category, technology, team, and participant fields;
- required Bob task-session screenshots or identifiers;
- final validation errors, submission status, receipt ID, and timestamp.

If any live value differs from a historical plan, add the discrepancy and date here. Do not silently edit old evidence to make it appear contemporaneous.
