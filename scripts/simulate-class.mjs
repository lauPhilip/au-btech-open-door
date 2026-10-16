#!/usr/bin/env node
// Simulates a class of students joining the hello room, to test the room before
// a real classroom test. Uses the WebSocket built into Node 22.
//
//   node scripts/simulate-class.mjs                         # 40 players on localhost:8787
//   node scripts/simulate-class.mjs --url https://open-door.example.workers.dev --players 30 --seconds 60
//
// Prints what a projector would see, then a short summary.

const args = new Map();
for (let i = 2; i < process.argv.length; i += 2) args.set(process.argv[i].replace(/^--/, ""), process.argv[i + 1]);

const base = new URL(args.get("url") ?? "http://localhost:8787");
const players = Number(args.get("players") ?? 40);
const seconds = Number(args.get("seconds") ?? 20);
const room = args.get("room") ?? "load-test";
const wsUrl = `${base.protocol === "https:" ? "wss" : "ws"}://${base.host}/parties/hello-room/${room}`;

const names = ["Laura", "Wei", "Kasper", "Sofie", "Linh", "Marco", "Priya", "Jonas", "Ida", "Ola", "Mei", "Ahmed", "Rasa", "Tomas", "Elena"];
const devices = ["phone", "phone", "laptop", "laptop", "tablet"];

let watcherCount = 0;
const errors = [];
const sockets = [];
const rtts = new Map();

function connect(i) {
  return new Promise((resolve) => {
    const ws = new WebSocket(wsUrl);
    let n = 0;
    let timer;
    ws.addEventListener("open", () => {
      ws.send(JSON.stringify({ t: "hello", name: `${names[i % names.length]} ${i + 1}`, device: devices[i % devices.length], reconnects: 0 }));
      timer = setInterval(() => ws.send(JSON.stringify({ t: "ping", n: ++n, sent: performance.now() })), 2000);
      resolve(ws);
    });
    ws.addEventListener("message", (e) => {
      const m = JSON.parse(e.data);
      if (m.t === "pong") {
        const rtt = Math.round(performance.now() - m.sent);
        rtts.set(i, rtt);
        if (m.n % 3 === 0) ws.send(JSON.stringify({ t: "report", rtt }));
      }
    });
    ws.addEventListener("error", () => errors.push(`player ${i + 1}: socket error`));
    ws.addEventListener("close", () => clearInterval(timer));
    sockets.push(ws);
  });
}

const watcher = new WebSocket(wsUrl);
watcher.addEventListener("message", (e) => {
  const m = JSON.parse(e.data);
  if (m.t === "presence") watcherCount = m.people.length;
});
await new Promise((r) => watcher.addEventListener("open", r));

const started = performance.now();
for (let i = 0; i < players; i++) {
  await connect(i);
  await new Promise((r) => setTimeout(r, 50)); // students arrive one by one
}
const joinSeconds = ((performance.now() - started) / 1000).toFixed(1);
console.log(`${players} players connected in ${joinSeconds} s to ${wsUrl}`);

for (let s = 0; s < seconds; s += 5) {
  await new Promise((r) => setTimeout(r, 5000));
  console.log(`  after ${s + 5} s: projector sees ${watcherCount} people`);
}

const values = [...rtts.values()].sort((a, b) => a - b);
const pct = (p) => values[Math.min(values.length - 1, Math.ceil((p / 100) * values.length) - 1)];
console.log(`Round trip: median ${pct(50)} ms, 95th percentile ${pct(95)} ms, max ${values.at(-1)} ms`);
console.log(`Projector count: ${watcherCount} of ${players} · errors: ${errors.length}`);

for (const ws of sockets) ws.close();
await new Promise((r) => setTimeout(r, 1500));
console.log(`After everyone left, projector sees ${watcherCount} people`);
watcher.close();
process.exit(watcherCount === 0 && errors.length === 0 ? 0 : 1);
