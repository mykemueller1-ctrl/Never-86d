import 'dotenv/config';

// Dynamically import the seed function
const { seedWave20 } = await import('./server/seedWave20.ts');

try {
  console.log('Starting Wave 20 seed...');
  const results = await seedWave20();
  console.log('Seed results:', JSON.stringify(results, null, 2));
  process.exit(0);
} catch (err) {
  console.error('Seed failed:', err);
  process.exit(1);
}
