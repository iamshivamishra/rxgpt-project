"use client";

import { useRef, useState } from "react";

export default function Home() {
  const [listening, setListening] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [reply, setReply] = useState("");
  const [confidence, setConfidence] = useState<number | null>(null);
  const recognitionRef = useRef<any>(null);

  function startListening() {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser. Please use Chrome.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-IN"; // change to "hi-IN" for Hindi testing
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setListening(true);

    recognition.onresult = async (event: any) => {
      const result = event.results[0][0];
      const text = result.transcript;
      const conf = result.confidence;

      setTranscript(text);
      setConfidence(conf);

      if (conf > 0 && conf < 0.6) {
        // Low confidence -> ask the user to repeat (Step 3 of the workflow)
        speak("Sorry, I didn't catch that clearly. Could you please repeat?");
        setReply("");
        return;
      }

      // Call the real local LLM (Ollama) instead of a dummy reply
      setThinking(true);
      setReply("");
      try {
        const res = await fetch("/api/brain", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
        });
        const data = await res.json();

        if (data.reply) {
          setReply(data.reply);
          speak(data.reply);
        } else {
          setReply("Error: " + (data.error || "Unknown error"));
        }
      } catch (err) {
        setReply("Could not reach the local LLM. Is Ollama running?");
      } finally {
        setThinking(false);
      }
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      setListening(false);
    };

    recognition.onend = () => setListening(false);

    recognitionRef.current = recognition;
    recognition.start();
  }

  function speak(text: string) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-IN";
    window.speechSynthesis.speak(utterance);
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 p-8 bg-slate-950 text-slate-100">
      <h1 className="text-2xl font-semibold">RxGPT Voice — Prototype</h1>
      <p className="text-slate-400 text-sm">Mic → Text → Local LLM (Ollama) → Voice</p>

      <button
        onClick={startListening}
        disabled={listening || thinking}
        className={`w-24 h-24 rounded-full flex items-center justify-center text-3xl border-2 transition
          ${listening ? "bg-emerald-900 border-emerald-500 animate-pulse" : "bg-slate-900 border-emerald-600"}`}
      >
        🎙
      </button>

      <p className="text-slate-400 text-sm">
        {listening ? "Listening..." : thinking ? "Thinking..." : "Tap the mic and speak"}
      </p>

      {transcript && (
        <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-lg p-4 text-sm">
          <p className="text-emerald-400 mb-1">You said:</p>
          <p className="mb-3">{transcript}</p>
          {confidence !== null && (
            <p className="text-xs text-slate-500">
              Confidence: {(confidence * 100).toFixed(0)}%
            </p>
          )}
        </div>
      )}

      {reply && (
        <div className="w-full max-w-md bg-slate-900 border border-emerald-700 rounded-lg p-4 text-sm">
          <p className="text-emerald-400 mb-1">RxGPT reply (local LLM):</p>
          <p>{reply}</p>
        </div>
      )}
    </main>
  );
}