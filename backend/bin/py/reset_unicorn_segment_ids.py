import json

from api.orm import SequenceOrm, SessionLocal
from lib.model.sequence import LedSequence


def main():
    db = SessionLocal()
    for sequence in (
        db.query(SequenceOrm)
        .filter_by(host_id="ed42fb69-749e-41b6-b9b0-3b40c17ee7ce")
        .all()
    ):
        led_sequence: LedSequence = sequence.sequence
        print(sequence.name)
        body = json.loads(
            json.loads(
                json.dumps(
                    led_sequence.model_dump_json(exclude_unset=True, by_alias=True)
                )
            )
        )
        print(body)
        print(json.dumps(body, indent=2))
        # for i, element in enumerate(led_sequence.elements):
        #     if element.state:
        #         for n, segment in enumerate(element.state.seg):
        #             segment.id = n
        #
        #     led_sequence.elements[i] = element

        # response = httpx.put(
        #     f"http://api.wled-seq.horde.home/sequence/{sequence.id}",
        #     json={
        #         "host_id": str(sequence.host_id),
        #         "name": sequence.name,
        #         "sequence": body,
        #     },
        # )
        # response.raise_for_status()

    db.close()


if __name__ == "__main__":
    main()
