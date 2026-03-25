<div align="center">
  <h1>🧮 Velum Pricing API</h1>
  <p>A robust, serverless API handling all internal price calculations for Velum Blinds & Curtains.</p>
</div>

---

## ⚡ Overview

The Velum Pricing API is a blazingly fast, standalone service designed to calculate exact product prices based on user dimensions, fabric types, and custom features. Built using pure **Vercel Serverless Functions** with a **Supabase** backend, it completely decouples the heavy tabular logic from the frontend bots.

## 🔐 Authentication

All endpoints are securely locked behind an **API Key**. 
Provide your key via the `x-api-key` header, or as a Bearer token in `Authorization`.

```http
x-api-key: your_super_secret_key
```

## 🚀 Endpoints

### 1. **Health Check**

- **URL:** `GET /api/ping`
- **Auth Required:** No

```json
{ "status": "ok", "time": "2026-03-25T20:15:00.000Z" }
```

---

### 2. **Calculate Price**

- **URL:** `POST /api/calculate`
- **Auth Required:** Yes

#### Payload

```json
{
  "product_type": "tradicional",
  "width": 2.5,
  "height": 2.0,
  "fabric_price": 150,
  "galeria": "RippleFold",
  "vertical_type": "Tela",
  "profit": 100,
  "iva": 12,
  "extras": 0
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `product_type` | string | ✅ | `enrollable`, `dia_y_noche`, `tradicional`, `vertical` |
| `width` | number | ✅ | Meters |
| `height` | number | ✅ | Meters |
| `fabric_price` | number | Conditional | Not needed for `vertical` |
| `galeria` | string | Conditional | Only for `tradicional`: `RippleFold`, `Francesa`, `Ojetes` |
| `vertical_type` | string | Conditional | Only for `vertical`: `PVC`, `Tela` |
| `profit` | number | ❌ | Default `100` (%) |
| `iva` | number | ❌ | Default `12` (%) |
| `extras` | number | ❌ | Default `0` (Q flat) |

#### Response

```json
{
  "success": true,
  "description": "Cortina Tradicional RippleFold | 2.5m x 2m",
  "pricing": {
    "totalCosto": 1458.79,
    "totalSinIva": 2917.58,
    "totalConIva": 3267.69
  }
}
```

---

### 3. **List Products**

- **URL:** `GET /api/products`
- **Auth Required:** Yes
- **Query Params:** `?include_fabrics=true` to include nested fabric prices.

---

### 4. **Fabric Prices (CRUD)**

- **URL:** `/api/fabric-prices`
- **Auth Required:** Yes

| Method | Description | Body |
|---|---|---|
| `GET` | List all fabric prices | Optional `?product_id=UUID` filter |
| `POST` | Create a new fabric price | `{ product_id, name, fabric_price, image_url? }` |
| `PUT` | Update a fabric price | `{ id, ...fieldsToUpdate }` |
| `DELETE` | Delete a fabric price | `{ id }` |

---

## 🔧 Environment Variables

| Variable | Description |
|---|---|
| `API_KEY` | Secret key for endpoint authentication |
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-side) |

## 💻 Local Development

```bash
git clone https://github.com/xRasv/velum_cotizador_api.git
npm install
vercel dev
```

## ☁️ Deployment

Zero-config Vercel deployments. Push to `main` and it deploys. Set your environment variables in the Vercel Dashboard!
