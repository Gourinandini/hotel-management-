# Hotel Booking Migration Implementation Plan

## Goal Description
Build a robust Service-Oriented Architecture (SOA) that encompasses a hotel booking web application, supported by microservices and a hybrid data approach. We initially store bookings in a Relational Database (PostgreSQL) and seamlessly migrate to a NoSQL Database (MongoDB) through both a one-time DB-to-DB migration and a Change Data Capture (CDC) pipeline using Kafka. Finally, we will use Playwright to simulate thousands of bookings over a 3-year span, and prepare a cohesive demo script demonstrating the migration and real-time syncing.

## User Review Required
> [!IMPORTANT]
> The approach relies on an "Outbox Pattern" for the CDC pipeline. Instead of setting up Debezium (which requires complex Kafka Connect configurations), the booking microservice will write a summary event (e.g., Booking ID) to an `outbox` table in Postgres. A lightweight polling publisher will send this to Kafka, and a subscriber will read from Kafka, *call the GET API* to fetch full details from Postgres, map the schema, and save it to MongoDB. This directly fulfills your requirement to "call APIs to fetch the changes from relational DB". Please confirm if this approach is suitable for your "CDC" requirement!

## Proposed Architecture

1. **Infrastructure Layer (`docker-compose.yml`)**
   - **PostgreSQL**: Relational DB for the booking app source.
   - **MongoDB**: NoSQL DB for the modernized/search-focused destination.
   - **Kafka & Zookeeper**: Event stream broker for the CDC pipeline.

2. **Backend Microservices**
   - **`booking-api` (Port 3001)**: Node.js + Express + Sequelize. 
     - Exposes `POST /api/bookings`, `GET /api/bookings/:id`. 
     - Stores data in PostgreSQL.
   - **`search-api` (Port 3002)**: Node.js + Express + Mongoose. 
     - Connects to MongoDB to serve search queries for the demo.
   - **`migration-service`**: A Node.js CLI tool that runs once. It executes a `SELECT *` against Postgres, transforms the records into nested JSON arrays (e.g., embedding customer info into the booking document), and performs a bulk `insertMany` into MongoDB.
   - **`cdc-publisher`**: A Node.js worker that queries Postgres for new unhandled changes, publishes minimal events (e.g., `{ "id": 123, "type": "BOOKING_CREATED" }`) to Kafka, and marks them as processed.
   - **`cdc-subscriber`**: A Node.js worker that subscribes to the Kafka topic. On receiving an event, it calls the `GET /api/bookings/:id` on the `booking-api`, transforms the response, and upserts it into MongoDB.

3. **Frontend Application**
   - **`web-app` (Port 5173)**: Built with React & Vite. Serves as the UI for browsing hotels and making bookings. Simple, sleek UI.

4. **Automation**
   - **`playwright-tests`**: A script that drives the Chromium browser or calls APIs directly (faster for thousands of records) to automatically generate dummy bookings for the next 3 years using tools like `faker.js`.

5. **Demo Toolkit**
   - Scripts allowing the user to seamlessly execute the demo:
     - `npm run demo:clean-nosql` (Drops MongoDB target collections)
     - `npm run demo:migrate-all` (Runs DB-to-DB migration)
     - `npm run demo:start-cdc` (Starts Publisher and Subscriber)
     - The web frontend will contain a "Search Migration Target" portal to search MongoDB.

## Verification Plan

### Automated Tests
- The **Playwright** suite will guarantee the frontend and backend are capable of generating the required booking volume over the required time span.

### Manual Verification
- A custom `<AppRoot>/demo.sh` orchestrator script will be built to walk you through:
  1. Booting up Docker Compose containers.
  2. Cleaning MongoDB.
  3. One-time Migration logic check.
  4. Real-time syncing (creating a booking in UI -> verifying it lands in MongoDB via Kafka log).
  5. Searching the newly imported data successfully.

## AI Travel Assistant Implementation Plan

1. **Backend (`booking-api/index.js`)**
   - Create a new endpoint `POST /api/itinerary` utilizing the existing `groq-sdk`.
   - Query Postgres for rich hotel data including rooms and pricing: `SELECT h.id, h.name, h.location, h.rating, r.price_per_night FROM hotels h JOIN rooms r ON h.id = r.hotel_id`.
   - Implement the exact system prompt described by the user (prioritize shortest distance, lower price, higher ratings; filter available rooms; structured step-by-step output).
   
2. **Frontend (`frontend/src/App.jsx`)**
   - Add a new tab/view state `view === 'itinerary'` called "AI Itinerary Planner".
   - Create a dedicated form asking for "Current Location", "Destination", "Max Price", "Max Distance/Proximity", and "Minimum Rating".
   - Display the generated step-by-step Travel Assistant itinerary.
   
### Verification Plan
- **Manual Verification**: Run `npm run start:backend` and `npm run start:frontend`. Click on "AI Itinerary Planner", input a test origin and destination, and verify the AI outputs the step-by-step itinerary with 2-3 hotel recommendations meeting the guidelines.
