import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const conn = await mysql.createConnection(process.env.DATABASE_URL);

try {
  // First, update existing staff department values to new enum values
  // "kitchen" -> "kitchen_line", "server" -> "dining_room"
  // We need to do this BEFORE altering the enum, so we add the new values first
  
  // Step 1: Expand the staff department enum to include ALL old + new values
  await conn.execute(`ALTER TABLE staff MODIFY COLUMN department enum('bar','kitchen','dining_room','kitchen_line','pizza_side','driver','server','dishwasher','management') NOT NULL`);
  console.log("✓ Staff department enum expanded");
  
  // Step 2: Migrate existing data
  await conn.execute(`UPDATE staff SET department = 'kitchen_line' WHERE department = 'kitchen'`);
  await conn.execute(`UPDATE staff SET department = 'dining_room' WHERE department = 'server'`);
  console.log("✓ Staff data migrated");
  
  // Step 3: Now shrink to final enum (remove old values)
  await conn.execute(`ALTER TABLE staff MODIFY COLUMN department enum('bar','dining_room','kitchen_line','pizza_side','driver','dishwasher','management') NOT NULL`);
  console.log("✓ Staff department enum finalized");
  
  // Step 4: Update jobRole enum
  await conn.execute(`ALTER TABLE staff MODIFY COLUMN jobRole enum('owner','key_manager','kitchen_manager','kitchen_key','bartender','bar_manager','server','wait_staff','driver','line_cook','pizza','dishwasher') NOT NULL`);
  console.log("✓ Staff jobRole enum updated");
  
  // Step 5: Update checklists department enum
  await conn.execute(`ALTER TABLE checklists MODIFY COLUMN department enum('bar','kitchen','dining_room','kitchen_line','pizza_side','driver','server','dishwasher','management','all') NOT NULL`);
  await conn.execute(`UPDATE checklists SET department = 'kitchen_line' WHERE department = 'kitchen'`);
  await conn.execute(`UPDATE checklists SET department = 'dining_room' WHERE department = 'server'`);
  await conn.execute(`ALTER TABLE checklists MODIFY COLUMN department enum('bar','dining_room','kitchen_line','pizza_side','driver','dishwasher','management','all') NOT NULL`);
  console.log("✓ Checklists department enum updated");
  
  // Step 6: Update schedule_shifts department enum
  await conn.execute(`ALTER TABLE schedule_shifts MODIFY COLUMN department enum('bar','kitchen','dining_room','kitchen_line','pizza_side','driver','server','dishwasher','management')`);
  await conn.execute(`UPDATE schedule_shifts SET department = 'kitchen_line' WHERE department = 'kitchen'`);
  await conn.execute(`UPDATE schedule_shifts SET department = 'dining_room' WHERE department = 'server'`);
  await conn.execute(`ALTER TABLE schedule_shifts MODIFY COLUMN department enum('bar','dining_room','kitchen_line','pizza_side','driver','dishwasher','management')`);
  console.log("✓ Schedule shifts department enum updated");
  
  // Step 7: Mark the migration as applied in drizzle journal
  await conn.execute(`INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?) ON DUPLICATE KEY UPDATE hash=hash`, [
    '0009_superb_war_machine', Date.now()
  ]);
  console.log("✓ Migration marked as applied");
  
  console.log("\n✅ All migrations complete!");
} catch (err) {
  console.error("Migration error:", err.message);
} finally {
  await conn.end();
}
