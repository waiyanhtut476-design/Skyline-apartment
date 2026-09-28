import fs from 'fs';

const fileContent = fs.readFileSync('src/components/BillCalculator.tsx', 'utf8');

let pos = 0;
const len = fileContent.length;

const stack = [];
let inString = null;
let inComment = null;
let inRegex = false;

function getLineAndCol(index) {
  const lines = fileContent.substring(0, index).split('\n');
  return { line: lines.length, col: lines[lines.length - 1].length + 1 };
}

while (pos < len) {
  const char = fileContent[pos];
  const next = fileContent[pos + 1];

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

  if (inRegex) {
    if (char === '\\') {
      pos += 2;
      continue;
    }
    if (char === '/') {
      inRegex = false;
      pos++;
      while (pos < len && /[gimyua-z]/.test(fileContent[pos])) {
        pos++;
      }
      continue;
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

  if (char === '/') {
    let endOfLine = fileContent.indexOf('\n', pos);
    if (endOfLine === -1) endOfLine = len;
    let nextSlash = fileContent.indexOf('/', pos + 1);
    if (nextSlash !== -1 && nextSlash < endOfLine) {
      inRegex = true;
      pos++;
      continue;
    }
  }

  if (char === '{' || char === '(' || char === '[') {
    const { line, col } = getLineAndCol(pos);
    stack.push({ type: char, line, col });
  } else if (char === '}' || char === ')' || char === ']') {
    const { line, col } = getLineAndCol(pos);
    if (stack.length === 0) {
      console.log(`Error: Extra closing '${char}' at Line ${line}, Col ${col}`);
    } else {
      const top = stack.pop();
      const expected = { '}': '{', ')': '(', ']': '[' }[char];
      if (top.type !== expected) {
        console.log(`Mismatched braces: opened '${top.type}' at Line ${top.line}, Col ${top.col} but closed with '${char}' at Line ${line}, Col ${col}`);
        stack.push(top); // keep open
      }
    }
  }

  pos++;
}

console.log(`Scan completed. Stack size: ${stack.length}`);
if (stack.length > 0) {
  console.log("Unclosed items:");
  for (const item of stack) {
    console.log(`  '${item.type}' at Line ${item.line}, Col ${item.col}`);
  }
}
