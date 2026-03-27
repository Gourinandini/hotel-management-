async function test() {
  try {
    const res = await fetch('https://nominatim.openstreetmap.org/search?q=Kochi&format=json&limit=1', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    });
    const text = await res.text();
    console.log("Status:", res.status);
    console.log("Response:", text.substring(0, 100));
  } catch (e) {
    console.log("Fetch Error Message:", e.message);
    console.log("Fetch Error Cause:", e.cause);
  }
}
test();
