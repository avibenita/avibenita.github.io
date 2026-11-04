# CapCut notes for contingency review r001

The review MP4 is a flattened picture. Editable pieces:

- Narration clips: `03_audio/*.mp3`
- Spoken script and times: `02_script/contingency__narration__r001.md` and `02_script/contingency__storyboard__r001.md`
- Scene recordings, before the loudness pass: `04_review/work/*.webm` (local render cache, not in git)
- Opening, close, and cards: `produce/open.html`, `produce/close.html`, `produce/cards.html`

Do not replace `06_approved/`. The approved export name reserved for later is `contingency__capcut__v001-vo.mp4`.

Rebuild:

```
cd Statistico/contingency/produce
py -3 speak.py cues.json ../03_audio
node capture.mjs
node assemble.mjs
```
