import fs from 'node:fs/promises';
import path from 'node:path';

const WEBSITE_ROOT = path.resolve(process.cwd(), '..');

function countMatches(input, pattern) {
  const matches = input.match(pattern);
  return matches ? matches.length : 0;
}

async function main() {
  const files = (await fs.readdir(WEBSITE_ROOT))
    .filter((file) => file.toLowerCase().endsWith('.html'))
    .sort((a, b) => a.localeCompare(b));

  const report = [];
  for (const file of files) {
    const source = await fs.readFile(path.join(WEBSITE_ROOT, file), 'utf8');
    const inlineScripts = countMatches(source, /<script(?![^>]*\bsrc=)[^>]*>[\s\S]*?<\/script>/gi);
    const inlineHandlers = countMatches(source, /\son[a-z]+\s*=\s*["'][^"']*["']/gi);
    if (inlineScripts || inlineHandlers) {
      report.push({ file, inlineScripts, inlineHandlers });
    }
  }

  console.log('CSP inline-code inventory');
  console.log('file,inlineScripts,inlineHandlers');
  for (const row of report) {
    console.log(`${row.file},${row.inlineScripts},${row.inlineHandlers}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
