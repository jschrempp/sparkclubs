# Agent Instructions: React + Django Application

## Project Objective
A web based application to manage a set of discussion groups, called 
Spark Groups, that are created and controlled by authenticated users.

## 1. Project Context & Stack
- **Architecture**: Decoupled React frontend communicating via REST API with a Django backend.
- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, TanStack Query (React Query).
- **Backend**: Django 5.x, Django REST Framework (DRF), MySQL, Celery (async tasks).
- **Deployment**: Railway.com

## 2. Django Backend Standards
- **Coding Style**: Follow PEP 8 strictly. Use clear type hints for function signatures.
- **Views**: Prefer Class-Based Views (CBVs) or `APIView` sets over function-based views.
- **Serializers**: Use `ModelSerializer` for CRUD operations. Explicitly declare `fields` (never use `fields = '__all__'`).
- **Database**: Optimize queries using `.select_related()` and `.prefetch_related()` to eliminate N+1 query bugs.
- **Security**: Enforce CSRF protection for session-authenticated requests. Use custom DRF `permissions` classes to handle user authorization at the endpoint level.

## 3. React Frontend Standards
- **State & Fetching**: Use TanStack Query for all server state cache and mutations. Do not use raw `useEffect` for data fetching.
- **TypeScript**: Enforce strict mode. Generate frontend types directly from Django schemas/OpenAPI specifications to maintain a single source of truth.
- **Components**: Functional components using arrow functions. Strict separation between layout UI components and container/logic-heavy hooks.

## 4. API & Communication Rules
- **Formatting**: API endpoints must use `snake_case` JSON payloads keys to match Python standards, or explicitly use a serializer middleware to translate to `camelCase` for the client.
- **Error Handling**: Django must return consistent error objects: `{ "error": "Error message", "details": {...} }`.
- **Status Codes**: Use correct HTTP status codes (200 OK, 201 Created, 400 Bad Request, 401 Unauthorized, 403 Forbidden).

## 5. Definition of Done
- Backend code must pass `flake8` and `black` formatting.
- Every new Django view or model requires corresponding unit tests in the `tests/` directory using `pytest-django`.
- All database modifications must be handled via explicit Django migrations (`makemigrations`).

## 6. JWT Authentication & Security Rules

### Django Backend (Token Issuance)
- **Library**: Use `django-rest-framework-simplejwt` for token authentication.
- **Access Tokens**: Keep short-lived (e.g., 5–15 minutes). Pass via standard `Authorization: Bearer <token>` headers.
- **Refresh Tokens**: Keep long-lived (e.g., 1–7 days). Enforce sliding-window expiration and single-use rotation (blacklist used tokens).
- **Token Storage**: Deliver the Refresh Token to the client via an `HttpOnly`, `Secure`, and `SameSite=Strict` cookie. Never expose it via the JSON response body.

### React Frontend (Token Management)
- **Memory Storage**: Store the short-lived Access Token strictly in-memory (local variable or React context state). 
- **Storage Ban**: Never save Access Tokens or Refresh Tokens in `localStorage` or `sessionStorage` to mitigate XSS risks.
- **Silent Refresh**: Implement an Axios or fetch interceptor that listens for `401 Unauthorized` responses. On a 401, it must automatically call the Django refresh endpoint to get a new Access Token seamlessly before retrying the failed request.
- **Initial Auth**: On application load, make a silent refresh call to check if an active session cookie exists before rendering the private application layouts.


## 7. Token Optimization & Efficiency Rules (Strict)

### Code Generation Efficiency
- **No Boilerplate**: Do not generate full files if only a single function or component changes. Provide only the modified snippet or diff.
- **Use Placeholders**: Replace large sections of existing, unchanged code with comments like `// ... existing code ...` or `# ... remaining django logic ...`.
- **DRY Code**: Proactively suggest utility imports over duplicating logic. Keep solutions modular to minimize character count.

### Output Communication Tone
- **Terse Explanations**: Omit polite introductions, conversational filler, and post-code summaries. Jump straight to the code.
- **Single-Sentence Context**: Limit explanations of *why* code works to a single sentence or bullet point, unless explicitly asked for a deep dive.
- **No Repeated Code blocks**: If a fix requires changes in multiple places, show the pattern once and explain the remaining occurrences inline.

### Dependency and Context Restraint
- **Native Over Libraries**: Prefer native React hooks and Django built-ins over importing heavy third-party packages unless they are already listed in our core tech stack.
- **Compact Data Formats**: When generating dummy data or mock APIs for testing, generate a maximum of 2-3 sample items instead of massive arrays.

