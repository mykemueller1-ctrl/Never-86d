import mysql from 'mysql2/promise';
const c = await mysql.createConnection(process.env.DATABASE_URL);
const [cols] = await c.query('SHOW CREATE TABLE knowledge_entries');
console.log(cols[0]['Create Table']);
// Try inserting one test entry
try {
  const [result] = await c.query(`INSERT INTO knowledge_entries (question, answer, category, station, confidence, tags, source)
    VALUES ('TEST_DELETE_ME', 'test answer', 'recipes', 'pizza_line', 95, 'test', 'test')
    ON DUPLICATE KEY UPDATE answer = VALUES(answer)`);
  console.log('Insert result:', result);
  // Delete the test
  await c.query(`DELETE FROM knowledge_entries WHERE question = 'TEST_DELETE_ME'`);
  console.log('Test entry deleted');
} catch(e) {
  console.error('Insert error:', e.message);
}
await c.end();
