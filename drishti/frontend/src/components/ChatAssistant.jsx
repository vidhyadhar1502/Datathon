import React, { useState, useRef } from 'react';
import { askAssistant } from '../api/assistantService';
import styles from './ChatAssistant.module.css';

/**
 * ChatAssistant
 * Simple chat UI for the conversational crime assistant. Voice input uses
 * the browser's native Web Speech API (SpeechRecognition) to convert
 * speech to text client-side — Zia's NLP (NER, intent) then runs
 * server-side on that transcript in assistant-service.
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
    <div>
      <p className={styles.sectionLabel}>Assistant</p>
      <div className={styles.chatBox}>
        <div className={styles.messages}>
          {messages.map((m, i) => (
            <div key={i} className={m.from === 'user' ? styles.messageRowUser : styles.messageRowAssistant}>
              <span className={m.from === 'user' ? styles.bubbleUser : styles.bubbleAssistant}>
                {m.text}
              </span>
            </div>
          ))}
          {loading && <p className={styles.thinking}>processing…</p>}
        </div>

        <div className={styles.inputRow}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendText(input)}
            placeholder="Ask about a case, hotspot, trend, or network…"
            className={styles.textInput}
          />
          <button onClick={() => sendText(input)} disabled={loading} className={styles.sendButton}>Send</button>
          <button onClick={startVoiceInput} disabled={listening} title="Voice input" className={styles.micButton}>
            {listening ? '🎙️…' : '🎙️'}
          </button>
        </div>
      </div>
    </div>
  );
}
