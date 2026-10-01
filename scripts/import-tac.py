#!/usr/bin/env python3
"""Prepare a local clue bank; this does not generate or publish a game board."""
import argparse
import hashlib
import json
import re
import unicodedata
from collections import Counter
from pathlib import Path


def write_json(path, value):
    # Serialize data, never interpolate clues into JSON text.
    text = json.dumps(value, ensure_ascii=False, separators=(",", ":")) + "\n"
    assert json.loads(text) == value, "JSON round-trip failed"
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(text, encoding="utf-8")
    temporary.replace(path)


def normalize_answer(answer):
    return unicodedata.normalize("NFC", answer).strip().replace("ı", "I").replace("i", "İ").upper()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input", type=Path)
    parser.add_argument("--output", type=Path, default=Path("data/cengel/tac"))
    args = parser.parse_args()
    import pyarrow.parquet as pq

    table = pq.read_table(args.input)
    required = {"answer", "clue", "Source", "Date"}
    if not required.issubset(table.column_names):
        raise ValueError("Unexpected TAC schema: " + str(table.column_names))
    records = table.to_pylist()
    pairs, seen, answers, excluded = [], set(), set(), Counter()
    for record in records:
        if not isinstance(record["answer"], str) or not isinstance(record["clue"], str):
            excluded["missing_text"] += 1
            continue
        answer = normalize_answer(record["answer"])
        clue = unicodedata.normalize("NFC", record["clue"]).strip()
        if not re.fullmatch(r"[ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ]{1,21}", answer):
            excluded["answer_outside_game_format"] += 1
            continue
        if not 3 <= len(clue) <= 100:
            excluded["clue_outside_game_length"] += 1
            continue
        key = (answer, clue)
        if key in seen:
            excluded["duplicate_pair"] += 1
            continue
        seen.add(key)
        answers.add(answer)
        pairs.append({"answer": answer, "clue": clue})

    args.output.mkdir(parents=True, exist_ok=True)
    source = "https://huggingface.co/datasets/Kamyar-zeinalipour/TAC"
    write_json(args.output / "tac-all.json", records)
    write_json(args.output / "clue-bank.json", {"version": 1, "source": source, "entries": pairs})
    report = {
        "source": source,
        "sourceSha256": hashlib.sha256(args.input.read_bytes()).hexdigest(),
        "sourceRows": len(records),
        "usableUniquePairs": len(pairs),
        "uniqueAnswers": len(answers),
        "excluded": dict(excluded),
        "uniqueAnswersByLength": {str(length): count for length, count in sorted(Counter(map(len, answers)).items())},
        "jsonRoundTripVerified": True,
        "datasetUsagePermission": "Not verified for publication; project README references a separate research license.",
        "note": "Source retained in full. Filtered records are candidates, not reviewed facts or prevalidated boards."
    }
    assert len(pairs) + sum(excluded.values()) == len(records)
    write_json(args.output / "import-report.json", report)
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
