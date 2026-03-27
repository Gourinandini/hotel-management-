const db = require('./db');

const SPOT_DATA = [
  { name: 'Fort Kochi Beach', district: 'Ernakulam', description: 'Historic beach with Chinese fishing nets.', lat: 9.9663, lon: 76.2323 },
  { name: 'Marine Drive', district: 'Ernakulam', description: 'Scenic promenade facing the backwaters.', lat: 9.9816, lon: 76.2764 },
  { name: 'Cherai Beach', district: 'Ernakulam', description: 'Picturesque beach known for dolphins.', lat: 10.1416, lon: 76.1783 },
  { name: 'Eravikulam National Park', district: 'Idukki', description: 'Home to the endangered Nilgiri Tahr.', lat: 10.1979, lon: 77.0436 },
  { name: 'Mattupetty Dam', district: 'Idukki', description: 'Beautiful dam surrounded by tea gardens.', lat: 10.1062, lon: 77.1235 },
  { name: 'Marari Beach', district: 'Alappuzha', description: 'Peaceful sandy beach perfect for relaxation.', lat: 9.5986, lon: 76.2983 },
  { name: 'Alleppey Lighthouse', district: 'Alappuzha', description: 'Historic lighthouse with panoramic coastal views.', lat: 9.4950, lon: 76.3190 },
  { name: 'Napier Museum', district: 'Thiruvananthapuram', description: 'Art and natural history museum.', lat: 8.5085, lon: 76.9554 },
  { name: 'Padmanabhaswamy Temple', district: 'Thiruvananthapuram', description: 'Ancient Hindu temple with intricate architecture.', lat: 8.4828, lon: 76.9436 },
  { name: 'Varkala Cliff', district: 'Thiruvananthapuram', description: 'Stunning red cliffs overlooking the Arabian Sea.', lat: 8.7369, lon: 76.7027 },
  { name: 'Edakkal Caves', district: 'Wayanad', description: 'Ancient caves with prehistoric petroglyphs.', lat: 11.6253, lon: 76.2355 },
  { name: 'Banasura Sagar Dam', district: 'Wayanad', description: 'Largest earth dam in India.', lat: 11.6669, lon: 75.9553 }
];

const RESTAURANT_DATA = [
  { name: 'Paragon Restaurant', district: 'Ernakulam', description: 'Famous for authentic Kerala Malabar biryani and seafood.', lat: 9.9861, lon: 76.2842 },
  { name: 'Dhe Puttu', district: 'Ernakulam', description: 'Specializes in traditional Kerala puttu varieties.', lat: 9.9928, lon: 76.3073 },
  { name: 'Rapsy Restaurant', district: 'Idukki', description: 'Popular budget eatery in Munnar known for parottas.', lat: 10.0863, lon: 77.0603 },
  { name: 'Harbour Restaurant', district: 'Alappuzha', description: 'Great seafood overlooking the Alleppey beach.', lat: 9.4940, lon: 76.3195 },
  { name: 'Villa Maya', district: 'Thiruvananthapuram', description: 'Fine dining in a restored 18th-century Dutch manor.', lat: 8.4988, lon: 76.9404 },
  { name: "1980's A Nostalgic Restaurant", district: 'Wayanad', description: 'Authentic Kerala meals served in a traditional setting.', lat: 11.6053, lon: 76.0841 }
];

const HOTEL_UPDATES = [
  { id: 1, lat: 10.1518, lon: 76.3930 }, 
  { id: 2, lat: 9.9839, lon: 76.2691 },  
  { id: 3, lat: 9.9658, lon: 76.2421 },  
  { id: 4, lat: 10.0889, lon: 77.0595 }, 
  { id: 5, lat: 10.0800, lon: 77.0600 }, 
  { id: 6, lat: 9.4981, lon: 76.3388 },  
  { id: 7, lat: 9.5050, lon: 76.3400 },  
  { id: 8, lat: 8.3988, lon: 76.9786 },  
  { id: 9, lat: 8.3881, lon: 76.9760 }   
];

async function seed() {
  const client = await db.pool.connect();
  try {
    console.log("Starting Kerala Dataset Seeding...");

    // 1. Alter Hotels Table
    console.log("Adding lat/lon to hotels table...");
    await client.query(`ALTER TABLE hotels ADD COLUMN IF NOT EXISTS lat FLOAT;`);
    await client.query(`ALTER TABLE hotels ADD COLUMN IF NOT EXISTS lon FLOAT;`);

    for (const h of HOTEL_UPDATES) {
      await client.query(`UPDATE hotels SET lat = $1, lon = $2 WHERE id = $3`, [h.lat, h.lon, h.id]);
    }
    console.log("Hotels updated with coordinates.");

    // 2. Create Spots Table
    console.log("Creating and populating spots table...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS spots (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        district VARCHAR(100) NOT NULL,
        description TEXT,
        lat FLOAT,
        lon FLOAT
      );
    `);
    await client.query(`TRUNCATE TABLE spots RESTART IDENTITY;`);

    for (const s of SPOT_DATA) {
      await client.query(`INSERT INTO spots (name, district, description, lat, lon) VALUES ($1, $2, $3, $4, $5)`,
        [s.name, s.district, s.description, s.lat, s.lon]);
    }

    // 3. Create Restaurants Table
    console.log("Creating and populating restaurants table...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS restaurants (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        district VARCHAR(100) NOT NULL,
        description TEXT,
        lat FLOAT,
        lon FLOAT
      );
    `);
    await client.query(`TRUNCATE TABLE restaurants RESTART IDENTITY;`);

    for (const r of RESTAURANT_DATA) {
      await client.query(`INSERT INTO restaurants (name, district, description, lat, lon) VALUES ($1, $2, $3, $4, $5)`,
        [r.name, r.district, r.description, r.lat, r.lon]);
    }

    console.log("✅ Seeding completed successfully!");
  } catch (err) {
    console.error("Error during seeding:", err);
  } finally {
    client.release();
    process.exit(0);
  }
}

seed();
