import { searchKnowledge } from './server/db';

async function test() {
  const queries = [
    ['chamber ground beef', 'general'],
    ['How much cheese on a large?', 'pizza_line'],
    ['What are today\'s specials?', 'general'],
    ['Food allergy procedure?', 'general'],
    ['Who are our vendors?', 'general'],
    ['dough roller', 'pizza_line'],
    ['How to make Old Fashioned?', 'bar'],
    ['Moscow Mule recipe?', 'bar'],
    ['fryer temperature', 'fry_line'],
    ['wing sauce list', 'fry_line'],
    ['closing checklist', 'general'],
    ['split check', 'bar'],
    ['Screwdriver recipe', 'bar'],
    ['Bloody Mary', 'bar'],
    ['brisket', 'general'],
    ['PFG ordering', 'general'],
    ['what is 86d', 'general'],
    ['Iowa Chop', 'general'],
    ['pizza dough recipe', 'pizza_line'],
    ['how to void a ticket', 'general'],
  ];
  
  for (const [q, station] of queries) {
    const results = await searchKnowledge(q, station, 3);
    const topResult = results[0];
    console.log(`\n[${q}] → ${results.length} results`);
    if (topResult) {
      console.log(`  TOP: ${topResult.question} (score: ${(topResult as any).relevance})`);
      console.log(`  ANS: ${topResult.answer?.slice(0, 80)}...`);
    } else {
      console.log('  *** NO RESULTS ***');
    }
  }
  
  process.exit(0);
}
test();
