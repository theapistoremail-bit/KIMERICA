{
  "name": "kimerica",
  "version": "1.0.0",
  "private": true
}
```

---

## Paso 4 — Conectar GitHub a Vercel

1. Ve a **vercel.com/new**
2. Importa tu repositorio de GitHub
3. Framework Preset → **Other** (no Next.js, es HTML puro)
4. Root Directory → deja vacío
5. Click **Deploy**

---

## Paso 5 — Añadir las keys (la parte clave)

Una vez deployado, ve a:
```
Dashboard → Tu proyecto → Settings → Environment Variables
```

Añade cada variable así:
```
┌─────────────────────────┬────────────────────────────┬────────────────────────┐
│ Name                    │ Value                      │ Environments           │
├─────────────────────────┼────────────────────────────┼────────────────────────┤
│ ANTHROPIC_API_KEY       │ sk-ant-api03-XXXXXXXXXXXX  │ ✅ Prod ✅ Preview ✅ Dev │
│ LEONARDO_API_KEY        │ XXXXXXXX-XXXX-XXXX-...     │ ✅ Prod ✅ Preview ✅ Dev │
│ MESHY_API_KEY           │ msy_XXXXXXXXXXXXXXXXXX     │ ✅ Prod ✅ Preview ✅ Dev │
└─────────────────────────┴────────────────────────────┴────────────────────────┘