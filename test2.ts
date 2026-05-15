async function searchWikipedia(query: string) {
  const url = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&utf8=&format=json&srlimit=3`;
  const response = await fetch(url);
  const data = await response.json();
  const results = data.query.search;
  
  const summaries = await Promise.all(results.map(async (r: any) => {
    const detailUrl = `https://en.wikipedia.org/w/api.php?action=query&prop=extracts&exintro=&explaintext=&titles=${encodeURIComponent(r.title)}&format=json`;
    const details = await fetch(detailUrl).then(res => res.json());
    const pages = details.query.pages;
    const extract = Object.values(pages)[0].extract;
    return `Title: ${r.title}\nSummary: ${extract}`;
  }));
  console.log(summaries.join('\n\n'));
}

searchWikipedia("Hombre fotografiando una bandera gigante").catch(console.error);
