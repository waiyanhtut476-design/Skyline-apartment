import fs from 'fs';

const fileContent = fs.readFileSync('src/components/BillCalculator.tsx', 'utf8');

// Strip template strings and comments to avoid false positives
function stripCommentsAndStrings(str) {
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

const cleaned = stripCommentsAndStrings(fileContent);

// Search for tags like <input, <br, <hr, <img
const tagRegex = /<([a-zA-Z0-9]+)([^>]*?)>/g;
let match;

const selfClosingNames = new Set(['input', 'br', 'hr', 'img', 'link']);

function getLineAndCol(index) {
  const lines = fileContent.substring(0, index).split('\n');
  return { line: lines.length, col: lines[lines.length - 1].length + 1 };
}

while ((match = tagRegex.exec(cleaned)) !== null) {
  const name = match[1].toLowerCase();
  const attributes = match[2];
  
  if (selfClosingNames.has(name)) {
    const isSelfClosed = attributes.endsWith('/');
    if (!isSelfClosed) {
      // Find position in the original file content
      const originalIndex = fileContent.indexOf(match[0]);
      const { line, col } = getLineAndCol(originalIndex);
      console.log(`Potential unclosed self-closing tag <${name}> at Line ${line}, Col ${col}: ${match[0]}`);
    }
  }
}
