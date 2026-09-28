import esbuild from 'esbuild';

try {
  const result = esbuild.buildSync({
    entryPoints: ['src/components/BillCalculator.tsx'],
    bundle: true,
    write: false,
    loader: { '.tsx': 'tsx' },
    logLevel: 'silent',
  });
  console.log("esbuild parsed successfully!");
} catch (e) {
  console.log("esbuild build failed:");
  if (e.errors) {
    for (const error of e.errors) {
      console.log(`[${error.location.file}:${error.location.line}:${error.location.column}] ${error.text}`);
      console.log(`  Code: ${error.location.lineText}`);
    }
  } else {
    console.log(e);
  }
}
