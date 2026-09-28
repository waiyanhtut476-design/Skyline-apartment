import fs from 'fs';

const fileContent = fs.readFileSync('src/components/BillCalculator.tsx', 'utf8');
const lines = fileContent.split('\n');

const stack = [];

// Trace from line 1254 to 1535
for (let i = 1253; i < 1535; i++) {
  const line = lines[i];
  
  let cleanedLine = line;
  const doubleSlashIdx = line.indexOf('//');
  if (doubleSlashIdx !== -1) {
    cleanedLine = line.substring(0, doubleSlashIdx);
  }

  let pos = 0;
  while (pos < cleanedLine.length) {
    const nextTag = cleanedLine.indexOf('<', pos);
    if (nextTag === -1) break;
    const closeTag = cleanedLine.indexOf('>', nextTag);
    if (closeTag === -1) {
      pos = nextTag + 1;
      continue;
    }
    const tagText = cleanedLine.substring(nextTag + 1, closeTag).trim();
    pos = closeTag + 1;

    if (tagText.startsWith('!--')) continue;

    if (tagText.startsWith('/')) {
      const tagName = tagText.substring(1).trim().split(' ')[0].toLowerCase();
      if (tagName === 'div') {
        if (stack.length === 0) {
          console.log(`Extra </div> inside modal at Line ${i + 1}: ${line.trim()}`);
        } else {
          const top = stack.pop();
          console.log(`  [DIV] Opened Line ${top.line} --> Closed Line ${i + 1}`);
        }
      }
    } else {
      const isSelfClosing = tagText.endsWith('/') || tagText.includes('/>');
      if (isSelfClosing) continue;
      const tagName = tagText.split(/[\s>]/)[0].toLowerCase();
      if (tagName === 'div') {
        stack.push({ name: 'div', line: i + 1 });
      }
    }
  }
}

console.log(`Modal Stack remaining size: ${stack.length}`);
if (stack.length > 0) {
  console.log("Unclosed tags inside modal:");
  console.log(stack);
}
