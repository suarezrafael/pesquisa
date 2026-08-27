# P versus NP Laboratory — V101 Core Context

## Load only this context first

V100 introduced the switching-defect parameter `tau(C)` for `NC0_3-Avoid`.

For an unate output gate `e`, let `d(e,v)` be its monotonicity direction on input `v`. A retained unate circuit is globally switchable to monotone form iff there are bits `r_v,q_e` satisfying

`d(e,v)=r_v XOR q_e`

on every incidence. Deleting output gates until this holds reduces to protected Odd Cycle Transversal. Protected OCT(k) reduces to ordinary OCT(k) by making `k+1` false twins of every protected input/subdivision vertex. Hence if

`tau(C) < m-n`,

the retained core has `m-tau>n`, switches to monotone `NC0_3`, and the published Kuntewar--Sarma monotone-Avoid algorithm returns a missing core word. Arbitrarily extending that word over deleted output coordinates gives a word outside the original range. The resulting algorithm is FPT in `tau`; it is not a general minimal-stretch algorithm.

V100 finite census:

- all 256 ternary functions: 104 unate, 152 non-unate;
- every non-unate ternary function is Hamming distance <=2 from unate;
- 144/152 are distance 1, 8/152 distance 2;
- essential ternary functions: 218 total = 72 unate + 146 non-unate;
- 144/146 essential non-unate functions are distance 1;
- only the two-function parity/XNOR NPN orbit (`0x69` representative) needs distance 2.

Verification:

- 300 random signed-balance instances, 0 reduction mismatches;
- 842 protected-OCT blowup checks, 0 mismatches;
- 500 exact-tau instances, 0 mismatches;
- 300 switching/target-extension circuits, 0 failures;
- independent verifier checks all 512 signings of K3,3 and the complete ternary census.

## V101 primary hypothesis: local-exception robustification

For each output `f_e`, choose a closest unate surrogate `h_e` and local exception set

`E_e={a : f_e(a) != h_e(a)}`,

where `|E_e|<=2` for fan-in <=3.

Define

`beta=max_x |{e : x|supp(e) in E_e}|`.

Then for every input x,

`dist(C(x),H(x)) <= beta`.

Therefore any target z satisfying

`dist(z, range(H)) > beta`

is outside `range(C)`.

## Required V101 work

1. Prove the robustification lemma formally and independently verify it.
2. Build an exact optimizer for `beta` on small circuits and identify its CSP structure.
3. Seek efficiently computable upper bounds on `beta` from support incidence, exception literals, fractional packing, spectral bounds, or bounded-width structure.
4. Revisit the V85 remote-point theorem: exact prefix pair counting constructs radius-r remote points whenever `2^n B(m,r)<2^m`. Determine whether the unate/switching structure permits such counting or a combinatorial substitute.
5. Combine loose-chi certificates with multiplicity/packing to seek Hamming distance >1 from the monotone range.
6. Adversarially generate circuits in which many one-point exceptions activate simultaneously; preserve the smallest obstruction.
7. Treat parity/XNOR separately rather than hiding its two-point exception set.
8. A V101 promotion requires a theorem that tolerates nonzero local exceptions without deleting all affected outputs. Numerical success alone is insufficient.

## Scientific boundary

General `NC0_3-Avoid[n,n+1]` remains open in this laboratory. V100/V101 do not prove P=NP or P!=NP. Any novelty claim requires specialist prior-art review.
