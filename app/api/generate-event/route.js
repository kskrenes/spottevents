import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const MAX_PROMPT_LENGTH = 500;
const AI_TIMEOUT_MS = 30_000;
const systemInstruction = "You are an event planning assistant. Generate event details based on the user's description."
const responseSchema = {
  type: "object",
  required: [
    "title",
    "description",
    "category",
    "suggestedCapacity",
    "suggestedTicketType"
  ],
  properties: {
    title: {
      type: "string",
      description: "Catchy professional title under 80 characters"
    },
    description: {
      type: "string",
      description:
        "Single paragraph, 2-3 sentences, no line breaks"
    },
    category: {
      type: "string",
      enum: [
        "tech",
        "music",
        "sports",
        "art",
        "food",
        "business",
        "health",
        "education",
        "gaming",
        "networking",
        "outdoor",
        "community"
      ]
    },
    suggestedCapacity: {
      type: "integer"
    },
    suggestedTicketType: {
      type: "string",
      enum: ["free", "paid"]
    }
  }
};

const withTimeout = (promise, ms) =>
  Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("AI request timed out")), ms)
    ),
  ]);

export async function POST(req) {
  try {
    // ensure request is authorized
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { prompt } = await req.json();

    // ensure prompt exists and is not just whitespace
    if (!prompt || !prompt.trim()) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }
    const sanitizedPrompt = prompt.trim().slice(0, MAX_PROMPT_LENGTH);

    const response = await withTimeout(ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{
        role: "user",
        parts: [{ text: sanitizedPrompt }]
      }],
      systemInstruction: {
        parts: [{ text: systemInstruction }]
      },
      config: { 
        responseMimeType: "application/json",  // emit raw JSON without markdown fences
        responseSchema: responseSchema,
      },
    }), AI_TIMEOUT_MS);

    let eventData;
    try {
      eventData = JSON.parse(response.text.trim());
    } catch {
      return NextResponse.json({ error: "Invalid AI response" }, { status: 502 });
    }
    if (
      typeof eventData?.title !== "string" ||
      typeof eventData?.description !== "string" ||
      typeof eventData?.category !== "string" ||
      typeof eventData?.suggestedCapacity !== "number" ||
      !["free", "paid"].includes(eventData?.suggestedTicketType)
    ) {
      return NextResponse.json({ error: "Invalid AI response" }, { status: 502 });
    }
    return NextResponse.json(eventData);

  } catch (error) {
    console.error("Error generating event:", error);
    return NextResponse.json(
      { error: "Failed to generate event" },
      { status: 500 }
    );
  }
}