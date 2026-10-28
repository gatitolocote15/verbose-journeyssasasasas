@echo off
REM ═══════════════════════════════════════════════════════════════════════════
REM  PUSH_TO_GITHUB.bat - Sube bin-service a GitHub
REM ═══════════════════════════════════════════════════════════════════════════

setlocal enabledelayedexpansion

echo.
echo ╔════════════════════════════════════════════════════════════════╗
echo ║           PUSH A GITHUB - bin-service                          ║
echo ╚════════════════════════════════════════════════════════════════╝
echo.

REM Pedir URL del repositorio
echo Primero, crea un repositorio en https://github.com/new
echo.
set /p "GITHUB_URL=Ingresa la URL de tu repositorio GitHub (ej: https://github.com/usuario/repo.git): "

if "!GITHUB_URL!"=="" (
    echo ❌ URL no puede estar vacía
    pause
    exit /b 1
)

echo.
echo 📦 Preparando para push...
echo.

REM Verificar si ya existe .git
if exist ".git" (
    echo ⚠️  Ya existe repositorio git local
    echo Usando remote existente...
    git remote set-url origin !GITHUB_URL!
) else (
    echo 🔧 Inicializando repositorio git...
    git init

    echo 📝 Configurando usuario (opcional)...
    git config user.name "Parques Nacionales Dev"
    git config user.email "dev@parques-nacionales.local"
)

echo.
echo 📤 Agregando archivos...
git add -A

echo 💾 Creando commit...
git commit -m "Deploy: bin-service para Parques Nacionales - Render ready"

echo.
echo 🚀 Empujando a GitHub...
echo    URL: !GITHUB_URL!
echo.

REM Detectar rama principal
git branch -M main
git remote add origin !GITHUB_URL! 2>nul
git push -u origin main

if %errorlevel% equ 0 (
    echo.
    echo ╔════════════════════════════════════════════════════════════════╗
    echo ║                   ✓ PUSH EXITOSO                               ║
    echo ╚════════════════════════════════════════════════════════════════╝
    echo.
    echo 📍 Repositorio GitHub:
    echo    !GITHUB_URL!
    echo.
    echo 📋 Próximos pasos:
    echo    1. Abre Render: https://render.com
    echo    2. Click "+ New" → "Web Service"
    echo    3. Conecta tu repositorio GitHub
    echo    4. Configura variables de entorno (Telegram, etc.)
    echo    5. Deploy automático
    echo.
    echo 📚 Guía completa: Lee DEPLOY_GUIDE.md
    echo.
) else (
    echo.
    echo ❌ Error al hacer push
    echo.
    echo Posibles soluciones:
    echo   - Verifica que la URL es correcta
    echo   - Asegúrate de tener credenciales de GitHub configuradas
    echo   - Prueba: git remote -v (para ver remotes)
    echo.
)

pause
