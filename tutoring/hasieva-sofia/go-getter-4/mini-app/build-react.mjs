import {build} from 'esbuild';
import {fileURLToPath} from 'node:url';
import {readFile,writeFile,copyFile} from 'node:fs/promises';
const root=new URL('../../../../',import.meta.url);
await copyFile(new URL('../supabase/functions/_shared/vocab/unit2.json',import.meta.url),new URL('vocab-space/unit2.json',root));
await build({entryPoints:[fileURLToPath(new URL('frontend/react/main.jsx',import.meta.url))],outfile:fileURLToPath(new URL('street-style-week/app.js',root)),bundle:true,format:'iife',target:['safari15','chrome100'],jsx:'automatic',minify:true,legalComments:'eof',define:{'process.env.NODE_ENV':'"production"'}});
for(const [entry,file,format] of [['CelebrationPreview.jsx','vocab-space/celebration.mjs','esm'],['GrammarApp.jsx','grammar-snack-01/app.js','iife'],['VocabApp.jsx','vocab-space/app.mjs','esm']]) {
 await build({entryPoints:[fileURLToPath(new URL('frontend/react/'+entry,import.meta.url))],outfile:fileURLToPath(new URL(file,root)),bundle:true,format,target:['safari15','chrome100'],jsx:'automatic',minify:true,legalComments:'eof',define:{'process.env.NODE_ENV':'"production"'}});
}
for(const file of ['tutoring/index.html','street-style-week/index.html','grammar-snack-01/index.html','vocab-space/index.html']){
 const path=new URL(file,root),text=await readFile(path,'utf8');
 const version='react-20261019-blue1';
 const output=text.replace(/(<script[^>]*\bsrc="(?:\.\.\/street-style-week\/)?app\.(?:js|mjs))(?:\?[^"\n]*)?"/,'$1?v='+version+'"');
 if(output!==text)await writeFile(path,output);
}
console.log('Built React + JavaScript for catalog, Street Style, Grammar Snack and Vocab Space; stable routes, banks and progress stores retained.');
