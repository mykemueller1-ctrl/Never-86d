import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const EXECUTE = process.argv.includes("--execute");

const TEST_STAFF_NAMES = [
  { firstName: "NewHire", lastName: "TestPerson" },
  { firstName: "Test", lastName: "FryLine" },
  { firstName: "Test", lastName: "Daytime" },
  { firstName: "Test", lastName: "Driver" },
];

const STAFF_REFERENCE_COLUMNS = new Set([
  "staffId",
  "authorizedById",
  "createdByStaffId",
  "approvedByStaffId",
  "approvedBy",
  "deniedBy",
  "trainerId",
  "evaluatorId",
  "issuedById",
  "promotedById",
]);

function nameWhereClause(alias = "") {
  const prefix = alias ? `${alias}.` : "";
  return TEST_STAFF_NAMES.map(() => `(${prefix}firstName = ? AND ${prefix}lastName = ?)`).join(" OR ");
}

function nameParams() {
  return TEST_STAFF_NAMES.flatMap((s) => [s.firstName, s.lastName]);
}

function quoteIdentifier(identifier) {
  return `\`${String(identifier).replace(/`/g, "``")}\``;
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set. Run this in the deployment/database environment.");
  }

  const conn = await mysql.createConnection(process.env.DATABASE_URL);

  try {
    const [staffRows] = await conn.execute(
      `SELECT id, firstName, lastName, department, jobRole, status FROM staff WHERE ${nameWhereClause()}`,
      nameParams(),
    );

    if (staffRows.length === 0) {
      console.log("No duplicate/test staff records found. Nothing to clean up.");
      return;
    }

    console.log("Duplicate/test staff records targeted for cleanup:");
    for (const row of staffRows) {
      console.log(`- #${row.id}: ${row.firstName} ${row.lastName} (${row.department}/${row.jobRole}, ${row.status})`);
    }

    if (!EXECUTE) {
      console.log("\nDry run only. Re-run with --execute to delete these staff records and dependent staff-scoped rows.");
      return;
    }

    const staffIds = staffRows.map((row) => row.id);
    const placeholders = staffIds.map(() => "?").join(", ");

    await conn.beginTransaction();

    const [columns] = await conn.query(
      `SELECT TABLE_NAME, COLUMN_NAME
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME <> 'staff'
         AND COLUMN_NAME IN (${Array.from(STAFF_REFERENCE_COLUMNS).map(() => "?").join(", ")})`,
      Array.from(STAFF_REFERENCE_COLUMNS),
    );

    const deletedByTable = [];
    for (const { TABLE_NAME, COLUMN_NAME } of columns) {
      const [result] = await conn.execute(
        `DELETE FROM ${quoteIdentifier(TABLE_NAME)} WHERE ${quoteIdentifier(COLUMN_NAME)} IN (${placeholders})`,
        staffIds,
      );
      if (result.affectedRows > 0) {
        deletedByTable.push({ table: TABLE_NAME, column: COLUMN_NAME, rows: result.affectedRows });
      }
    }

    const [staffDeleteResult] = await conn.execute(`DELETE FROM staff WHERE id IN (${placeholders})`, staffIds);

    await conn.commit();

    console.log("\nCleanup complete.");
    for (const item of deletedByTable) {
      console.log(`- Deleted ${item.rows} dependent row(s) from ${item.table}.${item.column}`);
    }
    console.log(`- Deleted ${staffDeleteResult.affectedRows} duplicate/test staff row(s) from staff`);
  } catch (error) {
    try {
      await conn.rollback();
    } catch {}
    throw error;
  } finally {
    await conn.end();
  }
}

main().catch((error) => {
  console.error("Failed to remove duplicate/test staff records:", error.message);
  process.exit(1);
});
