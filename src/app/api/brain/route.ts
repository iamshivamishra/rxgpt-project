import { NextResponse } from "next/server";

// This calls your LOCAL Ollama model (free, no API key, runs on your machine).
// Make sure Ollama is running: `ollama run qwen2.5:3b` (or gemma2:2b)

const OLLAMA_URL = "http://localhost:11434/api/generate";
const MODEL = "qwen2.5:3b"; // change to "gemma2:2b" or "mistral" if you used a different model

export async function POST(req: Request) {
  try {
    const { text } = await req.json();

    if (!text) {
      return NextResponse.json({ error: "No text provided" }, { status: 400 });
    }

    const systemPrompt = `You are RxGPT, an AI clinic receptionist voice assistant.
You only help with: booking, rescheduling, cancelling appointments, and answering
basic clinic FAQs (timings, doctors, policies). You must NEVER give medical advice,
diagnosis, or treatment instructions. Keep replies short (1-2 sentences), natural,
and in the same language the patient used. If asked anything medical, politely
say a staff member or doctor will help with that.`;

    const response = await fetch(OLLAMA_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        prompt: `${systemPrompt}\n\nPatient said: "${text}"\nRxGPT reply:`,
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama error: ${response.status}`);
    }

    const data = await response.json();

    return NextResponse.json({ reply: data.response.trim() });
  } catch (err: any) {
    console.error("LLM call failed:", err);
    return NextResponse.json(
      { error: "Local LLM not reachable. Is Ollama running?" },
      { status: 500 }
    );
  }
}