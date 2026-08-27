"""P versus NP Laboratory V100: switching-defect parameter for NC0_3-Avoid.

This is a computer-assisted research artifact.  It does NOT prove P != NP or
P = NP.  It verifies finite classification facts and the graph reductions used
by the V100 theorem candidate.

Main mathematical object:
  tau(C) = minimum number of output gates whose deletion leaves a circuit in
  which every remaining ternary predicate is unate and the signed incidence
  constraints d(e,v)=q_e XOR r_v are simultaneously satisfiable.

The V100 candidate theorem combines:
  (i) this graph reduction to protected Odd Cycle Transversal (OCT), and
  (ii) the published deterministic polynomial-time monotone NC0_3-Avoid
       algorithm for m>n.
If tau(C) < m-n, avoidance is FPT in tau(C).
"""
from __future__ import annotations

import argparse
import hashlib
import json
import random
from collections import Counter, defaultdict, deque
from itertools import combinations, permutations, product
from pathlib import Path

ASSIGNMENTS = list(product((0, 1), repeat=3))


def tt_bit(mask: int, a: tuple[int, int, int]) -> int:
    idx = a[0] | (a[1] << 1) | (a[2] << 2)
    return (mask >> idx) & 1


def essential(mask: int) -> bool:
    for i in range(3):
        changed = False
        for a in ASSIGNMENTS:
            if a[i] != 0:
                continue
            b = list(a)
            b[i] = 1
            if tt_bit(mask, a) != tt_bit(mask, tuple(b)):
                changed = True
                break
        if not changed:
            return False
    return True


def direction(mask: int, i: int):
    """0=increasing, 1=decreasing, None=inessential, 'non'=non-unate."""
    inc = dec = True
    strict_inc = strict_dec = False
    for a in ASSIGNMENTS:
        if a[i] != 0:
            continue
        b = list(a)
        b[i] = 1
        fa, fb = tt_bit(mask, a), tt_bit(mask, tuple(b))
        inc = inc and fa <= fb
        dec = dec and fa >= fb
        strict_inc = strict_inc or fa < fb
        strict_dec = strict_dec or fa > fb
    if inc and strict_inc:
        return 0
    if dec and strict_dec:
        return 1
    if inc and dec:
        return None
    return "non"


def is_unate(mask: int) -> bool:
    return all(direction(mask, i) != "non" for i in range(3))


def transform_mask(mask: int, perm, negs, outneg: int) -> int:
    out = 0
    for a in ASSIGNMENTS:
        x = [0, 0, 0]
        for i in range(3):
            x[i] = a[perm[i]] ^ negs[i]
        value = tt_bit(mask, tuple(x)) ^ outneg
        idx = a[0] | (a[1] << 1) | (a[2] << 2)
        out |= value << idx
    return out


def npn_orbit(mask: int) -> set[int]:
    return {
        transform_mask(mask, p, n, o)
        for p in permutations(range(3))
        for n in product((0, 1), repeat=3)
        for o in (0, 1)
    }


def canonical_npn(mask: int) -> int:
    return min(npn_orbit(mask))


def truth_table_census() -> dict:
    essential_masks = [m for m in range(256) if essential(m)]
    unate_masks = [m for m in essential_masks if is_unate(m)]
    nonunate_masks = [m for m in essential_masks if not is_unate(m)]
    all_unate = [m for m in range(256) if is_unate(m)]
    all_nonunate = [m for m in range(256) if not is_unate(m)]

    classes = defaultdict(list)
    for mask in essential_masks:
        classes[canonical_npn(mask)].append(mask)

    distance = {}
    for mask in nonunate_masks:
        distance[mask] = min((mask ^ u).bit_count() for u in all_unate)

    rows = []
    for rep in sorted(classes):
        members = classes[rep]
        flag = all(is_unate(m) for m in members)
        rows.append({
            "representative_decimal": rep,
            "representative_hex": f"0x{rep:02x}",
            "orbit_size": len(members),
            "unate": flag,
            "distance_to_unate": 0 if flag else min(distance[m] for m in members),
        })

    hist = Counter(distance.values())
    all_hist = Counter(
        min((mask ^ u).bit_count() for u in all_unate)
        for mask in all_nonunate
    )
    return {
        "all_ternary_functions": 256,
        "all_unate_functions": len(all_unate),
        "all_nonunate_functions": len(all_nonunate),
        "all_nonunate_distance_histogram": {str(k): all_hist[k] for k in sorted(all_hist)},
        "essential_ternary_functions": len(essential_masks),
        "essential_unate_functions": len(unate_masks),
        "essential_nonunate_functions": len(nonunate_masks),
        "essential_npn_classes": len(classes),
        "nonunate_distance_histogram": {str(k): hist[k] for k in sorted(hist)},
        "npn_classes": rows,
        "parity_orbit_representative": "0x69",
        "parity_orbit_size": len(classes[0x69]),
        "parity_distance_to_unate": min(distance[m] for m in classes[0x69]),
    }


def balanced_assignment(gates: list[dict], deleted: set[int] | frozenset[int] = frozenset()):
    """Solve r_v XOR q_e = d(e,v) by parity BFS; return assignment or None."""
    adj = defaultdict(list)
    for ei, gate in enumerate(gates):
        if ei in deleted:
            continue
        en = ("e", ei)
        for v, d in zip(gate["support"], gate["dirs"]):
            vn = ("v", v)
            adj[en].append((vn, d))
            adj[vn].append((en, d))

    value = {}
    for start in list(adj):
        if start in value:
            continue
        value[start] = 0
        queue = deque([start])
        while queue:
            u = queue.popleft()
            for v, d in adj[u]:
                wanted = value[u] ^ d
                if v in value:
                    if value[v] != wanted:
                        return None
                else:
                    value[v] = wanted
                    queue.append(v)
    return value


def minimum_gate_deletion_bruteforce(gates: list[dict]) -> set[int]:
    for k in range(len(gates) + 1):
        for deleted in combinations(range(len(gates)), k):
            if balanced_assignment(gates, set(deleted)) is not None:
                return set(deleted)
    raise AssertionError("unreachable")


def constraint_graph(gates: list[dict]):
    """Translate XOR labels to ordinary bipartiteness constraints.

    d=1 (different colors): direct edge e--v.
    d=0 (same colors): two-edge path e--s--v.
    Only e-nodes are deletable.  Variable/subdivision nodes are protected.
    """
    adj = defaultdict(set)
    gateset, protected = set(), set()
    for ei, gate in enumerate(gates):
        en = ("e", ei)
        gateset.add(en)
        adj[en]
        for j, (v, d) in enumerate(zip(gate["support"], gate["dirs"])):
            vn = ("v", v)
            protected.add(vn)
            adj[vn]
            if d == 1:
                adj[en].add(vn)
                adj[vn].add(en)
            else:
                sn = ("s", ei, j)
                protected.add(sn)
                adj[sn]
                adj[en].add(sn)
                adj[sn].add(en)
                adj[sn].add(vn)
                adj[vn].add(sn)
    return {u: set(vs) for u, vs in adj.items()}, gateset, protected


def is_bipartite_after(adj: dict, deleted: set) -> bool:
    color = {}
    for start in adj:
        if start in deleted or start in color:
            continue
        color[start] = 0
        queue = deque([start])
        while queue:
            u = queue.popleft()
            for v in adj[u]:
                if v in deleted:
                    continue
                if v not in color:
                    color[v] = color[u] ^ 1
                    queue.append(v)
                elif color[v] == color[u]:
                    return False
    return True


def restricted_oct_exists(adj: dict, deletable: set, k: int):
    vertices = list(deletable)
    for j in range(k + 1):
        for deleted in combinations(vertices, j):
            if is_bipartite_after(adj, set(deleted)):
                return True, set(deleted)
    return False, None


def protected_blowup(adj: dict, protected: set, k: int) -> dict:
    """Reduce protected-OCT(k) to ordinary OCT(k) using k+1 false twins."""
    copies = {}
    for u in adj:
        if u in protected:
            copies[u] = [("copy", u, i) for i in range(k + 1)]
        else:
            copies[u] = [u]
    out = defaultdict(set)
    for us in copies.values():
        for u in us:
            out[u]
    seen = set()
    for u, nbrs in adj.items():
        for v in nbrs:
            edge = frozenset((u, v))
            if edge in seen:
                continue
            seen.add(edge)
            for cu in copies[u]:
                for cv in copies[v]:
                    out[cu].add(cv)
                    out[cv].add(cu)
    return {u: set(vs) for u, vs in out.items()}


def ordinary_oct_exists(adj: dict, k: int):
    vertices = list(adj)
    for j in range(k + 1):
        for deleted in combinations(vertices, j):
            if is_bipartite_after(adj, set(deleted)):
                return True, set(deleted)
    return False, None


def signed_graph_audit(seed=1_000_100, random_cases=300) -> dict:
    rng = random.Random(seed)
    basic_mismatches = 0
    protected_mismatches = 0
    budget_checks = 0
    examples = []

    for case_id in range(random_cases):
        n = rng.randint(2, 5)
        m = rng.randint(1, 5)
        gates = []
        for _ in range(m):
            support = sorted(rng.sample(range(n), rng.randint(1, min(3, n))))
            dirs = [rng.randrange(2) for _ in support]
            gates.append({"support": support, "dirs": dirs})

        adj, deletable, protected = constraint_graph(gates)
        if (balanced_assignment(gates) is not None) != is_bipartite_after(adj, set()):
            basic_mismatches += 1

        for k in range(min(2, m) + 1):
            restricted, _ = restricted_oct_exists(adj, deletable, k)
            blown = protected_blowup(adj, protected, k)
            ordinary, _ = ordinary_oct_exists(blown, k)
            budget_checks += 1
            if restricted != ordinary:
                protected_mismatches += 1

        if case_id < 5:
            examples.append({"n": n, "m": m, "gates": gates})

    return {
        "seed": seed,
        "random_signed_instances": random_cases,
        "balance_vs_bipartite_mismatches": basic_mismatches,
        "protected_oct_budget_checks": budget_checks,
        "protected_blowup_mismatches": protected_mismatches,
        "sample_instances": examples,
    }


def tau_audit(seed=1_000_200, random_cases=500) -> dict:
    rng = random.Random(seed)
    mismatches = 0
    histogram = Counter()
    for _ in range(random_cases):
        n = rng.randint(2, 6)
        m = rng.randint(1, 7)
        gates = []
        for _ in range(m):
            support = sorted(rng.sample(range(n), rng.randint(1, min(3, n))))
            dirs = [rng.randrange(2) for _ in support]
            gates.append({"support": support, "dirs": dirs})

        direct = len(minimum_gate_deletion_bruteforce(gates))
        adj, deletable, _ = constraint_graph(gates)
        via_oct = None
        for k in range(m + 1):
            ok, _ = restricted_oct_exists(adj, deletable, k)
            if ok:
                via_oct = k
                break
        histogram[direct] += 1
        if direct != via_oct:
            mismatches += 1

    return {
        "seed": seed,
        "random_instances": random_cases,
        "tau_histogram": {str(k): histogram[k] for k in sorted(histogram)},
        "direct_vs_restricted_oct_mismatches": mismatches,
    }


def local_transform_from_monotone(hmask: int, input_flips, output_flip: int) -> int:
    out = 0
    for a in ASSIGNMENTS:
        b = tuple(a[i] ^ input_flips[i] for i in range(3))
        value = tt_bit(hmask, b) ^ output_flip
        idx = a[0] | (a[1] << 1) | (a[2] << 2)
        out |= value << idx
    return out


def eval_gate(mask: int, support, x) -> int:
    local = tuple(x[v] for v in support)
    return tt_bit(mask, local)


def eval_circuit(gates, x) -> tuple[int, ...]:
    return tuple(eval_gate(g["mask"], g["support"], x) for g in gates)


def target_extension_audit(seed=1_000_300, random_cases=300) -> dict:
    rng = random.Random(seed)
    monotone_essential = [
        m for m in range(256)
        if essential(m) and all(direction(m, i) == 0 for i in range(3))
    ]
    nonunate = [m for m in range(256) if essential(m) and not is_unate(m)]

    direction_mismatches = 0
    switching_mismatches = 0
    target_failures = 0

    for _ in range(random_cases):
        n = rng.randint(3, 7)
        tau = rng.randint(0, 2)
        core_m = n + 1
        global_r = [rng.randrange(2) for _ in range(n)]
        q = []
        core, transformed = [], []

        for _ in range(core_m):
            support = tuple(sorted(rng.sample(range(n), 3)))
            hmask = rng.choice(monotone_essential)
            qe = rng.randrange(2)
            q.append(qe)
            local_r = tuple(global_r[v] for v in support)
            fmask = local_transform_from_monotone(hmask, local_r, qe)
            core.append({"support": support, "mask": fmask})
            transformed.append({"support": support, "mask": hmask})
            dirs = [direction(fmask, i) for i in range(3)]
            expected = [global_r[v] ^ qe for v in support]
            if dirs != expected:
                direction_mismatches += 1

        defects = []
        for _ in range(tau):
            support = tuple(sorted(rng.sample(range(n), 3)))
            defects.append({"support": support, "mask": rng.choice(nonunate)})
        full = core + defects

        all_inputs = list(product((0, 1), repeat=n))
        for x in all_inputs:
            xp = tuple(x[v] ^ global_r[v] for v in range(n))
            original = eval_circuit(core, x)
            transformed_value = eval_circuit(transformed, xp)
            expected = tuple(transformed_value[e] ^ q[e] for e in range(core_m))
            if original != expected:
                switching_mismatches += 1
                break

        transformed_range = {eval_circuit(transformed, x) for x in all_inputs}
        missing = None
        for z in product((0, 1), repeat=core_m):
            if z not in transformed_range:
                missing = z
                break
        assert missing is not None
        y_core = tuple(missing[e] ^ q[e] for e in range(core_m))
        y = y_core + tuple(rng.randrange(2) for _ in range(tau))
        full_range = {eval_circuit(full, x) for x in all_inputs}
        if y in full_range:
            target_failures += 1

    return {
        "seed": seed,
        "random_constructed_circuits": random_cases,
        "direction_label_mismatches": direction_mismatches,
        "switching_equivalence_mismatches": switching_mismatches,
        "extended_target_failures": target_failures,
        "note": "Missing core words are found by brute force only for verification; V100 theorem uses the published monotone NC0_3-Avoid algorithm.",
    }


def build_summary() -> dict:
    census = truth_table_census()
    signed = signed_graph_audit()
    tau = tau_audit()
    extension = target_extension_audit()

    all_passed = (
        census["all_unate_functions"] == 104
        and census["all_nonunate_functions"] == 152
        and census["all_nonunate_distance_histogram"] == {"1": 144, "2": 8}
        and census["essential_ternary_functions"] == 218
        and census["essential_unate_functions"] == 72
        and census["essential_nonunate_functions"] == 146
        and census["nonunate_distance_histogram"] == {"1": 144, "2": 2}
        and signed["balance_vs_bipartite_mismatches"] == 0
        and signed["protected_blowup_mismatches"] == 0
        and tau["direct_vs_restricted_oct_mismatches"] == 0
        and extension["direction_label_mismatches"] == 0
        and extension["switching_equivalence_mismatches"] == 0
        and extension["extended_target_failures"] == 0
    )

    return {
        "lab": "V100",
        "date": "2026-08-26",
        "status": "internal theorem candidate; novelty not established",
        "theorem_candidate": {
            "parameter": "tau(C): minimum output deletions leaving an all-unate switching-balanced core",
            "condition": "tau(C) < m-n",
            "conclusion": "NC0_3-Avoid is deterministically FPT parameterized by tau(C)",
            "runtime": "3^tau * tau^O(1) * poly(|C|), using protected-OCT reduction plus a published OCT FPT algorithm and the published monotone NC0_3-Avoid algorithm",
            "proof_kernel": [
                "Non-unate outputs are mandatory deletions.",
                "For unate outputs, d(e,v)=r_v XOR q_e is a signed-balance system.",
                "Signed balance after deleting gates reduces to protected Odd Cycle Transversal.",
                "Protected OCT(k) reduces to ordinary OCT(k) by replacing each protected vertex by k+1 false twins.",
                "After deleting tau outputs, m-tau>n; input/output switches turn the core monotone.",
                "A missing word for the monotone core remains missing after arbitrary extension on deleted outputs.",
            ],
            "nonclaim": "This does not solve general NC0_3-Avoid at m=n+1 unless tau=0, and does not imply P != NP.",
        },
        "finite_census": census,
        "signed_balance_audit": signed,
        "tau_reduction_audit": tau,
        "target_extension_audit": extension,
        "all_internal_checks_passed": all_passed,
        "next_hypothesis": {
            "name": "local-exception robustification",
            "statement": "Every essential ternary predicate is at truth-table Hamming distance at most 2 from unate; exploit the 144 one-point defects (and two parity two-point defects) without deleting their outputs, by bounding simultaneous exception activation and constructing a remote point for the unate surrogate.",
        },
        "p_vs_np_resolved": False,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, default=Path("RESULTS.json"))
    args = parser.parse_args()
    summary = build_summary()
    args.output.write_text(json.dumps(summary, indent=2, sort_keys=True), encoding="utf-8")
    digest = hashlib.sha256(args.output.read_bytes()).hexdigest()
    print(json.dumps({
        "all_internal_checks_passed": summary["all_internal_checks_passed"],
        "essential": summary["finite_census"]["essential_ternary_functions"],
        "unate": summary["finite_census"]["essential_unate_functions"],
        "nonunate": summary["finite_census"]["essential_nonunate_functions"],
        "distance_histogram": summary["finite_census"]["nonunate_distance_histogram"],
        "sha256": digest,
    }, indent=2))


if __name__ == "__main__":
    main()
