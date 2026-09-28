import fs from 'fs';

const fileContent = fs.readFileSync('src/components/BillCalculator.tsx', 'utf8');

let pos = 0;
const len = fileContent.length;

const bracesStack = [];
let inString = null;
let inComment = null;
let inRegex = false;

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

  if (char === '{') {
    bracesStack.push('{');
  } else if (char === '}') {
    bracesStack.pop();
  }

  pos++;
}

console.log("End of file states:");
console.log("  inString:", inString);
console.log("  inComment:", inComment);
console.log("  inRegex:", inRegex);
console.log("  bracesStack size:", bracesStack.length);
