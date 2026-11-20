const fs = require('node:fs');
const vm = require('node:vm');

const [markdownIt, katex, bridge] = process.argv.slice(2);
const context = vm.createContext({ console });
context.window = context;
for (const file of [markdownIt, katex, bridge]) {
  vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename: file });
}

const renderer = context.markdownit({ html: false, linkify: true, breaks: false });
renderer.use(context.markdownitKatexBridge);

const paths = JSON.parse(fs.readFileSync(0, 'utf8'));
const articles = paths.map((path) => renderer.render(fs.readFileSync(path, 'utf8')));
process.stdout.write(JSON.stringify(articles));
