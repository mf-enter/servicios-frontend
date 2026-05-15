# Especificaciones Backend - API Payments y Services

## 📋 Resumen de Cambios Realizados

Se arreglaron dos rutas con conflictos que el frontend estaba enviando incorrectamente:

1. **POST /api/payments** - 400 Bad Request
2. **PATCH /api/services/{id}/status** - 409 Conflict

---

## 1️⃣ POST /api/payments

### 📍 Ruta
```
POST http://localhost:5000/api/payments
```

### 📤 Payload Esperado (NUEVO - Correcto)
```javascript
{
  "service_id": 10,              // INT - ID del servicio (requerido)
  "amount": 150.50,              // FLOAT - Monto a pagar, DEBE SER > 0 (requerido)
  "transaction_reference": "WEB-1778881744426"  // STRING - Referencia única (requerido)
  // "payment_method_id": 1     // INT - Opcional, si aplica
}
```

### ✅ Validaciones Backend Requeridas
- ✔️ `service_id` debe existir en la base de datos
- ✔️ `amount` DEBE SER > 0 (rechazar si es 0 o negativo) ❌ SIN CAMPO `status`
- ✔️ El servicio debe estar en estado `"Completado"` (verificar `services.status_name = 'Completado'`)
- ✔️ El servicio no debe tener un pago ya registrado (o permitir múltiples pagos según negocio)
- ✔️ El `transaction_reference` debe ser único o permitir duplicados según tu regla de negocio

### 📥 Response Esperado (200 OK)
```javascript
{
  "payment_id": 5,
  "service_id": 10,
  "amount": 150.50,
  "payment_status": "Completado",
  "transaction_reference": "WEB-1778881744426",
  "created_at": "2026-05-15T10:30:00Z",
  "payment_method_id": null
}
```

### ❌ Error Responses
| Status | Condición |
|--------|-----------|
| **400** | `amount <= 0` o falta campo requerido |
| **404** | `service_id` no existe |
| **409** | Servicio no está en estado "Completado" |
| **422** | Ya existe un pago para este servicio (si aplica) |

---

## 2️⃣ PATCH /api/services/{id}/status

### 📍 Ruta
```
PATCH http://localhost:5000/api/services/{serviceId}/status
```

**Ejemplo:**
```
PATCH http://localhost:5000/api/services/8/status
```

### 📤 Payload Esperado (NUEVO - Correcto)
```javascript
{
  "status_name": "Completado"  // STRING - Nombre del estado (requerido)
  // Valores válidos: "Pendiente", "Aceptado", "En progreso", "Completado", "Cancelado"
}
```

### ✅ Validaciones Backend Requeridas
- ✔️ `serviceId` (en URL) debe existir
- ✔️ `status_name` debe ser válido (uno de: Pendiente, Aceptado, En progreso, Completado, Cancelado)
- ✔️ Validar transiciones de estado permitidas:
  - `Pendiente` → `Aceptado`, `Cancelado`
  - `Aceptado` → `En progreso`, `Cancelado`
  - `En progreso` → `Completado`, `Cancelado`
  - `Completado` → (sin transiciones, solo lectura)
  - `Cancelado` → (sin transiciones, solo lectura)
- ✔️ Verificar que el usuario actual sea el trabajador asignado o sea admin

### 📥 Response Esperado (200 OK)
```javascript
{
  "service_id": 8,
  "status_name": "Completado",
  "status_id": 4,
  "updated_at": "2026-05-15T10:35:00Z",
  "message": "Servicio actualizado exitosamente"
}
```

### ❌ Error Responses
| Status | Condición |
|--------|-----------|
| **400** | `status_name` falta o es inválido |
| **404** | `serviceId` no existe |
| **409** | Transición de estado no permitida (ej: Cancelado → Completado) |
| **403** | Usuario no tiene permiso (no es el trabajador asignado ni admin) |

---

## 🔄 Flujo Correcto Esperado

### Cliente Pagando Servicio:
```
1. Cliente ve servicio en estado "Completado"
2. Cliente click en botón "Pagar"
3. Frontend → POST /api/payments {service_id, amount, transaction_reference}
4. Backend valida y crea registro de pago
5. Frontend actualiza UI con éxito
```

### Trabajador Completando Trabajo:
```
1. Trabajador ve servicio en estado "En progreso"
2. Trabajador click en "Marcar como completado"
3. Frontend → PATCH /api/services/8/status {status_name: "Completado"}
4. Backend valida transición y actualiza estado
5. Frontend actualiza UI con éxito
6. Cliente puede entonces proceder a pagar
```

---

## 🛠️ Cambios Frontend Realizados

### ✏️ Archivo: `src/pages/user/Account.jsx`
**Línea 152**: Cambio en `requestPayService()`
- ❌ Antes: Enviaba `{status: "Completado", amount: 0, ...}`
- ✅ Ahora: Envía `{service_id, amount, transaction_reference}`
- ✅ Validación: Verifica `amount > 0` antes de enviar

### ✏️ Archivo: `src/pages/worker/WorkerPanel.jsx`
**Línea 172**: Cambio en `updateServiceStatus()`
- ❌ Antes: Enviaba `{status: "Completado"}`
- ✅ Ahora: Envía `{status_name: "Completado"}`

---

## ✨ Próximos Pasos

1. **Verifica/actualiza tu backend** según estas especificaciones
2. **Prueba el flujo completo:**
   - Cliente crea servicio → Trabajador lo acepta → Marca en progreso → Marca completado → Cliente lo paga
3. **Si aún hay errores**, comparte el `response` del error desde DevTools (Network tab → Response)

---

## 📊 Resumen de Validaciones Clave

| Punto | Crítico |
|-------|----------|
| POST /payments: `amount > 0` | 🔴 CRÍTICO |
| POST /payments: Sin campo `status` | 🔴 CRÍTICO |
| PATCH /status: Campo `status_name` no `status` | 🔴 CRÍTICO |
| PATCH /status: Validar transiciones | 🟡 IMPORTANTE |
| Ambas rutas: Validar permisos del usuario | 🟡 IMPORTANTE |

