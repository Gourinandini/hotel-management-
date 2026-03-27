const db = require('./db');

async function updatePrices() {
  const client = await db.pool.connect();
  try {
    console.log("Updating hotel room prices to Indian Rupee scales (2000-15000 ₹)...");
    
    await client.query('BEGIN');
    
    // 3 Stars -> 3000-5000, 4 Stars -> 6000-9000, 5 Stars -> 10000-15000
    // We update rooms based on the hotel rating they belong to
    await client.query(`
      UPDATE rooms 
      SET price_per_night = CASE 
        WHEN (SELECT rating FROM hotels h WHERE h.id = rooms.hotel_id) = 3 THEN floor(random() * 2000 + 3000)
        WHEN (SELECT rating FROM hotels h WHERE h.id = rooms.hotel_id) = 4 THEN floor(random() * 3000 + 6000)
        WHEN (SELECT rating FROM hotels h WHERE h.id = rooms.hotel_id) = 5 THEN floor(random() * 5000 + 10000)
        ELSE 4000
      END
    `);
    
    await client.query('COMMIT');
    console.log("✅ Successfully updated prices in DB!");
  } catch (err) {
    await client.query('ROLLBACK');
    console.error("Error updating prices", err);
  } finally {
    client.release();
    process.exit(0);
  }
}

updatePrices();
