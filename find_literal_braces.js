import fs from 'fs';

const fileContent = fs.readFileSync('src/components/BillCalculator.tsx', 'utf8');

const lines = fileContent.split('\n');

// We want to find any '}' character that is in plain text (i.e. not preceded by '$' in template literals, and not part of code)
// In JSX, plain text is anything outside of tags and curly braces.
// Let's search for lines containing '}' but not '{' or any other indicator, or check their context.
for (let i = 569; i < 1712; i++) {
  const line = lines[i];
  if (line.includes('}')) {
    // Check if it's part of a JSX expression or a style or something
    // If it's just in a text span, like "နားလည်ပါပြီ (Close) }"
    // Let's print all lines containing '}' to manually verify.
    console.log(`Line ${i + 1}: ${line.trim()}`);
  }
}
