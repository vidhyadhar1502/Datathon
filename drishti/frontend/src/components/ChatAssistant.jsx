import React, { useState, useRef } from 'react';
import { askAssistant } from '../api/assistantService';

/**
 * ChatAssistant
 * Simple chat UI for the conversational crime assistant. Voice input uses
 * the browser's native Web Speech API (SpeechRecognition) to convert
 * speech to text client-side — Zia's NLP (NER, intent) then runs
 * server-side on that transcript in assistant-service. This keeps voice
 * capture free and avoids needing an audio-upload pipeline for the demo.
 */
export default function ChatAssistant() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [listening, setListening] = useState(false);
  const [loading, setLoading] = useState(false);
  const recognitionRef = useRef(null);

  async function sendText(text) {
    if (!text.trim()) return;
    setMessages(prev => [...prev, { from: 'user', text }]);
    setInput('');
    setLoading(true);
    try {
      const result = await askAssistant(text);
      setMessages(prev => [...prev, { from: 'assistant', text: result.reply }]);
    } catch (err) {
      setMessages(prev => [...prev, { from: 'assistant', text: `Error: ${err.message}` }]);
    } finally {
      setLoading(false);
    }
  }

  function startVoiceInput() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Voice input is not supported in this browser.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-IN';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setListening(true);
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      sendText(transcript);
    };

    recognitionRef.current = recognition;
    recognition.start();
  }

  return (
    <div style={{ maxWidth: 480, border: '1px solid #e5e7eb', borderRadius: 8, padding: 12 }}>
      <div style={{ minHeight: 240, maxHeight: 360, overflowY: 'auto', marginBottom: 8 }}>
        {messages.map((m, i) => (
          <div
            key={i}
            style={{
              textAlign: m.from === 'user' ? 'right' : 'left',
              margin: '6px 0'
            }}
          >
            <span
              style={{
                display: 'inline-block',
                padding: '6px 10px',
                borderRadius: 12,
                background: m.from === 'user' ? '#1d4ed8' : '#f3f4f6',
                color: m.from === 'user' ? '#fff' : '#111827',
                fontSize: 14
              }}
            >
              {m.text}
            </span>
          </div>
        ))}
        {loading && <p style={{ fontSize: 12, color: '#6b7280' }}>Thinking…</p>}
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendText(input)}
          placeholder="Ask about a case, hotspot, trend, or network…"
          style={{ flex: 1, padding: 8, borderRadius: 6, border: '1px solid #d1d5db' }}
        />
        <button onClick={() => sendText(input)} disabled={loading}>Send</button>
        <button onClick={startVoiceInput} disabled={listening} title="Voice input">
          {listening ? '🎙️…' : '🎙️'}
        </button>
      </div>
    </div>
  );
}
