import fs from 'fs';

const fileContent = fs.readFileSync('src/components/BillCalculator.tsx', 'utf8');

const lines = fileContent.split('\n');

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.includes('&& (') || line.includes('? (')) {
    console.log(`Conditional start on line ${i + 1}: ${line.trim()}`);
    
    // Find matching ')}' or ')'
    let parenLevel = 0;
    let braceLevel = 0;
    let found = false;
    
    // Scan from the index of '(' in this line
    let charIdx = fileContent.indexOf('(', fileContent.indexOf(line));
    if (charIdx === -1) continue;
    
    // Find matching closing paren and curly brace ')}' or ')'
    let scan = charIdx;
    while (scan < fileContent.length) {
      const char = fileContent[scan];
      if (char === '(') parenLevel++;
      if (char === ')') {
        parenLevel--;
        if (parenLevel === 0) {
          // Check if followed by '}' or if inside curly braces
          // Let's print where it closed
          const linesClosed = fileContent.substring(0, scan).split('\n');
          console.log(`  --> Closed on line ${linesClosed.length}: ${linesClosed[linesClosed.length - 1].trim()}`);
          found = true;
          break;
        }
      }
      scan++;
    }
  }
}
