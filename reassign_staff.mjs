/**
 * Re-assign all staff to correct departments/roles based on Google Drive employee data.
 * Also adds missing staff members from Drive that aren't in the DB yet.
 * 
 * Source: Google Drive "Employee Phone numbers" spreadsheet
 * Real roster from CTAP (Community Tap & Pizza, Fort Dodge, Iowa)
 */
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// The real staff roster from Google Drive with correct department assignments
const REAL_ROSTER = [
  // Management
  { firstName: "Mychael", lastName: "Mueller", department: "management", jobRole: "owner", isKeyEmployee: true, canAuthPayouts: true, pin: "8686", employeeNumber: "001" },
  { firstName: "Sally", lastName: "Hart", department: "management", jobRole: "owner", isKeyEmployee: true, canAuthPayouts: true, pin: "8687", employeeNumber: "002" },
  { firstName: "Gavin", lastName: "Thomas", department: "management", jobRole: "key_manager", isKeyEmployee: true, canAuthPayouts: true, pin: "1234", employeeNumber: "003" },
  
  // Kitchen Management
  { firstName: "Moe", lastName: "Thomas", department: "kitchen_line", jobRole: "kitchen_manager", isKeyEmployee: true, canAuthPayouts: true, pin: "4321", employeeNumber: "004" },
  { firstName: "Che", lastName: "Lyftogt", department: "kitchen_line", jobRole: "kitchen_key", isKeyEmployee: true, canAuthPayouts: true, pin: "5678", employeeNumber: "005" },
  { firstName: "Steven", lastName: "Klein", department: "kitchen_line", jobRole: "kitchen_key", isKeyEmployee: true, canAuthPayouts: true, pin: "5679", employeeNumber: "006" },
  
  // Bar Staff
  { firstName: "Jessica", lastName: "Gailey", department: "bar", jobRole: "bar_manager", isKeyEmployee: true, canAuthPayouts: false, pin: "1001", employeeNumber: "054" },
  { firstName: "Karlee", lastName: "Sturtz", department: "bar", jobRole: "bartender", isKeyEmployee: false, canAuthPayouts: false, pin: "1002", employeeNumber: "055" },
  { firstName: "Ashley", lastName: "Holding", department: "bar", jobRole: "bartender", isKeyEmployee: false, canAuthPayouts: false, pin: "1003", employeeNumber: "137" },
  { firstName: "Bryson", lastName: "Cook", department: "bar", jobRole: "bartender", isKeyEmployee: false, canAuthPayouts: false, pin: "1006", employeeNumber: "058" },
  { firstName: "Kaillee", lastName: "Miller", department: "bar", jobRole: "bartender", isKeyEmployee: false, canAuthPayouts: false, pin: "1007", employeeNumber: "059" },
  { firstName: "Samantha", lastName: "Swearingen", department: "bar", jobRole: "bartender", isKeyEmployee: false, canAuthPayouts: false, pin: "1008", employeeNumber: "060" },
  { firstName: "Azaria", lastName: "Silvey", department: "bar", jobRole: "bartender", isKeyEmployee: false, canAuthPayouts: false, pin: "1009", employeeNumber: "061" },
  
  // Kitchen Line (Fry Side)
  { firstName: "Ryan", lastName: "Berg", department: "kitchen_line", jobRole: "line_cook", isKeyEmployee: false, canAuthPayouts: false, pin: "2002", employeeNumber: "063" },
  { firstName: "Gavin", lastName: "Nore", department: "kitchen_line", jobRole: "line_cook", isKeyEmployee: false, canAuthPayouts: false, pin: "2013", employeeNumber: "074" },
  { firstName: "Peyton", lastName: "Jones", department: "kitchen_line", jobRole: "line_cook", isKeyEmployee: false, canAuthPayouts: false, pin: "2014", employeeNumber: "075" },
  { firstName: "Dohnovan", lastName: "Hart", department: "kitchen_line", jobRole: "line_cook", isKeyEmployee: false, canAuthPayouts: false, pin: "2015", employeeNumber: "076" },
  { firstName: "Chris", lastName: "Sorenson", department: "kitchen_line", jobRole: "line_cook", isKeyEmployee: false, canAuthPayouts: false, pin: "2016", employeeNumber: "077" },
  { firstName: "Ian", lastName: "Ebelsheiser", department: "kitchen_line", jobRole: "line_cook", isKeyEmployee: false, canAuthPayouts: false, pin: "2010", employeeNumber: "071" },
  { firstName: "Jacob", lastName: "Lawton", department: "kitchen_line", jobRole: "line_cook", isKeyEmployee: false, canAuthPayouts: false, pin: "2011", employeeNumber: "072" },
  { firstName: "Matt", lastName: "Jones", department: "kitchen_line", jobRole: "line_cook", isKeyEmployee: false, canAuthPayouts: false, pin: "2017", employeeNumber: "078" },
  { firstName: "Ben", lastName: "Mason", department: "kitchen_line", jobRole: "line_cook", isKeyEmployee: false, canAuthPayouts: false, pin: "2018", employeeNumber: "079" },
  { firstName: "Kyler", lastName: "Preston", department: "kitchen_line", jobRole: "line_cook", isKeyEmployee: false, canAuthPayouts: false, pin: "2019", employeeNumber: "080" },
  { firstName: "Tyson", lastName: "Anderson", department: "kitchen_line", jobRole: "line_cook", isKeyEmployee: false, canAuthPayouts: false, pin: "2012", employeeNumber: "073" },
  { firstName: "Brodey", lastName: "Laughman", department: "kitchen_line", jobRole: "line_cook", isKeyEmployee: false, canAuthPayouts: false, pin: "2006", employeeNumber: "067" },
  { firstName: "Max", lastName: "George", department: "kitchen_line", jobRole: "line_cook", isKeyEmployee: false, canAuthPayouts: false, pin: "2007", employeeNumber: "068" },
  { firstName: "Dustin", lastName: "Stein", department: "kitchen_line", jobRole: "line_cook", isKeyEmployee: false, canAuthPayouts: false, pin: "2008", employeeNumber: "069" },
  { firstName: "Doc", lastName: "", department: "kitchen_line", jobRole: "line_cook", isKeyEmployee: false, canAuthPayouts: false, pin: "2009", employeeNumber: "070" },
  
  // Dishwasher
  { firstName: "Andrik", lastName: "Roest", department: "dishwasher", jobRole: "dishwasher", isKeyEmployee: false, canAuthPayouts: false, pin: "2003", employeeNumber: "064" },
  
  // Drivers
  { firstName: "Kim", lastName: "Pratt", department: "driver", jobRole: "driver", isKeyEmployee: false, canAuthPayouts: false, pin: "3001", employeeNumber: "081" },
  { firstName: "Bryce", lastName: "Delaney", department: "driver", jobRole: "driver", isKeyEmployee: false, canAuthPayouts: false, pin: "3002", employeeNumber: "082" },
  { firstName: "Nathaniel", lastName: "Lowrey", department: "driver", jobRole: "driver", isKeyEmployee: false, canAuthPayouts: false, pin: "3003", employeeNumber: "083" },
  { firstName: "Stephen", lastName: "Wheaton", department: "driver", jobRole: "driver", isKeyEmployee: false, canAuthPayouts: false, pin: "3004", employeeNumber: "084" },
  { firstName: "Braydon", lastName: "Austin", department: "driver", jobRole: "driver", isKeyEmployee: false, canAuthPayouts: false, pin: "3005", employeeNumber: "085" },
  { firstName: "John", lastName: "Carr", department: "driver", jobRole: "driver", isKeyEmployee: false, canAuthPayouts: false, pin: "3006", employeeNumber: "086" },
  { firstName: "Keaton", lastName: "Seehusen", department: "driver", jobRole: "driver", isKeyEmployee: false, canAuthPayouts: false, pin: "3007", employeeNumber: "087" },
  { firstName: "Daniel", lastName: "Murphy", department: "driver", jobRole: "driver", isKeyEmployee: false, canAuthPayouts: false, pin: "3008", employeeNumber: "088" },
  
  // Dining Room / Wait Staff (also serve as phone takers)
  { firstName: "Kenzy", lastName: "Thompson", department: "dining_room", jobRole: "wait_staff", isKeyEmployee: false, canAuthPayouts: false, pin: "4001", employeeNumber: "089" },
  { firstName: "Jeri", lastName: "Wilson", department: "dining_room", jobRole: "wait_staff", isKeyEmployee: false, canAuthPayouts: false, pin: "4002", employeeNumber: "090" },
  { firstName: "Joleah", lastName: "Stuhr", department: "dining_room", jobRole: "wait_staff", isKeyEmployee: false, canAuthPayouts: false, pin: "4003", employeeNumber: "091" },
  
  // Pizza Side
  { firstName: "Josue", lastName: "Soto-Maldonado", department: "pizza_side", jobRole: "pizza", isKeyEmployee: false, canAuthPayouts: false, pin: "5001", employeeNumber: "092" },
];

try {
  // Step 1: Delete all existing staff (clean slate)
  await conn.execute(`DELETE FROM staff`);
  console.log("✓ Cleared existing staff table");
  
  // Step 2: Insert all real roster members
  let inserted = 0;
  for (const s of REAL_ROSTER) {
    const recentClockIn = new Date(Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000));
    await conn.execute(
      `INSERT INTO staff (firstName, lastName, department, jobRole, isKeyEmployee, canAuthPayouts, pin, employeeNumber, status, lastClockIn, totalPoints, currentStreak, weeklyVoids, schedulePriority) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, 0, 0, 0, 50)`,
      [s.firstName, s.lastName, s.department, s.jobRole, s.isKeyEmployee, s.canAuthPayouts, s.pin, s.employeeNumber, recentClockIn]
    );
    inserted++;
  }
  
  console.log(`✓ Inserted ${inserted} staff members with correct department assignments`);
  
  // Step 3: Verify counts by department
  const [counts] = await conn.execute(`SELECT department, COUNT(*) as cnt FROM staff GROUP BY department ORDER BY department`);
  console.log("\n📊 Staff by Department:");
  for (const row of counts) {
    console.log(`  ${row.department}: ${row.cnt}`);
  }
  
  console.log("\n✅ Staff re-assignment complete!");
} catch (err) {
  console.error("Error:", err.message);
} finally {
  await conn.end();
}
