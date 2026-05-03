/**
 * Seed remaining tables (achievements, missions, memories) that failed on first run.
 * Uses onDuplicateKeyUpdate to handle existing records.
 */
import { drizzle } from "drizzle-orm/mysql2";
import { sql } from "drizzle-orm";
import * as schema from "./drizzle/schema.ts";

const db = drizzle(process.env.DATABASE_URL);

async function seedAchievements() {
  console.log("🏆 Seeding achievement definitions...");
  const defs = [
    { slug: "rookie", name: "Rookie", description: "Complete 5 shifts", badge: "🟢", category: "onboarding", thresholdType: "cumulative", thresholdValue: 5, bonusPoints: 25, difficulty: "easy" },
    { slug: "iron_streak", name: "Iron Streak", description: "14-day consecutive on-time streak", badge: "🔥", category: "reliability", thresholdType: "consecutive", thresholdValue: 14, bonusPoints: 50, difficulty: "medium" },
    { slug: "clean_hands", name: "Clean Hands", description: "Zero voids in a full 30-day period", badge: "💎", category: "quality", thresholdType: "window", thresholdValue: 30, bonusPoints: 75, difficulty: "hard" },
    { slug: "machine", name: "Machine", description: "Complete 100 checklists", badge: "⚙️", category: "reliability", thresholdType: "cumulative", thresholdValue: 100, bonusPoints: 50, difficulty: "medium" },
    { slug: "voice", name: "Voice", description: "Submit 50 feedback entries", badge: "🎤", category: "engagement", thresholdType: "cumulative", thresholdValue: 50, bonusPoints: 50, difficulty: "medium" },
    { slug: "mentor", name: "Mentor", description: "Train 3 new employees on a station", badge: "🎓", category: "leadership", thresholdType: "cumulative", thresholdValue: 3, bonusPoints: 75, difficulty: "hard" },
    { slug: "ambassador", name: "Ambassador", description: "Post 10 social media posts tagged to the restaurant", badge: "📱", category: "engagement", thresholdType: "cumulative", thresholdValue: 10, bonusPoints: 50, difficulty: "medium" },
    { slug: "night_owl", name: "Night Owl", description: "Work 50 closing shifts", badge: "🦉", category: "longevity", thresholdType: "cumulative", thresholdValue: 50, bonusPoints: 50, difficulty: "medium" },
    { slug: "early_bird", name: "Early Bird", description: "Work 50 opening shifts", badge: "🐦", category: "longevity", thresholdType: "cumulative", thresholdValue: 50, bonusPoints: 50, difficulty: "medium" },
    { slug: "key_holder", name: "Key Holder", description: "Promoted to key employee status", badge: "🔑", category: "leadership", thresholdType: "milestone", thresholdValue: 1, bonusPoints: 100, difficulty: "hard" },
    { slug: "centurion", name: "Centurion", description: "Work 100 total shifts", badge: "💯", category: "longevity", thresholdType: "cumulative", thresholdValue: 100, bonusPoints: 75, difficulty: "medium" },
    { slug: "veteran", name: "Veteran", description: "1 year of active employment", badge: "⭐", category: "longevity", thresholdType: "cumulative", thresholdValue: 365, bonusPoints: 150, difficulty: "legendary" },
    { slug: "shutterbug", name: "Shutterbug", description: "Submit 25 verified photos", badge: "📸", category: "engagement", thresholdType: "cumulative", thresholdValue: 25, bonusPoints: 50, difficulty: "medium" },
    { slug: "brain_builder", name: "Brain Builder", description: "Contribute 10 approved knowledge corrections", badge: "🧠", category: "engagement", thresholdType: "cumulative", thresholdValue: 10, bonusPoints: 75, difficulty: "hard" },
  ];

  for (const def of defs) {
    await db.insert(schema.achievementDefinitions).values(def)
      .onDuplicateKeyUpdate({ set: { name: sql`VALUES(name)` } });
  }
  console.log(`  ✅ Seeded ${defs.length} achievement definitions`);
}

async function seedPhotoMissions() {
  console.log("📸 Seeding photo missions...");
  const missions = [
    { name: "Walk-In Inventory Snapshot", description: "Photo every shelf in the walk-in cooler.", category: "walk_in", pointsPerPhoto: 5, bonusPoints: 25, targetPhotoCount: 10 },
    { name: "Station Setup Check", description: "Photo your station at the start of shift.", category: "station_setup", pointsPerPhoto: 5, bonusPoints: 15, targetPhotoCount: 8 },
    { name: "Invoice Capture Sprint", description: "Photo every invoice that comes in this week.", category: "invoice", pointsPerPhoto: 10, bonusPoints: 50, targetPhotoCount: 10 },
    { name: "Equipment Health Check", description: "Photo all major equipment.", category: "equipment", pointsPerPhoto: 5, bonusPoints: 20, targetPhotoCount: 12 },
    { name: "Prep Station Documentation", description: "Photo your prep work.", category: "prep", pointsPerPhoto: 5, bonusPoints: 15, targetPhotoCount: 8 },
    { name: "Plate Presentation Gallery", description: "Photo finished plates before they go out.", category: "plate", pointsPerPhoto: 5, bonusPoints: 20, targetPhotoCount: 15 },
  ];

  for (const mission of missions) {
    await db.insert(schema.photoMissions).values(mission);
  }
  console.log(`  ✅ Seeded ${missions.length} photo missions`);
}

async function seedBriefingMemories() {
  console.log("💭 Seeding briefing memories...");
  const memories = [
    { factType: "event_pattern", fact: "Friday nights average 40% more revenue than weekdays.", relevanceScore: 90 },
    { factType: "event_pattern", fact: "4-7 PM generates 40% of daily revenue in just 3 hours.", relevanceScore: 85 },
    { factType: "event_pattern", fact: "2-3 PM is the dead zone — labor bleeds here.", relevanceScore: 75 },
    { factType: "event_pattern", fact: "10 PM-midnight runs 160%+ labor cost.", relevanceScore: 80 },
    { factType: "staff_pattern", fact: "Moe Thomas has the highest comp rate at $128.59/month.", relevanceScore: 70 },
    { factType: "vendor_change", fact: "PFG is the primary food vendor. Orders 2x/week, $2,800-3,400 per order.", relevanceScore: 60 },
    { factType: "seasonal", fact: "Iowa State football Saturdays drive 2x normal traffic.", relevanceScore: 65 },
    { factType: "equipment_issue", fact: "Fryer oil should be changed every 3-4 days.", relevanceScore: 50 },
  ];

  for (const memory of memories) {
    await db.insert(schema.briefingMemory).values(memory);
  }
  console.log(`  ✅ Seeded ${memories.length} briefing memories`);
}

async function main() {
  console.log("🚀 Seeding remaining intelligence tables...\n");
  try {
    await seedAchievements();
    await seedPhotoMissions();
    await seedBriefingMemories();
    console.log("\n✅ All remaining data seeded successfully!");
  } catch (error) {
    console.error("❌ Seed failed:", error.message || error);
  }
  process.exit(0);
}

main();
