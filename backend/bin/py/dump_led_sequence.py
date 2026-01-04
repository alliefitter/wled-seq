import json
from pathlib import Path

from lib.model.sequence import LedSequence

led_sequence_schema_file = Path("../share/schema/led_sequence_schema.json")

with led_sequence_schema_file.open("w") as f:
    json.dump(LedSequence.model_json_schema(), f, indent=2)
