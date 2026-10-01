#!/usr/bin/env python3
"""Build dense, crossing-compatible arrowword boards ahead of game time."""
import argparse
import json
import random
import time
from collections import defaultdict, deque
from pathlib import Path


def generate(bank, templates, count, seed=1):
    rng = random.Random(seed)
    clues = defaultdict(list)
    for item in bank["entries"]:
        clue = item["clue"].strip()
        if 3 <= len(clue) <= 70 and not any(c in clue for c in "<>\n\r"):
            clues[item["answer"]].append(clue)
    words, indexes = {}, {}
    for length in range(1, 22):
        words[length] = sorted(answer for answer in clues if len(answer) == length)
        index = defaultdict(int)
        for i, word in enumerate(words[length]):
            for pos, char in enumerate(word):
                index[pos, char] |= 1 << i
        indexes[length] = index
    boards, signatures = [], set()
    for attempt in range(count * 30):
        template = templates[attempt % len(templates)]
        slots = template["entries"]
        lengths = [len(entry["answer"]) for entry in slots]
        occupancy = defaultdict(list)
        for i, entry in enumerate(slots):
            for pos in range(lengths[i]):
                key = (entry["row"] + (pos + 1 if entry["direction"] == "down" else 0),
                       entry["col"] + (pos + 1 if entry["direction"] == "across" else 0))
                occupancy[key].append((i, pos))
        arcs, neighbors = [], defaultdict(list)
        for occupants in occupancy.values():
            for a, pa in occupants:
                for b, pb in occupants:
                    if a != b:
                        arcs.append((a, pa, b, pb))
                        neighbors[b].append((a, pa, b, pb))
        deadline = time.monotonic() + 2

        def propagate(domains, queue):
            while queue:
                a, pa, b, pb = queue.popleft()
                supported = 0
                for char in "ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ":
                    if domains[b] & indexes[lengths[b]][pb, char]:
                        supported |= indexes[lengths[a]][pa, char]
                narrowed = domains[a] & supported
                if not narrowed:
                    return False
                if narrowed != domains[a]:
                    domains[a] = narrowed
                    queue.extend(neighbors[a])
            return True

        def solve(domains):
            if time.monotonic() > deadline:
                return None
            if not propagate(domains, deque(arcs)):
                return None
            sizes = [bin(domain).count("1") for domain in domains]
            open_slots = [i for i, size in enumerate(sizes) if size > 1]
            if not open_slots:
                answers = [words[lengths[i]][domain.bit_length() - 1] for i, domain in enumerate(domains)]
                return answers if len(set(answers)) == len(answers) else None
            i = min(open_slots, key=lambda k: (sizes[k], -len(neighbors[k]), rng.random()))
            values = []
            domain = domains[i]
            while domain:
                bit = domain & -domain
                values.append(bit)
                domain ^= bit
            rng.shuffle(values)
            for bit in values:
                trial = list(domains)
                trial[i] = bit
                valid = True
                for k in range(len(slots)):
                    if k != i and lengths[k] == lengths[i]:
                        trial[k] &= ~bit
                        if not trial[k]:
                            valid = False
                            break
                if valid:
                    found = solve(trial)
                    if found:
                        return found
            return None

        domains = [(1 << len(words[length])) - 1 for length in lengths]
        answers = solve(domains)
        if not answers:
            continue
        signature = tuple(answers)
        if signature in signatures:
            continue
        signatures.add(signature)
        entries = [{**entry, "answer": answer, "clue": rng.choice(clues[answer])} for entry, answer in zip(slots, answers)]
        boards.append({**template, "title": "Yeni tahta, yeni kapışma", "category": "Genel kültür", "entries": entries})
        print(f"Prepared {len(boards)}/{count} ({template['rows']}x{template['cols']})", flush=True)
        if len(boards) >= count:
            return boards
    raise RuntimeError(f"Only {len(boards)} compatible boards found; requested {count}")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--bank", default="data/cengel/tac/clue-bank.json")
    parser.add_argument("--templates", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--count", type=int, default=128)
    parser.add_argument("--seed", type=int, default=1)
    args = parser.parse_args()
    boards = generate(json.loads(Path(args.bank).read_text()), json.loads(Path(args.templates).read_text()), args.count, args.seed)
    output = {"version": 1, "source": "TAC", "boards": boards}
    text = json.dumps(output, ensure_ascii=False, separators=(",", ":")) + "\n"
    assert json.loads(text) == output
    Path(args.output).write_text(text, encoding="utf-8")


if __name__ == "__main__":
    main()
