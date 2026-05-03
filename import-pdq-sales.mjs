/**
 * PDQ Sales Data Import Script
 * Loads daily sales and hourly sales from extracted CSVs into the CTAP database.
 * Column names use camelCase to match the Drizzle schema.
 *
 * Usage: node import-pdq-sales.mjs
 */
import { readFileSync } from "fs";
import { createConnection } from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) { console.error("DATABASE_URL not set"); process.exit(1); }

function parseDbUrl(url) {
  const u = new URL(url);
  return {
    host: u.hostname, port: parseInt(u.port) || 3306,
    user: decodeURIComponent(u.username), password: decodeURIComponent(u.password),
    database: u.pathname.slice(1), ssl: { rejectUnauthorized: true },
  };
}

function parseCSV(text) {
  const lines = text.trim().split("\n");
  const headers = lines[0].split(",");
  return lines.slice(1).map(line => {
    const values = []; let current = ""; let inQ = false;
    for (const ch of line) {
      if (ch === '"') { inQ = !inQ; continue; }
      if (ch === "," && !inQ) { values.push(current.trim()); current = ""; continue; }
      current += ch;
    }
    values.push(current.trim());
    const row = {};
    headers.forEach((h, i) => { row[h] = values[i] || ""; });
    return row;
  });
}

function sn(v) { if (!v || v === "" || v === "None") return null; const n = parseFloat(v); return isNaN(n) ? null : n; }
function si(v) { if (!v || v === "" || v === "None") return null; const n = parseInt(v); return isNaN(n) ? null : n; }
function sd(v) { const n = sn(v); return n !== null ? n.toFixed(2) : null; }

async function main() {
  const conn = await createConnection(parseDbUrl(DATABASE_URL));
  console.log("Connected to database");

  // ─── Import Daily Sales ───
  console.log("\n=== Importing Daily Sales ===");
  const dailyRows = parseCSV(readFileSync("/home/ubuntu/pdq_daily_sales.csv", "utf-8"));
  console.log(`Found ${dailyRows.length} daily records`);

  let dOk = 0, dSkip = 0;
  for (const r of dailyRows) {
    if (!r.business_date || r.business_date === "None") { dSkip++; continue; }
    try {
      await conn.execute(
        `INSERT INTO daily_sales (
          businessDate, grandTotal, tax,
          pickupQty, pickupAmount, deliveryQty, deliveryAmount,
          barQty, barAmount, tableQty, tableAmount,
          totalQty, totalAmount,
          catFoodQty, catFoodAmount, catBeerQty, catBeerAmount,
          catLiquorQty, catLiquorAmount, catPopQty, catPopAmount,
          catLargePizzasQty, catLargePizzasAmount,
          laborHeadcount, laborTotal, laborPct,
          voidsCount, voidsAmount,
          discountCount, discountTotal, discountPct,
          expectedCash, creditCards, creditCardTips,
          payOuts, tableOrders, tableGuests,
          avgGuestPerOrder, avgPerGuest, totalLastYear
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        ON DUPLICATE KEY UPDATE
          grandTotal=VALUES(grandTotal), tax=VALUES(tax),
          pickupQty=VALUES(pickupQty), pickupAmount=VALUES(pickupAmount),
          deliveryQty=VALUES(deliveryQty), deliveryAmount=VALUES(deliveryAmount),
          barQty=VALUES(barQty), barAmount=VALUES(barAmount),
          tableQty=VALUES(tableQty), tableAmount=VALUES(tableAmount),
          totalQty=VALUES(totalQty), totalAmount=VALUES(totalAmount),
          catFoodQty=VALUES(catFoodQty), catFoodAmount=VALUES(catFoodAmount),
          catBeerQty=VALUES(catBeerQty), catBeerAmount=VALUES(catBeerAmount),
          catLiquorQty=VALUES(catLiquorQty), catLiquorAmount=VALUES(catLiquorAmount),
          catPopQty=VALUES(catPopQty), catPopAmount=VALUES(catPopAmount),
          catLargePizzasQty=VALUES(catLargePizzasQty), catLargePizzasAmount=VALUES(catLargePizzasAmount),
          laborHeadcount=VALUES(laborHeadcount), laborTotal=VALUES(laborTotal), laborPct=VALUES(laborPct),
          voidsCount=VALUES(voidsCount), voidsAmount=VALUES(voidsAmount),
          discountCount=VALUES(discountCount), discountTotal=VALUES(discountTotal), discountPct=VALUES(discountPct),
          expectedCash=VALUES(expectedCash), creditCards=VALUES(creditCards), creditCardTips=VALUES(creditCardTips),
          payOuts=VALUES(payOuts), tableOrders=VALUES(tableOrders), tableGuests=VALUES(tableGuests),
          avgGuestPerOrder=VALUES(avgGuestPerOrder), avgPerGuest=VALUES(avgPerGuest), totalLastYear=VALUES(totalLastYear)`,
        [
          r.business_date, sd(r.grand_total), sd(r.tax),
          si(r.pickup_qty), sd(r.pickup_amount), si(r.delivery_qty), sd(r.delivery_amount),
          si(r.bar_qty), sd(r.bar_amount), si(r.table_qty), sd(r.table_amount),
          si(r.total_qty), sd(r.total_amount),
          si(r.cat_food_qty), sd(r.cat_food_amount), si(r.cat_beer_qty), sd(r.cat_beer_amount),
          si(r.cat_liquor_qty), sd(r.cat_liquor_amount), si(r.cat_pop_qty), sd(r.cat_pop_amount),
          si(r.cat_large_pizzas_qty), sd(r.cat_large_pizzas_amount),
          si(r.labor_headcount), sd(r.labor_total), sd(r.labor_pct),
          si(r.voids_count), sd(r.voids_amount),
          si(r.discount_count), sd(r.discount_total), sd(r.discount_pct),
          sd(r.expected_cash), sd(r.credit_cards), sd(r.credit_card_tips),
          sd(r.pay_outs), si(r.table_qty), si(r.table_qty),
          sd(r.total_avg_check), sd(r.total_avg_check), sd(r.total_last_year),
        ]
      );
      dOk++;
    } catch (e) {
      console.error(`  Daily ${r.business_date}: ${e.message}`);
      dSkip++;
    }
  }
  console.log(`Daily: ${dOk} imported, ${dSkip} skipped`);

  // ─── Import Hourly Sales ───
  console.log("\n=== Importing Hourly Sales ===");
  const hourlyRows = parseCSV(readFileSync("/home/ubuntu/pdq_hourly_sales.csv", "utf-8"));
  console.log(`Found ${hourlyRows.length} hourly records`);

  await conn.execute("DELETE FROM hourly_sales");
  let hOk = 0, hSkip = 0;

  for (const r of hourlyRows) {
    if (!r.business_date || r.business_date === "None" || !r.hour) { hSkip++; continue; }
    try {
      await conn.execute(
        `INSERT INTO hourly_sales (businessDate, hour, orders, total, avgSales, laborPct, pickupQty, pickupAmount, deliveryQty, deliveryAmount, barQty, barAmount, tableQty, tableAmount)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          r.business_date, r.hour, si(r.orders), sd(r.total),
          sd(r.avg_sales), sd(r.labor_pct),
          si(r.pickup_qty), sd(r.pickup_amount),
          si(r.delivery_qty), sd(r.delivery_amount),
          si(r.bar_qty), sd(r.bar_amount),
          si(r.table_qty), sd(r.table_amount),
        ]
      );
      hOk++;
    } catch (e) {
      console.error(`  Hourly ${r.business_date} ${r.hour}: ${e.message}`);
      hSkip++;
    }
  }
  console.log(`Hourly: ${hOk} imported, ${hSkip} skipped`);

  // ─── Summary ───
  console.log("\n=== Import Complete ===");
  const [dc] = await conn.execute("SELECT COUNT(*) as cnt FROM daily_sales");
  const [hc] = await conn.execute("SELECT COUNT(*) as cnt FROM hourly_sales");
  console.log(`Database: ${dc[0].cnt} daily records, ${hc[0].cnt} hourly records`);

  const [stats] = await conn.execute("SELECT MIN(businessDate) as first_date, MAX(businessDate) as last_date, AVG(CAST(grandTotal AS DECIMAL(10,2))) as avg_daily FROM daily_sales");
  console.log(`Date range: ${stats[0].first_date} to ${stats[0].last_date}`);
  console.log(`Average daily revenue: $${parseFloat(stats[0].avg_daily).toFixed(2)}`);

  await conn.end();
}

main().catch(e => { console.error(e); process.exit(1); });
