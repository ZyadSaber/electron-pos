# System Configuration Guide

Customize your store settings, invoice templates, UPI payment credentials, and hardware options.

## Sample Data Reset Master Key

Resetting sample data, clearing the database, and importing a backup in **Backup & Restore** require confirmation. Reset and clear actions also require a master key. For browser development, create `.env` in the project root and set `MASTER_KEY`; `bun run dev` verifies it through the Vite development server without exposing it in the browser bundle. Before building the Electron app:

1. Copy `.env.example` to `.env`.
2. Set `MASTER_KEY` to a unique key of your choice.
3. Build the installer with `bun run electron:build`.

The build includes `.env` as a resource in the packaged app, and Electron's main process verifies the entered key. Do not commit `.env` or expose the Vite development server to untrusted networks. A key shipped with a desktop application can be extracted from the installed files, so this is a confirmation gate rather than protection against someone who controls the device.

## 🏪 Shop Profile & Invoice Settings

Navigate to **Shop Settings** in the left sidebar menu:

* **Shop Name**: Appears on bill headers and receipts.
* **Owner Name**: Used for system logs and store manager profile.
* **GSTIN Number**: Tax identification number displayed on tax invoices.
* **Shop Address & Contact**: Printed on thermal receipts.
* **Low Stock Limit Warning**: Minimum quantity trigger for stock alerts (default: `10` units).
* **Default Tax Rate (%)**: Default GST rate applied to items.

On a new installation or after resetting the database, complete the setup form before signing in. It creates the first Owner account using the store phone number and the four-digit PIN entered in the form. The sample database contains one store and can be accessed with phone `01021020169` and PIN `1234` when sample data is selected.

Barcode labels print as individual 58 × 38 mm labels. Choose the copy count before printing; each copy contains the same selected product label.

---

## 💳 Dynamic UPI Payment Configuration

To enable instant QR payment generation on cashier screens:

1. Go to **Shop Settings** -> **Dynamic UPI Payment Settings**.
2. Check **Enable Dynamic UPI Payments**.
3. Enter **Merchant UPI ID (VPA)** (e.g. `yourshop@okaxis` or `9876500000@ybl`).
4. Enter **Receipt Footer Note** (e.g. *Thank you for shopping at Example Supermarket*).
5. Click **Save UPI Settings**.

---

## 🔌 Hardware Setup (USB Barcode Reader)

1. Plug any standard USB Barcode Scanner into your PC.
2. Ensure the barcode reader operates in **HID Keyboard Wedge Mode** (default factory setting for 99% of scanners).
3. Open the **POS Billing Terminal** (`F2` or click POS Billing).
4. Point and scan any product barcode. The scanner will automatically input the barcode and add the item to the bill instantly.
