# CTAP People Platform v1 — Build Checklist

## Core Features
- [x] Real staff names (Jessica Gailey, Karlee Sturtz, Ashley Holding, Moe Thomas, Gavin Thomas, etc.)
- [x] Key Employee hierarchy (Owners: Mychael Mueller, Sally Hart | Key Mgr: Gavin Thomas | Kitchen Mgr: Moe Thomas, Tom Dorthy | Kitchen Key: Che, Steven Klein)
- [x] Gamified login + welcome screen ("Welcome to the new wave")
- [x] Daily briefing on login (yesterday's recap, 86'd, specials, issues)
- [ ] [ROADMAP] Wi-Fi proximity tracking (on floor / off network) — needs router/AP integration
- [x] Schedule by merit (leaderboard score = shift priority)
- [ ] [ROADMAP] Social posting (Facebook) for points — needs Facebook Graph API integration
- [x] 30-day auto-archive DB helper + admin endpoint — archiveInactiveStaff() + admin.archiveInactive
- [ ] [ROADMAP] Scheduled job to run auto-archive automatically (needs deployed site + scheduled task)

## Store Run / Pay Out Module
- [x] Pay Out receipt photo upload backend — upload.receiptPhoto endpoint wired to S3 via storagePut
- [x] Wire payout form UI with camera capture button, upload via upload.receiptPhoto, pass URL to payouts.create
- [x] Required fields: WHO ran it, WHAT they bought, WHERE (required), WHO authorized (key employee selector), amount — all enforced in frontend validation
- [x] Authorization rule: Only key employees can hand cash — payout.create REJECTS if authorizer missing or not key employee
- [x] Block if non-key employee tries to authorize pay out — throws error, payout not created
- [x] Daily digest query endpoint — admin.dailyPayoutDigest returns today's payouts, total, flagged count
- [x] Restrict dailyPayoutDigest to adminProcedure (admin-only)
- [ ] [ROADMAP] Add actual delivery via notifyOwner or scheduled task (needs deployed site)
- [x] Pattern detection — admin.miscPayoutPatterns finds employees with 2+ misc payouts in configurable window
- [ ] [ROADMAP] Store run receipt matching (POS pay out ↔ store receipt) — needs POS data feed

## Void / Comp Tracking
- [x] Pattern by employee per week — DB query groups by employee
- [x] Manager nudge on 3+ voids — auto-creates issue alert at exactly 3 and 5 weekly voids (deduplicated, high priority at 5+)
- [x] Reason logging required — DB field exists
- [x] Running weekly total — query exists

## Driver EOD
- [x] Out-of-town runs — form exists, functional once deployed (requires Manus OAuth session)
- [x] Special runs — form exists, functional once deployed (requires Manus OAuth session)
- [x] Cash from till with reason — form exists, functional once deployed (requires Manus OAuth session)
- [x] Redeliveries with ticket # and excuse — form exists, functional once deployed (requires Manus OAuth session)
- [x] Manager must hand driver cash (not front staff) — enforced in driverReports.create (rejects if cash without manager handoff, verifies hander is key employee)

## Command Center (Owner/Manager)
- [x] 10 Intelligence Buckets overview — UI built
- [ ] [ROADMAP] Hourly sales pattern — needs POS data feed
- [ ] [ROADMAP] Labor % live — needs POS/scheduling data feed
- [ ] [ROADMAP] Wi-Fi proximity dashboard — needs router/AP integration
- [x] Leaderboard — real DB data

## Vendor / Invoice Tracking
- [x] Invoice photo upload backend — upload.receiptPhoto supports context: "invoice"
- [x] Wire invoice form UI with vendor selector, category picker, photo capture, and submit — all wired to invoices.create
- [ ] [ROADMAP] Auto-tag: vendor, category, authorized by, date — needs OCR/AI extraction pipeline
- [x] Vendors: Sawyer's Meats, Hughes Distributing, Fort Dodge Distributing, Confluence Brewing — in DB
- [ ] [ROADMAP] Week-over-week price tracking per item — needs historical invoice data
- [ ] [ROADMAP] Volume vs. sales matching — needs POS data feed
- [x] Running total by vendor per week/month — admin.invoiceTotals (by vendor) + admin.payoutTotals (by category) with configurable days
- [x] Add payout totals grouped by vendor — admin.payoutTotalsByVendor endpoint
- [x] Add test coverage for vendor running totals — 10 admin tests (archive, payoutTotals, invoiceTotals, payoutTotalsByVendor, auth checks, custom days)
- [ ] [ROADMAP] Anomaly flags (price jumps, volume mismatches) — needs historical data
- [x] Tom = Kitchen Manager authorized to place orders — in DB

## Full-Stack Upgrade
- [x] Upgrade to full-stack with database and backend (web-db-user)
- [x] Create database schema for employees, payouts, invoices, checklists, voids, feedback
- [x] Push database schema with pnpm db:push
- [x] Create tRPC routers for all platform features
- [x] Wire frontend to backend with real data persistence — core flows working

## Employee Data from Google Drive
- [ ] [ROADMAP] Scan all employee-related docs from Google Drive — needs Drive API access
- [x] Build real employee profiles in database
- [ ] [ROADMAP] Import bar schedule staff data — needs Drive API access
- [ ] [ROADMAP] Import kitchen schedule staff data — needs Drive API access
- [ ] [ROADMAP] Import core responsibilities and roles — needs Drive API access

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
- [x] Driver EOD and Feedback forms — functional once deployed (require Manus OAuth session, which is available in production)
- [x] Photo upload backend endpoint for invoices/payouts/issues — upload.receiptPhoto
- [x] Add vitest coverage for upload.receiptPhoto, dailyPayoutDigest, miscPayoutPatterns (6 tests in upload-digest.test.ts)
- [x] Command Center KPIs verified — sales, payouts, voids, staff count, vendor spend, issues all pulling from real DB

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
- [x] Staff self-only view for their own voids (myVoids query + profile display — frontend-filtered by staffId)
- [x] Server-side self-only enforcement for voids (staff session JWT cookie set on PIN login, myVoids reads staffId from server-side cookie)
- [x] Payout screen restricted to managers only
- [x] Staff self-only view for their own payouts (myPayouts query + profile display — frontend-filtered by staffId)
- [x] Server-side self-only enforcement for payouts (staff session JWT cookie set on PIN login, myPayouts reads staffId from server-side cookie)

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
- [x] Create Q&A content page (/faq) with 12 SEO-optimized questions targeting restaurant worker/operator search queries, with schema.org Question/Answer markup
- [x] Optimize for AI answer engines (clear headings, structured answers, entity markup)

## AI-Native Intelligence Layer (Phase 2)

### Knowledge Store & RAG
- [x] Create knowledgeEntries table (station, category, question, answer, confidence, source, corrections count)
- [x] Create knowledgeCorrections table (entryId, correctedBy staffId, oldAnswer, newAnswer, approved, approvedBy)
- [x] Seed knowledge base with menu items, drink recipes, station Q&A, vendor info, POS knowledge
- [x] Build RAG query endpoint — station-aware, time-aware, confidence-scored answers (knowledge.ask)
- [x] Knowledge correction endpoint — workers submit fixes, managers approve, system updates

### Photo Intelligence Pipeline
- [x] Build photo analysis endpoint — upload photo → LLM vision extracts content → structured data returned (photos.analyze)
- [x] Invoice photo OCR — extract line items, prices, vendor, quantities from invoice photos
- [x] Shelf photo analysis — estimate inventory levels from walk-in/storage photos
- [x] Equipment photo analysis — identify damage/issues from equipment photos
- [x] Auto-create invoice from photo — photo upload triggers LLM vision analysis, auto-fills vendor/total/invoice# in form
- [ ] Price comparison — compare extracted prices against last 4 orders, flag changes (needs historical data)

### Station Knowledge Brain
- [x] Station-aware AI chat endpoint — knows who's asking, what station, what time (knowledge.ask)
- [x] 8 station knowledge domains (Pizza, Fry, Bar, Waitstaff, BBQ, Store Room, Bathroom, Dish) — seeded
- [x] Time-of-day context (morning prep vs lunch rush vs closing)
- [x] Day-of-week context (Monday slow vs Friday game night)
- [x] Confidence scoring on answers (high/medium/low with disclaimers)

### Achievement & Progression Engine
- [x] Create achievementDefinitions table (12 achievements with thresholds and types)
- [x] Create staffAchievementProgress table (per-worker progress tracking)
- [x] Create staffAchievementUnlocks table (immutable unlock log)
- [x] Event-driven progression — checklist/void/shift/feedback events update progress (achievements.checkProgress)
- [x] Near-miss notifications at 80% progress (built into AchievementsScreen)
- [x] Unlock celebration UI (built into AchievementsScreen with unacknowledged check)
- [x] Badge gallery component with earned/locked states and progress bars (AchievementsScreen)

### Tangible Rewards System
- [x] Create rewards table (tier, name, description, pointsCost, type)
- [x] Create rewardRedemptions table (staffId, rewardId, status, approvedBy)
- [x] Rewards catalog UI — browse available rewards with point costs (RewardsShopScreen)
- [x] Redemption flow — staff claims reward, manager approves (rewards.redeem + rewards.approve)
- [x] 6 reward tiers: shift meal (100), t-shirt (250), hat+shift pick (500), gift card (1000), half-day paid (2500), cash bonus (5000)

### Photo Missions (Gamified Knowledge Capture)
- [x] Create photoMissions table (name, description, pointsPerPhoto, category, active dates)
- [x] Create photoSubmissions table (staffId, missionId, photoUrl, aiExtraction, verified)
- [x] Weekly rotating missions (Map Walk-in, Station Setup, Invoice Hunter, Equipment Health) — seeded
- [x] Photo submission UI with mission selector and camera capture (PhotoMissionsScreen)
- [x] AI extraction on submission — auto-tag, auto-categorize, update knowledge base (photos.analyze)

### Dynamic Order Guides
- [x] Create vendorProducts table (vendorName, sku, productName, category, lastPrice, parLevel, orderFrequency)
- [x] Create orderGuideTemplates table (assignedTo staffId, vendorName, products JSON, lastUpdated)
- [x] Tom's food order guide — PFG + Sysco SKUs with par levels — seeded in knowledge base
- [x] Ashley's bar order guide — Hy-Vee liquor + beer with Iowa ABD pricing — seeded in knowledge base
- [x] Auto-update vendor product prices from invoice OCR — invoices.create calls upsertVendorProductFromOCR for each extracted line item
- [x] Add vitest for invoice OCR price update flow — 3 tests covering items update, no-items skip, and malformed items handling (8 tests in invoice-ocr.test.ts)
- [ ] Par level suggestions based on sales patterns (needs historical data)

### Persistent Memory / Briefing Intelligence
- [x] Upgrade briefing to reference its own history (not stateless) — briefingMemory table + procedures
- [ ] Event-aware briefings (check local events, adjust prep recommendations) — needs event calendar integration
- [ ] Historical pattern references ("last game night we sold 47 lbs wings") — needs POS data
- [x] Briefing memory table — store key facts that persist across briefings

### POS Knowledge System
- [x] Seed POS knowledge — what PDQ POS is, every button, how to ring up orders, modifiers, tabs — seeded
- [x] POS void/comp process — step-by-step how to process voids and comps in the POS — seeded
- [x] POS close-out process — end-of-day cash out, credit card batching, report printing — seeded
- [x] POS troubleshooting — common errors, printer issues, card reader problems, network drops — seeded
- [x] POS menu navigation — where every menu item lives, how to find it, modifier trees — seeded
- [ ] POS training mode — AI walks new hires through POS operations step by step (future enhancement)

### Communication Logic
- [x] Contextual routing — station-aware knowledge.ask routes answers by department/role
- [ ] Shift handoff intelligence — outgoing shift writes notes, AI structures and routes to incoming (future)
- [x] Escalation chain — issue severity determines who gets notified (void alerts auto-create issues)
- [ ] Cross-station communication — kitchen tells bar about 86'd item, system broadcasts (future)
- [ ] Smart notifications — don't spam, batch low-priority, instant for critical (future)

## Wave 2 Features

### Achievement Auto-Progression
- [x] Wire checklist completion → auto-update "Machine" achievement progress
- [x] Wire void creation → auto-reset "Clean Hands" achievement window
- [x] Wire feedback submission → auto-update "Voice" achievement progress
- [x] Wire PIN login → auto-update "Rookie" shift count progress
- [x] Auto-unlock achievements when threshold reached (create unlock + award bonus points)
- [x] Add vitest for achievement auto-progression (19 tests in achievement-engine.test.ts)

### Dynamic Order Guide UI
- [x] Order Guide screen — browse vendor products by vendor with par levels and last prices
- [x] Price change indicators — show up/down/new badges from OCR-updated prices
- [x] Tom's food guide (PFG/Sysco) and Ashley's bar guide (Hy-Vee/liquor) views
- [x] Add to CTapHub screen routing (manager-only)

### Shift Handoff Screen
- [x] End-of-shift notes form — outgoing shift writes key notes before clocking out
- [x] AI-structured handoff — auto-categorizes notes into 86'd, prep, equipment, customers, staffing
- [x] Incoming shift reads structured handoff on briefing screen
- [x] Add to CTapHub screen routing
- [x] Add vitest for shift handoff flow (covered by briefingMemory tests in intelligence.test.ts)
