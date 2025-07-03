import { WebSocketServer } from "ws";
import { PrismaClient } from "@prisma/client";
import http from "http";
import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
const server = http.createServer(app); // 👈 usa Express per creare un server HTTP

// esempio API
app.get("/api/messages", async (req, res) => {
  const messages = await prisma.message.findMany({
    orderBy: { createdAt: "asc" },
  });
  res.json(messages);
});

const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;
const wss = new WebSocketServer({ server });
const clients = new Set();

function stringToColor(str) {
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

wss.on("connection", (ws) => {
  clients.add(ws);

  ws.on("message", async (data) => {
    let saved; // 👈 definito qui, visibile ovunque
    const raw = typeof data === "string" ? data : data.toString();
    const msg = JSON.parse(raw);

    console.log("📦 Messaggio ricevuto:", msg);

    try {
      const username = msg.username || "Anonimo";
      const text = msg.text || "Nessun testo";

      const lastMessage = await prisma.message.findFirst({
        where: { username },
        orderBy: { createdAt: "desc" },
      });
      const color = lastMessage?.color || stringToColor(username);

      // 💾 Salva il messaggio con colore
      saved = await prisma.message.create({
        data: { username, text, color },
      });

      console.log("✅ Messaggio salvato nel DB:", saved);
    } catch (err) {
      console.error("❌ Errore salvataggio DB:", err);
    }

    // ✅ Invia il messaggio salvato ai client (se esiste)
    if (saved) {
      for (const client of clients) {
        if (client.readyState === ws.OPEN) {
          client.send(JSON.stringify(saved));
        }
      }
    }
  });

  ws.on("close", () => {
    clients.delete(ws);
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Server HTTP in ascolto su http://localhost:${PORT}`);
});
