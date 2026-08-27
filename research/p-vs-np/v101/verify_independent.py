"""Independent verifier for P versus NP Lab V101.

Does not import p_vs_np_lab_v101.py.
"""
from __future__ import annotations

import argparse
import json
from itertools import combinations, product
from pathlib import Path


def hamming(a, b):
    return sum(x != y for x, y in zip(a, b))


def eval_gate(mask, support, x):
    idx = sum(x[v] << i for i, v in enumerate(support))
    return (mask >> idx) & 1


def eval_circuit(gates, x):
    return tuple(eval_gate(g["mask"], g["support"], x) for g in gates)


def beta(C, H, n):
    return max(hamming(eval_circuit(C, x), eval_circuit(H, x)) for x in product((0, 1), repeat=n))


def maxcut(n, edges):
    return max(sum(x[u] != x[v] for u, v in edges) for x in product((0, 1), repeat=n))


def reduction(edges):
    C, H = [], []
    for u, v in edges:
        support = (u, v)
        C += [{"support": support, "mask": 0x6}, {"support": support, "mask": 0x6}]
        H += [{"support": support, "mask": 0x2}, {"support": support, "mask": 0x4}]
    return C, H


def exhaustive_maxcut_reduction_n4():
    vertices = 4
    possible = list(combinations(range(vertices), 2))
    mismatches = 0
    for selector in range(1 << len(possible)):
        edges = [possible[i] for i in range(len(possible)) if (selector >> i) & 1]
        C, H = reduction(edges)
        if beta(C, H, vertices) != maxcut(vertices, edges):
            mismatches += 1
    return mismatches


def barrier_check():
    H = [
        {"support": (0, 1, 2), "mask": 0x80},
        {"support": (0, 1, 2), "mask": 0xEA},
        {"support": (0, 1, 2), "mask": 0xEC},
        {"support": (0, 1, 2), "mask": 0xF8},
    ]
    image = {eval_circuit(H, x) for x in product((0, 1), repeat=3)}
    expected = {
        (0, 0, 0, 0),
        (0, 0, 0, 1),
        (0, 0, 1, 0),
        (0, 1, 0, 0),
        (0, 1, 1, 1),
        (1, 1, 1, 1),
    }
    radius = max(min(hamming(z, y) for y in image) for z in product((0, 1), repeat=4))
    return image == expected and radius == 1


def robustification_exhaustive_small():
    # Exhaust all C,H maps {0,1}->{0,1}^2 (256 pairs of maps) and verify the
    # metric lemma directly. This does not use locality or the main code.
    inputs = [(0,), (1,)]
    maps = []
    for word0 in product((0, 1), repeat=2):
        for word1 in product((0, 1), repeat=2):
            maps.append({inputs[0]: word0, inputs[1]: word1})
    checked = 0
    for C in maps:
        for H in maps:
            b = max(hamming(C[x], H[x]) for x in inputs)
            for z in product((0, 1), repeat=2):
                dH = min(hamming(z, H[x]) for x in inputs)
                if dH > b:
                    assert all(z != C[x] for x in inputs)
                checked += 1
    return checked


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("results", type=Path, nargs="?")
    args = ap.parse_args()

    assert exhaustive_maxcut_reduction_n4() == 0
    assert barrier_check()
    checked = robustification_exhaustive_small()

    if args.results:
        data = json.loads(args.results.read_text())
        assert data["all_internal_checks_passed"] is True
        assert data["maxcut_hardness_audit"]["beta_vs_maxcut_mismatches"] == 0
        assert data["pair_count_audit"]["bruteforce_vs_variable_elimination_mismatches"] == 0
        assert data["remote_construction_audit"]["remote_or_avoidance_failures"] == 0
        assert data["minimal_stretch_barrier"]["covering_radius"] == 1

    print(f"V101 independent verification passed: 64/64 graphs in n=4 Max-Cut reduction; barrier radius=1; {checked} exhaustive robustification checks.")


if __name__ == "__main__":
    main()
