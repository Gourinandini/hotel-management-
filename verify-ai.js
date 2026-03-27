async function verify() {
  console.log("Verifying /api/chat...");
  try {
    const chatRes = await fetch('http://localhost:3001/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: "I want to plan a 2-day trip to Munnar starting from Kochi Airport.",
        history: []
      })
    });
    const chatData = await chatRes.json();
    console.log("Chat Response:", JSON.stringify(chatData, null, 2));
    if (chatData.isItinerary) {
      console.log("✅ Chat detected itinerary!");
    } else {
      console.log("❌ Chat DID NOT detect itinerary.");
    }
  } catch (err) {
    console.log("Chat error:", err.message);
  }

  console.log("\nVerifying /api/itinerary...");
  try {
    const itRes = await fetch('http://localhost:3001/api/itinerary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userPrompt: "I want to plan a 2-day trip to Munnar starting from Kochi Airport."
      })
    });
    const itData = await itRes.json();
    if (itData.structured) {
      console.log("Itinerary Structured Summary:", itData.structured.summary);
      const day1Hotel = itData.structured.days[0].hotels.medium || itData.structured.days[0].hotels.budget;
      if (day1Hotel && day1Hotel.googleMapsUrl) {
        console.log("✅ Hotel has Google Maps URL:", day1Hotel.googleMapsUrl);
      } else {
        console.log("❌ Hotel MISSING Google Maps URL.");
      }
    } else {
      console.log("❌ Itinerary failed to return structured data.");
    }
  } catch (err) {
    console.log("Itinerary error:", err.message);
  }
}

verify();
