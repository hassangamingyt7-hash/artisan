const fs = require('fs');
const glob = require('glob');

const files = glob.sync('src/components/**/*.tsx');
files.forEach(file => {
   let code = fs.readFileSync(file, 'utf8');
   
   // Replace `{isSaving ? "Saving..." : (\n                  {editingId ? ...}\n                )}`
   // Basically, if we have ({something}) we want (something) inside the ternary, BUT inside JSX `{}` wrapper we must not have nested `{}`.
   // Wait, if it was `{editingId ? "A" : "B"}`, the regex captured `{editingId ? "A" : "B"}`.
   // So it became: `{isSaving ? "Saving..." : ( {editingId ? "A" : "B"} )}`
   // We want `{isSaving ? "Saving..." : ( editingId ? "A" : "B" )}`
   
   // So we replace `( \n {` and `} \n )` with `(` and `)`.
   // Regex to find `(\s*\{([^]*?)\}\s*)` after `isSaving ? "Saving..." : `
   
   let oldCode = code;
   code = code.replace(/\{isSaving \? "Saving\.\.\." : \([\s\S]*?\{([\s\S]*?)\}[\s\S]*?\)\}/g, '{isSaving ? "Saving..." : ($1)}');
   

   if (oldCode !== code) {
     fs.writeFileSync(file, code);
     console.log('Fixed', file);
   }
});
