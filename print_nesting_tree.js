import fs from 'fs';

const fileContent = fs.readFileSync('src/components/BillCalculator.tsx', 'utf8');

// Strip comments and strings and curly braces content first to be clean
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

    // Ignore html comments
    if (tagText.startsWith('!--')) continue;

    if (tagText.startsWith('/')) {
      const tagName = tagText.substring(1).trim().split(' ')[0];
      // Only keep alphanumeric tags (lowercase and uppercase)
      if (/^[a-zA-Z0-9:]+$/.test(tagName)) {
        if (stack.length === 0) {
          console.log(`Extra closing tag </${tagName}> at Line ${i + 1}`);
        } else {
          const top = stack.pop();
          if (top.name !== tagName) {
            console.log(`Mismatch: Opened <${top.name}> at Line ${top.line} but closed with </${tagName}> at Line ${i + 1}`);
            // Put it back to trace
            stack.push(top);
          }
        }
      }
    } else {
      const isSelfClosing = tagText.endsWith('/') || tagText.includes('/>');
      if (isSelfClosing) continue;
      const tagName = tagText.split(/[\s>]/)[0];
      if (/^[a-zA-Z0-9:]+$/.test(tagName)) {
        // Skip common self-closers
        if (tagName === 'br' || tagName === 'hr' || tagName === 'img' || tagName === 'input' || tagName === 'link' || tagName === 'meta') {
          continue;
        }
        stack.push({ name: tagName, line: i + 1 });
      }
    }
  }
}

console.log(`Stack remaining size: ${stack.length}`);
if (stack.length > 0) {
  console.log("Unclosed tags stack:");
  console.log(stack);
}
