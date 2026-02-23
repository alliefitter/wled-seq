import json

import httpx

from api.orm import SequenceOrm, SessionLocal
from lib.model.sequence import LedSequence


def main():
    db = SessionLocal()
    for sequence in db.query(SequenceOrm).all():
        led_sequence: LedSequence = sequence.sequence
        segments = sequence.segment_set.segments
        for i, element in enumerate(led_sequence.elements):
            if element.state:
                for segment in element.state.seg:
                    seg = [s for s in segments if s.id == segment.id][0]
                    segment.start = seg.start
                    segment.stop = seg.stop

            led_sequence.elements[i] = element

        # print(led_sequence.model_dump(mode="json", exclude_unset=True))
        response = httpx.put(
            f"http://localhost:8080/sequence/{sequence.id}",
            json={
                "host_id": str(sequence.host_id),
                "name": sequence.name,
                "segment_set_id": str(sequence.segment_set_id),
                "sequence": led_sequence.model_dump(mode="json", exclude_unset=True),
            },
        )
        if response.is_error:
            exit(response.json())

    db.close()


if __name__ == "__main__":
    main()
