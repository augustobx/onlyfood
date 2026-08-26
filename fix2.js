const fs = require('fs');
let content = fs.readFileSync('app/admin/settings/SettingsForm.tsx', 'utf8');

// Splash Match
let splashRegex = /\{cfg\.splashEnabled && \(\s*<div className="space-y-2 animate-in fade-in">.*?<\/div>\s*\)\}/s;
content = content.replace(splashRegex, 
`{cfg.splashEnabled && (
                       <div className="space-y-4 animate-in fade-in">
                          <div className="space-y-2">
                             <Label>Imagen Animada del Logo (URL)</Label>
                             <Input placeholder="URL de la imagen (dejar en blanco para default 🍕)" value={cfg.splashUrl || ''} onChange={e => updateField('splashUrl', e.target.value)} />
                             <p className="text-xs text-muted-foreground">Recomendamos una imagen PNG transparente (aprox 200x200px).</p>
                          </div>
                          <div className="space-y-2">
                             <Label>Tiempo de duración (Segundos)</Label>
                             <Input type="number" min="1" max="10" value={cfg.splashDuration} onChange={e => updateField('splashDuration', e.target.value)} />
                             <p className="text-xs text-slate-500">Muestra el logo animado antes de entrar a la tienda.</p>
                          </div>
                       </div>
                     )}`
);

let bgRegex = /<div className="mt-8 p-6 rounded-2xl border" style=\{\{ backgroundColor: '#f8fafc' \}\}>/g;
content = content.replace(bgRegex, 
`<div className="space-y-4 border-t pt-6 mt-6 pb-6">
                     <h4 className="font-bold">Fondo General de la App (Background)</h4>
                     <div className="space-y-2">
                        <Label>URL de Imagen de Fondo</Label>
                        <Input placeholder="Ej: https://.../fondo.jpg (Dejar vacío para bloque liso)" value={cfg.backgroundUrl || ''} onChange={e => updateField('backgroundUrl', e.target.value)} />
                     </div>
                     {cfg.backgroundUrl && (
                        <div className="flex items-center justify-between border rounded-lg p-3 bg-slate-50">
                           <Label>Efecto de Desfoque Oscuro (Blur + Opacity)</Label>
                           <Switch checked={cfg.backgroundBlur || false} onCheckedChange={v => updateField('backgroundBlur', v)} />
                        </div>
                     )}
                  </div>

                  <div className="mt-8 p-6 rounded-2xl border" style={{ backgroundColor: '#f8fafc' }}>`
);

fs.writeFileSync('app/admin/settings/SettingsForm.tsx', content);
console.log('Script done');
