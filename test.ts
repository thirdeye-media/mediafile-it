import { search } from 'duck-duck-scrape';
async function run() {
  const results = await search('google movies');
  console.log(results.results.length);
}
run();
