require('dotenv').config();
const { GOOGLE_MAPS_API_KEY } = process.env;

async function test() {
  console.log("Key prefix:", GOOGLE_MAPS_API_KEY ? GOOGLE_MAPS_API_KEY.slice(0, 5) : "NO KEY");
  const origin = "Kochi Airport";
  const dest = "Kovalam Beach";
  const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(origin)}&destinations=${encodeURIComponent(dest)}&key=${GOOGLE_MAPS_API_KEY}`;
  
  try {
    const res = await fetch(url);
    const data = await res.json();
    console.log("Response:", JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Fetch failed:", err);
  }
}

test();
