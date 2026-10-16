// Simulates a whole class playing a game session: the teacher creates it, a projector watches,
// students join, pick teams and walk around at the same time. Used by simulate-class.mjs --mode game.
//
//   node scripts/simulate-class.mjs --mode game                    # 25 players, 30 s, localhost:8787
//   node scripts/simulate-class.mjs --mode game --players 30 --seconds 60 --url https://…

export async function simulateGame({ base, players, seconds }) {
  const http = `${base.protocol}//${base.host}`;
  const ws = `${base.protocol === "https:" ? "wss" : "ws"}://${base.host}`;
  const TEAMS = ["blue", "green", "yellow", "lilac", "red"];
  const names = ["Laura", "Wei", "Kasper", "Sofie", "Linh", "Marco", "Priya", "Jonas", "Ida", "Ola", "Mei", "Ahmed", "Rasa", "Tomas", "Elena"];
  const MAP = { w: 1206, h: 770 }; // Nordknit
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  const res = await fetch(`${http}/api/sessions`, { method: "POST", body: JSON.stringify({ minutes: 45 }) });
  if (res.status !== 201) throw new Error(`Could not create a session: ${res.status}`);
  const { code, teacherKey } = await res.json();
  console.log(`Session ${code} created`);

  const errors = [];
  function open(query, id, onMessage) {
    return new Promise((resolve, reject) => {
      const s = new WebSocket(`${ws}/parties/game-room/${code}?${query}${id ? `&_pk=${id}` : ""}`);
      s.bytes = 0;
      s.messages = 0;
      s.addEventListener("message", (e) => {
        s.bytes += String(e.data).length;
        s.messages++;
        const m = JSON.parse(e.data);
        if (m.t === "error") errors.push(`${id ?? query}: ${m.code}`);
        onMessage?.(m);
      });
      s.addEventListener("open", () => resolve(s));
      s.addEventListener("error", () => reject(new Error(`socket error (${id ?? query})`)));
    });
  }

  let screenState = null;
  const screen = await open("role=screen", null, (m) => {
    if (m.t === "state") screenState = m.game;
  });
  const teacher = await open(`key=${encodeURIComponent(teacherKey)}`);

  // Students arrive one by one, join and sit down. Five per table; anyone beyond 25 stays standing.
  const students = [];
  const echo = []; // ms from sending a move until it comes back in a batch
  const started = performance.now();
  for (let i = 0; i < players; i++) {
    const id = `sim-${code}-${String(i).padStart(3, "0")}`;
    const me = { id, x: 0, y: 0, target: null, sentAt: new Map() };
    me.socket = await open("", id, (m) => {
      if (m.t !== "moves") return;
      for (const [pid, x, y] of m.m) {
        if (pid !== id) continue;
        const t = me.sentAt.get(`${x},${y}`);
        if (t !== undefined) echo.push(performance.now() - t);
      }
    });
    me.socket.send(JSON.stringify({ t: "join", name: `${names[i % names.length]} ${i + 1}`, face: i % 15 }));
    if (i < TEAMS.length * 5) me.socket.send(JSON.stringify({ t: "team", team: TEAMS[i % TEAMS.length] }));
    students.push(me);
    await wait(40);
  }
  await wait(500);
  const seated = screenState?.players.filter((p) => p.team).length ?? 0;
  console.log(`${players} students joined in ${((performance.now() - started) / 1000).toFixed(1)} s · ${seated} at a table`);

  teacher.send(JSON.stringify({ t: "phase", phase: "story" }));
  await wait(300);
  teacher.send(JSON.stringify({ t: "phase", phase: "walk" }));
  await wait(500);
  console.log(`Phase on the projector: ${screenState?.phase}`);

  for (const s of students) {
    const p = screenState.players.find((q) => q.id === s.id);
    s.x = p.x;
    s.y = p.y;
  }

  // Everyone walks towards random points, sending ten updates a second like the app does.
  const walkers = students.filter((_, i) => i < TEAMS.length * 5);
  const before = { bytes: screen.bytes, messages: screen.messages };
  const walkStart = performance.now();
  const timer = setInterval(() => {
    for (const s of walkers) {
      if (!s.target || Math.hypot(s.target.x - s.x, s.target.y - s.y) < 30) {
        s.target = { x: 20 + Math.random() * (MAP.w - 40), y: 20 + Math.random() * (MAP.h - 40) };
      }
      const d = Math.hypot(s.target.x - s.x, s.target.y - s.y);
      s.x = Math.round(s.x + ((s.target.x - s.x) / d) * 26);
      s.y = Math.round(s.y + ((s.target.y - s.y) / d) * 26);
      s.sentAt.set(`${s.x},${s.y}`, performance.now());
      s.socket.send(JSON.stringify({ t: "move", x: s.x, y: s.y }));
    }
  }, 100);
  for (let t = 0; t < seconds; t += 10) {
    await wait(Math.min(10, seconds - t) * 1000);
    console.log(`  after ${Math.min(t + 10, seconds)} s of walking: ${echo.length} moves came back`);
  }
  clearInterval(timer);
  await wait(500);
  const walkSeconds = (performance.now() - walkStart) / 1000;

  const sorted = [...echo].sort((a, b) => a - b);
  const pct = (p) => Math.round(sorted[Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)] ?? NaN);
  const kbPerSecond = (screen.bytes - before.bytes) / 1024 / walkSeconds;
  const perSecond = (screen.messages - before.messages) / walkSeconds;
  const visited = new Set(screenState.players.flatMap((p) => p.visited));

  console.log(`Move echo: median ${pct(50)} ms, 95th percentile ${pct(95)} ms, max ${pct(100)} ms (${sorted.length} samples)`);
  console.log(`Projector traffic while walking: ${perSecond.toFixed(1)} messages/s, ${kbPerSecond.toFixed(1)} KB/s`);
  console.log(`Rooms visited by the class: ${visited.size} · errors: ${errors.length}${errors.length ? ` (${[...new Set(errors)].join(", ")})` : ""}`);

  for (const s of students) s.socket.close();
  await wait(1500);
  const stillOnline = screenState.players.filter((p) => p.online).length;
  console.log(`After everyone left: ${stillOnline} online on the projector`);
  screen.close();
  teacher.close();
  // Players beyond 25 have no table, so their moves are refused silently; any error message is a failure.
  return stillOnline === 0 && errors.length === 0 && screenState.phase === "walk" && seated === Math.min(players, 25);
}
