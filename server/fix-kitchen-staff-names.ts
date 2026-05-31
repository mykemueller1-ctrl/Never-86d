/**
 * One-time fix: Update kitchen staff last names from POS Z-Report data.
 * Source: Historical_Menu_Sales_By_Employee report (Sept 2025)
 * 
 * Confirmed from POS:
 * - Gavin Noore (ID 90002)
 * - Dustin Stein (ID 90008)
 * - Nash Wheaton (ID 90005) 
 * - Max George (ID 90015)
 * - Ryan Berg (ID 90014)
 * - Che Lyftogt (ID 90012)
 * - Tom Dorothy (ID 90006)
 * - Steven Klein (ID 90013)
 * 
 * Still unknown (newer hires, not in Sept 2025 POS data):
 * - Dekotah (ID 90007) - female, just started
 * - Kyler (ID 90009)
 * - Jacob (ID 90010)
 * - Josue (ID 90011)
 */

import { getDb } from "./db";
import { staff } from "../drizzle/schema";
import { eq } from "drizzle-orm";

const nameFixesFromPOS = [
  { id: 90002, firstName: "Gavin", lastName: "Noore" },
  { id: 90005, firstName: "Nash", lastName: "Wheaton" },
  { id: 90006, firstName: "Tom", lastName: "Dorothy" },
  { id: 90008, firstName: "Dustin", lastName: "Stein" },
  { id: 90012, firstName: "Che", lastName: "Lyftogt" },
  { id: 90013, firstName: "Steven", lastName: "Klein" },
  { id: 90014, firstName: "Ryan", lastName: "Berg" },
  { id: 90015, firstName: "Max", lastName: "George" },
];

export async function fixKitchenStaffNames() {
  const db = await getDb();
  if (!db) return;
  
  let fixed = 0;
  for (const fix of nameFixesFromPOS) {
    try {
      await db.update(staff)
        .set({ lastName: fix.lastName })
        .where(eq(staff.id, fix.id));
      fixed++;
    } catch (e) {
      console.warn(`[fix-names] Failed to update ID ${fix.id}:`, e);
    }
  }
  console.log(`[fix-names] Updated ${fixed}/${nameFixesFromPOS.length} kitchen staff last names from POS data`);
}
