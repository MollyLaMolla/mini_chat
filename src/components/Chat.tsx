"use client";

import { useEffect, useState, useRef } from "react";

type Message = {
  id?: number; // se vuoi anche un ID (facoltativo)
  username: string;
  text: string;
  createdAt?: string; // se vuoi anche la data (facoltativo)
};

function stringToColor(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const color =
    "#" +
    ((hash >> 24) & 0xff).toString(16).padStart(2, "0") +
    ((hash >> 16) & 0xff).toString(16).padStart(2, "0") +
    ((hash >> 8) & 0xff).toString(16).padStart(2, "0");
  return color.slice(0, 7);
}

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [username, setUsername] = useState("");
  const [usernameLoaded, setUsernameLoaded] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setUsername(value);
    localStorage.setItem("chat-username", value);
  };

  const autoResize = () => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.overflowY = "hidden"; // nasconde la scrollbar inizialmente
      el.style.height = el.scrollHeight + "px";

      const maxHeight = 128; // corrisponde a max-h-32 (128px)
      if (el.scrollHeight > maxHeight) {
        el.style.overflowY = "auto"; // mostra lo scroll solo se necessario
        el.style.height = maxHeight + "px"; // blocca la crescita
      }
    }
  };

  useEffect(() => {
    const timeout = setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 10);
    return () => clearTimeout(timeout);
  }, [messages]);

  useEffect(() => {
    const socket = new WebSocket("wss://https://mini-chat-my86.onrender.com");
    socketRef.current = socket;

    const saved = localStorage.getItem("chat-username");
    if (saved) {
      setUsername(saved);
      setUsernameLoaded(true);
    }

    socket.addEventListener("message", async (event) => {
      const raw = event.data;
      const text = raw instanceof Blob ? await raw.text() : raw;
      const parsed = JSON.parse(text);
      setMessages((prev) => [...prev, parsed]);
    });

    // 👇 Carica i messaggi dal DB
    fetch("/api/messages")
      .then((res) => res.json())
      .then((data) => {
        setMessages(data);
      });

    return () => {
      socket.close();
    };
  }, []);

  const sendMessage = () => {
    if (
      !input.trim() ||
      !username.trim() ||
      socketRef.current?.readyState !== WebSocket.OPEN
    )
      return;

    const message = {
      username,
      text: input,
      createdAt: new Date().toISOString(),
    };

    socketRef.current.send(JSON.stringify(message));
    setInput("");
    setTimeout(() => {
      autoResize();
    }, 0);
  };

  return (
    <div className="max-w-sm mt-10 p-4 border bg-white shadow rounded-xl">
      <div className="mb-4">
        <label className="text-sm">👤 Nome utente:</label>
        <input
          type="text"
          className="border px-3 py-1 rounded w-full"
          value={username}
          onChange={handleUsernameChange}
          placeholder="Inserisci il tuo nome"
        />
      </div>
      {!username && usernameLoaded && (
        <p className="text-sm text-red-500 mb-2">
          ⚠️ Inserisci un nome per partecipare alla chat
        </p>
      )}
      <div className="h-96 overflow-y-auto mb-4 border p-2 bg-gray-50 rounded text-sm max-w-full">
        {messages.map((msg, i) => {
          const isMine = msg.username === username;
          const isNew = i === messages.length - 1;

          const time =
            msg.createdAt &&
            new Date(msg.createdAt).toLocaleTimeString("it-IT", {
              hour: "2-digit",
              minute: "2-digit",
            });

          return (
            <div
              key={i}
              className={`mb-2 p-2 rounded transition-transform duration-300 ease-out ${
                isNew ? "animate-fade-in" : ""
              } ${
                isMine
                  ? "bg-indigo-100 text-right ml-auto"
                  : "bg-gray-100 text-left mr-auto"
              } max-w-[80%]`}
              style={{ borderLeft: `4px solid ${stringToColor(msg.username)}` }}
            >
              {!isMine && (
                <div className="flex items-center gap-2 mb-1">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
                    style={{ backgroundColor: stringToColor(msg.username) }}
                  >
                    {msg.username.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-xs font-semibold text-gray-600">
                    {msg.username}
                  </span>
                </div>
              )}
              {isMine && <div className="mb-1 text-xs text-gray-500">Tu</div>}
              <div className="text-sm break-words whitespace-pre-wrap">
                {msg.text}
              </div>
              {time && (
                <div className="text-xs text-gray-500 mt-1">🕒 {time}</div>
              )}
            </div>
          );
        })}
        <div ref={bottomRef} /> {/* 👈 Questo è il target reale dello scroll */}
      </div>
      <div className="flex gap-2">
        <textarea
          ref={textareaRef}
          className="border rounded px-3 py-1 flex-1 resize-none overflow-y-auto max-h-32 min-h-[2.5rem]"
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            autoResize();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              sendMessage();
            }
          }}
          placeholder="Scrivi un messaggio..."
        />
        <button
          className="bg-indigo-600 text-white px-4 py-1 rounded hover:bg-indigo-700 disabled:opacity-50"
          onClick={sendMessage}
          disabled={!username.trim()}
        >
          Invia
        </button>
      </div>
    </div>
  );
}
