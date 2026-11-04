# Cursor implementation brief — automated Statistico module-video workflow

## Goal

Implement a working local production → review → revision → re-render workflow around the existing Statistico video project. Pilot with Independent Means. Avi should start one command or Windows launcher and receive a versioned review MP4, an understandable QA report, and a clear completion/blocker status. Eliminate routine copying of review instructions between applications.

This file is an implementation specification, not an installed controller. Build it, verify the handoffs, and report the actual launch instructions. Preserve Avi's final viewing and CapCut export/approval. Do not publish or replace website assets.

## 1. Inspect the current project first

- Locate the real video/media root, package scripts, recording harness, assembly, scene definitions, narration generator/provider, fixture data, shared opening/ending, existing checks and output conventions.
- Earlier project descriptions mention `_demo_video`, `studio.mjs`, `film.mjs`, `chapters/`, and `npm run film`. These are discovery leads; verify their current paths and interfaces before editing. Reuse the working pipeline rather than rebuilding it.
- Locate `Independent_Means_Video_Cursor_Brief_r001.md` and the later `Independent_Means_Cursor_Revision_r002.md`. The later revision governs conflicting directions. Use the latest actual files available in the project; never assume r002 has already been implemented.
- Identify the actual OS, Node version, FFmpeg/ffprobe, browser recorder dependencies, Cursor CLI executable/version/authentication and OpenAI API access. Support Avi's Windows workflow; do not assume WSL is required. Consult current official CLI documentation and installed `--help` before selecting flags.
- Work in a separate branch/worktree or equivalent isolated working copy. Preserve existing uncommitted work. Do not reset or overwrite approved media.

First identify the source/render commands, pilot inputs and dependencies, then implement. Do not stop after writing a plan. If a credential or local dependency is missing, complete the controller and offline verification before reporting the exact remaining setup step.

## 2. Minimal architecture

Use a small Node controller if that fits the inspected project. Adapt names to existing conventions; the names below are proposed public interfaces, not claims about existing files.

| Component | Responsibility |
| --- | --- |
| Controller | Runs stages sequentially, persists state, limits rounds and resumes safely. |
| Producer adapter | Calls the existing recorder, narrator and assembler with the selected module/configuration. |
| Evidence packager | Extracts timestamped images, actual audio/transcript, scene manifest and technical checks. |
| Reviewer adapter | Sends evidence and standards to a configured OpenAI model with image-input support. |
| Revision adapter | Invokes the installed Cursor CLI non-interactively against the isolated video working copy. |
| Report generator | Writes a readable report and opens the local result folder/player at completion. |

Prefer existing dependencies. No dashboard, cloud hosting, queue service, scheduled task or browser-click automation of the ChatGPT/Cursor interfaces is needed.

## 3. User entry points

Implement package commands equivalent to:

```bash
npm run video:doctor
npm run video:auto -- --module independent-means --dry-run
npm run video:auto -- --module independent-means
```

- `video:doctor`: checks dependencies, input files, output permissions, CLI availability and required configuration without spending API credits. Credential presence is not proof of valid authentication; label untested access accurately.
- `--dry-run`: shows commands, paths, writable scope, budgets and planned stages; does not render, call paid APIs or modify production files.
- The normal command executes the cycle below. Provide `--resume <run-id>` or an equivalent documented resume command.
- Add a Windows `Start_Independent_Means_Auto.cmd` launcher, or equivalent matching the environment, that uses the correct working directory, displays progress, and retains errors on screen. Avi should not need to edit source code to launch a module.
- Console messages should be plain: Checking setup; Recording; Assembling; Reviewing; Applying revision 1 of 2; Checking revised film; Ready for your review; or Stopped: [specific reason].

## 4. Inputs and source of truth

Each module needs a small configuration containing its ID, current brief/revision files, fixture identity, scene source, production command, numerical-validation command, narrator settings, expected frame size/rate and output directory. Follow the established project conventions.

Create one reusable video-review standards document with these requirements:

- Preserve Statistico's existing navy/cyan visual family, logo, typography, restrained camera movement and shared components.
- Show the control, perform the real action, wait for current results/charts, then hold the result for approximately 2–3 seconds where appropriate. Avoid blank/loading footage, stale results and cropped labels.
- Demonstrate real interactivity and its analytical consequence. Do not animate invented statistical values or fabricate working features.
- Keep narration explanatory, align it with the action, and preserve enough time to read the result.
- Keep narration stems voice-only and scene-sized. Preserve intentional silence and separate optional music from narration.
- For this pilot, retain the two silent capabilities cards, 25 and 19 seconds, and the established closing unless the current r002 file says otherwise. A silence detector must not flag these cards as failed speech.
- Advertise only verified working module capabilities. Audit the cards against current functionality.
- Keep 1728×1080, 30 fps, H.264, fast-start for the Independent Means pilot, subject to the current source brief. Do not impose 1920×1080 or a different aspect ratio globally.
- Preserve the approximate −16 to −17 LUFS narration target and true peak ≤ −1 dBTP; assess intentional silence separately. Do not blindly boost audio that already meets the established requirements.
- Keep final human viewing and CapCut approval explicit. Automated readiness is not publication approval.

Persist brief/configuration/standards hashes and the source revision with each run. The reviewer receives these files every time; it has no automatic access to Avi's conversation history.

## 5. Automatic cycle and stop rules

1. Validate setup, configuration, input references and allowed writable paths. Prevent concurrent runs against the same working copy.
2. Run the module's numerical/fixture checks before production. On failure, report the discrepancy and stop the normal video loop. Do not conceal it with an overlay or adjust reference expectations to obtain a pass.
3. Produce V1 using the existing pipeline, or explicitly import a selected existing candidate. Imported evidence must identify that candidate and must not silently stand in for a newly rendered file.
4. Verify the complete output decodes, check technical properties and package evidence from that exact MP4.
5. Obtain a structured review. Save its original response, validated JSON and readable change list.
6. If no required changes remain and technical/numerical checks pass, mark `READY_FOR_HUMAN_REVIEW`. Always list unassessed criteria.
7. Otherwise give Cursor the required actionable changes and the permitted paths. Apply them, inspect the actual diff, rerun affected checks and render a fresh candidate.
8. Package fresh evidence and review the revised candidate. Explicitly check that previous issue IDs were resolved and that accepted scenes did not regress.
9. Stop after at most two revision rounds: at most three complete candidate reviews. If required issues remain, mark `NEEDS_HUMAN_REVIEW`; do not call the film final or enter an unlimited loop.

Persist states for setup, validation, production, packaging, review, revision, verification, ready, blocked and failed. A timeout, malformed review, refused request, exhausted limit or crashed child process cannot count as success. Kill abandoned children, release the run lock and preserve useful artifacts.

## 6. Evidence and reviewer contract

Review rendered output as well as scripts. A narration script alone cannot establish what was actually recorded.

Evidence must include:

- Exact MP4 path, file hash, dimensions, frame rate, runtime and source/run identity.
- Actual scene boundaries and labels; interaction timestamps and renderer readiness logs where available.
- Timestamped overview frames sampled across the full film, with denser sequences around interactions, transitions and previously flagged windows. Use a configurable bounded sample budget, such as 160 overview frames plus 80 detail frames. Record every sampled timestamp and disclose unsampled intervals; sampling is not complete motion review.
- Full-resolution detail crops for dense results and end-card text, with original frame coordinates and timestamps. Avoid evaluating legibility from small contact sheets alone.
- Audio extracted from the actual MP4, its automated transcript, the intended script and scene-sized narration timing. Align actual speech with the timeline using an available supported timestamp/alignment method. Do not claim supplied script timings are measured word timings.
- Measurements for loudness, peak, clipping, unexpected silence and basic decode errors. Compare intentional silent intervals against the scene manifest.
- Numerical reference/check results and a verified capability inventory. A vision model is not the numerical oracle.

Use the current OpenAI SDK/API and official documentation. Select a configurable available model supporting the required image inputs and structured schema. Process images in bounded chronological batches if necessary, preserving timestamps, then consolidate findings. Configure transcription separately as required. Do not assume an arbitrary MP4 upload is supported by the chosen image API.

Require schema-validated output with:

- `verdict`: `ready_for_human_review`, `needs_revision`, or `blocked`.
- `issues`: stable ID; severity (`required` or `advisory`); category; scene; start/end seconds; evidence filenames/timestamps; observed problem; requested change; observable acceptance check; permitted edit category; confidence.
- `resolved_issue_ids`, `unassessed_checks`, and a concise summary.

Check that referenced evidence exists and timestamps fall inside the candidate duration. An empty/missing/invalid response is a failed review. Make advisory style preferences informational; do not endlessly revise accepted scenes for subjective novelty.

Tell the reviewer explicitly: report uncertainty, never invent a missing observation, distinguish measured checks from visual judgments, and disclose that a transcript does not prove voice naturalness, pronunciation, absence of music/noise or pleasant transitions. Require a final human listening/motion pass for these gaps unless a suitable additional evaluation has actually been implemented and documented.

## 7. Permitted revisions and numerical protection

The unattended revision agent may edit only approved video scene definitions, camera/highlight/timing settings, video captions, narration text, film-specific layouts and render configuration within a tightly defined scope. Keep shared components read-only by default; allow a necessary shared change only through a separately reviewed implementation change.

Run the agent in an isolated working copy with only necessary credentials/tools. Enforce filesystem access using available OS/container isolation for the child process, and validate its diff before accepting changes. A prompt or post-run diff check alone is not a write sandbox. If enforceable isolation is unavailable, implement manual application of the generated revision and clearly report that fully unattended edits are blocked; complete the rest of the pipeline.

Never give the revision agent OpenAI secrets unnecessarily. Do not allow publication, deployment, access to approved CapCut exports, or changes to statistical engines, raw fixture data, reference tests or acceptance thresholds. Stop and report if correcting a video requires an analytical computation change.

Independent Means r002 already identifies numerical corrections. Implement any still-outstanding authorized r002 fixes as a separate inspected change with independent checks before using the automatic video loop; do not let the reviewer invent patches to the statistical model. Specifically verify:

- The saved seed-110401 fixture has 30 observations per group, means approximately 65/71 and sample SD approximately 10.
- Two-sided Welch p approximately .02366221481, df approximately 58; A−B approximately −6; 95% CI approximately [−11.16841240, −.8315877291]. Follow the declared orientation consistently.
- Unequal-n/variance reference cases prevent a pooled calculation from passing as Welch.
- Changing alpha .05 to .01 widens the CI and changes the decision threshold without changing the estimate or same-method p-value.
- Ordinary observed eta-squared, if that is the displayed definition, is approximately .0851735016 for this fixture, distinct from assumed planning eta-squared.
- Validate the real noncentral-F planning model and explicit balanced allocations: assumed eta-squared .083 → 90 total / 45 per group; .038 → 202 total / 101 per group at target power .80. Do not confuse these with the older noncentral-t storyboard or describe the planner as exact Welch power.
- Preserve the declared Mann–Whitney method/continuity policy. For the stated no-continuity asymptotic policy, U=309 and p approximately .03710526255.

Use the full r002 file for tolerances, exact definitions, remaining checks and presentation requirements. These summary values do not replace its numerical validation contract. If the saved fixture differs, resolve the discrepancy rather than reconstructing convenient data.

## 8. Credentials, resource limits and recovery

- Read the OpenAI credential from `OPENAI_API_KEY` in Avi's local environment or existing secret mechanism. Supply a blank example configuration and exact local setup instructions. Never ask Avi to paste the key into this conversation, commit it, log it or embed it in media/browser code.
- Use the installed Cursor CLI's supported authentication. Verify which executable/flags exist locally; do not assume its GUI conversation can be controlled or resumed as this workflow.
- Keep narrator/provider credentials separate. Reuse existing voice stems when text and voice settings are unchanged. If the chosen external voice-conversion service lacks a configured supported API, report that manual stage honestly; do not silently change voices or automate its website by clicking.
- Make models, sample caps, revision rounds, timeouts, API request/token ceilings and per-run estimated spending ceiling configurable. Require explicit finite limits before paid runs; a dry-run/offline demo must remain available without credentials.
- Log actual provider usage where returned. If estimating money, use configurable verified rates and label estimates; do not promise an exact charge or hard monetary cap from a rough local estimate. Include narration/transcription/reviewer usage and identify Cursor usage separately where observable.
- Use bounded retries for transient errors. Authentication/billing/configuration failures stop with an actionable message. Do not repeat a whole paid review unnecessarily.
- Cache outputs only when source/configuration/input hashes match. Resume failed runs from the first invalid/incomplete stage. Never reuse an old transcript or review after the MP4 changes.

## 9. Versioning and deliverables

Respect established `01_source`, `02_script`, `03_audio`, `04_review`, `05_capcut`, `06_approved` folders or their existing equivalent. Add run-specific review folders without renaming or disrupting the media tree.

Each run must preserve all candidates and contain the input/config snapshot, scene manifest, actual evidence, technical/numerical QA, structured reviews, revision instructions, source diffs/checkpoints, stage/usage logs and a short final report. Keep voice-only stems and timing metadata available for CapCut. Do not create anything in the approved folder automatically.

The report states which candidate is recommended, what changed, required unresolved issues, unassessed checks, actual validation performed and what Avi should view/listen to before approval. A previous passing candidate remains available if a later revision regresses.

## 10. Acceptance and actual delivery

Use focused controller integration checks with fake external adapters, then one real pilot when credentials and limits permit. Do not build a large unrelated testing framework.

1. Without credentials, doctor and dry-run work and the offline end-to-end handoff demo passes; normal execution stops truthfully with setup instructions.
2. Given a review requiring a longer hold in one scene, the revision adapter receives that exact issue, generates a permitted source change, and the controller re-renders and obtains fresh evidence. Verify the diff and final scene timing, not merely that an agent printed “done.”
3. An unexpected blank result, clipped label or narration mismatch in a controlled fixture is either detected with evidence or explicitly reported as a known detection limit; never manufacture a guaranteed reviewer pass.
4. A protected-file change is prevented by isolation; a prohibited diff is rejected. Statistical reference failures block the run.
5. Intentional silent cards pass; an API failure/malformed schema remains failed; unresolved issues stop after two revision rounds; cancelling/resuming preserves versions and avoids duplicate stages.
6. Approved outputs remain untouched. The ordinary pre-existing video command still works.
7. Run the real Independent Means pilot if the required local access is ready. If it is blocked, deliver the complete implementation and offline checks, with the precise unresolved local step. Label simulated results clearly.

In the completion response give Avi: changed files; exact one-time credential/login/dependency steps still required; the actual launcher path and command; actual test results; the produced MP4/report paths; and any remaining automation gaps. Do not merely return a proposed architecture.

## Official implementation references

Checked 4 November 2026; recheck current docs and local CLI flags when implementing:

- Cursor installation: https://cursor.com/docs/cli/installation
- Cursor non-interactive editing: https://cursor.com/docs/cli/headless
- OpenAI image inputs: https://developers.openai.com/api/docs/guides/images-vision
- OpenAI transcription: https://developers.openai.com/api/docs/guides/speech-to-text
- OpenAI structured outputs: https://developers.openai.com/api/docs/guides/structured-outputs

The Node commands and launcher names above are interfaces to implement. They will not work until Cursor adds them to the project.
