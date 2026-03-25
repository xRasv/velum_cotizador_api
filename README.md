<div align="center">
  <h1>🧮 Velum Pricing API</h1>
  <p>A robust, serverless API handling all internal price calculations for Velum Blinds & Curtains.</p>
</div>

---

## ⚡ Overview

The Velum Pricing API is a blazingly fast, standalone service designed to calculate exact product prices based on user dimensions, fabric types, and custom features. Built using pure **Vercel Serverless Functions**, it completely decouples the heavy tabular logic from the frontend bots.

## 🔐 Authentication

All calculation endpoints are securely locked behind an **API Key**. 
You must provide your key via the `x-api-key` header, or alternately, as a Bearer token in the `Authorization` header.

```http
x-api-key: your_super_secret_key
```

## 🚀 Endpoints

### 1. **Health Check**
Verify if the API and Vercel Edge Network are alive and routing correctly.

- **URL:** `/api/ping`
- **Method:** `GET`
- **Auth Required:** No

**Response:**
```json
{
  "status": "ok",
  "time": "2026-03-25T20:15:00.000Z"
}
```

---

### 2. **Calculate Price**
Dynamically calculates the exact tier pricing (Base Cost, Retail without IVA, Retail with IVA) based on the inputs provided.

- **URL:** `/api/calculate`
- **Method:** `POST`
- **Auth Required:** Yes (`x-api-key`)
- **Content-Type:** `application/json`

#### **Payload (Body)**
The body accepts an object defining the dimensions, material, and type of the product.

```json
{
  "product_type": "tradicional", // "enrollable" | "dia_y_noche" | "tradicional" | "vertical"
  "width": 2.5,
  "height": 2.0,
  "fabric_price": 150, // Unit price. Not needed for "vertical"
  "galeria": "RippleFold", // Specific to "tradicional"
  "vertical_type": "Tela", // "PVC" | "Tela" (specific to "vertical")
  "profit": 100, // Optional percentage markup (default 100)
  "iva": 12, // Optional tax percentage (default 12)
  "extras": 0 // Optional flat fee added to base (default 0)
}
```

#### **Success Response (200 OK)**
Returns the beautifully formatted invoice description alongside the exact pricing variables.

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

#### **Error Response (400 / 401)**
If authentication fails or missing properties occur.

```json
{
  "error": "Unauthorized: Invalid API key"
}
```

## 💻 Local Development

To test the formulas without hitting production:

1. Clone the repository natively.
2. Install the lightweight Vercel CLI: `npm i -g vercel`
3. Export an API key for your local terminal:
    - *Windows:* `$env:API_KEY="test"`
    - *Mac/Linux:* `export API_KEY="test"`
4. Start the environment:
```bash
vercel dev
```

## ☁️ Deployment

This repository is optimized for **Vercel zero-configuration deployments**. 

Simply connect the branch to your Vercel Project and every push to `main` will instantly mirror to the Edge Network within seconds. Make sure to define your `API_KEY` securely in the Vercel Dashboard Settings!
