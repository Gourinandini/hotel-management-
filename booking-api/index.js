const express = require('express');
const cors = require('cors');
const db = require('./db');
require('dotenv').config();
const Groq = require('groq-sdk');

const app = express();
app.use(cors());
app.use(express.json());

// Initialize Groq API (will warn if missing key)
let groq;
try {
  groq = new Groq({});
} catch (err) {
  console.warn("WARNING: GROQ_API_KEY is missing. AI Travel Assistant will throw an error when used.");
}

const PORT = process.env.PORT || 3001;

// Get all hotels
app.get('/api/hotels', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM hotels');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get rooms for a hotel
app.get('/api/hotels/:id/rooms', async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await db.query('SELECT * FROM rooms WHERE hotel_id = $1', [id]);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create a booking
app.post('/api/bookings', async (req, res) => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const { hotel_id, room_id, customer_name, customer_email, start_date, end_date, total_price } = req.body;

    // Availability check: prevent double booking
    const overlapCheck = await client.query(
      `SELECT id FROM bookings 
       WHERE room_id = $1 AND start_date < $2 AND end_date > $3`,
      [room_id, end_date, start_date]
    );
    if (overlapCheck.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ 
        error: 'Room is already booked for the selected dates. Please choose different dates or another room.' 
      });
    }

    const bookingQuery = `
      INSERT INTO bookings (hotel_id, room_id, customer_name, customer_email, start_date, end_date, total_price)
      VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id
    `;
    const bookingValues = [hotel_id, room_id, customer_name, customer_email, start_date, end_date, total_price];
    const { rows: bookingRows } = await client.query(bookingQuery, bookingValues);
    const bookingId = bookingRows[0].id;

    // Outbox entry for CDC
    const outboxQuery = `
      INSERT INTO outbox (aggregate_type, aggregate_id, type, payload)
      VALUES ($1, $2, $3, $4)
    `;
    const payload = JSON.stringify({ booking_id: bookingId, hotel_id, room_id, customer_name });
    await client.query(outboxQuery, ['Booking', bookingId.toString(), 'BOOKING_CREATED', payload]);

    await client.query('COMMIT');
    res.status(201).json({ id: bookingId, message: 'Booking created' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

// Get booking details (Used by CDC subscriber)
app.get('/api/bookings/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const bookingQuery = `
      SELECT b.*, h.name as hotel_name, h.location, r.room_number, r.type as room_type 
      FROM bookings b
      JOIN hotels h ON b.hotel_id = h.id
      JOIN rooms r ON b.room_id = r.id
      WHERE b.id = $1
    `;
    const { rows } = await db.query(bookingQuery, [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// AI Chat Concierge Endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { message, history } = req.body;

    // Check if API key is provided
    if (!process.env.GROQ_API_KEY) {
      return res.json({
        reply: "To experience the full AI Concierge, please add your `GROQ_API_KEY` to the `booking-api/.env` file. For now, I'm happily running in offline demo mode!",
        isItinerary: false
      });
    }

    // Fetch context from DB to make AI "aware"
    const { rows: hotels } = await db.query('SELECT id, name, location, rating FROM hotels');
    const { rows: spots } = await db.query('SELECT name, district FROM spots LIMIT 10');
    const { rows: restaurants } = await db.query('SELECT name, district FROM restaurants LIMIT 10');

    const hotelContext = hotels.map(h => `${h.name} in ${h.location} (${h.rating} stars)`).join(', ');
    const spotContext = spots.map(s => `${s.name} (${s.district})`).join(', ');
    const restContext = restaurants.map(r => `${r.name} (${r.district})`).join(', ');

    const systemPrompt = `You are an elite, luxurious hotel concierge named 'Aura'. You are incredibly polite, refined, and helpful. 
You work for 'Premium Stays'. 
Currently, our active hotels in the database are: ${hotelContext}.
Famous spots nearby: ${spotContext}.
Top restaurants: ${restContext}.

INSTRUCTIONS:
1. Keep answers concise and extremely helpful.
2. If the user asks for an itinerary, travel plan, or "what to do" for a number of days:
   - Provide a BRIEF (1-2 sentence) enthusiastic summary.
   - Mention that you can generate a detailed step-by-step plan.
   - You MUST include the keyword "ITINERARY_TRIGGER" at the end of your response if you are suggesting an itinerary plan.
3. If they ask about prices, suggest they click "Reserve Room" on the UI to see live rates.`;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'assistant', content: "Hello! I am Aura, your premium concierge. How can I assist you with your stay today?" },
      ...history.map(m => ({
        role: m.role === 'model' ? 'assistant' : 'user',
        content: m.parts[0].text
      })),
      { role: 'user', content: message }
    ];

    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: messages,
      temperature: 0.7,
      max_tokens: 1024,
    });

    const reply = response.choices[0].message.content;
    const isItinerary = reply.includes("ITINERARY_TRIGGER");
    const cleanedReply = reply.replace("ITINERARY_TRIGGER", "").trim();

    res.json({ reply: cleanedReply, isItinerary });
  } catch (err) {
    console.error("AI Error:", err);
    res.status(500).json({ error: 'AI Concierge is unavailable right now.' });
  }
});

// AI Travel Itinerary Planner Endpoint (Agentic RAG Pipeline)
app.post('/api/itinerary', async (req, res) => {
  try {
    const { userPrompt } = req.body;
    
    if (!process.env.GROQ_API_KEY) {
      return res.status(400).json({ error: "GROQ_API_KEY is missing in server environment." });
    }

    // ==========================================
    // STEP 1: Intent Extraction (LLM Call 1)
    // ==========================================
    const extractPrompt = `You are an AI assistant parsing travel requests. 
Extract the user's intent from this prompt: "${userPrompt}"
Return ONLY a valid JSON object with these keys (use null if not mentioned):
{
  "startingLocation": "string (e.g. Kochi, Kochi Airport)",
  "destination": "string (e.g. Munnar, Kovalam, Alleppey)",
  "numberOfDays": number,
  "maxPrice": number,
  "minRating": number,
  "keywords": ["string"]
}`;

    const extractRes = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: extractPrompt }],
      temperature: 0.1,
      response_format: { type: 'json_object' }
    });

    const intent = JSON.parse(extractRes.choices[0].message.content || "{}");
    const numDays = intent.numberOfDays || 2;

    // ==========================================
    // STEP 2: Availability-Aware DB Retrieval
    // ==========================================
    const hotelQuery = `
      SELECT h.id as hotel_id, h.name as hotel_name, h.location, h.rating, h.tier,
             h.lat as hotel_lat, h.lon as hotel_lon,
             r.id as room_id, r.room_number, r.price_per_night, r.type as room_type,
             CASE WHEN b.id IS NULL THEN true ELSE false END as available
      FROM hotels h 
      JOIN rooms r ON h.id = r.hotel_id
      LEFT JOIN bookings b ON r.id = b.room_id 
        AND b.start_date <= CURRENT_DATE + INTERVAL '${numDays} days'
        AND b.end_date >= CURRENT_DATE
      ORDER BY h.tier, h.rating DESC
    `;
    const { rows: allRooms } = await db.query(hotelQuery);
    const { rows: spots } = await db.query('SELECT * FROM spots');
    const { rows: restaurants } = await db.query('SELECT * FROM restaurants');

    const safeStr = (s) => (s || '').toLowerCase();
    const destLoc = safeStr(intent.destination);
    const startLoc = safeStr(intent.startingLocation);
    
    // Filter rooms near destination
    let destinationRooms = allRooms.filter(r => 
      (destLoc ? safeStr(r.location).includes(destLoc) : true) &&
      (intent.maxPrice ? r.price_per_night <= intent.maxPrice : true) &&
      (intent.minRating ? r.rating >= intent.minRating : true)
    );

    let startRooms = startLoc ? allRooms.filter(r => safeStr(r.location).includes(startLoc)) : [];
    
    if (destinationRooms.length === 0) {
      destinationRooms = allRooms.sort((a,b) => b.rating - a.rating).slice(0, 8);
    }

    // Build spots with Google Maps URLs (server-side, not LLM)
    const allMatchingSpots = spots.filter(s => destLoc ? safeStr(s.district).includes(destLoc) || safeStr(s.description).includes(destLoc) : true);
    const startSpots = startLoc ? spots.filter(s => safeStr(s.district).includes(startLoc)) : [];
    const combinedSpots = [...startSpots, ...allMatchingSpots];
    const spotsWithMaps = combinedSpots.map(s => ({
      name: s.name, district: s.district, description: s.description,
      lat: s.lat, lon: s.lon,
      googleMapsUrl: s.lat && s.lon ? `https://www.google.com/maps/search/?api=1&query=${s.lat},${s.lon}` : null
    }));

    const matchingRest = restaurants.filter(r => destLoc ? safeStr(r.district).includes(destLoc) : true).slice(0, 5);
    const restWithMaps = matchingRest.map(r => ({
      name: r.name, district: r.district, description: r.description,
      lat: r.lat, lon: r.lon,
      googleMapsUrl: r.lat && r.lon ? `https://www.google.com/maps/search/?api=1&query=${r.lat},${r.lon}` : null
    }));

    // Build hotel context grouped by tier (include coordinates)
    const combinedRooms = [...startRooms, ...destinationRooms];
    const hotelContext = JSON.stringify(combinedRooms.map(r => ({
      hotel_id: r.hotel_id, room_id: r.room_id, hotel_name: r.hotel_name,
      location: r.location, rating: r.rating, room_type: r.room_type,
      room_number: r.room_number, price_per_night: r.price_per_night,
      available: r.available, tier: r.tier,
      lat: r.hotel_lat, lon: r.hotel_lon
    })));

    // ==========================================
    // STEP 3: Structured Synthesis (LLM Call 2)
    // ==========================================
    const systemPrompt = `You are a premium Travel AI Concierge for Kerala, India.

User Request: "${userPrompt}"
Parsed Intent: ${JSON.stringify(intent)}

AVAILABLE HOTEL DATA (from our real database — each has a "tier" field: budget, medium, or luxury):
${hotelContext}

TOURIST SPOTS (with pre-built Google Maps links):
${JSON.stringify(spotsWithMaps)}

RESTAURANTS (with pre-built Google Maps links):
${JSON.stringify(restWithMaps)}

INSTRUCTIONS — Return ONLY a valid JSON object with this EXACT structure:
{
  "summary": "A brief 1-2 sentence greeting summarizing the trip plan",
  "startingLocation": "where the trip starts",
  "destination": "main destination",
  "totalDays": ${numDays},
  "days": [
    {
      "dayNumber": 1,
      "title": "Day 1: Kochi → Munnar",
      "attractions": [
        {
          "name": "Fort Kochi Beach",
          "description": "Historic beach with Chinese fishing nets",
          "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=9.9663,76.2323"
        }
      ],
      "localTip": "Try the Karimeen Pollichathu at a local toddy shop!",
      "hotels": {
        "budget": {
          "hotel_id": 5, "room_id": 9, "hotel_name": "Budget Retreat Munnar",
          "location": "Munnar (Town Center)", "room_type": "Basic", "room_number": "501",
          "price_per_night": 730, "rating": 3.0, "available": true, "tier": "budget",
          "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=10.0800,77.0600"
        },
        "medium": {
          "hotel_id": 4, "room_id": 7, "hotel_name": "Munnar Tea Hills Resort",
          "location": "Munnar (Tea Gardens)", "room_type": "Valley View", "room_number": "401",
          "price_per_night": 2200, "rating": 4.6, "available": true, "tier": "medium",
          "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=10.0889,77.0595"
        },
        "luxury": null
      }
    }
  ]
}

RULES:
1. Create exactly ${numDays} days in the "days" array.
2. For each day, provide 2-4 attractions. Use the EXACT spots from TOURIST SPOTS data above including their pre-built googleMapsUrl. You may also add well-known Kerala attractions with googleMapsUrl constructed as "https://www.google.com/maps/search/?api=1&query=PLACE_NAME+Kerala+India" (URL-encode the name).
3. For each day, provide "hotels" object with keys "budget", "medium", "luxury". For each tier, pick the BEST matching hotel from the AVAILABLE HOTEL DATA that has that tier.
4. For each selected hotel, include "googleMapsUrl" constructed as "https://www.google.com/maps/search/?api=1&query=LAT,LON" using their EXACT lat/lon from the data.
5. Use ONLY hotels from the AVAILABLE HOTEL DATA above. Do NOT invent hotels. Copy exact hotel_id, room_id, hotel_name, etc.
6. Prefer hotels marked "available": true.
7. Add a fun, useful "localTip" for each day.
8. Return ONLY the JSON object. No markdown, no explanation outside the JSON.`;

    const finalRes = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'system', content: systemPrompt }],
      temperature: 0.5,
      max_tokens: 4000,
      response_format: { type: 'json_object' }
    });

    let structured;
    try {
      structured = JSON.parse(finalRes.choices[0].message.content);
    } catch (parseErr) {
      console.error("Failed to parse LLM JSON:", parseErr);
      return res.json({ itinerary: finalRes.choices[0].message.content, structured: null });
    }

    res.json({ structured, itinerary: null });
  } catch (err) {
    console.error("Agentic AI Error:", err);
    res.status(500).json({ error: 'Travel Assistant is unavailable right now. Check backend logs.' });
  }
});

app.listen(PORT, () => {
  console.log(`Booking API running on port ${PORT}`);
});
