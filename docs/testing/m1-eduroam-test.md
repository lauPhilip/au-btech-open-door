# M1 · Classroom test on eduroam

This test answers one question before any real game is built: can thirty or more devices share one live room over eduroam in a Herning classroom, quickly and without dropping out? It uses the hello room — a page where everyone who joins sees everyone else connected, and each device measures its round-trip time to the room. It belongs to issue #4 and milestone *M1 - Works on eduroam*.

## What counts as a pass

| Measure | Target | Why |
|---|---|---|
| Devices connected at the same time | 30 or more | A full class |
| Time from scanning the QR code to being in the room | Under 30 seconds | The join rule from the concept book |
| Median round-trip time | Under 150 ms | Moves and notes feel instant |
| Devices under 400 ms | All, or all but one | The Doherty rule from the concept book |
| Reconnects during five minutes | Fewer than one per device | Wi-Fi hiccups are survived without anyone noticing |

## How to run it

The test takes about fifteen minutes of class time. Before class, deploy the latest version (see the README) and open the projector view on the classroom computer: `https://<your-worker-address>/?view=projector&room=herning-test`. Use a fresh room name for each test so earlier results do not mix in.

In class, ask everyone to connect to **eduroam**, not a phone hotspot, and to scan the QR code on the screen. Each student types a first name and presses Join. Note how long it takes until the count on the projector stops growing. Then ask everyone to keep the page open for five minutes — they can talk or work as normal. Halfway through, ask three volunteers to switch their Wi-Fi off for ten seconds and on again, to check that reconnecting works.

At the end, press **Copy results** on the projector and paste the text into the record below. Take a photo of the projector screen as well.

## Results

Fill in one table per test. Copy the block for each new test.

| | Test 1 |
|---|---|
| Date and time | |
| Room and building | |
| Network | eduroam |
| Devices (peak) | |
| Phones / laptops / tablets | |
| Time until everyone was in | |
| Median round trip | |
| Slowest 5% | |
| Devices under 400 ms | |
| Reconnects in total | |
| Problems seen | |
| Pass or fail | |

## After the test

If the test passes, record the result in a short decision note (`docs/decisions/0003-eduroam-test.md`), close issue #4, and continue with milestone *M2 - Playable*. If it fails, write down what went wrong — devices that could not join, high latency, or frequent reconnects — and discuss it before building further, because it may change the architecture in [decision 0001](../decisions/0001-tech-stack.md).

## Testing without a class

`scripts/simulate-class.mjs` simulates a class of players joining the room. It does not test eduroam, but it checks that the room itself handles a full class.

```
node scripts/simulate-class.mjs --url https://<your-worker-address> --players 40 --seconds 60
```
