"""Rebuild original practice-story audio on macOS; never reads assessment files."""
import json
from pathlib import Path
import re
import subprocess
import tempfile

root = Path(__file__).resolve().parents[4]
stories = json.loads((root / 'vocab-space/stories.json').read_text())
destination = root / 'vocab-space/assets/story'
destination.mkdir(parents=True, exist_ok=True)
with tempfile.TemporaryDirectory(prefix='learncore-story-audio-') as temporary:
    for story in stories:
        tracks = [(story['id'], '\n\n'.join(story['paragraphs']))]
        tracks += [(f"{story['id']}-p{index + 1}", text) for index, text in enumerate(story['paragraphs'])]
        for name, text in tracks:
            script = Path(temporary) / 'speech.txt'
            speech = Path(temporary) / 'speech.aiff'
            script.write_text(re.sub(r'\{([^}]+)\}', r'\1', text))
            subprocess.run(['say', '-v', 'Samantha', '-r', '145', '-f', str(script), '-o', str(speech)], check=True)
            subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(speech), '-ac', '1', '-codec:a', 'libmp3lame', '-b:a', '64k', str(destination / f'{name}.mp3')], check=True)
print(f'Built {len(stories) * 6} original English practice tracks.')
