# P versus NP Laboratory V101 — Local-exception geometry and bounded-width remote points

**Date:** 2026-08-27  
**Status:** internal structural theorem + explicit barrier; computational checks passed locally in the research harness; CI is part of this lab.  
**Scientific boundary:** this does **not** prove `P = NP`, `P != NP`, or solve general `NC0_3-Avoid[n,n+1]`. Novelty/priority has not been established by specialist review.

## 1. Starting point

V100 showed that every ternary Boolean output is within truth-table Hamming distance at most two of an unate output, and 144 of the 146 essential non-unate ternary functions are distance exactly one. V100's theorem candidate deleted problematic output coordinates until a switching-balanced unate core remained.

That is useful at surplus `m-n > tau`, but it collapses at minimal stretch `m=n+1`: deleting even one output destroys the `m'>n` condition.

V101 therefore keeps **all** output coordinates.

For a circuit

`C:{0,1}^n -> {0,1}^m`,

choose a local surrogate

`H:{0,1}^n -> {0,1}^m`

with the same support per output. For output `e`, define its local exception set

`E_e = {a : C_e(a) != H_e(a)}`.

When `H_e` is chosen as a closest unate surrogate in fan-in at most three, V100 guarantees `|E_e|<=2`.

Define

`beta(C,H) = max_x dist_H(C(x),H(x))`.

The V101 question is: can a point remote from `range(H)` be converted into an avoided point for `C`, while computing/certifying `beta` structurally?

## 2. Robustification lemma

### Lemma V101.1

If

`dist_H(z, range(H)) > beta(C,H)`,

then

`z notin range(C)`.

### Proof

For every input `x`, by the triangle inequality,

`dist(z,C(x)) >= dist(z,H(x)) - dist(H(x),C(x))`.

The first term is greater than `beta`, while the second is at most `beta`. Hence `dist(z,C(x))>0` for every `x`, so `z != C(x)` for every input. QED.

The lemma is elementary. The important issue is whether `beta` can be understood and whether the required remote point can be constructed deterministically.

## 3. Exact geometry of beta: a conflict graph

Create one **exception event** for every pair `(e,a)` with `a in E_e`. The event is the partial Boolean assignment saying that the variables in `supp(e)` equal `a`.

Construct `G_exc`:

- one vertex per exception event;
- two vertices are adjacent iff their partial assignments disagree on some variable that occurs in both supports.

### Theorem V101.2

`beta(C,H) = alpha(G_exc)`,

where `alpha` is the maximum independent-set number.

### Proof

Fix an input `x`. Every exception event activated by `x` agrees with the same global assignment, so the activated events are pairwise compatible and therefore form an independent set. Thus

`beta <= alpha(G_exc)`.

Conversely, take any independent set of exception events. Its partial assignments are pairwise compatible. For Boolean partial assignments, pairwise compatibility is enough for global compatibility: every variable receives at most one requested value across the set. Assign those requested values and extend all remaining variables arbitrarily. This global input activates every event in the independent set. Hence

`beta >= alpha(G_exc)`.

Therefore equality holds. QED.

This is stronger than treating `beta` as an opaque worst-case distance: it converts the simultaneous activation problem into a standard combinatorial object.

## 4. Exact beta is NP-hard even for singleton exceptions

The conflict characterization also exposes a barrier.

### Theorem V101.3

Computing `beta(C,H)` exactly is NP-hard even when:

- every original hard output is binary XOR;
- every chosen surrogate is unate;
- every output differs from its surrogate on **exactly one** local assignment.

### Reduction from Max-Cut

Given an undirected graph `G=(V,E)`, create two outputs for each edge `{u,v}`.

Both original outputs compute

`f(u,v)=u XOR v`.

For the first copy choose the unate surrogate

`h_01(u,v)=u AND NOT v`.

XOR and `h_01` differ only at `(u,v)=(0,1)`.

For the second copy choose

`h_10(u,v)=NOT u AND v`.

XOR and `h_10` differ only at `(u,v)=(1,0)`.

For a global assignment `x`:

- if edge `{u,v}` is not cut, neither copy is exceptional;
- if the edge is cut, exactly one of the two copies is exceptional.

Therefore

`dist(C(x),H(x)) = number of cut edges under x`,

and hence

`beta(C,H)=MaxCut(G)`.

The V101 harness tested this reduction on 200 random graphs (659 edges total), with zero mismatches. The independent verifier exhausts all 64 graphs on four labeled vertices.

### FPT escape

If only `k` input variables appear in exception events, exact `beta` is computable in

`O(2^k * |events|)`

by enumerating assignments to those variables. V101 checks this against brute force and the conflict-graph characterization on 300 random circuits, with zero mismatches.

So V101 does not pretend `beta` is generally easy; it identifies an exact hard core and a natural structural parameter.

## 5. Deterministic remote point by prefix pair counting

Let

`B(m,r)=sum_{j=0}^r binom(m,j)`

be the Hamming-ball volume.

Suppose a certified upper bound `b >= beta(C,H)` is available and

`2^n B(m,b) < 2^m`.

Equivalently,

`B(m,b) < 2^(m-n)`.

There are fewer than `2^m` pairs `(x,z)` with `z` within Hamming distance `b` of `H(x)`. Existence of a remote point follows immediately by counting, but V101 needs an **explicit deterministic construction**.

For an output prefix `p` of length `j`, define

`A(p) = # {(x,z): z starts with p and dist(H(x),z)<=b}`.

For a fixed input `x`, if

`d = dist(H_[j](x),p)`,

then the number of suffixes completing `p` to a word within radius `b` of `H(x)` is

`B(m-j,b-d)`.

Hence

`A(p)=sum_x B(m-j,b-dist(H_[j](x),p))`.

Also

`A(p)=A(p0)+A(p1)`.

At the root,

`A(empty)=2^n B(m,b) < 2^m`.

If a prefix satisfies

`A(p) < 2^(m-|p|)`,

then at least one child satisfies the analogous inequality. Choose the child with the smaller exact count. At length `m`, the right-hand side is `1`, while `A(z)` is an integer, so

`A(z)=0`.

Thus `z` has distance greater than `b` from every `H(x)`, and Lemma V101.1 implies `z` is outside `range(C)`.

The remaining algorithmic question is exact computation of `A(p)`.

## 6. Bounded-width exact pair counting

For a fixed prefix, associate a formal variable `t` with Hamming mismatch. Every prefix output gate contributes the local factor

`t^[H_e(x) != p_e]`.

Multiplying the factors and summing over all input assignments gives the truncated generating polynomial

`P_p(t)=sum_x t^dist(H_[j](x),p)`.

If

`P_p(t)=sum_d N_d t^d`,

then

`A(p)=sum_{d=0}^b N_d B(m-j,b-d)`.

V101 implements this with polynomial-valued **variable elimination**. When the supplied elimination order has induced width `w`, every bucket table contains at most `2^(w+1)` Boolean assignments, and polynomial coefficients are truncated at degree `b`.

### Theorem V101.4 — bounded-width robust avoidance

Given `C,H:{0,1}^n->{0,1}^m`, a certified `b >= beta(C,H)`, and a variable-elimination order of induced width `w` for the primal graph of `H`, if

`B(m,b) < 2^(m-n)`,

then a word outside `range(C)` can be constructed deterministically in

`m * 2^O(w) * poly(n,m,b)`

time, plus the cost of certifying `b`.

The same elimination order works for every prefix because a prefix only removes output factors from the full primal graph; it cannot increase the induced width.

### Near-unate `NC0_3` corollary

Choose a closest unate surrogate per output using the V100 finite classification. If

- `k` variables occur in local exception events;
- the surrogate has elimination width `w`;
- exact `beta` is obtained in `O(2^k |events|)`;
- `B(m,beta)<2^(m-n)`;

then range avoidance is FPT in `k+w`, while **retaining every output coordinate**, including non-unate ones.

This is the central positive result of V101.

## 7. Experimental verification

### Conflict theorem

Seed `1010100`:

- 300 random local `(C,H)` instances;
- `beta` by exhaustive inputs vs `alpha(G_exc)`: 0 mismatches;
- `beta` vs enumeration of exception variables: 0 mismatches.

### Max-Cut reduction

Seed `1010200`:

- 200 random graphs;
- 659 total edges;
- `beta` vs exact Max-Cut: 0 mismatches.

### Polynomial-valued variable elimination

Seed `1010300`:

- 300 random surrogate/prefix/radius instances;
- exact brute-force pair count vs variable-elimination count: 0 mismatches.

### End-to-end remote construction

Seed `1010400`:

- 150 accepted random instances satisfying the volume condition;
- beta values 0 through 3 represented;
- every constructed target was farther than beta from the surrogate range;
- every target avoided the original perturbed circuit;
- failures: 0.

`RESULTS.json` is deterministic and generated by the main script.

## 8. What surplus does the volume condition require?

For constant beta, the required surplus is logarithmic in `m`.

For `beta=1`, `B(m,1)=m+1`, so it suffices that

`m-n > log2(m+1)`.

Examples from V101:

| m | beta=1 minimum surplus | beta=2 | beta=3 |
|---:|---:|---:|---:|
| 32 | 6 | 10 | 13 |
| 64 | 7 | 12 | 16 |
| 128 | 8 | 14 | 19 |
| 256 | 9 | 16 | 22 |
| 1024 | 11 | 20 | 28 |

Thus V101 enters a genuinely different regime from V100: one simultaneously active local defect can be tolerated without deleting any coordinate at only `Theta(log m)` surplus, provided the surrogate counting structure has controlled width.

This is still far from `m=n+1`.

## 9. Minimal-stretch barrier: monotone range can already dominate the cube

The key falsification in V101 is that the natural remote-point strategy **cannot** simply be pushed to `m=n+1` with `beta=1`.

Consider `n=3,m=4` and the monotone circuit

- `h1 = x0 AND x1 AND x2`;
- `h2 = x0 OR (x1 AND x2)`;
- `h3 = x1 OR (x0 AND x2)`;
- `h4 = x2 OR (x0 AND x1)`.

All four outputs are monotone and depend essentially on all three inputs.

Its image is exactly

`{0000,0001,0010,0100,0111,1111}`.

Exhaustive checking of all 16 words of the four-dimensional cube gives

`covering_radius(range(H)) = 1`.

Therefore **no** word is at distance greater than one from the range.

This is not an isolated small-`n` artifact. For every `n>=3`, append identity outputs for the additional variables:

`H_n(x)=(H_3(x0,x1,x2), x3, ..., x_(n-1))`.

Then `H_n` is monotone `NC0_3`, has `m=n+1`, and its range still has covering radius one because it is the Cartesian product of the six-word base image with a full cube.

### Consequence

Any proof framework that knows only

`dist(C(x),H(x))<=1`

and then demands a point of distance `>1` from `range(H)` **cannot solve general minimal-stretch avoidance**, even when the surrogate is already monotone and the base example uses essential ternary gates.

The robustification lemma is correct; the symmetric Hamming envelope is simply too lossy.

## 10. Why this is useful rather than a dead end

V101 simultaneously gives:

1. a positive deterministic theorem for nonzero defects at logarithmic surplus under bounded-width counting structure;
2. an exact combinatorial interpretation of simultaneous exceptions;
3. an NP-hardness explanation for why exact global exception overlap cannot be treated as a trivial preprocessing step;
4. an explicit infinite-family barrier proving that the symmetric remote-point formulation cannot reach minimal stretch even for `beta=1`.

The negative result sharply identifies what information is being thrown away: an exception is not an arbitrary Hamming flip. For a fixed input and gate, it has a **specific orientation** and a specific local activation pattern.

## 11. V102 target — oriented exception geometry

V102 should replace the symmetric containment

`C(x) in Ball(H(x), beta)`

by the exact directed correction set

`C(x)=H(x) XOR D(x)`,

where `D(x)` is determined by simultaneously activated exception events.

The intended program is:

1. define the directed exceptional neighborhood
   `N_exc(H(x))={H(x) XOR D(x)}` allowed by local event activation, instead of an entire Hamming ball;
2. count prefix pairs `(x,z)` only for **realizable directed corrections**;
3. determine whether those directed neighborhoods can have average size strictly below 2 even when `m=n+1`;
4. exploit the V101 conflict graph to count/encode compatible correction sets;
5. test the explicit covering-radius-one monotone family as the first adversarial benchmark — symmetric balls cover the entire cube, so any V102 gain must come from deleting unrealizable flip directions;
6. treat the parity/XNOR two-exception orbit separately;
7. promote only if a theorem handles `beta>0` closer to minimal stretch than the `Theta(beta log m)` volume barrier.

This is now the most promising continuation because it attacks the exact information loss exposed by V101 rather than increasing finite enumeration sizes.

## 12. Current literature boundary checked for V101

- Kuntewar and Sarma, *Range Avoidance in Boolean Circuits via Turan-type Bounds* (2025), give deterministic polynomial time for monotone `NC0_3-Avoid` whenever `m>n` and develop the loose-cycle/Turan framework.
- Huang, Li, and Zhong, *Range Avoidance and Remote Point: New Algorithms and Hardness* (ITCS 2026), study Remote-Point and give improved general `NC0_k-Avoid` algorithms, including local algorithms at `m=n+1`; their results emphasize that deterministic explicit avoidance remains tightly connected to circuit lower bounds.

A targeted search did not identify the exact V101 composition `local unate exceptions -> conflict alpha -> bounded-width polynomial pair counting -> robust avoided word`, nor the specific four-output monotone covering-radius-one obstruction. This is **not** a novelty claim; specialist literature review is required before external use.
