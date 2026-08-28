param(
    [Parameter(Mandatory = $true)]
    [ValidateNotNullOrEmpty()]
    [string]$Mensaje
)

$ErrorActionPreference = "Stop"

$raizProyecto = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $raizProyecto

if (-not (Test-Path -LiteralPath ".git")) {
    throw "No se encontro el repositorio Git en $raizProyecto"
}

$ramaActual = (git branch --show-current).Trim()
if ($LASTEXITCODE -ne 0) {
    throw "No se pudo determinar la rama actual."
}

if ($ramaActual -ne "main") {
    throw "La publicacion debe ejecutarse desde la rama main. Rama actual: $ramaActual"
}

git fetch origin main
if ($LASTEXITCODE -ne 0) {
    throw "No se pudo consultar origin/main."
}

$local = (git rev-parse HEAD).Trim()
$remoto = (git rev-parse origin/main).Trim()
$baseComun = (git merge-base HEAD origin/main).Trim()

if ($local -eq $remoto) {
    Write-Host "La rama local esta sincronizada con GitHub."
}
elseif ($local -eq $baseComun) {
    throw "GitHub tiene cambios nuevos. Ejecuta git pull --ff-only antes de publicar."
}
elseif ($remoto -ne $baseComun) {
    throw "La rama local y GitHub tienen historiales distintos. Revisa el repositorio antes de publicar."
}

git add -A
if ($LASTEXITCODE -ne 0) {
    throw "No se pudieron preparar los cambios."
}

git diff --cached --quiet
if ($LASTEXITCODE -eq 0) {
    Write-Host "No hay cambios nuevos para publicar."
    exit 0
}

git commit -m $Mensaje
if ($LASTEXITCODE -ne 0) {
    throw "No se pudo crear el commit."
}

git push origin main
if ($LASTEXITCODE -ne 0) {
    throw "El commit se creo localmente, pero no se pudo subir a GitHub."
}

$commitPublicado = (git rev-parse --short HEAD).Trim()
Write-Host "Publicado correctamente en GitHub: $commitPublicado"
