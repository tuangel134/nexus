# NEXUS - Windows Installer
Write-Host ""
Write-Host "╔══════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║         ⬡ NEXUS — Instalador Windows        ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

$REPO = "https://github.com/tuusuario/nexus.git"
$INSTALL_DIR = "$env:USERPROFILE\nexus"

# Verificar Python
try {
    $py = Get-Command python3 -ErrorAction Stop
} catch {
    try {
        $py = Get-Command python -ErrorAction Stop
    } catch {
        Write-Host "❌ Python no encontrado. Descargalo desde https://python.org" -ForegroundColor Red
        exit 1
    }
}
Write-Host "✅ Python $(& $py.Source --version 2>&1)" -ForegroundColor Green

# Clonar
if (Test-Path $INSTALL_DIR) {
    Write-Host "📂 Actualizando NEXUS..." -ForegroundColor Yellow
    Set-Location $INSTALL_DIR; & "git" pull
} else {
    Write-Host "📥 Descargando NEXUS..." -ForegroundColor Yellow
    & "git" clone $REPO $INSTALL_DIR 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "📥 git no disponible, descargando ZIP..." -ForegroundColor Yellow
        $wc = New-Object System.Net.WebClient
        $wc.DownloadFile("https://github.com/tuusuario/nexus/archive/main.zip", "$env:TEMP\nexus.zip")
        Expand-Archive "$env:TEMP\nexus.zip" -DestinationPath "$env:USERPROFILE"
        Rename-Item "$env:USERPROFILE\nexus-main" $INSTALL_DIR
    }
}

Set-Location $INSTALL_DIR

# Instalar dependencias Python
Write-Host "📦 Instalando dependencias..." -ForegroundColor Yellow
& $py.Source -m pip install flask cryptography qrcode[pil] --quiet 2>&1 | Out-Null

# Build frontend
if (Test-Path "nexus-frontend/app") {
    if (Get-Command npm -ErrorAction SilentlyContinue) {
        Write-Host "📦 Construyendo frontend..." -ForegroundColor Yellow
        Set-Location "nexus-frontend/app"
        & "npm" install --silent 2>&1 | Out-Null
        & "npm" run build 2>&1 | Out-Null
        Set-Location $INSTALL_DIR
    }
}

New-Item -ItemType Directory -Path "uploads" -Force | Out-Null
New-Item -ItemType Directory -Path "backups" -Force | Out-Null

Write-Host ""
Write-Host "================================================" -ForegroundColor Green
Write-Host "  ✅ NEXUS instalado en: $INSTALL_DIR" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Para iniciar:" -ForegroundColor White
Write-Host "  cd $INSTALL_DIR && python3 app.py" -ForegroundColor Gray
Write-Host ""
