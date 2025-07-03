"use client";

import { useEffect, useState } from "react";
import Chat from "../components/Chat";

type Utente = {
  id: number;
  nome: string;
  email: string;
};

export default function Home() {
  const [utenti, setUtenti] = useState<Utente[]>([]);

  useEffect(() => {
    fetch("/api/utenti")
      .then((res) => res.json())
      .then((data) => setUtenti(data));
  }, []);

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <h1 className="text-2xl font-bold text-center mt-8">💬 Mini Chat</h1>
      <Chat />
    </main>
  );
}
