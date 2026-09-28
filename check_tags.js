import fs from 'fs';

let code = fs.readFileSync('src/components/BillCalculator.tsx', 'utf8');

// Let's strip curly braces content correctly handling nesting
function stripCurlyBraces(str) {
  let result = '';
  let braceCount = 0;
  let inString = null; // " or ' or `
  let escaped = false;

  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    
    if (escaped) {
      escaped = false;
      if (braceCount === 0) result += char;
      continue;
    }
    
    if (char === '\\') {
      escaped = true;
      if (braceCount === 0) result += char;
      continue;
    }

    if (inString) {
      if (char === inString) {
        inString = null;
      }
      if (braceCount === 0) result += char;
      continue;
    }

    if (char === '"' || char === "'" || char === '`') {
      inString = char;
      if (braceCount === 0) result += char;
      continue;
    }

    if (char === '{') {
      braceCount++;
      // replace with space to preserve offsets/positions or empty
      result += ' ';
      continue;
    }

    if (char === '}') {
      braceCount = Math.max(0, braceCount - 1);
      result += ' ';
      continue;
    }

    if (braceCount === 0) {
      result += char;
    } else {
      result += ' '; // inside curly, replace with space
    }
  }
  return result;
}

const cleanedCode = stripCurlyBraces(code);
const lines = cleanedCode.split('\n');
const stack = [];

const HTML_TAGS = new Set([
  'div', 'span', 'p', 'form', 'label', 'select', 'input', 'option', 
  'button', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'table', 'thead', 
  'tbody', 'tr', 'th', 'td', 'a', 'img', 'svg', 'ul', 'li', 'ol',
  'strong', 'em', 'code', 'pre', 'textarea'
]);

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
    
    const tagContent = line.substring(nextTag + 1, closeTag).trim();
    pos = closeTag + 1;
    
    // Ignore comments
    if (tagContent.startsWith('!--') || tagContent.startsWith('/*')) {
      continue;
    }
    
    // If it is a closing tag
    if (tagContent.startsWith('/')) {
      const tagName = tagContent.substring(1).trim();
      const nameMatch = tagName.match(/^([a-z0-9]+)/);
      if (nameMatch) {
        const name = nameMatch[1];
        if (!HTML_TAGS.has(name)) continue;
        
        if (stack.length === 0) {
          console.log(`Error: Extra closing HTML tag </${name}> at line ${i + 1}`);
        } else {
          const last = stack.pop();
          if (last.name !== name) {
            console.log(`Mismatched tags: opened <${last.name}> at line ${last.line} but closed with </${name}> at line ${i + 1}`);
            stack.push(last); // keep in stack
          }
        }
      }
    } else {
      // Opening tag or self-closing tag
      const isSelfClosing = tagContent.endsWith('/') || tagContent.includes('/>');
      if (isSelfClosing) continue;
      
      const nameMatch = tagContent.match(/^([a-z0-9]+)/);
      if (nameMatch) {
        const name = nameMatch[1];
        if (!HTML_TAGS.has(name)) continue;
        
        if (name === 'br' || name === 'hr' || name === 'img' || name === 'input') {
          continue; // standard self-closing
        }
        stack.push({ name, line: i + 1 });
      }
    }
  }
}

console.log(`Remaining open standard HTML tags:`, stack.length);
if (stack.length > 0) {
  console.log(`All unclosed HTML tags from stack:`, stack);
}
