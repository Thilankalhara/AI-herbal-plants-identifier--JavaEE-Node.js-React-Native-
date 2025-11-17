// src/utils/sendRequest.ts
import Constants from "expo-constants";

export async function sendRequest(payload: any) {
  const SERVER_URL = Constants.expoConfig?.extra?.SERVER_URL;

  if (!SERVER_URL) {
    console.error("SERVER_URL not configured in app.json");
    return { ok: false, message: "SERVER_URL not configured" };
  }

  console.log("Sending to:", SERVER_URL);

  try {
    const res = await fetch(SERVER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`HTTP ${res.status}: ${text}`);
    }

    const json = await res.json();
    return json;
  } catch (e: any) {
    console.error("Request failed:", e);
    return { ok: false, message: e.message };
  }
}
