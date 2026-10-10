"""Original 'shakiin' special SE: blade swish, bright steel ring, spacious shimmer.
Deterministic stereo synthesis with no external samples or dependencies.
"""
from pathlib import Path
import math, random, struct, wave
RATE = 44100
DURATION = 2.60
rng = random.Random(20261012)
frames = int(RATE * DURATION)
left, right = [0.0] * frames, [0.0] * frames
noise_low = 0.0
sweep_phase = 0.0
# Inharmonic steel modes, with the strong upper mids that give a blade its ring.
MODES = [(826, .21, 1.05), (1717, .25, 1.10), (2783, .19, 1.45),
         (3989, .12, 1.95), (5471, .07, 3.7), (7069, .035, 5.2)]
for i in range(frames):
    t = i / RATE
    noise = rng.uniform(-1, 1)
    noise_low = .82 * noise_low + .18 * noise
    bright_noise = noise - noise_low
    # A swift upward slash, rather than a bass-heavy charge or explosion.
    if t < .145:
        p = t / .145
        envelope = math.sin(math.pi * p) ** 1.15
        sweep_phase += 2 * math.pi * (1100 + 4200 * p ** 1.35) / RATE
        swish = (.24 * bright_noise + .055 * math.sin(sweep_phase)) * envelope
        pan = .18 + .64 * p
        left[i] += swish * (1 - pan)
        right[i] += swish * pan
    u = t - .083
    if u >= 0:
        attack = min(1, u / .0015)
        # Crisp contact at the start, followed by a clean sustained "kiiin".
        contact = .19 * bright_noise * math.exp(-u * 62) * attack
        left[i] += contact
        right[i] += contact
        for k, (freq, level, decay) in enumerate(MODES):
            envelope = attack * math.exp(-u * decay)
            # Brief pitch settling and very small detuning produce living metal.
            settling = -1.8 * math.exp(-u * 34)
            phase = 2 * math.pi * freq * u + settling
            l = level * math.sin(phase + .10 * math.sin(2 * math.pi * 5.1 * u)) * envelope
            r = level * math.sin(phase + 2 * math.pi * (1.7 + k * .23) * u) * envelope
            pan = .35 if k % 2 == 0 else .65
            left[i] += l * (1 - pan)
            right[i] += r * pan
        # A bright octave shimmer blooms behind the initial steel strike.
        bloom = (1 - math.exp(-u * 15)) * math.exp(-u * 1.55)
        left[i] += .042 * math.sin(2 * math.pi * 3434 * u) * bloom
        right[i] += .042 * math.sin(2 * math.pi * 3436.4 * u) * bloom
# Cross-channel reflections keep the metallic tail wide and continuous.
dry_left, dry_right = left[:], right[:]
for k, (delay, level) in enumerate([(.027, .24), (.049, .20), (.083, .16),
                                   (.131, .13), (.193, .10), (.277, .075),
                                   (.389, .055), (.521, .038), (.683, .024)]):
    offset = int(delay * RATE)
    sign = -1 if k % 3 == 1 else 1
    for i in range(offset, frames):
        left[i] += dry_right[i - offset] * level * sign
        right[i] += dry_left[i - offset] * level * (.92 if k % 2 else 1.07) * sign
for i in range(frames):
    t = i / RATE
    fade = min(1, (DURATION - t) / .23)
    left[i] = math.tanh(left[i] * 1.05) * fade
    right[i] = math.tanh(right[i] * 1.05) * fade
peak = max(max(map(abs, left)), max(map(abs, right)))
gain = .88 / peak
output = Path(__file__).resolve().parent.parent / 'sound' / 'special.wav'
with wave.open(str(output), 'wb') as wav:
    wav.setnchannels(2)
    wav.setsampwidth(2)
    wav.setframerate(RATE)
    wav.writeframes(b''.join(struct.pack('<hh', int(l * gain * 32767), int(r * gain * 32767)) for l, r in zip(left, right)))
print(f'{output.name}: {DURATION:.2f}s, stereo PCM, peak {20 * math.log10(.88):.1f} dBFS')
