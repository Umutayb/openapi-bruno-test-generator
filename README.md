# 🧩 OpenAPI → Bruno Converter & Test Runner

This project automates the conversion of **OpenAPI specifications** into **Bruno-compatible collections**, merges them, and generates structured **test collections** based on defined test flows.
Finally, tests can be executed directly via the **Bruno CLI**.

---

## 📦 Features

* ✅ Convert OpenAPI specs (`.json`) to Bruno format
* 🧠 Automatically inject OpenAPI example request bodies
* 🗂 Merge multiple Bruno collections into a master collection
* ⚙️ Generate Bruno test flows from a `test-flows.json` definition
* 🧪 Run generated tests directly with **Bruno CLI**

---

## 🧰 Prerequisites

* **Node.js** ≥ 18
* **Bruno CLI** (`bru`) installed globally

  ```bash
  npm install -g @usebruno/cli
  ```
* **@usebruno/converters** and **@usebruno/filestore**:

  ```bash
  npm install @usebruno/converters @usebruno/filestore
  ```

---

## 📁 Project Structure

Example layout before running the converter:

```
project/
├── oas/
│   ├── user-api.json
│   ├── booking-api.json
│   └── payments-api.json
├── test-flows.json
├── converter.js
└── package.json
```

After running, new files will be generated:

```
project/
├── collections/               # Converted OAS → Bruno files
│   ├── user-api.json
│   ├── booking-api.json
│   └── payments-api.json
├── master-collection.json     # Merged Bruno collection
├── test-collection.json       # Combined test definition
└── RegressionTests/           # Final structured Bruno test collection
    ├── collection.bru
    ├── bruno.json
    ├── environments/
    │   └── test-environment.bru
    ├── check-in-flow/
    │   ├── Step1.bru
    │   ├── Step2.bru
    │   └── Step3.bru
```

---

## ⚙️ Usage

### 1. Prepare your OpenAPI files

Place your **OpenAPI JSON specs** inside the `/oas` folder.
Each file should represent one API domain or microservice.

Example:

```bash
oas/
├── users.json
├── orders.json
└── payments.json
```

---

### 2. Define your test flows

Create a `test-flows.json` that defines how requests should be chained into test scenarios.

Example:

```json
{
  "name": "RegressionTests",
  "root": { "name": "Sample API", "type": "collection" },
  "environments": [
    { "name": "test-environment", "vars": { "base_url": "https://api.test.example.com" } }
  ],
  "test_flows": [
    {
      "flow_name": "check-in-flow",
      "seq": 1,
      "root": { "name": "check-in-flow" },
      "requests": [
        { "request_id": "CreateBooking", "file_path": "booking-api", "seq": 1 },
        { "request_id": "GetBooking", "file_path": "booking-api", "seq": 2 },
        { "request_id": "ConfirmBooking", "file_path": "booking-api", "seq": 3 }
      ]
    }
  ]
}
```

---

### 3. Run the converter

Run the main pipeline script:

```bash
node testflow-generation.js
```

This executes the following steps:

1. Converts OpenAPI → Bruno (`oas/` → `collections/`)
2. Merges all Bruno files (in `collections/`) into a single master collection (`master-collection.json`)
3. Builds test flows and creates the structured test collection folder (`RegressionTests/`)

---

## 🧪 Running Tests with Bruno CLI

Once the conversion pipeline completes, you can execute your generated test collection with:

```bash
bru run check-in-flow --env "test-environment"
```

This runs the **“check-in-flow”** using the environment named **“test-environment”**.

---

## 🧭 Full Pipeline Summary

| Stage | Function                                       | Description                                                      |
| ----- | ---------------------------------------------- | ---------------------------------------------------------------- |
| 1️⃣   | `convertOpenApiToBruno()`                      | Converts each OpenAPI spec into Bruno collection format          |
| 2️⃣   | `mergeOpenApiCollections()`                    | Merges all converted Bruno collections into a single master file |
| 3️⃣   | `createBrunoCollection()`                      | Builds structured Bruno test flows & environments                |
| 4️⃣   | `testGenerationPipeline()`                     | Runs all steps end-to-end automatically                          |
| 5️⃣   | `bru run check-in-flow --env test-environment` | Executes generated Bruno tests                                   |

---

## 🧾 Example Command Flow

```bash
# Step 1: Generate test collection
node converter.js

# Step 2: Run Bruno tests
bru run check-in-flow --env "test-environment"
```

---

## 🧩 Notes

* Ensure all `operationId` fields in your OpenAPI specs match request names.
* Example JSON bodies will automatically populate from OpenAPI `examples`.
* Logs will show ✅ for successful conversions and ❌ for any issues.
* Generated `.bru` files, or the test directory (`RegressionTests/`), can be opened directly in **Bruno App** for inspection.

---

Would you like me to make the anonymized version use **generic environment and flow names** (like `staging-environment`, `order-processing-flow`) instead of the current `test-environment` / `check-in-flow`? That would make it even more reusable for publishing.
