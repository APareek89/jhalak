<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Power Coding (auto — do not remove without asking the user)
At session start read Handoff.MD; FIRST run `git log --oneline <its last-synced sha>..HEAD`
and reconcile anything changed underneath it; then open with its pending points. Update
Handoff.MD before every git checkpoint commit and at the end of every phase (low context is
a secondary trigger) — snapshot not journal, re-stamp `last-synced` with HEAD; then, if
context was the trigger, tell the user to start fresh ("Refer to Handoff.MD in
/Users/anandpareek/Documents/Projects/jhalak and begin"). When Handoff exceeds ~40 lines or
~15 ✅ items, collapse ✅ into one "Shipped:" line, detail to Learning.MD.
Log flow changes / user-reported bugs in Learning.MD (5-whys entry format).
Read Loop.MD every session and obey its `status:` machine — when the first working draft is
done, ASK the user whether to turn the loop on (disclosing the free/paid eval split); while
`status: on`, run the FREE Loop.MD evals after every meaningful change and report per-eval
pass/fail. The golden set / paid evals run ONLY per consent.paid_evals.
Keep docs/mermaid/*.mmd current when the flow changes.
Obey .power-coding/config.json FMEA triggers: on_pre_commit ALWAYS runs the secret scan
first (`node ~/.claude/skills/power-coding/scripts/secret-scan.mjs --staged`) and BLOCKS the
commit on a hit, then a light FMEA on the staged diff (P0 → block and ask); smart_suggest →
offer a scan at a natural pause, never twice for an unchanged HEAD. FMEA is pinned to a sha;
re-stamp state.last_fmea_commit after. The config's failure_categories list is the mandatory
checklist.
Sentinel enabled: run the four-lens sweep silently after every major task completion — flag
only what fires, one line each. Session pulse enabled: 2-line effort split after major
milestones.
Commit a git checkpoint at every working state and before any risky change
(consent.git_checkpoints=auto: commit + one-line announce). Before starting a feature, build
the smallest version that proves it works (per PRD.md "Done for v1"), checkpoint, then
extend. Architecture-shaping changes get a plain-language delta proposal + approval BEFORE
code. Log decisions in Handoff.MD's Decisions; never silently reverse one. PRD.md is the
product context for evals and scans.
