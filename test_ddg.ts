import * as fs from 'fs';

async function performDDGSearch(query: string) {
    try {
        const res = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                "Accept-Language": "en-US,en;q=0.5"
            }
        });
        const text = await res.text();
        // Super simple regex scrape just to see if we get content
        const snippets = text.match(/<a class="result__snippet[^>]*>(.*?)<\/a>/gi);
        if (snippets) {
            console.log(snippets.map(s => s.replace(/<[^>]+>/g, '').trim()).join('\n'));
        } else {
            console.log("No snippets found", text.length);
        }
    } catch(e) {
        console.error(e);
    }
}
performDDGSearch("hello world");
