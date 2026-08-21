import fs from 'node:fs';

const indexUrl = new URL('../index.html', import.meta.url);
const runtime = fs.readFileSync(new URL('../src/runtime/shared-core.js', import.meta.url), 'utf8').trimEnd();
const styles = fs.readFileSync(new URL('../src/runtime/shared-styles.css', import.meta.url), 'utf8').trimEnd();
let html = fs.readFileSync(indexUrl, 'utf8');

const runtimePattern = /<!-- MINDDECK_SHARED_RUNTIME_START -->\s*<script id="minddeck-shared-runtime">\s*[\s\S]*?\s*<\/script>\s*<!-- MINDDECK_SHARED_RUNTIME_END -->/;
const stylesPattern = /<!-- MINDDECK_SHARED_STYLES_START -->\s*<style id="minddeck-shared-styles">\s*[\s\S]*?\s*<\/style>\s*<!-- MINDDECK_SHARED_STYLES_END -->/;

if (!runtimePattern.test(html)) throw new Error('Shared runtime markers not found in index.html');
if (!stylesPattern.test(html)) throw new Error('Shared styles markers not found in index.html');

html = html.replace(runtimePattern,
`<!-- MINDDECK_SHARED_RUNTIME_START -->
<script id="minddeck-shared-runtime">
${runtime}
</script>
<!-- MINDDECK_SHARED_RUNTIME_END -->`);

html = html.replace(stylesPattern,
`<!-- MINDDECK_SHARED_STYLES_START -->
<style id="minddeck-shared-styles">
${styles}
</style>
<!-- MINDDECK_SHARED_STYLES_END -->`);

fs.writeFileSync(indexUrl, html);
console.log('MindDeck shared runtime embedded into index.html');
