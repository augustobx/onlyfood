const fs = require('fs');
let content = fs.readFileSync('app/(store)/StorefrontClient.tsx', 'utf8');

// Replace pizza emoji with dynamic image
let splashRegex = /<span className="text-6xl md:text-7xl">🍕<\/span>/;
content = content.replace(splashRegex, 
`{config?.splashUrl ? (
                   <img src={config.splashUrl} alt="Logo" className="w-[85%] h-[85%] object-contain" />
                ) : (
                   <span className="text-6xl md:text-7xl">🍕</span>
                )}`
);

let mb8Regex = /className="w-32 h-32 md:w-40 md:h-40 bg-white rounded-full flex items-center justify-center shadow-2xl mb-8 border-4 border-white"/;
content = content.replace(mb8Regex, 'className="w-32 h-32 md:w-40 md:h-40 bg-white rounded-full flex items-center justify-center shadow-2xl mb-8 border-4 border-white overflow-hidden"');

fs.writeFileSync('app/(store)/StorefrontClient.tsx', content);
console.log('Done!');
