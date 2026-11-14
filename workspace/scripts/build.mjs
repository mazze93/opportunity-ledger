import {readFileSync,writeFileSync,mkdirSync,cpSync} from 'node:fs';
mkdirSync('dist/server',{recursive:true});mkdirSync('dist/.openai',{recursive:true});
const html=readFileSync('web/index.html','utf8').replace('/* APP_CSS */',readFileSync('web/style.css','utf8')).replace('/* APP_JS */',readFileSync('web/app.js','utf8'));
writeFileSync('dist/server/index.js',readFileSync('worker/index.js','utf8').replace('const HTML = "BUILD_HTML";', 'const HTML = '+JSON.stringify(html)+';'));
cpSync('.openai/hosting.json','dist/.openai/hosting.json');
console.log('Worker and embedded interface built.');
