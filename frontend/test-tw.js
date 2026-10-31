/* eslint-disable @typescript-eslint/no-require-imports */
const { compile } = require('@tailwindcss/node');
const { Scanner } = require('@tailwindcss/oxide');
const fs = require('fs');

async function test() {
  const css = fs.readFileSync('app/globals.css', 'utf8');
  const compiler = await compile(css, {
    from: 'app/globals.css',
    base: process.cwd(),
    onDependency: () => {},
  });
  const scanner = new Scanner({ sources: [{ base: process.cwd(), pattern: '**/*', negated: false }] });
  const candidates = scanner.scan();
  const builtCss = compiler.build([...candidates]);
  console.log('Successfully built Tailwind CSS! Length:', builtCss.length);
  console.log('Candidate count:', candidates.length);
  fs.writeFileSync('app/tailwind-built.css', builtCss);
}

test().catch(console.error);
