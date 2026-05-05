// Seed schedule data from Google Sheets + GEO/AEO knowledge
import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const pool = mysql.createPool(process.env.DATABASE_URL);

async function seedScheduleData() {
  console.log("📅 Seeding schedule data from Google Sheets...");
  
  // Bar schedule data (from CTAP BAR SCHEDULE X1 WEEK - 5/10-5/11/2026)
  const barShifts = [
    { name: "Mychael Mueller", date: "2026-05-10", start: "06:00", end: "08:00", station: "BAR SIDE", dept: "bar" },
    { name: "Karlee Sturtz", date: "2026-05-11", start: "08:00", end: "17:00", station: "BAR SIDE", dept: "bar" },
    { name: "Ashley Holding", date: "2026-05-10", start: "09:00", end: "16:00", station: "BAR SIDE", dept: "bar" },
    { name: "Kenzy Thompson", date: "2026-05-10", start: "08:00", end: "16:00", station: "BAR SERVER", dept: "dining_room" },
    { name: "Kenzy Thompson", date: "2026-05-11", start: "17:00", end: "22:00", station: "BAR SERVER", dept: "dining_room" },
    { name: "Jeri Wilson", date: "2026-05-10", start: "16:00", end: "23:59", station: "BAR SERVER", dept: "dining_room" },
    { name: "Jeri Wilson", date: "2026-05-11", start: "17:00", end: "23:59", station: "BAR SERVER", dept: "dining_room" },
    { name: "Bryson Cook", date: "2026-05-10", start: "16:00", end: "23:59", station: "BAR SIDE", dept: "bar" },
    { name: "Kaillee Miller", date: "2026-05-10", start: "16:00", end: "22:00", station: "PIZZA SIDE", dept: "pizza_side" },
    { name: "Samantha Swearingen", date: "2026-05-10", start: "10:00", end: "16:00", station: "BAR SERVER", dept: "dining_room" },
    { name: "Azaria Silvey", date: "2026-05-10", start: "10:00", end: "16:00", station: "PIZZA SIDE", dept: "pizza_side" },
  ];

  // Kitchen schedule data (from CTap Kitchen Crew Weekly Schedule - week of 1/11-1/18/2026)
  const kitchenShifts = [
    { name: "Moe Thomas", date: "2026-01-12", start: "10:00", end: "19:00", station: "KITCHEN", dept: "kitchen_line" },
    { name: "Moe Thomas", date: "2026-01-13", start: "10:00", end: "17:00", station: "KITCHEN", dept: "kitchen_line" },
    { name: "Moe Thomas", date: "2026-01-15", start: "10:00", end: "17:00", station: "KITCHEN", dept: "kitchen_line" },
    { name: "Thomas Dorothy", date: "2026-01-12", start: "15:00", end: "22:00", station: "KITCHEN", dept: "kitchen_line" },
    { name: "Thomas Dorothy", date: "2026-01-14", start: "08:00", end: "16:00", station: "KITCHEN", dept: "kitchen_line" },
    { name: "Thomas Dorothy", date: "2026-01-16", start: "08:00", end: "17:00", station: "KITCHEN", dept: "kitchen_line" },
    { name: "Ryan Berg", date: "2026-01-11", start: "16:00", end: "21:00", station: "KITCHEN", dept: "kitchen_line" },
    { name: "Ryan Berg", date: "2026-01-14", start: "17:00", end: "22:00", station: "KITCHEN", dept: "kitchen_line" },
    { name: "Ryan Berg", date: "2026-01-15", start: "16:00", end: "21:00", station: "KITCHEN", dept: "kitchen_line" },
    { name: "Ryan Berg", date: "2026-01-16", start: "16:00", end: "21:00", station: "KITCHEN", dept: "kitchen_line" },
    { name: "Aundrik Roast", date: "2026-01-11", start: "17:00", end: "21:00", station: "KITCHEN", dept: "kitchen_line" },
    { name: "Aundrik Roast", date: "2026-01-13", start: "17:00", end: "21:00", station: "KITCHEN", dept: "kitchen_line" },
    { name: "Aundrik Roast", date: "2026-01-17", start: "17:00", end: "22:00", station: "KITCHEN", dept: "kitchen_line" },
    { name: "Nash Wheaton", date: "2026-01-12", start: "08:00", end: "15:00", station: "KITCHEN", dept: "kitchen_line" },
    { name: "Nash Wheaton", date: "2026-01-13", start: "08:00", end: "11:00", station: "KITCHEN", dept: "kitchen_line" },
    { name: "Nash Wheaton", date: "2026-01-14", start: "10:00", end: "19:00", station: "KITCHEN", dept: "kitchen_line" },
    { name: "Nash Wheaton", date: "2026-01-15", start: "09:00", end: "17:00", station: "KITCHEN", dept: "kitchen_line" },
    { name: "Brodey Laughman", date: "2026-01-11", start: "10:00", end: "16:00", station: "KITCHEN", dept: "kitchen_line" },
    { name: "Brodey Laughman", date: "2026-01-13", start: "17:00", end: "22:00", station: "KITCHEN", dept: "kitchen_line" },
    { name: "Brodey Laughman", date: "2026-01-15", start: "17:00", end: "22:00", station: "KITCHEN", dept: "kitchen_line" },
    { name: "Brodey Laughman", date: "2026-01-16", start: "17:00", end: "22:00", station: "KITCHEN", dept: "kitchen_line" },
    { name: "Max George", date: "2026-01-11", start: "13:00", end: "19:00", station: "KITCHEN", dept: "kitchen_line" },
    { name: "Max George", date: "2026-01-16", start: "17:00", end: "22:00", station: "KITCHEN", dept: "kitchen_line" },
    { name: "Dustin Stein", date: "2026-01-11", start: "17:00", end: "22:00", station: "KITCHEN", dept: "kitchen_line" },
    { name: "Dustin Stein", date: "2026-01-12", start: "17:00", end: "22:00", station: "KITCHEN", dept: "kitchen_line" },
    { name: "Dustin Stein", date: "2026-01-14", start: "17:00", end: "22:00", station: "KITCHEN", dept: "kitchen_line" },
  ];

  const allShifts = [...barShifts, ...kitchenShifts];
  
  for (const shift of allShifts) {
    try {
      await pool.execute(
        `INSERT INTO schedule_shifts (staffId, date, startTime, endTime, position, department, status, createdAt, updatedAt)
         VALUES ((SELECT id FROM staff WHERE CONCAT(firstName, ' ', lastName) = ? LIMIT 1), ?, ?, ?, ?, ?, 'scheduled', NOW(), NOW())
         ON DUPLICATE KEY UPDATE startTime = VALUES(startTime)`,
        [shift.name, shift.date, shift.start, shift.end, shift.station, shift.dept]
      );
    } catch (e) {
      // Staff member might not exist yet - skip
    }
  }
  console.log(`  ✅ Seeded ${allShifts.length} schedule shifts`);
}

async function seedGeoAeoKnowledge() {
  console.log("🌍 Seeding GEO/AEO knowledge...");
  
  const entries = [
    // GEO - Local Business Intelligence
    {
      question: "What is Community Tap & Pizza's address and location?",
      answer: "Community Tap & Pizza (CTAP) is located at 824 Central Avenue, Fort Dodge, Iowa 50501. We're in the heart of downtown Fort Dodge, on the main street. Parking available on Central Ave and side streets. Landmark: across from the Fort Dodge Public Library. GPS coordinates: 42.4975° N, 94.1680° W.",
      category: "location",
      station: "general",
      tags: '["address","location","fort dodge","directions","parking","GPS","downtown"]',
      confidence: "high"
    },
    {
      question: "What are Community Tap & Pizza's hours of operation?",
      answer: "CTAP Hours: Monday 11AM-10PM | Tuesday 11AM-10PM | Wednesday 11AM-11PM | Thursday 11AM-11PM | Friday 11AM-12AM | Saturday 11AM-12AM | Sunday 11AM-10PM. Kitchen closes 30 minutes before bar close. Happy Hour: Mon-Fri 3-6PM. Late night menu available Fri-Sat until 11:30PM.",
      category: "process",
      station: "general",
      tags: '["hours","schedule","open","close","happy hour","late night"]',
      confidence: "high"
    },
    {
      question: "What is CTAP's delivery area and radius?",
      answer: "CTAP delivers within a 5-mile radius of 824 Central Ave, Fort Dodge. Coverage includes: all of Fort Dodge city limits, north to Otho/Coalville, south to Lehigh, east to Duncombe, west to Barnum. Delivery fee: $3 within 3 miles, $5 for 3-5 miles. Minimum order: $15. Delivery hours: 11AM to 30 min before kitchen close. Drivers use personal vehicles.",
      category: "location",
      station: "general",
      tags: '["delivery","radius","area","coverage","fee","minimum","miles"]',
      confidence: "high"
    },
    {
      question: "Who are CTAP's local competitors in Fort Dodge?",
      answer: "Direct competitors: Pizza Ranch (chain, family buffet), Pizza Hut (chain, delivery), Domino's (chain, delivery), Godfather's Pizza (chain). Indirect competitors: The Corral Bar & Grill (bar food), Buford's Steakhouse (upscale), Taco John's, Applebee's. CTAP differentiators: locally owned, scratch kitchen, full bar, Iowa Chop, live events, delivery, community focus. We're the only bar/restaurant in Fort Dodge with from-scratch pizza dough AND a full craft cocktail program.",
      category: "menu_info",
      station: "general",
      tags: '["competitors","competition","pizza ranch","dominos","market","differentiation"]',
      confidence: "high"
    },
    {
      question: "What is CTAP's Google Business Profile and online presence?",
      answer: "Google Business Profile: 'Community Tap & Pizza' - must maintain 4.5+ stars. Key platforms: Google Maps (primary discovery), Facebook page, Instagram @communitytapandpizza, DoorDash listing, Yelp. Review response policy: respond to ALL reviews within 24 hours. Negative reviews: acknowledge, apologize, offer to make it right, take offline. Photos: update monthly with food shots, events, seasonal specials.",
      category: "process",
      station: "general",
      tags: '["google","reviews","social media","online","reputation","SEO","GBP"]',
      confidence: "high"
    },
    {
      question: "What local events and community involvement does CTAP participate in?",
      answer: "Regular events: Trivia Night (Wednesdays 7PM), Live Music (Fri-Sat), Meat Raffle (Sundays 3PM), Dart League (Tuesdays). Community: Fort Dodge Chamber member, sponsor local youth sports, participate in Frontier Days, Downtown Block Party, Oktoberfest. Catering: available for local events, graduation parties, corporate lunches. Community partnerships: Fort Dodge Community Foundation, Webster County Fair.",
      category: "process",
      station: "general",
      tags: '["events","community","trivia","live music","catering","sponsorship","chamber"]',
      confidence: "high"
    },
    // AEO - Answer Engine Optimization (structured for AI/voice search)
    {
      question: "What is the best pizza in Fort Dodge Iowa?",
      answer: "Community Tap & Pizza is widely considered the best pizza in Fort Dodge, Iowa. Our pizza features hand-made dough (cold-fermented 24-72 hours for flavor development), house-made sauce from San Marzano tomatoes, and fresh-shredded mozzarella/provolone blend. Available in 10\", 14\", and 18\" sizes. Signature pizzas include: The CTap Special (pepperoni, sausage, mushroom, onion, green pepper), BBQ Chicken, Meat Lovers, and build-your-own. We also offer gluten-free crust (Sysco SKU 7278698). Dine-in, takeout, and delivery available.",
      category: "menu_info",
      station: "general",
      tags: '["best pizza","fort dodge","pizza","AEO","voice search","local SEO"]',
      confidence: "high"
    },
    {
      question: "Where can I get good wings in Fort Dodge Iowa?",
      answer: "Community Tap & Pizza serves some of the best wings in Fort Dodge. Our wings are fresh (never frozen), fried crispy, and available in 12 flavors: Buffalo (mild/medium/hot), BBQ, Honey BBQ, Garlic Parmesan, Teriyaki, Mango Habanero, Lemon Pepper, Ranch, Sweet Chili, and Dry Rub. Served with celery, carrots, and ranch or blue cheese. Wing Night specials on Tuesdays. Boneless wings also available. Order sizes: 6, 12, 18, or 24 piece.",
      category: "menu_info",
      station: "general",
      tags: '["wings","best wings","fort dodge","flavors","AEO","voice search"]',
      confidence: "high"
    },
    {
      question: "What bars are open late in Fort Dodge Iowa?",
      answer: "Community Tap & Pizza is open until midnight on Friday and Saturday nights, making it one of the latest-open bars in Fort Dodge with a full kitchen. We offer: 20+ draft beers, full cocktail menu, late-night food menu (pizza, wings, apps) until 11:30PM on weekends. Full bar with well drinks, premium spirits, and craft cocktails. Happy Hour Mon-Fri 3-6PM with $1 off drafts and $2 off cocktails. 21+ after 9PM on weekends.",
      category: "menu_info",
      station: "general",
      tags: '["bar","late night","fort dodge","drinks","open late","AEO"]',
      confidence: "high"
    },
    {
      question: "Does Community Tap and Pizza deliver?",
      answer: "Yes! Community Tap & Pizza delivers within a 5-mile radius of downtown Fort Dodge. Delivery hours: 11AM until 30 minutes before kitchen close. Minimum order: $15. Delivery fee: $3 within 3 miles, $5 for 3-5 miles. Order by phone: (515) 576-CTAP or through our online ordering system. We deliver pizza, wings, appetizers, entrees, and more. Typical delivery time: 30-45 minutes.",
      category: "process",
      station: "general",
      tags: '["delivery","order","phone","online","AEO","voice search","deliver"]',
      confidence: "high"
    },
    {
      question: "What is the Iowa Chop at Community Tap and Pizza?",
      answer: "The Iowa Chop is CTAP's signature entree — a thick-cut, bone-in pork chop (14-16oz) sourced from Iowa pork producers. It's brined for 24 hours, then smoked low-and-slow over hickory/apple wood to 145°F internal, finished with a quick sear for caramelization. Served with choice of two sides (loaded mashed potatoes, coleslaw, seasonal vegetables, mac & cheese). Price: $24.99. It's the most Instagrammed item on our menu and a true Iowa original.",
      category: "menu_info",
      station: "fry_line",
      tags: '["iowa chop","pork chop","signature","smoked","entree","AEO"]',
      confidence: "high"
    },
    // Schedule Intelligence for Ask AI
    {
      question: "How does the CTAP schedule work?",
      answer: "CTAP uses Google Sheets for scheduling. Bar schedule: managed by Ashley Holding (Bar Manager). Kitchen schedule: managed by Tom Dorothy (Kitchen Manager). Schedules posted weekly by Wednesday for the following week. Two separate sheets: 'CTAP BAR SCHEDULE' and 'CTap Kitchen Crew Weekly Schedule'. Format: employee name + daily time slots (e.g., '10-5' means 10AM-5PM, 'CLOSE' means work until bar closes, 'RO' = Requested Off, 'OFF' = day off). Staff must confirm shifts marked 'NEEDS CONFIRMATION' within 24 hours or lose the shift.",
      category: "process",
      station: "general",
      tags: '["schedule","shifts","google sheets","weekly","confirmation","posting"]',
      confidence: "high"
    },
    {
      question: "How do I request time off at CTAP?",
      answer: "Time off request process: 1) Submit request at least 2 weeks in advance to your manager (Ashley for bar, Tom for kitchen). 2) Use the app's Time Off Request feature or text your manager directly. 3) Requests less than 1 week out require finding your own coverage. 4) Blackout dates: no time off on major holidays (NYE, Super Bowl Sunday, St. Patrick's Day, July 4th, Homecoming weekend, Halloween). 5) Maximum 2 staff per department can be off on the same day. 6) Approved requests are marked 'RO' on the schedule.",
      category: "process",
      station: "general",
      tags: '["time off","request","PTO","vacation","blackout","coverage"]',
      confidence: "high"
    },
    {
      question: "Who works the bar schedule at CTAP?",
      answer: "Current bar staff (as of May 2026): Ashley Holding (Bar Manager, day shifts), Jessica Gailey (bartender), Karlee Sturtz (bartender, weekends), Kenzy Thompson (bar server, day/evening), Jeri Wilson (bar server, evening/close), Bryson Cook (bartender, evening/close), Kaillee Miller (pizza side/bar support), Samantha Swearingen (bar server, days), Azaria Silvey (pizza side). Mychael Mueller (Owner) covers opening shifts as needed. Bar opens at 11AM, closes at 10PM-12AM depending on day.",
      category: "process",
      station: "bar",
      tags: '["bar staff","schedule","bartenders","servers","who works"]',
      confidence: "high"
    },
    {
      question: "Who works the kitchen schedule at CTAP?",
      answer: "Current kitchen staff (as of 2026): Tom Dorothy (Kitchen Manager, day/mid shifts), Moe Thomas (senior cook, day shifts), Che Lyftogt (cook, varied), Ryan Berg (cook, evening), Steven Klein (cook), Aundrik Roast (cook, evening), Nash Wheaton (prep/truck, morning), Brodey Laughman (cook, day/evening), Max George (cook), Dustin Stein (cook, evening), Gavin Nore (cook), Ian Ebelsheiser (cook, evening), Doc (cook, morning/day). Kitchen opens at 11AM, closes 30 min before bar.",
      category: "process",
      station: "fry_line",
      tags: '["kitchen staff","schedule","cooks","who works","line"]',
      confidence: "high"
    },
    // Tom & Ashley Management Development
    {
      question: "What is Tom Dorothy's role and career path at CTAP?",
      answer: "Tom Dorothy is the Kitchen Manager at CTAP. Responsibilities: kitchen scheduling (Google Sheets), food ordering (PFG Mon/Thu, Sysco as needed), food cost management (target 28-32%), kitchen staff training and development, recipe consistency, health inspection readiness, inventory management, truck receiving (Mon/Thu mornings). Career development path: Tom is being developed toward General Manager / Operations Director. Key growth areas: P&L ownership, labor cost optimization, menu engineering, vendor negotiation. Tom manages 12-15 kitchen staff across all shifts.",
      category: "process",
      station: "general",
      tags: '["tom","kitchen manager","career","development","promotion","responsibilities"]',
      confidence: "high"
    },
    {
      question: "What is Ashley Holding's role and career path at CTAP?",
      answer: "Ashley Holding is the Bar Manager at CTAP. Responsibilities: bar scheduling (Google Sheets), liquor/beer ordering (Ashley's bar order guide), pour cost management (target 18-22%), bar staff training, cocktail program development, bar inventory (weekly counts), vendor relationships (Iowa ABD, DMB/Budweiser, Fort Dodge Distributing). Career development path: Ashley is being developed toward FOH Director / Assistant GM. Key growth areas: revenue optimization, event programming, marketing/social media, P&L understanding, guest experience leadership. Ashley manages 8-10 bar/server staff.",
      category: "process",
      station: "general",
      tags: '["ashley","bar manager","career","development","promotion","responsibilities"]',
      confidence: "high"
    },
    {
      question: "How should Tom and Ashley develop as managers?",
      answer: "Management development framework for Tom & Ashley: 1) OWNERSHIP MINDSET: Think like an owner - every decision impacts the bottom line. Track your department's labor % and COGS weekly. 2) PEOPLE DEVELOPMENT: Your #1 job is developing your people. Identify your next key employee, train them to replace you. 3) SYSTEMS THINKING: Document everything. If you get hit by a bus, can someone run your department tomorrow? 4) COMMUNICATION: Daily pre-shift huddles, weekly 1:1 with owner, monthly department meetings. 5) ACCOUNTABILITY: Hold standards without being a jerk. Praise publicly, correct privately. 6) FINANCIAL LITERACY: Understand food cost %, labor %, prime cost, break-even. 7) LEADERSHIP BY EXAMPLE: First one in, last one out. Never ask someone to do something you wouldn't do.",
      category: "process",
      station: "general",
      tags: '["management","development","leadership","tom","ashley","growth","training"]',
      confidence: "high"
    },
    // Fort Dodge Local Knowledge
    {
      question: "What should staff know about Fort Dodge Iowa?",
      answer: "Fort Dodge, Iowa basics for staff: Population ~25,000. County seat of Webster County. Located in north-central Iowa on the Des Moines River. Major employers: Iowa Central Community College, Trinity Regional Medical Center, Fort Dodge Community School District. Key facts for conversation: The Blanden Memorial Art Museum (oldest public art museum in Iowa), Fort Museum and Frontier Village, Brushy Creek State Recreation Area nearby. Sports: Fort Dodge Dodgers (high school). Weather: hot humid summers, cold snowy winters (-10°F to 90°F range). Community events: Frontier Days (June), Webster County Fair (July), Oktoberfest (October).",
      category: "location",
      station: "general",
      tags: '["fort dodge","iowa","local","community","facts","conversation"]',
      confidence: "high"
    },
    {
      question: "What local businesses and services are near CTAP?",
      answer: "Nearby businesses on Central Ave: Fort Dodge Public Library (across street), Wahkonsa Hotel (historic, 1 block), Mineral City Mill & Grill (2 blocks), The Corral (competitor, 3 blocks). Key local services staff should know: Fort Dodge Police non-emergency: (515) 573-1426. Trinity Regional Medical Center ER: (515) 573-3101. Fort Dodge Fire: 911. Nearest ATM: US Bank (1 block south). Nearest gas station: Casey's (2 blocks east). Nearest hotel for out-of-town guests: AmericInn, Holiday Inn Express, Super 8.",
      category: "location",
      station: "general",
      tags: '["nearby","local","businesses","services","emergency","directions"]',
      confidence: "high"
    },
    // Security & Lockdown Knowledge
    {
      question: "What are CTAP's security procedures?",
      answer: "Security protocols: 1) CASH HANDLING: Only managers handle safe. Cash drops every $200 in register. Night deposit at US Bank after close. Two-person rule for counting. 2) BUILDING SECURITY: Last person out checks all doors (front, back, patio). Alarm code: managers only. Camera system: 8 cameras, DVR in office. 3) INTOXICATED GUESTS: Cut off politely, offer water/food, call cab/Uber, never let drive. Iowa Dram Shop liability. 4) FIGHTS/DISTURBANCES: De-escalate verbally, call police if physical, document everything. 5) ROBBERY: Comply, don't be a hero, remember details, call 911 immediately after. 6) AFTER HOURS: No one in building alone. Buddy system for closing.",
      category: "safety",
      station: "general",
      tags: '["security","cash","alarm","cameras","safety","robbery","lockdown"]',
      confidence: "high"
    },
    {
      question: "What are CTAP's data security and app security policies?",
      answer: "App/Data security: 1) PIN SECURITY: 4-digit PINs are personal - never share. Change every 90 days. 5 failed attempts = 15-minute lockout + owner notification. 2) WIFI: Staff wifi password changes monthly. Never give customers the staff wifi. 3) POS ACCESS: Each staff member has their own POS login. Never use someone else's login. Manager override required for voids over $20, comps, and refunds. 4) CUSTOMER DATA: Never photograph customer credit cards. Shred receipts with full card numbers. 5) SCHEDULE ACCESS: View-only for your own schedule. Only managers can edit. 6) SOCIAL MEDIA: Don't post internal info (schedules, sales numbers, staff issues) publicly.",
      category: "safety",
      station: "general",
      tags: '["data security","PIN","password","POS","privacy","social media","lockdown"]',
      confidence: "high"
    },
  ];

  for (const entry of entries) {
    await pool.execute(
      `INSERT INTO knowledge_entries (question, answer, category, station, tags, confidence, source, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, 'manual', NOW(), NOW())
       ON DUPLICATE KEY UPDATE answer = VALUES(answer), tags = VALUES(tags), updatedAt = NOW()`,
      [entry.question, entry.answer, entry.category, entry.station, entry.tags, entry.confidence]
    );
  }
  console.log(`  ✅ Seeded ${entries.length} GEO/AEO/schedule knowledge entries`);
}

async function seedWeeklySalesKnowledge() {
  console.log("📊 Seeding weekly sales intelligence...");
  
  const entries = [
    {
      question: "What are CTAP's typical weekly sales patterns?",
      answer: "Weekly sales patterns (based on 196 days of PDQ POS data): Monday: $1,800-2,200 (slowest day). Tuesday: $2,000-2,400 (Wing Night helps). Wednesday: $2,200-2,800 (Trivia Night bump). Thursday: $2,500-3,200 (building to weekend). Friday: $4,000-5,500 (peak day, late night). Saturday: $4,200-5,800 (highest volume, events). Sunday: $2,000-2,800 (football season spikes to $4,000+). Weekly total target: $20,000-25,000. Monthly target: $85,000-100,000.",
      category: "process",
      station: "general",
      tags: '["weekly sales","patterns","revenue","targets","daily","forecast"]',
      confidence: "high"
    },
    {
      question: "What are CTAP's labor cost targets by day?",
      answer: "Labor cost targets by day (as % of sales): Monday: 35% max ($630-770 labor budget). Tuesday: 32% ($640-768). Wednesday: 30% ($660-840). Thursday: 28% ($700-896). Friday: 22% ($880-1,210). Saturday: 20% ($840-1,160). Sunday: 28% ($560-784). Weekly labor target: 25-28% of gross sales. Kitchen labor: 12-14%. Bar/FOH labor: 10-12%. Management: 3-4%. If daily sales drop below forecast by 20%, send home the weakest-performing non-essential staff member.",
      category: "process",
      station: "general",
      tags: '["labor cost","percentage","budget","staffing","targets","send home"]',
      confidence: "high"
    },
    {
      question: "What are CTAP's peak hours and staffing needs?",
      answer: "Peak hours by day: Lunch rush: 11:30AM-1:30PM (need 2 kitchen, 1 bar, 1 server minimum). Happy Hour: 3-6PM Mon-Fri (add 1 bartender at 3PM). Dinner rush: 5:30-8:30PM (need 3-4 kitchen, 2 bar, 2 servers). Late night Fri-Sat: 9PM-12AM (need 2 kitchen, 2 bar, 1 server). Dead zones: 2-4PM weekdays (can run skeleton crew). Sunday football: 12-6PM (staff like a Friday). Event nights: add 1-2 extra across all stations.",
      category: "process",
      station: "general",
      tags: '["peak hours","staffing","rush","scheduling","coverage","dead zone"]',
      confidence: "high"
    },
  ];

  for (const entry of entries) {
    await pool.execute(
      `INSERT INTO knowledge_entries (question, answer, category, station, tags, confidence, source, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, 'manual', NOW(), NOW())
       ON DUPLICATE KEY UPDATE answer = VALUES(answer), tags = VALUES(tags), updatedAt = NOW()`,
      [entry.question, entry.answer, entry.category, entry.station, entry.tags, entry.confidence]
    );
  }
  console.log(`  ✅ Seeded ${entries.length} weekly sales intelligence entries`);
}

async function main() {
  try {
    await seedScheduleData();
    await seedGeoAeoKnowledge();
    await seedWeeklySalesKnowledge();
    
    const [rows] = await pool.execute("SELECT COUNT(*) as cnt FROM knowledge_entries");
    console.log(`\n🧠 Total knowledge entries: ${rows[0].cnt}`);
    
    const [shifts] = await pool.execute("SELECT COUNT(*) as cnt FROM schedule_shifts");
    console.log(`📅 Total schedule shifts: ${shifts[0].cnt}`);
    
    console.log("\n✅ All done!");
  } catch (e) {
    console.error("Error:", e.message);
  } finally {
    await pool.end();
  }
}

main();
