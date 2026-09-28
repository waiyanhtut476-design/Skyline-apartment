import fs from 'fs';

const fileContent = fs.readFileSync('src/components/BillCalculator.tsx', 'utf8');

// We want to count the level of <div> and </div> tags in order.
// Let's strip curly braces content correctly to ignore any divs in strings or comments or template literals.
function stripCommentsAndStringsAndBraces(str) {
  let result = '';
  let inString = null;
  let inComment = null;
  let braceCount = 0;
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

    if (char === '{') {
      braceCount++;
      result += ' ';
      pos++;
      continue;
    }
    if (char === '}') {
      braceCount = Math.max(0, braceCount - 1);
      result += ' ';
      pos++;
      continue;
    }

    if (braceCount === 0) {
      result += char;
    } else {
      result += ' ';
    }
    pos++;
  }
  return result;
}

const cleaned = stripCommentsAndStringsAndBraces(fileContent);
const lines = cleaned.split('\n');

const stack = [];

function getLineAndCol(index) {
  const lines = fileContent.substring(0, index).split('\n');
  return { line: lines.length, col: lines[lines.length - 1].length + 1 };
}

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

    if (tagText.startsWith('/')) {
      const tagName = tagText.substring(1).trim().split(' ')[0].toLowerCase();
      if (tagName === 'div') {
        if (stack.length === 0) {
          console.log(`Error: Extra closing </div> at Line ${i + 1}`);
        } else {
          const top = stack.pop();
          // We can see the span
          // console.log(`Closed <div> from Line ${top.line} on Line ${i + 1}`);
        }
      }
    } else {
      const isSelfClosing = tagText.endsWith('/') || tagText.includes('/>');
      if (isSelfClosing) continue;
      const tagName = tagText.split(' ')[0].toLowerCase();
      if (tagName === 'div') {
        stack.push({ line: i + 1 });
      }
    }
  }
}

console.log(`Nesting check done. Remaining open <div> elements in stack: ${stack.length}`);
if (stack.length > 0) {
  console.log("Unclosed <div> elements:");
  for (const item of stack) {
    console.log(`  <div className="..."> at Line ${item.line}`);
  }
}
