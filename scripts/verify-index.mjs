import fs from 'node:fs';
import vm from 'node:vm';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
if (!html.includes('<!DOCTYPE html') || !html.includes('</html>')) throw new Error('index.html structure is incomplete');
if (!html.includes('MindDeck V9.0')) throw new Error('Unexpected MindDeck version in index.html');
const match = html.match(/<script>([\s\S]*?)<\/script>/);
if (!match) throw new Error('Main script not found');
new vm.Script(match[1], { filename: 'index-inline.js' });
console.log('index.html inline JavaScript syntax: OK');
