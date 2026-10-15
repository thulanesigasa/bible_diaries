import assert from 'node:assert/strict';
import { pages } from '../src/content/pages.mjs';
const slugs=['legal','terms','privacy','waitlist-privacy','cookies','community-guidelines','safety','support','security'];
let total=0;
for(const slug of slugs){
  const page=pages[slug];
  assert.ok(page?.intro && page.sections.length>=10,`${slug}: incomplete document`);
  assert.equal(new Set(page.sections.map(([heading])=>heading)).size,page.sections.length,`${slug}: duplicate headings`);
  for(const [heading,body] of page.sections){
    assert.ok(typeof heading==='string' && typeof body==='string' && body.trim().length>100,`${slug}: empty/placeholder section`);
    assert.ok(!/\b(?:lorem ipsum|insert policy here|todo:|tbd:)\b/i.test(body),`${slug}: unfinished content`);
  }
  const words=[page.title,page.heading,page.intro,...page.sections.flat()].join(' ').split(/\s+/).filter(Boolean).length;
  total+=words;console.log(`${slug}: ${words.toLocaleString('en-ZA')} words, ${page.sections.length} sections`);
}
assert.ok(total>=20000 && total<=24000,`Expected approximately 20,000 words across the nine documents; received ${total}.`);
console.log(`TOTAL: ${total.toLocaleString('en-ZA')} words. Counts include titles, introductions and section text; navigation and references are excluded.`);
