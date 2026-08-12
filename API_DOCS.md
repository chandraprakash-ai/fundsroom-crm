# FundsRoom CRM — API Documentation

> **Base URL (Local):** `http://localhost:5000/api`  
> **Base URL (Production):** `https://your-deployed-backend.railway.app/api`

All protected endpoints require the `Authorization: Bearer <token>` header.  
Token is obtained from the `/auth/login` endpoint.

---

## Authentication

### POST `/auth/login`

Authenticate a user and receive a JWT token.

**Auth required:** No

**Request Body:**
```json
{
  "username": "admin",
  "password": "password123"
}
```

**Success Response `200`:**
```json
{
  "status": "success",
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "uuid-here",
      "username": "admin",
      "name": "System Admin",
      "role": "ADMIN"
    }
  }
}
```

**Error Response `401`:**
```json
{
  "status": "error",
  "message": "Invalid username or password"
}
```

---

## Health Check

### GET `/health`

Check if the server is running.

**Auth required:** No

**Success Response `200`:**
```json
{
  "status": "success",
  "message": "Server is running smoothly",
  "timestamp": "2026-08-12T06:00:00.000Z",
  "uptime": 3600.5
}
```

---

## Customers

### GET `/customers`

Retrieve all customers with optional search and pagination.

**Auth required:** Yes  
**Roles allowed:** ADMIN, SALES, ACCOUNTS

**Query Parameters:**

| Param    | Type   | Description                                     |
|----------|--------|-------------------------------------------------|
| `search` | string | Filter by name, email, mobile, or businessName  |
| `status` | string | Filter by status: `LEAD`, `ACTIVE`, `INACTIVE`  |
| `type`   | string | Filter by type: `RETAIL`, `WHOLESALE`, `DISTRIBUTOR` |
| `page`   | number | Page number (default: 1)                        |
| `limit`  | number | Results per page (default: 20)                  |

**Success Response `200`:**
```json
{
  "status": "success",
  "data": {
    "customers": [
      {
        "id": "uuid",
        "name": "Ramesh Kumar",
        "mobile": "9876543210",
        "email": "ramesh@example.com",
        "businessName": "Ramesh Traders",
        "gstNumber": "27AAPFU0939F1ZV",
        "type": "WHOLESALE",
        "address": "123 Main St, Mumbai",
        "status": "ACTIVE",
        "followUpDate": "2026-09-01T00:00:00.000Z",
        "notes": "Interested in bulk order",
        "createdAt": "2026-08-01T10:00:00.000Z"
      }
    ],
    "totalCount": 1,
    "page": 1,
    "totalPages": 1
  }
}
```

---

### GET `/customers/:id`

Get a single customer's full profile.

**Auth required:** Yes  
**Roles allowed:** ADMIN, SALES, ACCOUNTS

**Success Response `200`:**
```json
{
  "status": "success",
  "data": { /* full Customer object */ }
}
```

**Error Response `404`:**
```json
{
  "status": "error",
  "message": "Customer not found"
}
```

---

### POST `/customers`

Create a new customer profile.

**Auth required:** Yes  
**Roles allowed:** ADMIN, SALES

**Request Body:**
```json
{
  "name": "Ramesh Kumar",
  "mobile": "9876543210",
  "email": "ramesh@example.com",
  "businessName": "Ramesh Traders",
  "gstNumber": "27AAPFU0939F1ZV",
  "type": "WHOLESALE",
  "address": "123 Main St, Mumbai",
  "status": "LEAD",
  "followUpDate": "2026-09-01T00:00:00.000Z",
  "notes": "Met at trade fair"
}
```

> `gstNumber`, `followUpDate`, and `notes` are optional.  
> `type` must be one of: `RETAIL`, `WHOLESALE`, `DISTRIBUTOR`  
> `status` must be one of: `LEAD`, `ACTIVE`, `INACTIVE`

**Success Response `201`:**
```json
{
  "status": "success",
  "data": { /* created Customer object */ }
}
```

---

### PUT `/customers/:id`

Update an existing customer. Supports partial updates (PATCH semantics).

**Auth required:** Yes  
**Roles allowed:** ADMIN, SALES

**Request Body (all fields optional):**
```json
{
  "status": "ACTIVE",
  "notes": "Signed annual contract",
  "followUpDate": "2026-10-01T00:00:00.000Z"
}
```

**Success Response `200`:**
```json
{
  "status": "success",
  "data": { /* updated Customer object */ }
}
```

---

### DELETE `/customers/:id`

Permanently delete a customer profile.

**Auth required:** Yes  
**Roles allowed:** ADMIN, SALES

**Success Response `200`:**
```json
{
  "status": "success",
  "message": "Customer deleted successfully"
}
```

---

## Products (Inventory)

### GET `/products`

Retrieve all products with optional filters.

**Auth required:** Yes  
**Roles allowed:** ADMIN, SALES, WAREHOUSE, ACCOUNTS

**Query Parameters:**

| Param      | Type    | Description                                    |
|------------|---------|------------------------------------------------|
| `search`   | string  | Filter by name, SKU, or category               |
| `lowStock` | boolean | If `true`, return only items below minStockAlert |
| `minPrice` | number  | Filter products with unit price >= minPrice    |
| `maxPrice` | number  | Filter products with unit price <= maxPrice    |

**Success Response `200`:**
```json
{
  "status": "success",
  "data": [
    {
      "id": "uuid",
      "name": "Industrial Fan 24-inch",
      "sku": "FAN-IND-24",
      "category": "Fans",
      "unitPrice": 4500,
      "currentStock": 25,
      "minStockAlert": 5,
      "location": "Rack A3",
      "createdAt": "2026-08-01T10:00:00.000Z"
    }
  ]
}
```

---

### GET `/products/logs`

Retrieve all stock movement logs across all products.

**Auth required:** Yes  
**Roles allowed:** ADMIN, SALES, WAREHOUSE, ACCOUNTS

**Success Response `200`:**
```json
{
  "status": "success",
  "data": [
    {
      "id": "uuid",
      "productId": "uuid",
      "product": { "name": "Industrial Fan 24-inch", "sku": "FAN-IND-24" },
      "quantityChanged": 10,
      "movementType": "IN",
      "reason": "Restock from supplier",
      "createdBy": { "name": "Walter White (Warehouse)" },
      "timestamp": "2026-08-10T09:00:00.000Z"
    }
  ]
}
```

---

### GET `/products/:id`

Get a single product with its full stock movement history.

**Auth required:** Yes  
**Roles allowed:** ADMIN, SALES, WAREHOUSE, ACCOUNTS

**Success Response `200`:**
```json
{
  "status": "success",
  "data": {
    "id": "uuid",
    "name": "Industrial Fan 24-inch",
    "sku": "FAN-IND-24",
    "category": "Fans",
    "unitPrice": 4500,
    "currentStock": 25,
    "minStockAlert": 5,
    "location": "Rack A3",
    "stockMovements": [
      {
        "id": "uuid",
        "quantityChanged": 10,
        "movementType": "IN",
        "reason": "Restock",
        "createdBy": { "name": "Walter White" },
        "timestamp": "2026-08-10T09:00:00.000Z"
      }
    ]
  }
}
```

---

### POST `/products`

Add a new product to the catalog.

**Auth required:** Yes  
**Roles allowed:** ADMIN, WAREHOUSE

**Request Body:**
```json
{
  "name": "Industrial Fan 24-inch",
  "sku": "FAN-IND-24",
  "category": "Fans",
  "unitPrice": 4500,
  "currentStock": 50,
  "minStockAlert": 10,
  "location": "Rack A3"
}
```

**Success Response `201`:**
```json
{
  "status": "success",
  "data": { /* created Product object */ }
}
```

---

### PUT `/products/:id`

Update product details or adjust stock level. When `currentStock` is changed, a `StockMovementLog` is automatically created.

**Auth required:** Yes  
**Roles allowed:** ADMIN, WAREHOUSE

**Request Body (all fields optional):**
```json
{
  "currentStock": 60,
  "unitPrice": 4800,
  "location": "Rack B1"
}
```

**Success Response `200`:**
```json
{
  "status": "success",
  "data": { /* updated Product object */ }
}
```

> ✅ When `currentStock` is changed, the system automatically creates a `StockMovementLog` record with `movementType: IN` or `OUT` and calculates the quantity difference.

---

### DELETE `/products/:id`

Delete a product from the catalog.

**Auth required:** Yes  
**Roles allowed:** ADMIN, WAREHOUSE

**Success Response `200`:**
```json
{
  "status": "success",
  "message": "Product deleted successfully"
}
```

---

## Sales Challans

### GET `/challans`

Get all sales challans (summary list, no line items).

**Auth required:** Yes  
**Roles allowed:** ADMIN, SALES, ACCOUNTS, WAREHOUSE

**Success Response `200`:**
```json
{
  "status": "success",
  "data": [
    {
      "id": "uuid",
      "challanNumber": "CH-2026-0001",
      "status": "CONFIRMED",
      "totalQuantity": 15,
      "createdAt": "2026-08-10T14:00:00.000Z",
      "customer": {
        "name": "Ramesh Kumar",
        "businessName": "Ramesh Traders"
      },
      "createdBy": {
        "name": "Sarah Connor (Sales)"
      }
    }
  ]
}
```

---

### GET `/challans/:id`

Get full challan details including all snapshotted line items and customer billing info.

**Auth required:** Yes  
**Roles allowed:** ADMIN, SALES, ACCOUNTS, WAREHOUSE

**Success Response `200`:**
```json
{
  "status": "success",
  "data": {
    "id": "uuid",
    "challanNumber": "CH-2026-0001",
    "status": "CONFIRMED",
    "totalQuantity": 15,
    "createdAt": "2026-08-10T14:00:00.000Z",
    "customer": {
      "id": "uuid",
      "name": "Ramesh Kumar",
      "businessName": "Ramesh Traders",
      "email": "ramesh@example.com",
      "mobile": "9876543210",
      "address": "123 Main St, Mumbai",
      "gstNumber": "27AAPFU0939F1ZV"
    },
    "createdBy": {
      "name": "Sarah Connor (Sales)",
      "role": "SALES"
    },
    "items": [
      {
        "id": "uuid",
        "quantity": 10,
        "priceSnapshot": 4500,
        "nameSnapshot": "Industrial Fan 24-inch",
        "skuSnapshot": "FAN-IND-24"
      }
    ]
  }
}
```

---

### POST `/challans`

Create a new sales challan (DRAFT or CONFIRMED).

**Auth required:** Yes  
**Roles allowed:** ADMIN, SALES

**Request Body:**
```json
{
  "customerId": "customer-uuid",
  "status": "DRAFT",
  "items": [
    { "productId": "product-uuid", "quantity": 10 },
    { "productId": "another-product-uuid", "quantity": 5 }
  ]
}
```

> - `status` must be `DRAFT` or `CONFIRMED`
> - If `CONFIRMED`, stock is immediately deducted and a `StockMovementLog` (OUT) is created for each item
> - `items` must have at least 1 entry
> - `productId` must be a valid UUID

**Success Response `201`:**
```json
{
  "status": "success",
  "data": { /* created Challan object with items */ }
}
```

**Error Response `400` (insufficient stock):**
```json
{
  "status": "error",
  "message": "Insufficient stock for 'Industrial Fan 24-inch'. Available: 5, Requested: 10"
}
```

---

### PUT `/challans/:id`

Update a challan's status (typically DRAFT → CONFIRMED).

**Auth required:** Yes  
**Roles allowed:** ADMIN, SALES

**Request Body:**
```json
{
  "status": "CONFIRMED"
}
```

> When confirming a DRAFT challan, stock is deducted and movement logs are created automatically.

**Success Response `200`:**
```json
{
  "status": "success",
  "data": { /* updated Challan object */ }
}
```

---

## Error Response Format

All error responses follow this format:

```json
{
  "status": "error",
  "message": "Human-readable error message",
  "errors": [
    {
      "path": ["body", "email"],
      "message": "Invalid email address"
    }
  ]
}
```

> `errors` array is only present for validation errors (HTTP 400).

---

## HTTP Status Codes

| Code | Meaning                                          |
|------|--------------------------------------------------|
| 200  | OK — Successful GET or PUT                       |
| 201  | Created — Successful POST                        |
| 400  | Bad Request — Validation error or business rule  |
| 401  | Unauthorized — Missing or invalid token          |
| 403  | Forbidden — Role does not have permission        |
| 404  | Not Found — Resource doesn't exist               |
| 500  | Internal Server Error — Unexpected server error  |

---

## Role Access Summary

| Endpoint                        | ADMIN | SALES | WAREHOUSE | ACCOUNTS |
|---------------------------------|-------|-------|-----------|----------|
| POST `/auth/login`              | ✅    | ✅    | ✅        | ✅       |
| GET `/customers`                | ✅    | ✅    | ❌        | ✅       |
| POST `/customers`               | ✅    | ✅    | ❌        | ❌       |
| PUT `/customers/:id`            | ✅    | ✅    | ❌        | ❌       |
| DELETE `/customers/:id`         | ✅    | ✅    | ❌        | ❌       |
| GET `/products`                 | ✅    | ✅    | ✅        | ✅       |
| POST `/products`                | ✅    | ❌    | ✅        | ❌       |
| PUT `/products/:id`             | ✅    | ❌    | ✅        | ❌       |
| DELETE `/products/:id`          | ✅    | ❌    | ✅        | ❌       |
| GET `/products/logs`            | ✅    | ✅    | ✅        | ✅       |
| GET `/challans`                 | ✅    | ✅    | ✅        | ✅       |
| POST `/challans`                | ✅    | ✅    | ❌        | ❌       |
| PUT `/challans/:id`             | ✅    | ✅    | ❌        | ❌       |
