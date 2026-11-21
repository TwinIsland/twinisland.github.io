const fs = require('node:fs');
const vm = require('node:vm');

const files = process.argv.slice(2);
const context = vm.createContext({ console });
context.window = context;
for (const file of files) {
  vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename: file });
}

const renderer = context.createBlogMarkdownRenderer();

const { markdown, inline } = JSON.parse(fs.readFileSync(0, 'utf8'));
process.stdout.write(JSON.stringify({
  markdown: markdown.map((path) => renderer.render(fs.readFileSync(path, 'utf8'))),
  inline: inline.map((tex) => context.katex.renderToString(tex)),
}));
