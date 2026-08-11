# CRM & Inventory Management System (Express + React)
## Project Requirements & Specification

This document outlines the detailed requirements and system specifications for the Express + React CRM & Inventory Management application.

---

## 1. Authentication and Roles
Implement role-based access control (RBAC) with simple JWT (JSON Web Token) authentication.

### User Roles
*   **Admin:** Full access to all modules and configurations.
*   **Sales:** Can manage customers, create sales challans, and view product lists.
*   **Warehouse:** Manages products, stock levels, and logs stock movements.
*   **Accounts:** Views sales challans, financial/transaction reports, and customer profiles.

### Authentication Flow
*   Secure login endpoint (`POST /auth/login`).
*   Role validation middleware on the backend to protect sensitive routes.
*   Token persistence on the frontend (e.g., in localStorage or cookies) to keep users logged in.

---

## 2. Customer CRM Module
Manage client relationships, contact details, and follow-ups.

### Customer Fields
*   **Customer Name:** Full name of the primary contact.
*   **Mobile Number:** Contact number (validated).
*   **Email:** Contact email (validated).
*   **Business Name:** Name of the company or establishment.
*   **GST Number:** Optional.
*   **Customer Type:** Must be one of: `Retail`, `Wholesale`, `Distributor`.
*   **Address:** Physical billing/shipping address.
*   **Status:** Must be one of: `Lead`, `Active`, `Inactive`.
*   **Follow-up Date:** Next scheduled communication date.
*   **Notes:** Miscellaneous customer info.

### Required Features
1.  **Add Customer:** Form to register a new customer profile.
2.  **Edit Customer:** Ability to update details of an existing customer.
3.  **Search & Filter Customers:** Search by name, business, status, or type.
4.  **Customer Detail Page:** Dedicated view displaying all customer info, purchase history, and follow-up timeline.
5.  **Add Follow-up Notes:** Append dated notes to a customer's record to track interactions.

---

## 3. Product and Inventory Module
Track and manage stock levels across warehouses.

### Product Fields
*   **Product Name:** Descriptive title of the product.
*   **SKU/Code:** Unique identifier for stock keeping.
*   **Category:** Product classification.
*   **Unit Price:** Unit cost of the product.
*   **Current Stock:** Actual quantity available in inventory.
*   **Minimum Stock Alert Quantity:** Low-stock threshold triggers an alert.
*   **Location/Warehouse:** Storage location/bin identifier.

### Required Features
1.  **Add Product:** Create a new product entry in inventory.
2.  **Edit Product:** Update product info and alert limits.
3.  **Stock Movement Log:** Automate logging of any changes in stock.

#### Stock Movement Log Fields
*   **Product:** Reference to the product.
*   **Quantity Changed:** Number of units changed.
*   **Movement Type:** `IN` (restock/returned) or `OUT` (sales/dispatch).
*   **Reason:** Context (e.g., "Challan #102 Confirmed", "Restocked by Supplier").
*   **Created By:** User ID/Name of the person who initiated the change.
*   **Timestamp:** Date and time of the transaction.

---

## 4. Sales Challan Module
Enables sales users to create and finalize sales orders (challans).

### Sales Flow
1.  Select a customer.
2.  Add multiple products.
3.  Specify quantity for each product.
4.  Generate challan number automatically.
5.  Save challan as either **Draft** or **Confirmed**.

### Business Rules (Critical)
*   **Stock Reduction:** Confirming a challan must reduce the product inventory automatically.
*   **No Negative Stock:** Stock levels must never drop below 0. 
*   **Validation Check:** If stock is insufficient for any item, the API must reject the confirmation and return a detailed error.
*   **Snapshotting:** Store product snapshot data (Name, SKU, Unit Price) in the challan. *Do not rely solely on product IDs, as prices and product names might change in the database over time.*

### Challan Fields
*   **Challan Number:** Auto-generated unique identifier.
*   **Customer:** Customer details snapshot/reference.
*   **Products:** Array of items (Product ID, Snapshot Name/SKU/Price, Quantity).
*   **Total Quantity:** Aggregate of all items ordered.
*   **Status:** `Draft`, `Confirmed`, `Cancelled`.
*   **Created By:** User role/ID who drafted the challan.
*   **Created Date:** Auto-generated timestamp.

---

## 5. API Expectations
All endpoints must be robust REST APIs following clean design patterns.

### Core API Examples
*   `POST /auth/login`
*   `GET /customers`

### API Standards
*   **Input Validation:** Sanitize and validate inputs on the backend (e.g., using Joi, Express-Validator, or Zod).
*   **HTTP Status Codes:** 
    *   `200 OK` / `201 Created`
    *   `400 Bad Request` (Validation errors, Insufficient stock)
    *   `401 Unauthorized` (Invalid/expired JWT)
    *   `403 Forbidden` (Insufficient permissions/incorrect role)
    *   `404 Not Found`
*   **Error Messaging:** Informative, user-friendly JSON error payloads.
*   **Pagination:** Apply limit and offset parameters to list views (e.g., customer/product lists).
*   **Search/Filter:** Support query parameters (e.g., `?search=Acme&status=Active`).
