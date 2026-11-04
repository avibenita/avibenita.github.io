import asyncio
import json
import sys
from pathlib import Path

import edge_tts

VOICE = "en-US-AriaNeural"
RATE = "-4%"


async def main():
    cues = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
    out = Path(sys.argv[2])
    out.mkdir(parents=True, exist_ok=True)
    for cue in cues:
        dest = out / f"{cue['id']}.mp3"
        await edge_tts.Communicate(cue["spoken"], VOICE, rate=RATE).save(str(dest))
        print(cue["id"], dest.stat().st_size)


asyncio.run(main())
