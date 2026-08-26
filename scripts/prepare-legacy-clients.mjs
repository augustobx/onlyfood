import fs from "node:fs";
import path from "node:path";

const sourcePath = path.resolve(process.argv[2] || "dbbkpd/clientes.sql");
const migrationDir = path.resolve(
  process.argv[3] || "prisma/migrations/20260812223000_import_legacy_clients",
);
const outputPath = path.join(migrationDir, "migration.sql");

if (!fs.existsSync(sourcePath)) {
  throw new Error(`No se encontró el respaldo: ${sourcePath}`);
}

const source = fs.readFileSync(sourcePath, "utf8");
const rowPattern = /\((\d+), '((?:[^'\\]|\\.)*)', '((?:[^'\\]|\\.)*)', (NULL|'(?:[^'\\]|\\.)*'), (-?\d+), (NULL|'(?:[^'\\]|\\.)*'), '([^']+)'\)(?:,|;)/g;

function decodeSqlString(value) {
  if (value === "NULL") return null;
  const content = value.startsWith("'") ? value.slice(1, -1) : value;
  return content
    .replace(/\\0/g, "\0")
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\Z/g, "\x1a")
    .replace(/\\'/g, "'")
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, "\\");
}

function escapeSql(value) {
  if (value === null) return "NULL";
  return `'${String(value)
    .replace(/\\/g, "\\\\")
    .replace(/\0/g, "\\0")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/\x1a/g, "\\Z")
    .replace(/'/g, "\\'")}'`;
}

const clients = [];
for (const match of source.matchAll(rowPattern)) {
  clients.push({
    legacyId: Number(match[1]),
    phone: decodeSqlString(match[2]),
    name: decodeSqlString(match[4]),
    points: Number(match[5]),
    createdAt: match[7],
  });
}

if (clients.length === 0) throw new Error("El respaldo no contiene clientes reconocibles.");

const phones = new Set();
for (const client of clients) {
  if (!client.phone || client.phone.length > 50) {
    throw new Error(`Usuario inválido en cliente ${client.legacyId}.`);
  }
  if (phones.has(client.phone)) throw new Error(`Teléfono duplicado: ${client.phone}.`);
  phones.add(client.phone);
}

const values = clients.map((client) => `(
  ${escapeSql(`legacy-client-${client.legacyId}`)},
  ${escapeSql(client.phone)},
  '',
  TRUE,
  ${escapeSql(client.name)},
  ${client.points},
  ${escapeSql(client.createdAt)},
  ${escapeSql(client.createdAt)}
)`).join(",\n");

const migration = `-- Accounts imported from the legacy clientes table.
-- Legacy passwords and security tokens are intentionally excluded.
ALTER TABLE \`Client\`
  ADD COLUMN \`passwordSetupRequired\` BOOLEAN NOT NULL DEFAULT false;

INSERT IGNORE INTO \`Client\`
  (\`id\`, \`phone\`, \`password\`, \`passwordSetupRequired\`, \`name\`, \`points\`, \`createdAt\`, \`updatedAt\`)
VALUES
${values};
`;

fs.mkdirSync(migrationDir, { recursive: true });
fs.writeFileSync(outputPath, migration, "utf8");
console.log(`Migración preparada con ${clients.length} clientes: ${outputPath}`);
