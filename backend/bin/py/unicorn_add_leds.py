from api.orm import Sequence, SessionLocal
from lib.model.sequence import LedSequence


def main():
    db = SessionLocal()
    for sequence in (
        db.query(Sequence)
        .filter_by(host_id="ed42fb69-749e-41b6-b9b0-3b40c17ee7ce")
        .all()
    ):
        led_sequence: LedSequence = sequence.sequence
        # print(sequence.name)
        # print(led_sequence.model_dump_json(exclude_unset=True, by_alias=True))
        for i, element in enumerate(led_sequence.elements):
            if element.state:
                for n, segment in enumerate(element.state.seg):
                    if segment.start and segment.start != 0:
                        segment.start += 4 if segment.start <= 11 else 5

                    if segment.stop:
                        segment.stop += 4 if segment.stop <= 11 else 5

                    element.state.seg[n] = segment

            led_sequence.elements[i] = element

        sequence.sequence = led_sequence
        print(sequence.name)
        print(sequence.sequence.model_dump_json(exclude_unset=True, by_alias=True))
        # db.add(sequence)
        # db.commit()


if __name__ == "__main__":
    main()
