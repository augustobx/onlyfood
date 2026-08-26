const fs = require('fs');
let content = fs.readFileSync('app/admin/settings/SettingsForm.tsx', 'utf8');

// Add logoUrl payload
content = content.replace(
  'splashUrl: cfg.splashUrl,',
  'splashUrl: cfg.splashUrl,\n       logoUrl: cfg.logoUrl,'
);

// Add input to UI
content = content.replace(
  '<Label>Nombre de la Aplicación (Título)</Label>',
  '<Label>Nombre de la Aplicación (Título)</Label>'
);

content = content.replace(
  '<Input value={cfg.appName} onChange={e => updateField(\\'appName\\', e.target.value)} />\\n                </div>',
  '<Input value={cfg.appName} onChange={e => updateField(\\'appName\\', e.target.value)} />\\n                </div>\\n                <div className=\"space-y-2\">\\n                  <Label>Logo del NavBar (URL)</Label>\\n                  <Input placeholder=\"Dejar vacío para usar el nombre\" value={cfg.logoUrl || \\'\\'} onChange={e => updateField(\\'logoUrl\\', e.target.value)} />\\n                  <p className=\"text-xs text-muted-foreground\">Aparecerá en la barra superior en vez del texto.</p>\\n                </div>'
);

fs.writeFileSync('app/admin/settings/SettingsForm.tsx', content);
console.log('Done!');
