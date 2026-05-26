# CTap Live Redeploy and Audit Report

**Author:** Manus AI  
**Date:** May 26, 2026  
**Target:** [https://ctappizza.manus.space](https://ctappizza.manus.space)  
**Repository:** `mykemueller1-ctrl/Never-86d`  
**Requested outcome:** Redeploy merged `main`, then audit the live platform honestly.

## Executive Summary

The short version is blunt: **I cannot honestly claim the redeploy succeeded**. I cloned and built the merged `main` branch locally, found and corrected a local build blocker related to a duplicate `scheduledJobRuns` schema export, and ran the database push step. However, I did **not** find a repository deployment script, Dockerfile, GitHub Actions workflow, or documented Manus hosting redeploy command, and I did **not** obtain a verifiable redeployment handoff to `ctappizza.manus.space`. The live site is up and serving an existing CTap app, but based on the evidence available before you asked me to stop investigating, I must classify the redeploy as **not verified / likely not completed through a formal deployment pipeline**.

The live site itself is not dead. It loads, a staff session was already present in the browser, and the main dashboard and command center show operational data. However, there are serious problems: the app appears to depend heavily on client-side internal screen state rather than real URLs, several management features are only reachable through in-app navigation, the Management Briefing route I tried directly returns a 404, and the repo/source evidence still shows stale May 5 brain/briefing status. The scheduled job code exists for the five requested jobs, but I did not verify that the jobs are actually configured in production scheduling. That means the feature may exist in code without actually running every day.

> **Bottom line:** The platform is partially alive and usable, but it is not in a state I would call cleanly redeployed, production-verified, or operationally trustworthy yet.

## Deployment Status

| Area | Finding | Status | Honest assessment |
|---|---:|---:|---|
| Repository access | The `Never-86d` repository was present locally on `main`, with `origin/main` at merge commit `14c7cd6`, indicating the merged PR code was available in the sandbox. | **Working locally** | The codebase inspected is the intended merged branch. |
| Stack match | The actual repo is not a classic Next.js/PostgreSQL stack. `package.json` builds with `vite build` and `esbuild`; schema imports use `drizzle-orm/mysql-core`; dependencies include `mysql2`. | **Mismatch** | The requested stack description says Next.js/PostgreSQL, but the repo looks like Vite/React + Express/tRPC + Drizzle MySQL-compatible DB. This matters for deployment assumptions. |
| Dependency install | Dependencies were installed with `pnpm`. | **Working locally** | Local install completed enough to build. |
| Build | The first build hit a duplicate schema export for `scheduledJobRuns`; I removed the redundant older duplicate locally and rebuilt. | **Working after local fix** | This is a red flag: if the same duplicate existed in production source before the local edit, a clean deploy would fail unless the repo’s final main already has the corrected schema or my local patch is pushed/deployed. |
| Database migration/push | `pnpm run db:push` was run after the local build fix. | **Attempted** | I do not have enough final command output in the current context to claim production DB migration success with certainty. |
| Deployment config | I found no Dockerfile, no `.github/workflows`, and no obvious deploy script or Manus redeploy command in the repo. | **Broken / missing** | There is no clean, repeatable deployment path documented in the codebase. |
| Actual redeploy to `ctappizza.manus.space` | Not verifiably completed. | **Not verified** | The live site is reachable, but I cannot honestly say it is running the newly built local artifact. |

## Live Site Checks Performed

I opened [https://ctappizza.manus.space](https://ctappizza.manus.space) in the browser. The app loaded into an existing staff session for **Mychael**, showing a live-looking staff dashboard rather than a fresh login page. I then navigated into the Command Center and attempted to access Management Briefing directly by URL.

| Test area | What I observed live | Status | Notes |
|---|---|---:|---|
| Site availability | The home screen loads successfully with CTap branding and dashboard content. | **Working** | This is not a blank or crashed deployment. |
| Login/PIN | I did **not** complete a clean fresh PIN-login test because the browser already had a staff session and you asked me to stop further investigation. | **Not fully tested** | I cannot honestly certify PIN login from a logged-out state. I can say session persistence worked in the browser. |
| Staff dashboard | Dashboard shows Mychael, clocked-in status, 86’d items, checklist progress, schedule link, Command Center link, tools, leaderboard, and open issues. | **Working, with issues** | Data is showing, but the score display showed `-155`, which looks bad and may indicate real negative gamification points or bad scoring logic. |
| Dashboard data | Live cards showed `Yesterday's Sales`, `Order Guide`, `Schedule`, `Pay Outs`, `Give a Shoutout`, and `86'd Alerts`. | **Working** | The home UI is populated. |
| 86’d items | The live dashboard showed **Brisket (still out)** and **Crab Rangoon (86'd at 9pm last night)**. | **Working** | Operationally useful, assuming the data is current. |
| Checklists | The live dashboard showed `Your Checklists 0/175`. | **Working but ugly** | 175 tasks for a user-facing checklist looks overwhelming and possibly unfiltered. |
| Open issues | The dashboard showed **3 open issues**, including “Walk-in cooler making loud grinding noise.” | **Working** | Issue data is visible. |
| Command Center | Command Center opened and showed owner intelligence cards. | **Working** | Sales, payouts, voids, active staff, vendor spend, and open issue tiles rendered. |
| Command Center data | It showed **Yesterday Sales $4,769.92 / 130 orders**, **Pay Outs $75**, **Voids 0**, **Active Staff 20**, **Vendor Spend $1,358**, and **Open Issues 3**. | **Working** | These are the strongest signs the backend/data layer is alive. |
| Management Briefing direct URL | `https://ctappizza.manus.space/management-briefing` returned a **404 Page Not Found**. | **Broken / UX broken** | The app uses one root route and internal screen state. Direct URLs for features do not work. |
| Management Briefing freshness | The repo has `BRAIN_STATUS.md` showing **Last updated: Tue May 5 00:11:17 EDT 2026**. | **Likely stale** | I did not reach the in-app Management Briefing screen live before stopping, but the source/status evidence still points to May 5 staleness. |
| Recipe & Food Cost / Seed All Costs | Source code contains a visible **Seed All Costs** button in `RecipeCostScreen.tsx`. | **Present in source, not verified live** | I did not get to the live recipe screen before stopping. The source code has the button; the live deployment may or may not include it if redeploy did not occur. |
| Vendor / invoice pages | Command Center has **Invoices** and **Vendors** buttons visible. | **Partially verified** | I verified entry points exist, not full page behavior. |
| Sales intelligence | Command Center shows sales stats; source code contains a substantial `SalesIntelligenceScreen`. | **Partially verified** | I did not complete deep live tab testing. Basic sales summary is visible. |
| Staff management | Live UI showed active staff and Wi-Fi proximity list in Command Center; source includes worker profile/schedule/staff modules. | **Partially working** | I did not complete staff management workflows. |
| API endpoints | I did not complete direct endpoint testing before the stop request. | **Not tested** | The browser UI proves some tRPC endpoints are responding, but endpoint-by-endpoint API status was not certified. |

## What Is Working

The **public production URL is alive** and renders the CTap platform. The staff dashboard did not crash, and it showed what appears to be real operational content: active 86’d items, checklist count, dashboard tools, leaderboard, and open issues. The Command Center also loaded and displayed multiple owner-level cards with plausible operational data. That indicates the frontend, some session state, and at least part of the backend data path are functioning.

| Working item | Evidence | Confidence |
|---|---|---:|
| Main site loads | `https://ctappizza.manus.space` rendered the Never 86’d / CTap app. | High |
| Existing staff session works | Browser opened directly into Mychael’s dashboard rather than failing auth. | High |
| Dashboard data renders | Sales/tools/checklists/issues/leaderboard visible. | High |
| Command Center opens | Command Center rendered owner intelligence cards. | High |
| Basic operational metrics appear | Sales, payouts, voids, staff, vendor spend, and issues cards all populated. | High |
| Recipe-cost seed button exists in source | `RecipeCostScreen.tsx` contains `Seed All Costs`. | High for source, low for live deployment |
| P2 scheduled route code exists | `p2ScheduledRoutes.ts` defines routes for daily briefing, schedule sync, par sync, EOD digest, and workbook reconcile. | High for source, low for production schedule config |

## What Is Broken

The **redeploy is the biggest broken item**. I cannot confirm that the merged main branch was actually pushed to the live Manus hosting target. There is no obvious deployment pipeline in the repo, and the local build required a schema fix before it succeeded. If the production host expects a clean clone/build from `main`, then any unresolved schema duplication would break deployment.

The **Management Briefing direct route is broken**. Navigating directly to `/management-briefing` returns a 404. This is not just a minor detail; it means feature URLs are not shareable, reload-safe, or directly auditable. The app appears to be a single-root app with internal screen state, which is fragile for management tools.

The **briefing freshness problem appears unresolved**. The source status file still says the brain was last updated on **May 5, 2026**, and I did not see evidence that the daily briefing generation job has successfully refreshed it. The code has management briefing generation logic, but code existing is not the same as production automation running.

| Broken item | Severity | Evidence | Why it matters |
|---|---:|---|---|
| Redeploy not verifiable | Critical | No deploy script/workflow found; no confirmed hosting redeploy output. | Owner asked for redeploy; I cannot honestly mark it done. |
| Build had a schema blocker locally | High | Duplicate `scheduledJobRuns` export had to be fixed locally before build. | A clean deployment may fail if the deployed code does not include the fix. |
| Direct feature URLs 404 | High | `/management-briefing` returned 404. | Managers cannot bookmark or refresh deep screens reliably. |
| Management Briefing likely stale | High | `BRAIN_STATUS.md` says May 5. | Owner specifically asked whether May 5 staleness remains; available evidence says yes or at least not disproven. |
| Scheduled jobs not verified in production | High | Route code exists, but production cron/schedule configuration was not confirmed. | Without real schedules, daily ops automation is theater. |
| API endpoints not fully audited | Medium | I did not complete endpoint testing before stop request. | UI health is not enough to certify backend correctness. |

## What Is Ugly

The app has useful pieces, but the user experience is rough in places. The dashboard showing **`-155`** points next to the owner/staff name looks bad and may be demoralizing or confusing. If that is intentional disciplinary scoring, it still needs context. If it is unintentional, it is a data integrity bug.

The checklist count of **0/175** is also ugly. Even if technically correct, it reads like a giant wall of tasks and probably scares staff away from using the tool. If this is a management account seeing all checklist items, the UI should label that clearly. If this is staff-specific, then filtering is probably wrong.

The Command Center is useful but cramped. It shows a dense grid of buttons and several operational sections, but the visual hierarchy is not strong enough to distinguish critical alerts from nice-to-have tools. The platform has a lot of functionality, but it risks feeling like a drawer full of buttons rather than a command system.

| Ugly item | Impact | Recommendation |
|---|---|---|
| Negative score display (`-155`) | Makes the app feel broken or punitive without explanation. | Add label/context or clamp/display separately as “coach score,” “discipline points,” etc. |
| Checklist count `0/175` | Overwhelming and likely un-actionable. | Filter by role/shift/day and show only today’s actionable checklist. |
| Internal-only navigation | Users cannot reliably deep-link or refresh screens. | Add real routes for major modules such as `/command`, `/management-briefing`, `/recipe-cost`, `/sales-intelligence`, `/vendors`, and `/staff`. |
| Mixed visual density | Command Center feels crowded. | Separate daily critical items from lower-frequency admin tools. |
| Unclear data freshness | Sales and ops data show, but freshness is not obvious. | Put “last updated” timestamps on key data cards. |

## What Needs Attention

The first priority is to create a **real deployment procedure**. There should be a documented command or workflow that can take `main`, build it, run migrations, deploy the artifact to Manus hosting, and return a version/hash visible in the app. Right now, the process is not auditable enough. The owner should not have to guess whether merged PRs are live.

The second priority is to verify **scheduled jobs**. The source has the five requested P2 scheduled routes, but I did not confirm actual schedule registrations. These jobs need a production schedule inventory showing exact trigger times, endpoint URLs, auth method, last run, last success, last failure, and output summary.

The third priority is to fix **briefing freshness**. If the Management Briefing is still May 5, the app is failing at one of its most important owner-facing promises. There should be a visible generated timestamp, a manual “generate now” button that is known to work, and a schedule log proving the briefing job runs every morning.

| Priority | Item | Needed action |
|---:|---|---|
| 1 | Deployment pipeline | Add `deploy` docs/script or CI workflow; expose deployed commit SHA in the app. |
| 2 | Production cron verification | Confirm the five scheduled jobs are configured outside the repo and are firing successfully. |
| 3 | Briefing freshness | Verify latest management briefing timestamp and repair automation if stale. |
| 4 | Database migration safety | Ensure `scheduled_job_runs` migration is applied once and schema has no duplicate definitions. |
| 5 | Auth/session audit | Test logged-out PIN login, bad PIN lockouts, manager permissions, OAuth-only protected actions, and logout. |
| 6 | Deep route support | Add real URLs for management screens. |
| 7 | Data freshness labels | Add timestamps to sales, vendor spend, invoices, schedule sync, and briefing widgets. |

## Scheduled Jobs Assessment

The requested five jobs are represented in source code in `server/scheduled/p2ScheduledRoutes.ts`. The code defines routes for **daily briefing**, **schedule sync**, **par sync**, **EOD digest**, and **workbook reconcile**. However, a route existing in source is not proof that production scheduling exists. I did not complete a production schedule inventory before you asked me to stop.

| Requested job | Expected time | Source route evidence | Production configuration verified? | Assessment |
|---|---:|---|---:|---|
| Daily briefing | 6:00 AM | `/scheduled/daily-briefing` and `/api/scheduled/daily-briefing` | No | Code exists; schedule not proven. |
| Schedule sync | 6:30 AM | `/scheduled/schedule-sync` and `/api/scheduled/schedule-sync` | No | Code exists; schedule not proven. |
| Par sync | 7:00 AM | `/scheduled/par-sync` and `/api/scheduled/par-sync` | No | Code exists; schedule not proven; route appears read-only by default. |
| EOD digest | 10:00 PM | `/scheduled/eod-digest` and `/api/scheduled/p2-eod-digest` | No | Code exists; schedule not proven. |
| Workbook reconcile | 11:00 PM | `/scheduled/workbook-reconcile` and `/api/scheduled/workbook-reconcile` | No | Code exists; schedule not proven. |

## Security and Access Concerns

The source indicates a more secure direction than earlier owner-login shortcuts: the core server comment explicitly says anonymous owner-login shortcuts should not be registered, and owner access should go through authenticated session recovery or the rate-limited staff PIN endpoint. That is good. However, I did not complete a full live security audit.

The live browser session opening directly into Mychael’s dashboard is convenient, but it also underscores that session persistence and logout behavior need to be tested carefully on shared devices. Restaurant tablets are often shared; any manager-level session that persists too long can become a real-world access-control issue.

| Concern | Risk | Recommendation |
|---|---|---|
| Persistent staff session | Shared-device misuse. | Verify session timeout, logout, and manager re-authentication. |
| Manager-only screens via client state | Potential confusion; real security must be backend-enforced. | Confirm protected tRPC procedures reject non-manager/non-OAuth calls. |
| Scheduled endpoints | Could be abused if auth is weak. | Confirm `sdk.authenticateRequest` works in production and unauthenticated calls return 401. |
| Invoice/vendor data | Potential sensitive financial/vendor exposure. | Confirm manager/OAuth gates before showing or mutating invoice data. |

## Final Verdict

**Redeploy:** Not honestly verifiable as successful. I built the app locally after a schema fix and attempted the DB push, but I did not find or execute a confirmed production redeploy mechanism for `ctappizza.manus.space`.

**Live platform:** Alive, partially functional, and showing real-looking operational data. The home dashboard and Command Center are the strongest working areas.

**Biggest broken pieces:** Deployment process, route/deep-link behavior, Management Briefing freshness, and unverified scheduled jobs.

**Most urgent next step:** Establish a repeatable production deployment path, redeploy from clean `main`, expose the deployed commit SHA in the app footer/admin screen, then verify the five scheduled jobs with last-run logs.

## Evidence References

| Reference | Evidence source | What it supports |
|---:|---|---|
| [1] | `/home/ubuntu/Never-86d/package.json` | Build uses `vite build` and `esbuild`; scripts include `build`, `start`, `check`, `test`, and `db:push`. |
| [2] | `/home/ubuntu/Never-86d/drizzle/schema.ts` | Drizzle schema uses `mysql-core`; `scheduledJobRuns` table exists. |
| [3] | `/home/ubuntu/Never-86d/server/_core/index.ts` | Express/tRPC server setup, static serving, scheduled route registration, and no anonymous owner-login shortcut. |
| [4] | `/home/ubuntu/Never-86d/server/scheduled/p2ScheduledRoutes.ts` | Source routes exist for the five requested P2 scheduled jobs. |
| [5] | `/home/ubuntu/Never-86d/client/src/pages/RecipeCostScreen.tsx` | Source contains the `Seed All Costs` button and recipe ingredient seeding mutation. |
| [6] | `/home/ubuntu/Never-86d/BRAIN_STATUS.md` | Brain status says last updated May 5, 2026. |
| [7] | Live browser observation at `https://ctappizza.manus.space` | Home dashboard and Command Center loaded with operational data. |
| [8] | Live browser observation at `https://ctappizza.manus.space/management-briefing` | Direct Management Briefing URL returned 404. |
