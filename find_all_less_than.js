import fs from 'fs';

const fileContent = fs.readFileSync('src/components/BillCalculator.tsx', 'utf8');

const lines = fileContent.split('\n');

// The JSX block is between line 570 and 1712
for (let i = 569; i < 1712; i++) {
  const line = lines[i];
  let idx = 0;
  while ((idx = line.indexOf('<', idx)) !== -1) {
    // Check if it's part of an HTML tag or comment or if it's something else
    const after = line.substring(idx + 1).trim();
    const isTag = /^[a-zA-Z/!]/.test(after);
    if (!isTag) {
      console.log(`Non-tag '<' found at Line ${i + 1}, Col ${idx + 1}: ${line.trim()}`);
    }
    idx++;
  }
}
