"""P versus NP Laboratory V101: local-exception geometry for NC0_3-Avoid.

Computer-assisted research artifact.  This does not prove P=NP or P!=NP.

V101 studies a circuit C through a local surrogate H.  Each output of C differs
from the corresponding output of H on a small set of local assignments.  The
main verified objects are:

* beta(C,H) = max_x dist(C(x),H(x));
* the exact conflict-graph characterization beta = alpha(G_exc);
* an NP-hardness reduction for computing beta via Max-Cut, even with one local
  exception per output relative to a fixed nearest unate surrogate;
* deterministic prefix pair-counting for a beta-remote point when the surrogate
  has a bounded-width variable-elimination order and
      2^n * B(m,beta) < 2^m;
* an explicit monotone essential ternary minimal-stretch surrogate of covering
  radius 1, showing that symmetric Hamming-ball robustification alone cannot
  handle beta=1 at m=n+1.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
import random
from collections import Counter
from itertools import combinations, product
from pathlib import Path


def ball_volume(m: int, r: int) -> int:
    if r < 0:
        return 0
    return sum(math.comb(m, j) for j in range(min(m, r) + 1))


def eval_gate(gate: dict, x: tuple[int, ...]) -> int:
    idx = 0
    for i, v in enumerate(gate["support"]):
        idx |= x[v] << i
    return (gate["mask"] >> idx) & 1


def eval_circuit(gates: list[dict], x: tuple[int, ...]) -> tuple[int, ...]:
    return tuple(eval_gate(g, x) for g in gates)


def hamming(a, b) -> int:
    return sum(x != y for x, y in zip(a, b))


def exception_events(C: list[dict], H: list[dict]) -> list[dict]:
    events = []
    for e, (cg, hg) in enumerate(zip(C, H)):
        if tuple(cg["support"]) != tuple(hg["support"]):
            raise ValueError("C and H must use the same local support per output")
        support = tuple(cg["support"])
        for idx in range(1 << len(support)):
            cf = (cg["mask"] >> idx) & 1
            hf = (hg["mask"] >> idx) & 1
            if cf == hf:
                continue
            bits = tuple((idx >> i) & 1 for i in range(len(support)))
            events.append({"gate": e, "support": support, "bits": bits})
    return events


def compatible_events(a: dict, b: dict) -> bool:
    da = dict(zip(a["support"], a["bits"]))
    db = dict(zip(b["support"], b["bits"]))
    return all(v not in db or db[v] == bit for v, bit in da.items())


def conflict_graph(events: list[dict]) -> list[set[int]]:
    adj = [set() for _ in events]
    for i in range(len(events)):
        for j in range(i + 1, len(events)):
            if not compatible_events(events[i], events[j]):
                adj[i].add(j)
                adj[j].add(i)
    return adj


def maximum_independent_set_bruteforce(adj: list[set[int]]) -> tuple[int, tuple[int, ...]]:
    n = len(adj)
    best = 0
    best_set: tuple[int, ...] = ()
    for mask in range(1 << n):
        count = mask.bit_count()
        if count <= best:
            continue
        ok = True
        for i in range(n):
            if not ((mask >> i) & 1):
                continue
            for j in adj[i]:
                if j > i and ((mask >> j) & 1):
                    ok = False
                    break
            if not ok:
                break
        if ok:
            best = count
            best_set = tuple(i for i in range(n) if (mask >> i) & 1)
    return best, best_set


def beta_bruteforce(C: list[dict], H: list[dict], n: int) -> tuple[int, tuple[int, ...]]:
    best = -1
    witness: tuple[int, ...] = ()
    for x in product((0, 1), repeat=n):
        d = hamming(eval_circuit(C, x), eval_circuit(H, x))
        if d > best:
            best = d
            witness = x
    return best, witness


def exact_beta_by_exception_variables(C: list[dict], H: list[dict]) -> tuple[int, int]:
    """FPT exact beta algorithm in k=#variables touched by exception events."""
    events = exception_events(C, H)
    variables = sorted({v for e in events for v in e["support"]})
    pos = {v: i for i, v in enumerate(variables)}
    best = 0
    for bits in product((0, 1), repeat=len(variables)):
        active = 0
        for event in events:
            if all(bits[pos[v]] == b for v, b in zip(event["support"], event["bits"])):
                active += 1
        best = max(best, active)
    return best, len(variables)


def poly_add(a: tuple[int, ...], b: tuple[int, ...]) -> tuple[int, ...]:
    return tuple(x + y for x, y in zip(a, b))


def poly_conv(a: tuple[int, ...], b: tuple[int, ...], degree: int) -> tuple[int, ...]:
    out = [0] * (degree + 1)
    for i, x in enumerate(a):
        if not x:
            continue
        for j, y in enumerate(b):
            if y and i + j <= degree:
                out[i + j] += x * y
    return tuple(out)


def factor_multiply(factors, degree: int):
    if not factors:
        return (), {(): (1,) + (0,) * degree}
    scope = tuple(sorted({v for s, _ in factors for v in s}))
    table = {}
    for bits in product((0, 1), repeat=len(scope)):
        assignment = dict(zip(scope, bits))
        value = (1,) + (0,) * degree
        for fscope, ftable in factors:
            key = tuple(assignment[v] for v in fscope)
            value = poly_conv(value, ftable[key], degree)
        table[bits] = value
    return scope, table


def eliminate_variable(factors, variable: int, degree: int):
    selected = []
    rest = []
    for factor in factors:
        (selected if variable in factor[0] else rest).append(factor)
    if not selected:
        # A truly free Boolean input contributes two assignments.
        return rest + [((), {(): (2,) + (0,) * degree})]

    union_scope, union_table = factor_multiply(selected, degree)
    new_scope = tuple(v for v in union_scope if v != variable)
    new_table = {}
    for bits in product((0, 1), repeat=len(new_scope)):
        fixed = dict(zip(new_scope, bits))
        total = (0,) * (degree + 1)
        for vb in (0, 1):
            full = tuple(vb if v == variable else fixed[v] for v in union_scope)
            total = poly_add(total, union_table[full])
        new_table[bits] = total
    return rest + [(new_scope, new_table)]


def prefix_distance_distribution_dp(
    H: list[dict], prefix: tuple[int, ...], n: int, radius: int, order=None
):
    """Return counts N_d=#{x:dist(H_prefix(x),prefix)=d}, truncated at radius.

    This is polynomial-valued variable elimination.  The reported width is the
    maximum bucket scope minus one for the supplied elimination order.
    """
    identity = (1,) + (0,) * radius
    factors = [((v,), {(0,): identity, (1,): identity}) for v in range(n)]

    for e, target in enumerate(prefix):
        gate = H[e]
        scope = tuple(gate["support"])
        table = {}
        for idx in range(1 << len(scope)):
            bits = tuple((idx >> i) & 1 for i in range(len(scope)))
            value = (gate["mask"] >> idx) & 1
            d = int(value != target)
            coeff = [0] * (radius + 1)
            if d <= radius:
                coeff[d] = 1
            table[bits] = tuple(coeff)
        factors.append((scope, table))

    order = list(range(n)) if order is None else list(order)
    max_bucket_scope = 0
    for v in order:
        selected = [factor for factor in factors if v in factor[0]]
        if selected:
            bucket_scope = {u for scope, _ in selected for u in scope}
            max_bucket_scope = max(max_bucket_scope, len(bucket_scope))
        factors = eliminate_variable(factors, v, radius)

    scope, table = factor_multiply(factors, radius)
    if scope:
        raise AssertionError("elimination order did not eliminate every input variable")
    return table[()], max(0, max_bucket_scope - 1)


def prefix_pair_count_dp(H, prefix, n: int, m: int, radius: int, order=None):
    distribution, width = prefix_distance_distribution_dp(H, prefix, n, radius, order)
    remaining = m - len(prefix)
    total = sum(count * ball_volume(remaining, radius - d) for d, count in enumerate(distribution))
    return total, width


def prefix_pair_count_bruteforce(H, prefix, n: int, m: int, radius: int) -> int:
    total = 0
    for x in product((0, 1), repeat=n):
        hx = eval_circuit(H, x)
        d = hamming(hx[: len(prefix)], prefix)
        total += ball_volume(m - len(prefix), radius - d)
    return total


def construct_remote_point_dp(H, n: int, m: int, radius: int, order=None):
    """Conditional-expectation/prefix construction of a radius-remote point."""
    root_pairs = (1 << n) * ball_volume(m, radius)
    if root_pairs >= (1 << m):
        raise ValueError("volume condition 2^n B(m,r) < 2^m is required")

    prefix: tuple[int, ...] = ()
    max_width = 0
    current, width = prefix_pair_count_dp(H, prefix, n, m, radius, order)
    max_width = max(max_width, width)
    if current >= (1 << m):
        raise AssertionError("root density invariant failed")

    for _ in range(m):
        a0, w0 = prefix_pair_count_dp(H, prefix + (0,), n, m, radius, order)
        a1, w1 = prefix_pair_count_dp(H, prefix + (1,), n, m, radius, order)
        max_width = max(max_width, w0, w1)
        if a0 <= a1:
            prefix = prefix + (0,)
            current = a0
        else:
            prefix = prefix + (1,)
            current = a1
        if current >= (1 << (m - len(prefix))):
            raise AssertionError("prefix density did not remain below one")

    if current != 0:
        raise AssertionError("integer pair count at a full word must be zero")
    return prefix, max_width


def conflict_graph_audit(seed=1_010_100, cases=300):
    rng = random.Random(seed)
    mismatches = 0
    fpt_mismatches = 0
    event_hist = Counter()
    for _ in range(cases):
        n = rng.randint(2, 5)
        m = rng.randint(1, 5)
        C, H = [], []
        for _ in range(m):
            arity = rng.randint(1, min(3, n))
            support = tuple(sorted(rng.sample(range(n), arity)))
            hmask = rng.randrange(1 << (1 << arity))
            cmask = hmask
            flip_count = rng.randint(0, min(2, 1 << arity))
            for idx in rng.sample(range(1 << arity), flip_count):
                cmask ^= 1 << idx
            H.append({"support": support, "mask": hmask})
            C.append({"support": support, "mask": cmask})

        events = exception_events(C, H)
        event_hist[len(events)] += 1
        beta, _ = beta_bruteforce(C, H, n)
        alpha, _ = maximum_independent_set_bruteforce(conflict_graph(events))
        beta_k, _ = exact_beta_by_exception_variables(C, H)
        if beta != alpha:
            mismatches += 1
        if beta != beta_k:
            fpt_mismatches += 1
    return {
        "seed": seed,
        "random_instances": cases,
        "beta_vs_conflict_alpha_mismatches": mismatches,
        "beta_vs_exception_variable_enumeration_mismatches": fpt_mismatches,
        "event_count_histogram": {str(k): event_hist[k] for k in sorted(event_hist)},
    }


def maxcut_bruteforce(n: int, edges: list[tuple[int, int]]) -> int:
    best = 0
    for x in product((0, 1), repeat=n):
        best = max(best, sum(x[u] != x[v] for u, v in edges))
    return best


def maxcut_reduction_circuits(edges: list[tuple[int, int]]):
    """Two XOR copies per edge; each fixed unate surrogate differs at one point.

    XOR mask 0x6 on support (u,v).
    h01=0x2 is x_u AND NOT x_v, so XOR differs only at (0,1).
    h10=0x4 is NOT x_u AND x_v, so XOR differs only at (1,0).
    """
    C, H = [], []
    for u, v in edges:
        support = (u, v)
        C.append({"support": support, "mask": 0x6})
        H.append({"support": support, "mask": 0x2})
        C.append({"support": support, "mask": 0x6})
        H.append({"support": support, "mask": 0x4})
    return C, H


def maxcut_hardness_audit(seed=1_010_200, cases=200):
    rng = random.Random(seed)
    mismatches = 0
    checked_edges = 0
    for _ in range(cases):
        n = rng.randint(2, 7)
        edges = [
            (u, v)
            for u in range(n)
            for v in range(u + 1, n)
            if rng.random() < 0.35
        ]
        C, H = maxcut_reduction_circuits(edges)
        beta, _ = beta_bruteforce(C, H, n)
        cut = maxcut_bruteforce(n, edges)
        checked_edges += len(edges)
        if beta != cut:
            mismatches += 1
    return {
        "seed": seed,
        "random_graphs": cases,
        "total_edges_checked": checked_edges,
        "beta_vs_maxcut_mismatches": mismatches,
        "reduction": "each graph edge becomes two XOR outputs, with nearest unate surrogates having singleton exception assignments 01 and 10",
    }


def pair_count_audit(seed=1_010_300, cases=300):
    rng = random.Random(seed)
    mismatches = 0
    width_hist = Counter()
    for _ in range(cases):
        n = rng.randint(1, 6)
        m = rng.randint(1, 7)
        radius = rng.randint(0, 2)
        H = []
        for _ in range(m):
            arity = rng.randint(0, min(3, n))
            support = tuple(sorted(rng.sample(range(n), arity))) if arity else ()
            H.append({"support": support, "mask": rng.randrange(1 << (1 << arity))})
        length = rng.randint(0, m)
        prefix = tuple(rng.randrange(2) for _ in range(length))
        brute = prefix_pair_count_bruteforce(H, prefix, n, m, radius)
        dp, width = prefix_pair_count_dp(H, prefix, n, m, radius)
        width_hist[width] += 1
        if brute != dp:
            mismatches += 1
    return {
        "seed": seed,
        "random_prefix_instances": cases,
        "bruteforce_vs_variable_elimination_mismatches": mismatches,
        "observed_order_width_histogram": {str(k): width_hist[k] for k in sorted(width_hist)},
    }


def remote_construction_audit(seed=1_010_400, successful_cases=150):
    rng = random.Random(seed)
    failures = 0
    accepted = 0
    attempts = 0
    beta_hist = Counter()
    width_hist = Counter()
    while accepted < successful_cases and attempts < 5000:
        attempts += 1
        n = rng.randint(2, 5)
        m = rng.randint(n + 2, n + 9)
        C, H = [], []
        for _ in range(m):
            arity = rng.randint(1, min(3, n))
            support = tuple(sorted(rng.sample(range(n), arity)))
            hmask = rng.randrange(1 << (1 << arity))
            cmask = hmask
            if rng.random() < 0.30:
                cmask ^= 1 << rng.randrange(1 << arity)
            H.append({"support": support, "mask": hmask})
            C.append({"support": support, "mask": cmask})

        beta, _ = beta_bruteforce(C, H, n)
        if (1 << n) * ball_volume(m, beta) >= (1 << m):
            continue

        z, width = construct_remote_point_dp(H, n, m, beta)
        all_inputs = list(product((0, 1), repeat=n))
        remote = all(hamming(z, eval_circuit(H, x)) > beta for x in all_inputs)
        avoided = all(z != eval_circuit(C, x) for x in all_inputs)
        if not (remote and avoided):
            failures += 1
        accepted += 1
        beta_hist[beta] += 1
        width_hist[width] += 1

    if accepted < successful_cases:
        raise AssertionError("not enough random instances met the volume condition")
    return {
        "seed": seed,
        "accepted_random_instances": accepted,
        "sampling_attempts": attempts,
        "remote_or_avoidance_failures": failures,
        "beta_histogram": {str(k): beta_hist[k] for k in sorted(beta_hist)},
        "observed_order_width_histogram": {str(k): width_hist[k] for k in sorted(width_hist)},
    }


def covering_radius(gates: list[dict], n: int):
    m = len(gates)
    image = {eval_circuit(gates, x) for x in product((0, 1), repeat=n)}
    radius = -1
    farthest = []
    for z in product((0, 1), repeat=m):
        d = min(hamming(z, y) for y in image)
        if d > radius:
            radius = d
            farthest = [z]
        elif d == radius:
            farthest.append(z)
    return radius, image, farthest


def minimal_stretch_barrier():
    # h1 = x0 x1 x2
    # h2 = x0 OR (x1 x2)
    # h3 = x1 OR (x0 x2)
    # h4 = x2 OR (x0 x1)
    H3 = [
        {"support": (0, 1, 2), "mask": 0x80},
        {"support": (0, 1, 2), "mask": 0xEA},
        {"support": (0, 1, 2), "mask": 0xEC},
        {"support": (0, 1, 2), "mask": 0xF8},
    ]
    radius, image, farthest = covering_radius(H3, 3)
    expected_image = {
        (0, 0, 0, 0),
        (0, 0, 0, 1),
        (0, 0, 1, 0),
        (0, 1, 0, 0),
        (0, 1, 1, 1),
        (1, 1, 1, 1),
    }
    return {
        "n": 3,
        "m": 4,
        "gate_masks": ["0x80", "0xea", "0xec", "0xf8"],
        "gate_formulas": [
            "x0 & x1 & x2",
            "x0 | (x1 & x2)",
            "x1 | (x0 & x2)",
            "x2 | (x0 & x1)",
        ],
        "all_outputs_monotone_and_essential_ternary": True,
        "image_size": len(image),
        "image": ["".join(map(str, y)) for y in sorted(image)],
        "image_matches_expected": image == expected_image,
        "covering_radius": radius,
        "number_of_farthest_words": len(farthest),
        "infinite_family_lift": "for n>=3 append identity outputs x3,...,x_{n-1}; m=n+1 and covering radius remains 1",
        "consequence": "a generic beta=1 robustification that asks for distance >1 from a monotone surrogate cannot solve minimal stretch",
    }


def surplus_table():
    rows = []
    for m in (32, 64, 128, 256, 1024):
        row = {"m": m}
        for beta in (1, 2, 3):
            volume = ball_volume(m, beta)
            # Strict condition volume < 2^s.
            s = volume.bit_length()
            row[f"beta_{beta}_ball"] = volume
            row[f"beta_{beta}_min_surplus"] = s
        rows.append(row)
    return rows


def build_summary():
    conflict = conflict_graph_audit()
    maxcut = maxcut_hardness_audit()
    pair = pair_count_audit()
    remote = remote_construction_audit()
    barrier = minimal_stretch_barrier()

    all_passed = (
        conflict["beta_vs_conflict_alpha_mismatches"] == 0
        and conflict["beta_vs_exception_variable_enumeration_mismatches"] == 0
        and maxcut["beta_vs_maxcut_mismatches"] == 0
        and pair["bruteforce_vs_variable_elimination_mismatches"] == 0
        and remote["remote_or_avoidance_failures"] == 0
        and barrier["image_matches_expected"]
        and barrier["covering_radius"] == 1
    )

    return {
        "lab": "V101",
        "date": "2026-08-27",
        "status": "internal structural theorem plus barrier; novelty not established",
        "robustification_lemma": {
            "statement": "If beta=max_x dist(C(x),H(x)) and dist(z,range(H))>beta, then z is outside range(C).",
            "proof": "For every x, dist(z,C(x)) >= dist(z,H(x))-dist(H(x),C(x)) > beta-beta = 0.",
        },
        "exception_conflict_theorem": {
            "statement": "For local exception events represented as partial assignments, beta(C,H)=alpha(G_exc), where two events are adjacent iff their partial assignments conflict.",
            "reason": "Every x activates a pairwise-compatible event set; conversely every pairwise-compatible set of Boolean partial assignments has a common global extension.",
            "complexity_barrier": "Exact beta is NP-hard even with singleton local exceptions: Max-Cut reduces using two XOR outputs per graph edge and fixed nearest unate surrogates.",
            "fpt_escape": "If k input variables occur in exception events, beta is computable exactly in O(2^k * |events|).",
        },
        "bounded_width_remote_theorem": {
            "hypotheses": [
                "C,H:{0,1}^n->{0,1}^m share local output supports",
                "beta is a certified upper bound on max_x dist(C(x),H(x))",
                "H has a supplied variable-elimination order of induced width w",
                "2^n * B(m,beta) < 2^m",
            ],
            "conclusion": "A word z outside range(C) is constructible deterministically by prefix pair counting.",
            "prefix_pair_count": "A(p)=sum_x B(m-|p|, beta-dist(H_prefix(x),p)).",
            "algorithm": "Compute A(p0),A(p1) by polynomial-valued variable elimination and choose the smaller child. Density stays <1; at length m the integer count is 0.",
            "runtime": "m * 2^O(w) * poly(n,m,beta), plus the cost of certifying beta",
            "near_unate_corollary": "For NC0_3, V100 gives a per-output unate surrogate with <=2 local exceptions. If exception-variable count k and surrogate elimination width w are small, the theorem is FPT in k+w whenever B(m,beta)<2^(m-n).",
        },
        "conflict_graph_audit": conflict,
        "maxcut_hardness_audit": maxcut,
        "pair_count_audit": pair,
        "remote_construction_audit": remote,
        "minimal_stretch_barrier": barrier,
        "surplus_needed_by_volume_bound": surplus_table(),
        "strategic_conclusion": {
            "positive": "V101 tolerates nonzero local defects without deleting their output coordinates, at logarithmic-or-larger surplus when beta is constant and surrogate counting width is controlled.",
            "negative": "At m=n+1, symmetric Hamming-envelope robustification cannot even guarantee beta=1, because monotone essential ternary surrogates can have covering radius 1.",
            "next": "V102 should replace symmetric balls by oriented exception geometry: track which output bit flips are possible from each surrogate image point and avoid the directed union, preserving exception signs/patterns rather than only beta.",
        },
        "p_vs_np_resolved": False,
        "all_internal_checks_passed": all_passed,
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, default=Path("RESULTS.json"))
    args = parser.parse_args()
    summary = build_summary()
    args.output.write_text(json.dumps(summary, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    digest = hashlib.sha256(args.output.read_bytes()).hexdigest()
    print(json.dumps({
        "all_internal_checks_passed": summary["all_internal_checks_passed"],
        "conflict_mismatches": summary["conflict_graph_audit"]["beta_vs_conflict_alpha_mismatches"],
        "maxcut_mismatches": summary["maxcut_hardness_audit"]["beta_vs_maxcut_mismatches"],
        "pair_count_mismatches": summary["pair_count_audit"]["bruteforce_vs_variable_elimination_mismatches"],
        "remote_failures": summary["remote_construction_audit"]["remote_or_avoidance_failures"],
        "minimal_stretch_covering_radius": summary["minimal_stretch_barrier"]["covering_radius"],
        "sha256": digest,
    }, indent=2))


if __name__ == "__main__":
    main()
