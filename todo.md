# CTAP People Platform v1 — Build Checklist

## Core Features
- [x] Real staff names (Jessica Gailey, Karlee Sturtz, Ashley Holding, Moe Thomas, Gavin Thomas, etc.)
- [x] Key Employee hierarchy (Owners: Mychael Mueller, Sally Hart | Key Mgr: Gavin Thomas | Kitchen Mgr: Moe Thomas, Tom Dorthy | Kitchen Key: Che, Steven Klein)
- [x] Gamified login + welcome screen ("Welcome to the new wave")
- [x] Daily briefing on login (yesterday's recap, 86'd, specials, issues)
- [ ] Wi-Fi proximity tracking (on floor / off network) — UI placeholder only
- [x] Schedule by merit (leaderboard score = shift priority)
- [ ] Social posting (Facebook) for points — UI entry only, no FB integration
- [ ] 30-day auto-archive for inactive staff

## Store Run / Pay Out Module
- [ ] Pay Out tracking with receipt photo capture — UI form exists, photo upload not wired to S3
- [ ] Required fields: WHO ran it, WHAT they bought, WHERE, WHO authorized, amount — form exists but validation not tested
- [ ] Authorization rule: Only key employees can hand cash — DB field exists, enforcement not tested
- [ ] Flag if non-key employee processes pay out — not implemented
- [ ] Daily digest to manager/owner of all pay outs
- [ ] Pattern detection on repeated misc pay outs
- [ ] Store run receipt matching (POS pay out ↔ store receipt)

## Void / Comp Tracking
- [x] Pattern by employee per week — DB query groups by employee
- [ ] Manager nudge on 3+ voids — not implemented
- [x] Reason logging required — DB field exists
- [x] Running weekly total — query exists

## Driver EOD
- [ ] Out-of-town runs — form exists, requires Manus auth to submit
- [ ] Special runs — form exists, requires Manus auth to submit
- [ ] Cash from till with reason — form exists, requires Manus auth to submit
- [ ] Redeliveries with ticket # and excuse — form exists, requires Manus auth to submit
- [ ] Manager must hand driver cash (not front staff) — not enforced

## Command Center (Owner/Manager)
- [x] 10 Intelligence Buckets overview — UI built
- [ ] Hourly sales pattern
- [ ] Labor % live
- [ ] Wi-Fi proximity dashboard — UI placeholder only
- [x] Leaderboard — real DB data

## Vendor / Invoice Tracking
- [ ] Invoice photo capture — form exists, photo upload not wired to S3
- [ ] Auto-tag: vendor, category, authorized by, date — DB fields exist, no auto-extraction
- [x] Vendors: Sawyer's Meats, Hughes Distributing, Fort Dodge Distributing, Confluence Brewing — in DB
- [ ] Week-over-week price tracking per item
- [ ] Volume vs. sales matching
- [ ] Running total by vendor per week/month — query exists but not verified
- [ ] Anomaly flags (price jumps, volume mismatches)
- [x] Tom = Kitchen Manager authorized to place orders — in DB

## Full-Stack Upgrade
- [x] Upgrade to full-stack with database and backend (web-db-user)
- [x] Create database schema for employees, payouts, invoices, checklists, voids, feedback
- [x] Push database schema with pnpm db:push
- [x] Create tRPC routers for all platform features
- [x] Wire frontend to backend with real data persistence — core flows working

## Employee Data from Google Drive
- [ ] Scan all employee-related docs from Google Drive
- [x] Build real employee profiles in database
- [ ] Import bar schedule staff data
- [ ] Import kitchen schedule staff data
- [ ] Import core responsibilities and roles

## tRPC Backend Wiring
- [x] Add staff.loginByPin procedure for PIN-based shift login
- [x] Add getStaffByPin db helper
- [x] Rewrite CTapHub.tsx to use tRPC hooks for all screens
- [x] Login screen loads real staff from DB by department
- [x] PIN login queries real DB (not hardcoded)
- [x] Welcome screen shows real points/streak from DB
- [x] Briefing screen pulls real daily briefing from DB
- [x] Hub screen shows real stats (points, streak, checklist counts)
- [x] Checklist screen loads real checklists from DB (filtered by department)
- [x] Leaderboard shows real totalPoints ranking from DB
- [x] Write vitest tests for staff.loginByPin, staff.list, leaderboard, briefing, checklists
- [x] All 17 vitest tests passing (8 staff + 9 security)

## Known Issues
- [x] Bottom nav z-index fixed — moved outside overflow-hidden container (preview mode overlay still intercepts in dev)
- [ ] Driver EOD and Feedback forms require Manus OAuth session (protected procedures)
- [ ] Photo upload for invoices/payouts needs S3 wiring
- [ ] Command Center KPIs need end-to-end verification

## Security Hardening
- [x] Strip PINs from all public API responses (staff.list, staff.active, staff.byDepartment, staff.byId, leaderboard)
- [x] loginByPin response must NOT return the PIN back to the client
- [x] Staff list endpoints return only safe fields (id, firstName, lastName, department, jobRole, status, totalPoints, currentStreak)
- [x] Protect sensitive endpoints (payouts, voids, invoices, feedback, driver reports) — all reads moved to protectedProcedure
- [x] staff.seed restricted to adminProcedure
- [x] Ensure no employee phone/email leaks through public endpoints

## UX Simplification
- [x] Remove tab-heavy hub with 10+ tile buttons
- [x] Role-aware home screen — staff sees what THEY need based on department/role
- [x] Conversational greeting: "Hey Jessica, here's your closing checklist"
- [x] Bartender flow: checklist + leaderboard + feedback
- [x] Kitchen flow: checklist + leaderboard (prep list not yet separate — uses checklists)
- [x] Driver flow: EOD report screen exists (requires Manus OAuth to submit)
- [x] Owner/Manager flow: command center + leaderboard + issues
- [x] Simple bottom nav: Home / My Tasks / Board / Profile (4 max)
- [x] No hunting through tabs — the app knows who you are and surfaces your stuff

## Intelligence Report
- [x] Synthesize all research into polished intelligence report (platforms, benchmarks, gaps, recommendations)

## Social Media Content for Never 86'd
- [x] Find CTAP / Community Tap photos and videos online (8 photos from Tripadvisor/Yelp, Facebook page with 9.8K likes)
- [x] Create Never 86'd branded short-form content — 3 reel covers (9:16) + 2 square posts (1:1) + full content pack with captions and hashtags
- [x] Package content assets ready for posting (content-pack.md with captions, hashtags, posting schedule)

## QA Pass
- [x] Test every button on every screen (splash, login, department select, staff select, PIN entry, welcome, briefing, home, checklists, leaderboard, profile, command center, EOD, feedback, payouts, invoices, voids)
- [x] Fix any broken buttons or dead-end flows

## Role-Based Permissions & Data Visibility
- [x] Staff should NEVER see raw sales/revenue numbers — gamify instead
- [x] Manager/Owner screens show command center with operational intelligence
- [x] Regular staff see gamified metrics only (points, streaks, rank, badges)
- [x] P&L data restricted to manager+ roles (owner, key_manager, kitchen_manager, bar_manager)
- [x] Void counts hidden from non-managers on leaderboard and profile
- [ ] Staff self-only view for their own voids (not yet implemented)
- [x] Payout screen restricted to managers only
- [ ] Staff self-only view for their own payouts (not yet implemented)

## Gamified UI Polish
- [x] Replace any raw dollar amounts with gamified equivalents for non-managers
- [x] Make leaderboard feel rewarding (badges, rank visuals, gold/silver/bronze top 3, KEY badges, streak badges)
- [x] Polish the overall look to feel premium, not like a spreadsheet

## Demo Video
- [x] Create a short teaser/demo video showing key screens (8s portrait: splash → login → home → leaderboard)
- [x] Create 24s demo video covering key staff screens (splash → login → briefing → home) and manager screens (command center → leaderboard) — 3 clips concatenated

## SEO / AEO (Answer Engine Optimization)
- [x] Add structured data (JSON-LD) for SoftwareApplication schema
- [x] Add FAQ schema markup for common restaurant tech questions
- [x] Add meta tags (title, description, twitter:card) to index.html
- [x] Add og:image and twitter:image assets (generated Never 86'd branded card)
- [ ] Create Q&A content page targeting restaurant worker/operator search queries
- [x] Optimize for AI answer engines (clear headings, structured answers, entity markup)
