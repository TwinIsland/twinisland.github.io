window.createBlogMarkdownRenderer = function createBlogMarkdownRenderer() {
  if (!window.markdownit) return;

  const renderer = window.markdownit({
    html: false,
    linkify: true,
    breaks: false,
  });
  if (typeof window.markdownitKatexBridge === 'function') {
    renderer.use(window.markdownitKatexBridge);
  }

  renderer.core.ruler.after(
    'inline',
    'blog_image_captions',
    ({ tokens, Token }) => {
      for (let index = 0; index < tokens.length - 2; index += 1) {
        const open = tokens[index];
        const inline = tokens[index + 1];
        const close = tokens[index + 2];
        const children = inline.children;
        if (
          open.type !== 'paragraph_open' ||
          close.type !== 'paragraph_close' ||
          children?.length !== 1
        ) {
          continue;
        }

        const image = children[0];
        const title = image.type === 'image' ? image.attrIndex('title') : -1;
        const caption = title < 0 ? '' : image.attrs[title][1].trim();
        if (!caption) continue;

        open.type = 'figure_open';
        open.tag = 'figure';
        open.hidden = false;
        close.type = 'figure_close';
        close.tag = 'figure';
        close.hidden = false;
        image.attrs.splice(title, 1);

        const captionToken = new Token('blog_image_caption', '', 0);
        captionToken.content = caption;
        tokens.splice(index + 2, 0, captionToken);
        index += 3;
      }
    }
  );
  renderer.renderer.rules.blog_image_caption = (tokens, index) =>
    `<figcaption>${renderer.utils.escapeHtml(tokens[index].content)}</figcaption>\n`;
  return renderer;
};
