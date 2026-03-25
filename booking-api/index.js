const express = require('express');
const cors = require('cors');
const db = require('./db');
require('dotenv').config();
const Groq = require('groq-sdk');

const app = express();
app.use(cors());
app.use(express.json());

// Initialize Groq API (will warn if missing key)
const groq = new Groq({});

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
        reply: "To experience the full AI Concierge, please add your `GROQ_API_KEY` to the `booking-api/.env` file. For now, I'm happily running in offline demo mode!" 
      });
    }

    // Fetch context from DB to make AI "aware"
    const { rows: hotels } = await db.query('SELECT id, name, location, rating FROM hotels');
    const hotelContext = hotels.map(h => `${h.name} in ${h.location} (${h.rating} stars)`).join(', ');

    const systemPrompt = `You are an elite, luxurious hotel concierge named 'Aura'. You are incredibly polite, refined, and helpful. 
You work for 'Premium Stays'. 
Currently, our active hotels in the database are: ${hotelContext}.
Keep answers concise, extremely helpful, and try to assist the user in finding a great room based on our locations. 
If they ask about prices, suggest they click "Reserve Room" on the UI to see live rates.`;

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

    res.json({ reply: response.choices[0].message.content });
  } catch (err) {
    console.error("AI Error:", err);
    res.status(500).json({ error: 'AI Concierge is unavailable right now.' });
  }
});

app.listen(PORT, () => {
  console.log(`Booking API running on port ${PORT}`);
});
