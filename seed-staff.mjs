/**
 * Seed script — populates the staff table with all 27 real CTap employees.
 * Run: node seed-staff.mjs
 */
import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) { console.error("DATABASE_URL not set"); process.exit(1); }

const staff = [
  // ── OWNERS ──
  { firstName: "Mychael", lastName: "Mueller", department: "management", jobRole: "owner", isKey: true, canAuth: true, pin: "8686", empNum: "001" },
  { firstName: "Sally", lastName: "Hart", department: "management", jobRole: "owner", isKey: true, canAuth: true, pin: "8687", empNum: "002" },

  // ── MANAGERS ──
  { firstName: "Gavin", lastName: "Thomas", department: "management", jobRole: "key_manager", isKey: true, canAuth: true, pin: "1234", empNum: "003" },
  { firstName: "Moe", lastName: "Thomas", department: "kitchen", jobRole: "kitchen_manager", isKey: true, canAuth: true, pin: "1235", empNum: "004" },
  { firstName: "Tom", lastName: "Dorthy", department: "kitchen", jobRole: "kitchen_manager", isKey: true, canAuth: true, pin: "1236", empNum: "005" },

  // ── KITCHEN KEYS ──
  { firstName: "Che", lastName: "", department: "kitchen", jobRole: "kitchen_key", isKey: true, canAuth: true, pin: "2001", empNum: "006" },
  { firstName: "Steven", lastName: "Klein", department: "kitchen", jobRole: "kitchen_key", isKey: true, canAuth: true, pin: "2002", empNum: "007" },

  // ── BAR STAFF ──
  { firstName: "Jessica", lastName: "Gailey", department: "bar", jobRole: "bartender", isKey: false, canAuth: false, pin: "3001", empNum: "054" },
  { firstName: "Karlee", lastName: "Sturtz", department: "bar", jobRole: "bartender", isKey: false, canAuth: false, pin: "3002", empNum: "009" },
  { firstName: "Ashley", lastName: "Holding", department: "bar", jobRole: "bartender", isKey: false, canAuth: false, pin: "3003", empNum: "137" },
  { firstName: "Kenzy", lastName: "Thompson", department: "bar", jobRole: "bartender", isKey: false, canAuth: false, pin: "3004", empNum: "011" },
  { firstName: "Jeri", lastName: "Wilson", department: "bar", jobRole: "bartender", isKey: false, canAuth: false, pin: "3005", empNum: "012" },
  { firstName: "Bryson", lastName: "Cook", department: "bar", jobRole: "bartender", isKey: false, canAuth: false, pin: "3006", empNum: "013" },
  { firstName: "Kaillee", lastName: "Miller", department: "bar", jobRole: "bartender", isKey: false, canAuth: false, pin: "3007", empNum: "014" },
  { firstName: "Samantha", lastName: "Swearingen", department: "bar", jobRole: "bartender", isKey: false, canAuth: false, pin: "3008", empNum: "015" },
  { firstName: "Azaria", lastName: "Silvey", department: "bar", jobRole: "bartender", isKey: false, canAuth: false, pin: "3009", empNum: "016" },

  // ── KITCHEN CREW ──
  { firstName: "Ryan", lastName: "", department: "kitchen", jobRole: "line_cook", isKey: false, canAuth: false, pin: "4001", empNum: "017" },
  { firstName: "Aundrik", lastName: "", department: "kitchen", jobRole: "line_cook", isKey: false, canAuth: false, pin: "4002", empNum: "018" },
  { firstName: "Audrey", lastName: "", department: "kitchen", jobRole: "line_cook", isKey: false, canAuth: false, pin: "4003", empNum: "019" },
  { firstName: "Nash", lastName: "", department: "kitchen", jobRole: "line_cook", isKey: false, canAuth: false, pin: "4004", empNum: "020" },
  { firstName: "Brody", lastName: "", department: "kitchen", jobRole: "line_cook", isKey: false, canAuth: false, pin: "4005", empNum: "021" },
  { firstName: "Max", lastName: "", department: "kitchen", jobRole: "line_cook", isKey: false, canAuth: false, pin: "4006", empNum: "022" },
  { firstName: "Dustin", lastName: "", department: "kitchen", jobRole: "line_cook", isKey: false, canAuth: false, pin: "4007", empNum: "023" },
  { firstName: "Tyson", lastName: "", department: "kitchen", jobRole: "line_cook", isKey: false, canAuth: false, pin: "4008", empNum: "024" },
  { firstName: "Doc", lastName: "", department: "kitchen", jobRole: "line_cook", isKey: false, canAuth: false, pin: "4009", empNum: "025" },
  { firstName: "Ian", lastName: "", department: "kitchen", jobRole: "line_cook", isKey: false, canAuth: false, pin: "4010", empNum: "026" },
  { firstName: "Michael", lastName: "", department: "kitchen", jobRole: "line_cook", isKey: false, canAuth: false, pin: "4011", empNum: "027" },
];

async function seed() {
  const conn = await mysql.createConnection(DATABASE_URL);
  console.log("Connected to database.");

  // Check if staff already seeded
  const [rows] = await conn.execute("SELECT COUNT(*) as cnt FROM staff");
  if (rows[0].cnt > 0) {
    console.log(`Staff table already has ${rows[0].cnt} rows. Skipping seed.`);
    await conn.end();
    return;
  }

  for (const s of staff) {
    await conn.execute(
      `INSERT INTO staff (firstName, lastName, employeeNumber, department, jobRole, isKeyEmployee, canAuthPayouts, pin, status, totalPoints, currentStreak, weeklyVoids, schedulePriority)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, 0, 50)`,
      [
        s.firstName, s.lastName, s.empNum, s.department, s.jobRole,
        s.isKey ? 1 : 0, s.canAuth ? 1 : 0, s.pin,
        Math.floor(Math.random() * 500) + 100, // random starting points
        Math.floor(Math.random() * 10), // random streak
      ]
    );
    console.log(`  ✓ ${s.firstName} ${s.lastName} (${s.jobRole})`);
  }

  // Seed sample checklists
  const checklists = [
    { name: "Pizza Nightly Closing", department: "kitchen", type: "closing", items: JSON.stringify([
      { task: "Clean all pizza stations", required: true, order: 1 },
      { task: "Wrap and date all dough", required: true, order: 2 },
      { task: "Clean and sanitize prep tables", required: true, order: 3 },
      { task: "Empty all trash cans", required: true, order: 4 },
      { task: "Sweep and mop kitchen floor", required: true, order: 5 },
      { task: "Clean fryer — drain, wipe, refill", required: true, order: 6 },
      { task: "Wipe down all equipment exteriors", required: true, order: 7 },
      { task: "Check walk-in temps and log", required: true, order: 8 },
      { task: "Restock pizza boxes", required: true, order: 9 },
      { task: "Clean slicer — disassemble, wash, sanitize", required: true, order: 10 },
      { task: "Wipe down hoods and vents", required: false, order: 11 },
      { task: "Check all food labels and dates", required: true, order: 12 },
      { task: "Turn off ovens and grills", required: true, order: 13 },
      { task: "Lock back door", required: true, order: 14 },
    ])},
    { name: "Bar Closing Checklist", department: "bar", type: "closing", items: JSON.stringify([
      { task: "Wipe down all bar tops and tables", required: true, order: 1 },
      { task: "Clean and sanitize beer taps", required: true, order: 2 },
      { task: "Restock all bottles and garnishes", required: true, order: 3 },
      { task: "Empty tip jars and count", required: true, order: 4 },
      { task: "Run dishwasher — final load", required: true, order: 5 },
      { task: "Clean glass washer", required: true, order: 6 },
      { task: "Sweep and mop bar floor", required: true, order: 7 },
      { task: "Check all cooler temps", required: true, order: 8 },
      { task: "Lock liquor cabinet", required: true, order: 9 },
      { task: "Run end-of-day Z report", required: true, order: 10 },
    ])},
    { name: "Opening Checklist", department: "all", type: "opening", items: JSON.stringify([
      { task: "Unlock doors and disarm alarm", required: true, order: 1 },
      { task: "Turn on all lights and signage", required: true, order: 2 },
      { task: "Check voicemail and messages", required: true, order: 3 },
      { task: "Verify 86'd list from last night", required: true, order: 4 },
      { task: "Check walk-in and freezer temps", required: true, order: 5 },
      { task: "Start fryers and ovens", required: true, order: 6 },
      { task: "Set up POS stations", required: true, order: 7 },
      { task: "Count cash drawer", required: true, order: 8 },
    ])},
  ];

  for (const cl of checklists) {
    await conn.execute(
      "INSERT INTO checklists (name, department, type, items) VALUES (?, ?, ?, ?)",
      [cl.name, cl.department, cl.type, cl.items]
    );
    console.log(`  ✓ Checklist: ${cl.name}`);
  }

  // Seed a sample daily briefing
  await conn.execute(
    `INSERT INTO daily_briefings (date, salesYesterday, ordersYesterday, eightySixedItems, specials, openIssues, shoutouts)
     VALUES (NOW(), '5318.00', 172, ?, ?, ?, ?)`,
    [
      JSON.stringify(["Brisket"]),
      JSON.stringify([{ name: "Friday Special", description: "Crab Rangoon Pizza" }]),
      JSON.stringify([{ description: "Fryer thermostat — maintenance coming Tuesday", priority: "high" }]),
      JSON.stringify([{ staffName: "Karlee Sturtz", reason: "Zero voids all week" }]),
    ]
  );
  console.log("  ✓ Daily briefing seeded");

  console.log("\n✅ Seed complete — 27 staff, 3 checklists, 1 briefing.");
  await conn.end();
}

seed().catch(e => { console.error(e); process.exit(1); });
