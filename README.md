# Frontend Black Box

Lightweight, framework-independent browser diagnostics SDK for collecting runtime errors,
promise rejections and bounded breadcrumbs, then delivering sanitized events to an application-owned
endpoint.

## Why

Frontend applications often fail without enough context to understand what happened.

Frontend Black Box captures:

- JavaScript runtime errors
- Unhandled Promise rejections
- Privacy-safe interaction breadcrumbs
- Network request breadcrumbs
- Custom developer and navigation breadcrumbs

and sends them to any monitoring backend without being coupled to a specific service.

## Features

✅ Manual exception capturing

✅ Automatic JavaScript error collection

✅ Unhandled Promise rejection collection

✅ Click breadcrumbs

✅ Fetch breadcrumbs

✅ Manual breadcrumbs

✅ Sensitive data sanitization

✅ Batched event delivery

✅ Configurable queue limits

✅ Page exit delivery using `sendBeacon`

✅ TypeScript-first API

✅ Unit-tested core modules

## Technical Highlights

- Strict TypeScript configuration
- ESLint + Prettier
- Unit-tested core modules
- Interface-driven architecture
- Batched transport pipeline
- Sensitive data sanitization

---

## Installation

```bash
npm install github:i-vanb/frontend-black-box#<reviewed-commit>
```

## Development

```bash
npm run dev
```

## Quality checks

```bash
npm run typecheck
npm run lint
npm run test:run
npm run quality
```

---

## Basic Usage

```ts
import { monitor } from "frontend-black-box";

monitor.init({
  appName: "demo-app",
  environment: "production",
  release: "git-sha",
  endpoint: "/api/monitoring/events",
  flushInterval: 5000,
  batchSize: 10,
  maxQueueSize: 100,
  requestIdHeader: "x-request-id",
  sanitizeUrl: (url) => new URL(url, window.location.origin).pathname,
});
```

`sanitizeUrl` should map application capability URLs and dynamic identifiers to stable route
templates. The built-in sanitizer removes query strings and fragments and redacts UUID/opaque path
segments.

---

## Manual Error Reporting

```ts
monitor.captureException(new Error("Checkout failed"), {
  source: "checkout-submit",
});
```

---

## Manual Breadcrumbs

```ts
monitor.addBreadcrumb({
  type: "manual",
  message: "Checkout started",
  metadata: {
    cartItems: 3,
  },
});
```

---

## Context and navigation

```ts
monitor.setContext({ requestId: "request-id-from-response" });
monitor.addNavigationBreadcrumb(window.location.href);
monitor.clearContext();
```

Context is sanitized and bounded before it is retained. Do not add customer content or credentials.
When `requestIdHeader` is configured, the most recent validated response correlation ID is attached
to subsequent events.

## Delivery guarantees

- Non-2xx responses fail delivery and retain queued events.
- Network, timeout, `408`, `429`, and `5xx` failures use bounded exponential retries.
- Queue overflow drops the oldest event and never exceeds `maxQueueSize`.
- `sendBeacon` rejection falls back to `fetch(..., { keepalive: true })`.
- Diagnostic delivery is ignored by the fetch collector to avoid feedback recursion.
- Debug console output is disabled unless `debug: true` is configured.

## Example event

```json
{
  "id": "0b787fd6-578c-472a-b7af-baccc5ed5314",
  "type": "error",
  "message": "Demo error from button",
  "appName": "demo-app",
  "url": "http://localhost:5173/",
  "breadcrumbs": [
    {
      "type": "click",
      "message": "Trigger error"
    },
    {
      "type": "http",
      "message": "GET /api/monitoring/test 200"
    }
  ],
  "metadata": {
    "source": "demo-button",
    "name": "Error"
  }
}
```

---

## Architecture

### Core

| Module           | Responsibility                         |
| ---------------- | -------------------------------------- |
| monitor          | Public SDK API                         |
| event-queue      | Event batching and delivery scheduling |
| breadcrumb-store | In-memory breadcrumb storage           |

### Collectors

| Collector                   | Responsibility               |
| --------------------------- | ---------------------------- |
| error-collector             | JavaScript runtime errors    |
| promise-rejection-collector | Unhandled Promise rejections |
| click-collector             | User click tracking          |
| fetch-collector             | Network request tracking     |

### Transport

| Module         | Responsibility          |
| -------------- | ----------------------- |
| http-transport | Event delivery via HTTP |

### Utilities

| Utility         | Responsibility           |
| --------------- | ------------------------ |
| normalize-error | Error normalization      |
| sanitize        | Sensitive data filtering |

---

## Design Decisions

### Low Coupling

The SDK is organized as a collection of loosely coupled modules.

Collectors, queue management, transport layer and utilities are isolated behind clear boundaries and can evolve independently.

### Dependency Inversion

Core modules depend on abstractions rather than concrete implementations.

For example, `EventQueue` works with the `Transport` interface and is unaware of the actual delivery mechanism.

This allows different transport implementations to be introduced without changing queue logic and makes the module easier to test.

### Separation of Responsibilities

Each module has a single responsibility:

- Collectors gather browser events
- Monitor orchestrates SDK behavior
- EventQueue manages batching and delivery scheduling
- Transport delivers events
- Utilities provide reusable helper functions

This separation improves maintainability and testability.

---

## Event Delivery Strategy

Events are added to an internal queue.

The SDK sends events when:

- queue size reaches `batchSize`
- flush interval expires
- page is being closed or hidden

The SDK uses:

```txt
navigator.sendBeacon()
```

when available to reduce event loss during page unload.

---

## Sensitive Data Protection

The SDK filters common sensitive fields and common email, bearer-token and JWT patterns. Values are
bounded by depth, length, object keys and array size; cycles, `BigInt`, DOM elements and files are
converted into JSON-safe summaries.

```txt
password
pass
token
accessToken
refreshToken
authorization
cookie
secret
apiKey
```

Example:

```json
{
  "token": "[Filtered]",
  "password": "[Filtered]"
}
```

---

## Testing

Current test coverage includes:

- error normalization
- sensitive data sanitization
- breadcrumb storage
- event queue batching
- transport delivery
- click collector
- fetch collector

```bash
npm run test:run
```

---

## Roadmap

- Session tracking
- Performance monitoring
- Route change breadcrumbs
- Retry strategy
- Event sampling
- Dashboard UI panel
- React integration package
- OpenTelemetry bridge

---

## License

MIT
