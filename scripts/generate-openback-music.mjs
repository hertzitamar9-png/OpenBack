import { spawnSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";

const sampleRate = 44_100;
const durationSeconds = 48;
const frames = sampleRate * durationSeconds;
const channels = 2;
const beatSeconds = 0.75;
const output = resolve("resources/sounds/music/openback-command.ogg");
const wav = resolve(tmpdir(), "openback-command-source.wav");

const midi = (note) => 440 * 2 ** ((note - 69) / 12);
const aligned = (frequency) =>
  Math.round(frequency * durationSeconds) / durationSeconds;
const wave = (frequency, time, phase = 0) =>
  Math.sin(Math.PI * 2 * aligned(frequency) * time + phase);
const triangle = (frequency, time) =>
  (2 / Math.PI) * Math.asin(wave(frequency, time));
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const smoothstep = (value) => {
  const x = clamp(value, 0, 1);
  return x * x * (3 - 2 * x);
};

const chords = [
  [50, 53, 57],
  [46, 50, 53],
  [43, 46, 50],
  [48, 52, 55],
  [50, 53, 57],
  [53, 57, 60],
  [46, 50, 53],
  [48, 52, 55],
];
const bass = [38, 34, 31, 36, 38, 41, 34, 36];
const arpOrder = [0, 1, 2, 1, 2, 1, 0, 1];

let noiseState = 0x4f50454e;
const noise = () => {
  noiseState ^= noiseState << 13;
  noiseState ^= noiseState >>> 17;
  noiseState ^= noiseState << 5;
  return ((noiseState >>> 0) / 0xffffffff) * 2 - 1;
};

const left = new Float32Array(frames);
const right = new Float32Array(frames);
let peak = 0;

for (let i = 0; i < frames; i++) {
  const time = i / sampleRate;
  const beat = Math.floor(time / beatSeconds);
  const beatPhase = (time % beatSeconds) / beatSeconds;
  const chordIndex = Math.floor(beat / 8) % chords.length;
  const chord = chords[chordIndex];
  const chordPhase = (time % (beatSeconds * 8)) / (beatSeconds * 8);
  const chordEnvelope =
    smoothstep(chordPhase / 0.06) * smoothstep((1 - chordPhase) / 0.08);

  let padLeft = 0;
  let padRight = 0;
  for (let n = 0; n < chord.length; n++) {
    const frequency = midi(chord[n]);
    padLeft += wave(frequency, time, n * 0.7) * (0.72 - n * 0.1);
    padRight +=
      wave(frequency * 1.0015, time, 1.1 + n * 0.5) * (0.72 - n * 0.1);
  }
  padLeft *= 0.105 * chordEnvelope;
  padRight *= 0.105 * chordEnvelope;

  const bassEnvelope = Math.exp(-beatPhase * 5.2);
  const bassFrequency = midi(bass[chordIndex]);
  const bassVoice =
    (triangle(bassFrequency, time) * 0.8 +
      wave(bassFrequency * 2, time, 0.2) * 0.2) *
    bassEnvelope *
    0.19;

  const halfBeat = beatSeconds / 2;
  const arpStep = Math.floor(time / halfBeat);
  const arpPhase = (time % halfBeat) / halfBeat;
  const arpChord = chords[Math.floor(arpStep / 16) % chords.length];
  const arpNote = arpChord[arpOrder[arpStep % arpOrder.length]] + 12;
  const arpEnvelope = Math.exp(-arpPhase * 7.5);
  const arpVoice =
    (wave(midi(arpNote), time) * 0.75 +
      triangle(midi(arpNote) * 2, time) * 0.25) *
    arpEnvelope *
    0.095;

  const kickEnvelope = Math.exp(-beatPhase * 18);
  const kickFrequency = 48 + 72 * Math.exp(-beatPhase * 14);
  const kick =
    Math.sin(Math.PI * 2 * kickFrequency * time) * kickEnvelope * 0.2;
  const hatGate = beat % 2 === 1 ? 1 : 0.45;
  const hat = noise() * Math.exp(-arpPhase * 30) * 0.035 * hatGate;

  const masterFade =
    smoothstep(time / 0.8) * smoothstep((durationSeconds - time) / 0.8);
  const stereoArp = arpStep % 2 === 0 ? 0.65 : 1;
  const l =
    (padLeft + bassVoice + arpVoice * stereoArp + kick + hat) * masterFade;
  const r =
    (padRight + bassVoice + arpVoice * (1.65 - stereoArp) + kick + hat * 0.8) *
    masterFade;
  left[i] = l;
  right[i] = r;
  peak = Math.max(peak, Math.abs(l), Math.abs(r));
}

const gain = peak > 0 ? 0.86 / peak : 1;
const dataBytes = frames * channels * 2;
const buffer = Buffer.alloc(44 + dataBytes);
buffer.write("RIFF", 0);
buffer.writeUInt32LE(36 + dataBytes, 4);
buffer.write("WAVE", 8);
buffer.write("fmt ", 12);
buffer.writeUInt32LE(16, 16);
buffer.writeUInt16LE(1, 20);
buffer.writeUInt16LE(channels, 22);
buffer.writeUInt32LE(sampleRate, 24);
buffer.writeUInt32LE(sampleRate * channels * 2, 28);
buffer.writeUInt16LE(channels * 2, 32);
buffer.writeUInt16LE(16, 34);
buffer.write("data", 36);
buffer.writeUInt32LE(dataBytes, 40);

let offset = 44;
for (let i = 0; i < frames; i++) {
  buffer.writeInt16LE(Math.round(clamp(left[i] * gain, -1, 1) * 32767), offset);
  buffer.writeInt16LE(
    Math.round(clamp(right[i] * gain, -1, 1) * 32767),
    offset + 2,
  );
  offset += 4;
}

mkdirSync(dirname(output), { recursive: true });
writeFileSync(wav, buffer);
const result = spawnSync(
  "ffmpeg",
  [
    "-y",
    "-i",
    wav,
    "-c:a",
    "libvorbis",
    "-b:a",
    "96k",
    "-metadata",
    "title=OpenBack Command",
    "-metadata",
    "artist=frootz jhklphy",
    output,
  ],
  { encoding: "utf8" },
);
rmSync(wav, { force: true });
if (result.status !== 0) {
  throw new Error(result.stderr ?? "ffmpeg failed to encode OpenBack music");
}
console.log(`Created ${output}`);
