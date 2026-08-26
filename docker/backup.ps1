param(
  [string]$Destination = ".\backups",
  [string]$EnvFile = ".env.docker"
)
$ErrorActionPreference = "Stop"
New-Item -ItemType Directory -Force -Path $Destination | Out-Null
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$target = Join-Path (Resolve-Path $Destination) "nfood-$stamp.sql"
docker compose --env-file $EnvFile exec -T db sh -c 'exec mariadb-dump --single-transaction --routines --events -uroot -p"$MARIADB_ROOT_PASSWORD" "$MARIADB_DATABASE"' | Set-Content -Encoding utf8 $target
if ($LASTEXITCODE -ne 0) { Remove-Item -LiteralPath $target -ErrorAction SilentlyContinue; throw "Fallo el backup" }
Write-Output $target
