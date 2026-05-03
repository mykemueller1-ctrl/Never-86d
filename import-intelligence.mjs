/**
 * CTAP Intelligence Data Import
 * Loads void records, product mix, weather data, and anomalies into the database.
 */
import 'dotenv/config';
import mysql from 'mysql2/promise';
import { readFileSync } from 'fs';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) { console.error('DATABASE_URL not set'); process.exit(1); }

// Parse MySQL connection from DATABASE_URL
const url = new URL(DATABASE_URL);
const conn = await mysql.createConnection({
  host: url.hostname,
  port: parseInt(url.port || '3306'),
  user: url.username,
  password: url.password,
  database: url.pathname.slice(1),
  ssl: { rejectUnauthorized: true },
});

function loadCSV(path) {
  try {
    const text = readFileSync(path, 'utf-8');
    const lines = text.trim().split('\n');
    if (lines.length < 2) return [];
    const headers = lines[0].split(',').map(h => h.trim());
    return lines.slice(1).map(line => {
      // Handle commas inside quotes
      const vals = [];
      let current = '';
      let inQuotes = false;
      for (const ch of line) {
        if (ch === '"') { inQuotes = !inQuotes; continue; }
        if (ch === ',' && !inQuotes) { vals.push(current.trim()); current = ''; continue; }
        current += ch;
      }
      vals.push(current.trim());
      const obj = {};
      headers.forEach((h, i) => { obj[h] = vals[i] || ''; });
      return obj;
    });
  } catch (e) {
    console.log(`  Warning: Could not load ${path}: ${e.message}`);
    return [];
  }
}

function safe(v, def = null) {
  if (v === undefined || v === null || v === '' || v === 'NaN' || v === 'nan') return def;
  const n = parseFloat(v);
  return isNaN(n) ? def : n;
}

// ============ VOID RECORDS ============
console.log('=== Importing Void Records ===');
const voidItems = loadCSV('/home/ubuntu/pdq_void_items.csv');
const voidOrders = loadCSV('/home/ubuntu/pdq_void_orders.csv');
console.log(`  Loaded ${voidItems.length} void items, ${voidOrders.length} void orders`);

let voidCount = 0;
for (const row of voidItems) {
  try {
    await conn.execute(
      `INSERT INTO void_records (businessDate, orderId, recordType, itemType, itemDesc, employeeName, amount, timeIn, timeApplied, sourceFile)
       VALUES (?, ?, 'void_item', ?, ?, ?, ?, ?, ?, ?)`,
      [
        row.business_date || row.date || '',
        row.order_id || '',
        row.item_type || '',
        row.item_desc || row.description || '',
        row.employee_name || row.employee || '',
        safe(row.amount || row.total),
        row.time_in || '',
        row.time_applied || '',
        row.source_file || '',
      ]
    );
    voidCount++;
  } catch (e) {
    if (!e.message.includes('Duplicate')) console.log(`  Void item error: ${e.message}`);
  }
}

for (const row of voidOrders) {
  try {
    await conn.execute(
      `INSERT INTO void_records (businessDate, orderId, recordType, itemType, itemDesc, employeeName, amount, timeIn, timeApplied, sourceFile)
       VALUES (?, ?, 'void_order', ?, ?, ?, ?, ?, ?, ?)`,
      [
        row.business_date || row.date || '',
        row.order_id || '',
        row.item_type || row.type || '',
        row.item_desc || row.description || '',
        row.employee_name || row.employee || '',
        safe(row.amount || row.total),
        row.time_in || '',
        row.time_applied || '',
        row.source_file || '',
      ]
    );
    voidCount++;
  } catch (e) {
    if (!e.message.includes('Duplicate')) console.log(`  Void order error: ${e.message}`);
  }
}
console.log(`  Imported ${voidCount} void records`);

// ============ PRODUCT MIX ============
console.log('=== Importing Product Mix ===');
const productMix = loadCSV('/home/ubuntu/pdq_product_mix.csv');
console.log(`  Loaded ${productMix.length} product mix entries`);

let mixCount = 0;
for (const row of productMix) {
  try {
    // Auto-categorize based on item name
    const name = (row.item_name || row.name || '').toLowerCase();
    let category = 'other';
    if (name.includes('pizza') || name.includes('topping') || name.includes('community special') || name.includes('meat lovers') || name.includes('works') || name.includes('taco') || name.includes('bbq chicken')) {
      category = 'pizza';
    } else if (name.includes('bucket') || name.includes('bottle') || name.includes('can') || name.includes('draft') || name.includes('ultra') || name.includes('light') || name.includes('bud') || name.includes('busch') || name.includes('coors') || name.includes('miller') || name.includes('ipa') || name.includes('lager') || name.includes('ale') || name.includes('stout')) {
      category = 'beer';
    } else if (name.includes('captain') || name.includes('jack') || name.includes('crown') || name.includes('smirnoff') || name.includes('malibu') || name.includes('fireball') || name.includes('shot') || name.includes('bloody mary') || name.includes('margarita') || name.includes('whiskey') || name.includes('vodka') || name.includes('rum') || name.includes('tequila') || name.includes('gin')) {
      category = 'liquor';
    } else if (name.includes('pepsi') || name.includes('dr pepper') || name.includes('mountain dew') || name.includes('starry') || name.includes('lemonade') || name.includes('iced tea') || name.includes('rootbeer') || name.includes('fountain')) {
      category = 'pop';
    } else if (name.includes('wing') || name.includes('tender') || name.includes('strip') || name.includes('burger') || name.includes('fry') || name.includes('cheese') || name.includes('bread') || name.includes('salad') || name.includes('sandwich') || name.includes('fish') || name.includes('shrimp') || name.includes('steak') || name.includes('app')) {
      category = 'food';
    }

    await conn.execute(
      `INSERT INTO product_mix_entries (periodStart, periodEnd, itemName, itemId, category, totalAmount, totalQty, sourceFile)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        row.period_start || row.start_date || '',
        row.period_end || row.end_date || '',
        row.item_name || row.name || '',
        row.item_id || '',
        category,
        safe(row.total_amount || row.amount),
        safe(row.total_qty || row.qty, 0),
        row.source_file || '',
      ]
    );
    mixCount++;
  } catch (e) {
    if (!e.message.includes('Duplicate')) console.log(`  Product mix error: ${e.message}`);
  }
}
console.log(`  Imported ${mixCount} product mix entries`);

// ============ WEATHER DATA ============
console.log('=== Importing Weather Data ===');
const weatherCSV = loadCSV('/home/ubuntu/pdq_weather_correlation.csv');
console.log(`  Loaded ${weatherCSV.length} weather records`);

let weatherCount = 0;
for (const row of weatherCSV) {
  try {
    await conn.execute(
      `INSERT INTO weather_data (date, tempMax, tempMin, precipitation, snowfall, windMax, weatherCode, isForecast)
       VALUES (?, ?, ?, ?, ?, ?, ?, false)
       ON DUPLICATE KEY UPDATE tempMax=VALUES(tempMax)`,
      [
        row.date || '',
        safe(row.temp_max),
        safe(row.temp_min),
        safe(row.precipitation),
        safe(row.snowfall),
        safe(row.wind_max),
        safe(row.weather_code, 0),
      ]
    );
    weatherCount++;
  } catch (e) {
    if (!e.message.includes('Duplicate')) console.log(`  Weather error: ${e.message}`);
  }
}
console.log(`  Imported ${weatherCount} weather records`);

// ============ ANOMALIES ============
console.log('=== Importing Anomalies ===');
try {
  const intel = JSON.parse(readFileSync('/home/ubuntu/ctap_intelligence.json', 'utf-8'));
  const anomalies = intel.anomalies || [];
  let anomalyCount = 0;
  for (const a of anomalies) {
    await conn.execute(
      `INSERT INTO intelligence_anomalies (anomalyType, severity, employeeName, detail, businessDate)
       VALUES (?, ?, ?, ?, ?)`,
      [
        a.type || 'unknown',
        a.severity || 'low',
        a.employee || '',
        a.detail || '',
        a.date || '',
      ]
    );
    anomalyCount++;
  }
  console.log(`  Imported ${anomalyCount} anomalies`);
} catch (e) {
  console.log(`  Anomaly import error: ${e.message}`);
}

// ============ SUMMARY ============
const [voidRows] = await conn.execute('SELECT COUNT(*) as c FROM void_records');
const [mixRows] = await conn.execute('SELECT COUNT(*) as c FROM product_mix_entries');
const [weatherRows] = await conn.execute('SELECT COUNT(*) as c FROM weather_data');
const [anomalyRows] = await conn.execute('SELECT COUNT(*) as c FROM intelligence_anomalies');

console.log('\n=== IMPORT COMPLETE ===');
console.log(`  void_records: ${voidRows[0].c}`);
console.log(`  product_mix_entries: ${mixRows[0].c}`);
console.log(`  weather_data: ${weatherRows[0].c}`);
console.log(`  intelligence_anomalies: ${anomalyRows[0].c}`);

await conn.end();
