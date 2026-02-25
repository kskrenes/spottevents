import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function POST(req) {
  try {
    // ensure request is authorized
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { prompt } = await req.json();

    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const systemPrompt = `You are an event planning assistant. Generate event details based on the user's description.

      CRITICAL: Return ONLY valid JSON with properly escaped strings. No newlines in string values - use spaces instead.

      Return this exact JSON structure:
      {
        "title": "Event title (catchy and professional, single line)",
        "description": "Detailed event description in a single paragraph. Use spaces instead of line breaks. Make it 2-3 sentences describing what attendees will learn and experience.",
        "category": "One of: tech, music, sports, art, food, business, health, education, gaming, networking, outdoor, community",
        "suggestedCapacity": 50,
        "suggestedTicketType": "free"
      }

      User's event idea: ${prompt}

      Rules:
      - Return ONLY the JSON object, no markdown, no explanation
      - All string values must be on a single line with no line breaks
      - Use spaces instead of \\n or line breaks in description
      - Make title catchy and under 80 characters
      - Description should be 2-3 sentences, informative, single paragraph
      - suggestedTicketType should be either "free" or "paid"
    `;

    const result = await model.generateContent(systemPrompt);
    const responseText = result.response.text();

    // clean the response, remove any markdown blocks if present
    let cleanedText = responseText.trim();
    if (cleanedText.startsWith("```json")) {
      cleanedText = cleanedText
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "");
    } else if (cleanedText.startsWith("```")) {
      cleanedText = cleanedText.replace(/```\n?/g, "");
    }

    let eventData;
    try {
      eventData = JSON.parse(cleanedText);
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