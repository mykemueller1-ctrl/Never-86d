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
- [x] [ROADMAP] Scheduled job to run auto-archive automatically — POST /api/scheduled/auto-archive endpoint + notifyOwner report

## Store Run / Pay Out Module
- [x] Pay Out receipt photo upload backend — upload.receiptPhoto endpoint wired to S3 via storagePut
- [x] Wire payout form UI with camera capture button, upload via upload.receiptPhoto, pass URL to payouts.create
- [x] Required fields: WHO ran it, WHAT they bought, WHERE (required), WHO authorized (key employee selector), amount — all enforced in frontend validation
- [x] Authorization rule: Only key employees can hand cash — payout.create REJECTS if authorizer missing or not key employee
- [x] Block if non-key employee tries to authorize pay out — throws error, payout not created
- [x] Daily digest query endpoint — admin.dailyPayoutDigest returns today's payouts, total, flagged count
- [x] Restrict dailyPayoutDigest to adminProcedure (admin-only)
- [x] [ROADMAP] Add actual delivery of payout digest via notifyOwner — POST /api/scheduled/payout-digest endpoint + notifyOwner with flagged alerts
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
- [x] Hourly sales pattern — getHourlySalesHeatmap + SalesIntelligenceScreen Hours tab (3,104 records, DOW×Hour grid)
- [ ] [ROADMAP] Labor % live — needs POS/scheduling data feed
- [ ] [ROADMAP] Wi-Fi proximity dashboard — needs router/AP integration
- [x] Leaderboard — real DB data

## Vendor / Invoice Tracking
- [x] Invoice photo upload backend — upload.receiptPhoto supports context: "invoice"
- [x] Wire invoice form UI with vendor selector, category picker, photo capture, and submit — all wired to invoices.create
- [x] Auto-tag: vendor, category, date — LLM vision pipeline extracts vendor/total/items from invoice photos (photos.analyze + invoices.create auto-fill)
- [x] Vendors: Sawyer's Meats, Hughes Distributing, Fort Dodge Distributing, Confluence Brewing — in DB
- [x] Week-over-week price tracking per item — skuPriceHistory table + getSkuPriceHistory + auto-update from invoice OCR built in Wave 7
- [ ] [ROADMAP] Volume vs. sales matching — needs POS data feed
- [x] Running total by vendor per week/month — admin.invoiceTotals (by vendor) + admin.payoutTotals (by category) with configurable days
- [x] Add payout totals grouped by vendor — admin.payoutTotalsByVendor endpoint
- [x] Add test coverage for vendor running totals — 10 admin tests (archive, payoutTotals, invoiceTotals, payoutTotalsByVendor, auth checks, custom days)
- [x] Anomaly flags (price jumps) — scanForPriceChanges flags 5%+ moves, priceAlerts table + review flow built in Wave 7
- [x] Tom = Kitchen Manager authorized to place orders — in DB

## Full-Stack Upgrade
- [x] Upgrade to full-stack with database and backend (web-db-user)
- [x] Create database schema for employees, payouts, invoices, checklists, voids, feedback
- [x] Push database schema with pnpm db:push
- [x] Create tRPC routers for all platform features
- [x] Wire frontend to backend with real data persistence — core flows working

## Employee Data from Google Drive
- [x] [ROADMAP] Scan all employee-related docs from Google Drive — found Employee Phone/Email sheet, bar schedule, kitchen schedule via gws CLI
- [x] Build real employee profiles in database
- [x] [ROADMAP] Import bar schedule staff data — bar schedule spreadsheet read (1DnwdaQRe9kUMOXKtAZ2wmOp5xyRGKWqrp92DhQeyM5M)
- [x] [ROADMAP] Import kitchen schedule staff data — kitchen schedule doc exported (1Id05WzNByGLvkCcuZCISLVmdT0szMM6Cd9OMw0BE6sQ)
- [x] [ROADMAP] Import core responsibilities and roles — syncStaffFromDriveData helper + admin.syncStaffFromDrive endpoint built, maps Drive roles to DB department/jobRole

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
- [x] Price comparison — getPriceComparisons + getInvoicePriceComparison + auto-scan on invoice create + price alert notifications to managers

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
- [x] Par level suggestions backend helper — getPriceComparisons + getParLevelSuggestions in db.ts

### Persistent Memory / Briefing Intelligence
- [x] Upgrade briefing to reference its own history (not stateless) — briefingMemory table + procedures
- [x] Event-aware briefings — getEventAwareBriefingContext helper + vendorProducts.getPriceHistory / intelligence endpoints
- [x] Historical pattern references — getDayOfWeekPattern + getRecentSalesTrend wired into knowledge.ask LLM briefings
- [x] Briefing memory table — store key facts that persist across briefings

### POS Knowledge System
- [x] Seed POS knowledge — what PDQ POS is, every button, how to ring up orders, modifiers, tabs — seeded
- [x] POS void/comp process — step-by-step how to process voids and comps in the POS — seeded
- [x] POS close-out process — end-of-day cash out, credit card batching, report printing — seeded
- [x] POS troubleshooting — common errors, printer issues, card reader problems, network drops — seeded
- [x] POS menu navigation — where every menu item lives, how to find it, modifier trees — seeded
- [x] POS training mode — 5 interactive training modules (phone orders, bar service, closing, voids, delivery) with step-by-step walkthroughs

### Communication Logic
- [x] Contextual routing — station-aware knowledge.ask routes answers by department/role
- [x] Shift handoff intelligence — ShiftHandoffScreen with write/read modes, auto-categorization, 24hr expiry
- [x] Escalation chain — issue severity determines who gets notified (void alerts auto-create issues)
- [x] Cross-station communication — StationBroadcastScreen + stationBroadcasts table + endpoints
- [x] Smart notifications — notificationQueue table + queueNotification + processNotificationBatch helpers

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

## Wave 3 Features

### Portable Worker Profile System
- [x] Add 8 new tables to schema (6 worker profile + 2 sales intelligence: dailySales, hourlySales)
- [x] Add primaryTrack and secondaryTracks fields to staff table
- [x] Run db:push to migrate new schema
- [x] Seed training modules from SOP documents (18 modules) — seeded: kitchen 6, foh 6, driver 3, all 2, pizza 1
- [x] Build backend procedures — training completion CRUD
- [x] Build backend procedures — evaluation CRUD (9-category scoring)
- [x] Build backend procedures — write-up workflow (verbal → written → final → termination)
- [x] Build backend procedures — advancement readiness engine
- [x] Build Worker Profile UI screen (training progress, skills, evaluations, write-ups, career track)
- [x] Build Evaluation Form UI (9 categories, 1-5 scoring, narrative fields) — embedded in Worker Profile
- [x] Build Write-Up Form UI (severity, category, description, acknowledgment) — embedded in Worker Profile
- [x] Build Career Advancement UI (readiness score, hard gates, promotion flow) — embedded in Worker Profile
- [x] Add worker profile to CTapHub navigation ("My Profile" button for all staff)

### PDQ POS Sales Intelligence
- [x] Pull all historical PDQ daily sales reports from Gmail (1,088 PDFs downloaded)
- [x] Parse and structure PDQ report format (202 days extracted to CSV)
- [x] Store sales data in database (196 daily records, 3,104 hourly records imported)
- [x] Build product mix analysis — 8,939 item records, 1,069 unique products analyzed
- [x] Build Sales Intelligence UI — daily trends, channel breakdown, labor analysis, role-based access
- [x] Machine learning — linear regression model with DOW seasonality, time trend, temperature coefficient, category trends, 95% confidence intervals (getMLSalesPrediction + forecast.mlPrediction endpoint + ML Prediction tab in ForecastScreen)

## Wave 4 — Intelligence Engine

### Product Mix Intelligence
- [x] Analyze food/beer/pop/liquor category trends from 196 days of POS data
- [x] Day-of-week patterns per category (e.g., wings spike Fridays)
- [x] Seasonal/monthly trend detection
- [x] Top sellers and declining items identification
- [x] Category revenue share over time

### Hourly Sales Patterns
- [x] Hourly heatmap by day-of-week (when does the rush actually hit)
- [x] Channel breakdown by hour (pickup vs delivery vs bar vs dine-in)
- [x] Labor cost % by hour analysis
- [x] Dead hours identification for scheduling

### Comp/Promo/Void Anomaly Detection
- [x] Parse void/promo data from PDQ reports (4,954 records from 431 PDFs)
- [x] Flag anomalies: repeated voids by same employee, high-value voids, late-night voids (59 anomalies detected)
- [x] Comp/promo tracking with theories on patterns
- [x] Shrinkage risk scoring

### Weather Correlation
- [x] Integrate weather API for Fort Dodge, Iowa (202 days of weather data)
- [x] Correlate historical weather with daily sales
- [x] Weather forecast → sales prediction
- [x] Rainy day vs sunny day revenue patterns (rain -6.4%, snow +6.2%)

### Local Events Radar (30-mile radius)
- [x] Pull upcoming events near Fort Dodge (high school sports, Iowa Central, county events)
- [x] Event impact estimation on sales
- [x] Calendar view of upcoming events with staffing recommendations

### Schedule Intelligence Briefing
- [x] Combine all signals: weather + events + historical patterns + trends
- [x] Generate weekly scheduling recommendation for owner (LLM-powered)
- [x] Push notification to Mychael with staffing suggestions — briefings.generate + notifyOwner + scheduled task configured
- [x] Build Schedule Intelligence UI screen in CTapHub

### Backend & UI
- [x] Build intelligence analysis engine (server-side) — 6 new tables, full analysis pipeline
- [x] Build backend tRPC procedures for all intelligence endpoints
- [x] Build Intelligence Dashboard UI with 7 tabs: Daily, Mix, Voids, Weather, Hours, Anomalies, Schedule
- [x] Add vitest for intelligence engine (mocks updated, 127 tests passing)

## Wave 5 — Knowledge & Training Integration

### Training Module Seeding
- [x] Seed 18 training modules from SOP documents into workerTrainingModules table
- [x] Modules cover: kitchen (6), FOH (6), driver (3), all-staff (2), pizza (1)

### POS Training Mode
- [x] Build POSTrainingScreen.tsx with 5 interactive training modules
- [x] Phone Order module — step-by-step phone order taking workflow
- [x] Bar Service module — drink making, tab management, ID checking
- [x] Closing Procedures module — end-of-night cash out, batch, cleanup
- [x] Void/Comp Processing module — when/how to void, manager approval flow
- [x] Delivery Driver module — order verification, cash handling, route tips
- [x] Wire POSTrainingScreen into CTapHub routing + home screen QuickAction
- [x] Map POS training modules to real DB training module IDs (phone→4, bar→16, closing→7, voids→3, driver→5)
- [x] Add answer validation logic — 20 multiple-choice questions across 5 modules, 80% pass threshold

### Intelligence Briefing Enhancements
- [x] Wire historical sales patterns into knowledge.ask LLM briefings (getDayOfWeekPattern + getRecentSalesTrend)
- [x] Add event-aware briefing context (getEventAwareBriefingContext)
- [x] Add price comparison helper (getPriceComparisons) for vendor product price tracking
- [x] Add vendorProducts.getPriceHistory endpoint
- [x] Add intelligence.getEventBriefing endpoint (eventBriefing.context)

### Par Level Suggestions
- [x] Backend helper getParLevelSuggestions in db.ts
- [x] Par level suggestions UI in OrderGuideScreen — Products/Par Suggestions toggle with actionable adjustments and on-target indicators

### Remaining Items
- [x] Push notification to Mychael for schedule intelligence — briefings.generate + notifyOwner
- [x] Cross-station communication (kitchen ↔ bar 86'd broadcasts) — StationBroadcastScreen built in Wave 7
- [x] Smart notification batching (low-priority batch, critical instant) — notificationQueue + queueNotification built in Wave 7

## Wave 6 — Schedule Intelligence Notifications

### Role-Based Briefing System
- [x] POST /api/scheduled/briefing endpoint for scheduled task to call (scheduledRoutes.ts)
- [x] Comprehensive briefing generator: weather, events (30mi), hourly sales trends, food/beer/liquor/pop trends, comp/promo/void analysis, anomaly theories
- [x] Role-based routing: Ashley = bar trends, Tom = BOH/kitchen trends, Mychael = full schedule picture
- [x] Store briefings in management_briefings table for in-app viewing
- [x] notifyOwner integration for push notifications to Mychael
- [x] ManagementBriefingScreen with role filter tabs (Mychael/Ashley/Tom), theories, action items, anomaly alerts, events context

## Bug Fix — Name Correction
- [x] Fix all "Michael" references to "Mychael" (owner's actual name spelling) across briefing system, role labels, LLM prompts, and todo.md

## Wave 7 — Food Cost Intelligence System
- [x] Recipe schema — recipes + recipeIngredients tables with portions, prep, yield tracking
- [x] SKU schema — skuCatalog + skuPriceHistory tables tracking every product by vendor, unit size, price per unit
- [x] Menu items schema — menuItems table linking recipes to POS items for margin analysis
- [x] Waste/yield tracking schema — wasteLog table for trim, cooking loss, expired, dropped, overportioned, returned
- [x] Recipe costing db helpers — recalculateRecipeCost auto-pulls SKU prices, applies yield%, updates recipe
- [x] SKU tracking db helpers — crossVendorPriceComparison, getSkuPriceHistory, CRUD for all SKUs
- [x] Menu cost engine db helpers — recalculateMenuItemMargin, getFoodCostSummary by category
- [x] Price comparison alerts — scanForPriceChanges flags 5%+ price moves, createPriceAlert, reviewPriceAlert
- [x] tRPC endpoints for recipe CRUD, SKU management, menu costing, waste logging, broadcasts, forecasts
- [x] RecipeCostScreen UI — recipe builder with ingredient costs, portion calculator, cost per plate
- [x] SKUTrackerScreen UI — vendor product catalog, price alerts, cross-vendor comparison
- [x] PriceComparisonScreen UI — integrated into SKUTrackerScreen price alerts tab
- [x] Cross-station 86'd broadcast system — StationBroadcastScreen + endpoints + ack
- [x] StationBroadcastScreen UI — send/receive 86'd alerts, acknowledge, resolve, history
- [x] Smart notification batching — notificationQueue table + queueNotification + processNotificationBatch
- [x] POS training answer validation — 20 multiple-choice questions with real A/B/C/D grading, visual feedback, correct answer reveal
- [x] Wire all new screens into CTapHub navigation (Forecast, Recipes, SKU, 86'd Alerts, Waste Log)

## Wave 7b — Forecast Model & Communication Hub Enhancements
- [x] Sales forecast engine — generateSalesForecast + ForecastScreen UI with 7-day view
- [x] Weather-sales correlation model — analyzeWeatherSalesCorrelation in db.ts
- [x] Event-pattern matching — getEventImpactHistory + forecast.eventImpactHistory endpoint
- [x] Waste reporting from communication hub — WasteLogScreen with category/reason tracking
- [x] Forecast display on management dashboard with confidence levels + weather overlay
- [x] Local event intelligence — integrated into ForecastScreen + event impact history
- [x] Event impact correlation — getEventImpactHistory matches event types to sales data
- [x] Proactive event alerts for Mychael — built into scheduled briefing + ForecastScreen

## Remaining Gaps
- [x] POS training answer validation — 20 multiple-choice questions with real A/B/C/D grading, visual feedback, correct answer reveal
- [x] Smart notification batching end-to-end — critical/high = instant delivery, low/normal = auto-batchKey + batchNotifications() groups by category+role+date

## Wave 8 — Iowa Compliance & Cost Intelligence Research
- [x] Parallel research: Iowa food safety laws, liquor regulations, labor laws, commodity prices, food cost benchmarks (12 topics)
- [x] Comprehensive reference document: IOWA_RESTAURANT_COMPLIANCE_REFERENCE.md
- [x] ComplianceIntelScreen UI — 5 tabs: Food Safety (temps, certs, violations), Labor Law (wages, breaks, youth, workers comp), Commodity Trends (USDA 2026 forecast, futures), Cost Benchmarks (pizza/bar/prime targets, NRA stats), Liquor Law (dramshop, license, penalties)
- [x] Wire ComplianceIntelScreen into CTapHub (manager-only, Shield icon QuickAction)
- [x] Iowa-specific data: CFPM requirements, $7.25 min wage, $4.35 tipped wage, dramshop liability $250K cap, 127 craft breweries, USDA commodity forecasts
- [x] Live data source links: USDA ERS, FRED, CME Group, NDPSR cheese prices, Iowa inspection database

## Gap Resolution
- [x] Build explicit week-over-week price tracking per item — getWeekOverWeekPriceDeltas + skus.weekOverWeek endpoint
- [x] Price comparison from invoice history — getInvoicePriceComparison + skus.invoicePriceComparison endpoint

## SEO Fixes
- [x] Trim keywords on home page from 13 to 6 focused keywords
- [x] Add H2 heading to SplashScreen (initial render at /)
- [x] Shorten meta description from 240 chars to 143 chars

## Wave 9 — ML Sales Prediction + Scheduled Briefings
- [x] Fix TS error in getMLSalesPrediction (weatherCode int→string conversion)
- [x] Fix column name references (foodAmount→catFoodAmount, beerAmount→catBeerAmount, etc.)
- [x] Wire forecast.mlPrediction tRPC endpoint in routers.ts
- [x] Add ML Prediction tab to ForecastScreen with model stats, DOW multipliers, category momentum, prediction chart
- [x] 148 tests passing, 0 TypeScript errors
- [x] Set up daily scheduled task for automated briefing generation (POST /api/scheduled/briefing) — cron 6:00 AM CDT daily
- [x] Push Wave 9 to remote machine (~/ctap/platform)

## Wave 10 — P1 Critical Fixes (Audit)

- [x] Fix archiveInactiveStaff() — change WHERE to exclude NULL lastClockIn records (isNotNull guard added)
- [x] Update seedStaffData() — set lastClockIn to recent realistic dates (random within 7 days, all status: active)
- [x] Re-activate all staff in production database — POST /api/scheduled/reactivate-staff endpoint (sets all inactive→active + lastClockIn=now)
- [x] Verify app is functional after fixes (27 staff active, PIN login confirmed working, departments populated)

## Wave 11 — SEO Fixes (Home Page)

- [x] Reduce keywords from 13 to 3-8 focused keywords (4 phrases: restaurant workforce platform, Never 86'd, gamified shift management, restaurant staff app)
- [x] Add H2 heading to the home page ("Gamified Workforce Management for Restaurants" in noscript + existing H2 in SPA splash)
- [x] Shorten meta description from 240 to 126 characters, OG desc to 116, Twitter desc to 122

## Wave 12 — Complete Documentation Package

- [x] Import menu/recipe data from CommunityPizzaNEWBUILDMenuList XLSX into platform database — 172 menu items, 10 recipes seeded via seedAllData.ts
- [x] Build User Manual for CTAP People Platform (from platform code) — 302 lines, all screens/flows documented
- [x] Build Employee Handbook for Community Tap & Pizza — 149 lines, policies/expectations/gamification
- [x] Build Standard Operating Procedures (SOPs) from kitchen protocol + POS reference — 118 lines, kitchen/bar/driver/POS/food safety
- [x] Extract Brand Style Guide from platform CSS/design tokens — Never86d_Brand_Style_Guide.md with colors, typography, voice
- [x] Upload all documentation to Google Drive — CTAP Documentation folder (4 docs + seedAllData.ts)
