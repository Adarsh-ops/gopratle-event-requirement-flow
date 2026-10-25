# Eventbrief | GoPratle Full-Stack Developer Intern Assignment

A responsive, four-step event requirement posting flow built with **Next.js + TypeScript**, **Node.js + Express**, and **MongoDB/Mongoose**. The form adapts to the selected category (Event Planner, Performer, or Crew), validates inputs in both browser and API, then persists the submission to MongoDB.

> Product/UI name: Eventbrief. This is a candidate-built prototype for the assignment, not an official GoPratle product.

## Features

- Four-step flow: Event basics → Category details → Requirements → Review & submit.
- Event basics: event name/type, single date or date range, event format, location, optional venue, and category.
- Planner-specific details: event scale, estimated guest count, planning stage, service checklist, budget, requirements.
- Performer-specific details: performer type, genre/style, duration, group size, production needs, budget, requirements.
- Crew-specific details: crew role, headcount, experience level, shift length, skills, budget, requirements.
- Review screen with edit controls before submission, loading/error/success states, and a reference code.
- Express API uses Zod validation, CORS allow-list, Helmet security headers, JSON size limit, and rate limiting.
- MongoDB documents are categorized with `planner`, `performer`, or `crew`; timestamps and a reference code are stored.
- Test suite covers all three category payloads and invalid date-range/required-service cases.
- Mobile-responsive design, keyboard focus styling, visible progress, and semantic button states.

## Project structure

```text
gopratle-assignment/
├── frontend/
│   ├── app/
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── .env.local.example
│   ├── next.config.ts
│   ├── package.json
│   └── tsconfig.json
└── backend/
    ├── src/
    │   ├── app.js
    │   ├── Requirement.js
    │   ├── server.js
    │   └── validation.js
    ├── test/validation.test.js
    ├── .env.example
    └── package.json
```

## Prerequisites

- Node.js 20.9 or later (Node 22 LTS is recommended)
- npm
- A MongoDB Atlas cluster or another MongoDB instance

## Run locally

### 1. Configure MongoDB and run the backend

```bash
cd backend
npm install
```

Copy `.env.example` to `.env` and replace `MONGODB_URI` with your actual MongoDB connection string. Never commit `.env` or expose database credentials.

```bash
npm run dev
```

The API starts at `http://localhost:4000` after MongoDB connects. Verify it with:

```bash
curl http://localhost:4000/api/health
```

Expected health response includes `"success": true` and `"database": "connected"`.

### 2. Run the frontend

Open another terminal:

```bash
cd frontend
npm install
```

Copy `.env.local.example` to `.env.local` (the default points to the local API), then run:

```bash
npm run dev
```

Open `http://localhost:3000`.

### 3. Run backend validation tests

From the backend directory:

```bash
npm test
```

The tests exercise each category payload and negative validation cases without requiring a MongoDB connection.

## API contract

### `GET /api/health`

Returns service status and whether Mongoose is connected. This endpoint is useful for a deployment health check.

### `POST /api/requirements`

Accepts JSON containing the event basics, category, and category-specific `details` object. Successful submissions return HTTP `201` with a reference code and the MongoDB document ID. The API intentionally does **not** expose a public GET endpoint for submitted personal/event details.

Example planner payload:

```json
{
  "eventName": "Summer Product Launch",
  "eventType": "Corporate event",
  "dateMode": "range",
  "startDate": "2027-03-10",
  "endDate": "2027-03-11",
  "eventFormat": "In person",
  "location": "Kolkata, West Bengal",
  "venue": "Riverside Convention Centre",
  "category": "planner",
  "details": {
    "eventScale": "Mid-sized",
    "guestCount": 250,
    "planningStage": "Shortlisting vendors",
    "servicesNeeded": ["Venue sourcing", "Catering"],
    "budgetRange": "75k_2l",
    "specialRequirements": "A step-free entrance is needed."
  }
}
```

Allowed category values: `planner`, `performer`, `crew`.

## Deploy the backend (Render or equivalent Node host)

1. Push this project to a GitHub repository.
2. Create a new Node web service using the repository's `backend/` directory as the root.
3. Build command: `npm install`
4. Start command: `npm start`
5. Add environment variables in the host dashboard:
   - `MONGODB_URI`: MongoDB connection string
   - `NODE_ENV`: `production`
   - `FRONTEND_URLS`: your Vercel URL, e.g. `https://your-project.vercel.app` (comma-separate multiple origins if needed)
   - `PORT`: usually supplied automatically by the host
6. Open `https://YOUR-API-HOST/api/health` and confirm `database` is `connected`.

For MongoDB Atlas, create a database user and allow the deployed host to reach the cluster. Use the narrowest practical network access rules; do not put the URI in source code.

## Deploy the frontend (Vercel)

1. Import the GitHub repository into Vercel.
2. Set the project root directory to `frontend/`.
3. Add the environment variable `NEXT_PUBLIC_API_URL=https://YOUR-API-HOST` (no trailing slash).
4. Deploy, then add the final Vercel URL to the backend's `FRONTEND_URLS` environment variable and redeploy/restart the backend.
5. Open the live site, submit a test requirement, confirm the success/reference screen, and verify the new record appears in MongoDB Atlas.

**Deploy the backend before the frontend** so the frontend has a real API URL to call. A Vercel frontend alone does not provide the Express API or MongoDB persistence.

## QA checklist before sharing

- [ ] Submit a planner requirement with a single date.
- [ ] Submit a performer requirement with a date range.
- [ ] Submit a crew requirement and verify `category: "crew"` in MongoDB.
- [ ] Confirm an end date earlier than the start date is blocked.
- [ ] Confirm planner submission requires at least one service.
- [ ] Confirm invalid/missing fields are rejected by the backend, not just the UI.
- [ ] Confirm the API health endpoint reports MongoDB connected.
- [ ] Confirm the frontend origin is in `FRONTEND_URLS`.
- [ ] Test mobile layout and browser refresh.
- [ ] Verify each success screen shows a reference code and that the document is saved in MongoDB.
- [ ] Use synthetic test data only, and remove any sensitive test data before sharing the application.

## Design and implementation assumptions

- Event type (wedding, corporate event, concert, etc.) is separate from the requested provider category (planner, performer, crew).
- Event format is included as a useful extra field: in person, virtual, or hybrid.
- Budget is captured as a coarse range, not an exact quote.
- Planner service selection is required; performer equipment and crew skills are optional.
- Date ranges cannot end before they start.
- Each accepted request creates one MongoDB document with category-specific details.
- Submitted details are not publicly retrievable by ID; the client receives a receipt containing the reference code.

## Before submission

Replace example URLs with your deployed URLs, test the live API and database, and ensure both `frontend/` and `backend/` are present in the same GitHub repository. Never commit `.env` files or actual database credentials.
