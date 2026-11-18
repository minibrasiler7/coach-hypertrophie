#!/usr/bin/env python3
"""Enregistre les phrases du coach avec une voix neurale et les range par paquets MP3.

Usage :
  node tools/voice-texts.js > textes.json
  python3 tools/make-voice.py textes.json f snd --models <dossier des modèles> [--only paquet,paquet]

Voix : f = féminine (Piper fr_FR-siwis-medium), m = masculine (Piper fr_FR-upmc-medium, locuteur « pierre »).
Chaque phrase est synthétisée jusqu'à 6 fois, mise au même volume, puis réécoutée par la reconnaissance vocale
(Whisper). On garde la version la mieux comprise. Un rapport liste les phrases mal comprises.

Dépendances : pip install piper-tts sherpa-onnx soundfile scipy numpy ; ffmpeg avec libmp3lame.
Modèles attendus dans --models :
  vits-piper-fr_FR-siwis-medium/fr_FR-siwis-medium.onnx(.json)   (huggingface.co/rhasspy/piper-voices)
  vits-piper-fr_FR-upmc-medium/fr_FR-upmc-medium.onnx(.json)
  sherpa-onnx-whisper-small/small-{encoder,decoder}.int8.onnx, small-tokens.txt   (github.com/k2-fsa/sherpa-onnx, asr-models)
"""
import argparse, json, os, re, subprocess, sys, tempfile, time
import numpy as np, soundfile as sf
from scipy import signal

VOICES = {
    'f': dict(model='vits-piper-fr_FR-siwis-medium/fr_FR-siwis-medium.onnx', sid=None, speed=1.05, noise=0.70, noise_w=0.85, label='Voix féminine'),
    'm': dict(model='vits-piper-fr_FR-upmc-medium/fr_FR-upmc-medium.onnx', sid=1, speed=1.03, noise=0.70, noise_w=0.85, label='Voix masculine'),
}
# Mots de salle d'origine anglaise : écrits comme on les prononce en français, sinon la voix les déforme.
RESPELL = [(r'\bhack squat\b', 'ak squatte'), (r'\bsquats?\b', 'squatte'), (r'\bcurls?\b', 'keurle'), (r'\bcrunch\b', 'creuntche'),
           (r'\bdips\b', 'dipse'), (r'\bpull-over\b', 'poulovère'), (r'\browing\b', 'roouigne'), (r'\bkickback\b', 'kikbak'),
           (r'\bface pull\b', 'fèce poule'), (r'\bdead bug\b', 'dèd beug'), (r'\bhip thrust\b', 'ip treust'),
           (r'\bchest press\b', 'tchest presse'), (r'\bT-bar\b', 'té-bar'), (r'\bEZ\b', 'E Z'),
           (r'°', ' degrés'), (r'–', ' à '), (r'[«»]', ''), (r'’', "'"), (r'\s+', ' ')]

def spoken(text):
    for pat, rep in RESPELL: text = re.sub(pat, rep, text, flags=re.I)
    return text.strip()

_ph = None
def phon(text):
    """Phonèmes d'un texte français (espeak-ng) : sert à comparer ce qui est dit et ce qui est compris."""
    global _ph
    if _ph is None:
        from piper.phonemize_espeak import EspeakPhonemizer
        _ph = EspeakPhonemizer()
    out = []
    for sent in _ph.phonemize('fr', spoken(text)): out += [c for c in sent if c.isalpha() or ord(c) > 0x24F]
    return [c for c in out if c not in 'ˈˌː ']

def per(ref, hyp):
    r, h = phon(ref), phon(hyp); d = list(range(len(h) + 1))
    for i in range(1, len(r) + 1):
        p, d[0] = d[0], i
        for j in range(1, len(h) + 1):
            p, d[j] = d[j], min(d[j] + 1, d[j - 1] + 1, p + (r[i - 1] != h[j - 1]))
    return d[len(h)] / max(1, len(r))

def master(x, sr):
    """Coupe les silences, filtre le grave, ajoute de la présence, amène au même volume, limite les crêtes."""
    x = x.astype(np.float64); peak = np.abs(x).max()
    if peak < 1e-4: return None
    idx = np.where(np.abs(x) > peak * 0.006)[0]
    a, b = max(0, idx[0] - int(0.05 * sr)), min(len(x), idx[-1] + int(0.12 * sr)); x = x[a:b]
    x = signal.sosfilt(signal.butter(2, 85, 'highpass', fs=sr, output='sos'), x)
    w0 = 2 * np.pi * 3000 / sr; A = 10 ** (3.0 / 40); alpha = np.sin(w0) / (2 * 1.0)          # +3 dB autour de 3 kHz
    bq = np.array([1 + alpha * A, -2 * np.cos(w0), 1 - alpha * A]); aq = np.array([1 + alpha / A, -2 * np.cos(w0), 1 - alpha / A])
    x = signal.lfilter(bq / aq[0], aq / aq[0], x)
    loud = x[np.abs(x) > np.abs(x).max() * 0.05]; x = x * (0.19 / (np.sqrt(np.mean(loud ** 2)) + 1e-9))   # environ -14,5 dB efficaces
    T, top = 0.5, 0.95; ax = np.abs(x); over = ax > T
    x[over] = np.sign(x[over]) * (T + (top - T) * np.tanh((ax[over] - T) / (top - T)))            # limiteur doux
    n1, n2 = int(0.005 * sr), int(0.04 * sr); x[:n1] *= np.linspace(0, 1, n1); x[-n2:] *= np.linspace(1, 0, n2)
    return x.astype(np.float32)

def main():
    ap = argparse.ArgumentParser(); ap.add_argument('texts'); ap.add_argument('voice', choices=VOICES); ap.add_argument('out')
    ap.add_argument('--models', required=True); ap.add_argument('--only', default=''); ap.add_argument('--report', default='')
    ap.add_argument('--tries', type=int, default=6)
    args = ap.parse_args(); cfg = VOICES[args.voice]; M = args.models
    packs = json.load(open(args.texts, encoding='utf-8'))
    if args.only: packs = {k: v for k, v in packs.items() if k in args.only.split(',')}
    from piper import PiperVoice, SynthesisConfig
    import sherpa_onnx
    voice = PiperVoice.load(os.path.join(M, cfg['model'])); sr = voice.config.sample_rate
    d = os.path.join(M, 'sherpa-onnx-whisper-small')
    asr = sherpa_onnx.OfflineRecognizer.from_whisper(encoder=f'{d}/small-encoder.int8.onnx', decoder=f'{d}/small-decoder.int8.onnx',
                                                     tokens=f'{d}/small-tokens.txt', language='fr', task='transcribe', num_threads=2)
    def synth(text):
        sc = SynthesisConfig(speaker_id=cfg['sid'], length_scale=1.0 / cfg['speed'], noise_scale=cfg['noise'], noise_w_scale=cfg['noise_w'], normalize_audio=True)
        gap = np.zeros(int(0.11 * sr), dtype=np.float32); parts = []
        for c in voice.synthesize(text, syn_config=sc): parts += [c.audio_float_array.astype(np.float32), gap]
        return np.concatenate(parts[:-1])
    def heard(x):
        pad = np.zeros(int(sr * 0.4), dtype=np.float32); s = asr.create_stream()
        s.accept_waveform(sr, np.concatenate([pad, x, pad])); asr.decode_stream(s); return s.result.text.strip()

    outdir = os.path.join(args.out, args.voice); os.makedirs(outdir, exist_ok=True)
    index_path = os.path.join(outdir, 'index.json')
    index = json.load(open(index_path)) if (args.only and os.path.exists(index_path)) else {}
    report, t0, tmp = [], time.time(), tempfile.mkdtemp()
    for pi, (pack, clips) in enumerate(packs.items()):
        blob, offs = b'', {}
        for cid, text in clips.items():
            say = spoken(text); best = None
            for attempt in range(args.tries):
                y = master(synth(say), sr)
                if y is None: continue
                hyp = heard(y); e = per(text, hyp)
                if best is None or e < best[0]: best = (e, y, hyp, attempt + 1)
                if e <= 0.05: break
            e, y, hyp, tries = best
            wav, mp3 = os.path.join(tmp, 'a.wav'), os.path.join(tmp, 'a.mp3'); sf.write(wav, y, sr)
            subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', wav, '-ac', '1', '-ar', str(sr), '-c:a', 'libmp3lame', '-b:a', '48k',
                            '-map_metadata', '-1', '-id3v2_version', '0', '-write_xing', '0', mp3], check=True)
            data = open(mp3, 'rb').read(); offs[cid] = [len(blob), len(blob) + len(data)]; blob += data
            report.append(dict(pack=pack, clip=cid, text=text, said=say, heard=hyp, per=round(e, 3), tries=tries, sec=round(len(y) / sr, 2)))
        open(os.path.join(outdir, pack + '.mp3'), 'wb').write(blob); index[pack] = offs
        if pi % 10 == 0: print(f'{args.voice} {pi + 1}/{len(packs)} paquets, {time.time() - t0:.0f} s', flush=True)
    json.dump(index, open(index_path, 'w'), separators=(',', ':'))
    if args.report: json.dump(report, open(args.report, 'w'), ensure_ascii=False, indent=1)
    bad = [r for r in report if r['per'] > 0.2]
    print(f"{args.voice} terminé : {len(report)} phrases, {sum(r['sec'] for r in report):.0f} s de voix, "
          f"erreur phonétique moyenne {100 * np.mean([r['per'] for r in report]):.1f} %, {len(bad)} à vérifier, {time.time() - t0:.0f} s", flush=True)

if __name__ == '__main__':
    main()
