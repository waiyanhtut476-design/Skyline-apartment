import esbuild from 'esbuild';
import fs from 'fs';

const files = fs.readdirSync('src/components');

for (const file of files) {
  if (!file.endsWith('.tsx')) continue;
  const filePath = `src/components/${file}`;
  
  try {
    esbuild.buildSync({
      entryPoints: [filePath],
      bundle: true,
      write: false,
      loader: { '.tsx': 'tsx' },
      logLevel: 'silent',
    });
    console.log(`${file} parsed successfully!`);
  } catch (e) {
    console.log(`\n--- Error in ${file} ---`);
    if (e.errors) {
      for (const error of e.errors) {
        console.log(`[${error.location.file}:${error.location.line}:${error.location.column}] ${error.text}`);
        console.log(`  Code: ${error.location.lineText}`);
      }
    } else {
      console.log(e);
    }
  }
}
