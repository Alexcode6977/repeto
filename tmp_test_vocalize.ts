import * as fs from 'fs';

async function testVocalizeRoute() {
    const scriptId = "fe2b08eb-d930-4baa-8eb4-f9e09dc76321"; // A recent script ID from logs

    console.log("Calling local vocalize API...");
    try {
        const response = await fetch("http://localhost:3000/api/vocalize", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ scriptId, priority: "high" })
        });

        const data = await response.json();
        console.log("Vocalize Route Response:", data);
    } catch (e) {
        console.error("Error calling route:", e);
    }
}

testVocalizeRoute().catch(console.error);
