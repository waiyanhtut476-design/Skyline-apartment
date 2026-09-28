import fs from 'fs';

const fileContent = fs.readFileSync('src/components/BillCalculator.tsx', 'utf8');

// Strip only strings and comments
function strip(str) {
  let result = '';
  let inString = null;
  let inComment = null;
  let pos = 0;
  const len = str.length;

  while (pos < len) {
    const char = str[pos];
    const next = str[pos + 1];

    if (inComment === 'slashslash') {
      if (char === '\n') inComment = null;
      pos++;
      continue;
    }
    if (inComment === 'multiline') {
      if (char === '*' && next === '/') {
        inComment = null;
        pos += 2;
      } else {
        pos++;
      }
      continue;
    }

    if (inString) {
      if (char === '\\') {
        pos += 2;
        continue;
      }
      if (char === inString) {
        inString = null;
      }
      pos++;
      continue;
    }

    if (char === '/' && next === '/') {
      inComment = 'slashslash';
      pos += 2;
      continue;
    }
    if (char === '/' && next === '*') {
      inComment = 'multiline';
      pos += 2;
      continue;
    }

    if (char === '"' || char === "'" || char === '`') {
      inString = char;
      pos++;
      continue;
    }

    result += char;
    pos++;
  }
  return result;
}

const cleaned = strip(fileContent);
const lines = cleaned.split('\n');

const stack = [];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  let pos = 0;
  while (pos < line.length) {
    const nextTag = line.indexOf('<', pos);
    if (nextTag === -1) break;
    const closeTag = line.indexOf('>', nextTag);
    if (closeTag === -1) {
      pos = nextTag + 1;
      continue;
    }
    const tagText = line.substring(nextTag + 1, closeTag).trim();
    pos = closeTag + 1;

    if (tagText.startsWith('!--')) continue;

    if (tagText.startsWith('/')) {
      const tagName = tagText.substring(1).trim().split(' ')[0].toLowerCase();
      if (tagName === 'div') {
        if (stack.length === 0) {
          console.log(`Extra </div> at Line ${i + 1}`);
        } else {
          const top = stack.pop();
          console.log(`[DIV] Opened Line ${top.line} --> Closed Line ${i + 1}`);
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

console.log(`Stack remaining size: ${stack.length}`);
if (stack.length > 0) {
  console.log("Unclosed tags stack:");
  console.log(stack);
}
