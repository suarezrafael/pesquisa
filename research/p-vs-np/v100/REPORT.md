# P versus NP Laboratory V100 — Switching-defect parameter for `NC⁰₃-Avoid`

**Date:** 2026-08-26  
**Status:** internal theorem candidate; computer-assisted checks passed; not peer reviewed; novelty/priority not established.  
**Nonclaim:** this laboratory does **not** prove `P = NP`, `P ≠ NP`, or a polynomial-time algorithm for general `NC⁰₃-Avoid` at minimal stretch.

## 1. Why V100 changes direction

The recent line of the laboratory identified a useful easy class: ternary outputs that are **unate** and whose input directions can be made globally consistent by switching input bits and complementing outputs. Such a circuit becomes monotone after a global bijection of the input cube and coordinate-wise output complements. The published monotone `NC⁰₃-Avoid` theorem then applies whenever the number of remaining outputs exceeds the number of inputs.

The obstruction is global inconsistency: even if every output predicate is individually unate, the same input variable can be required with incompatible directions around cycles of the incidence graph. V100 asks a parameterized question instead of trying to remove that obstruction unconditionally:

> How many output coordinates must be discarded before the remaining circuit becomes globally switchable to a monotone `NC⁰₃` circuit?

This gives a concrete distance-to-tractability parameter and a falsifiable algorithmic theorem.

## 2. Definition of the switching-defect parameter

Let

`C : {0,1}^n -> {0,1}^m`

be a Boolean circuit whose output coordinate `e` depends on at most three input variables. Simplify every support first so it contains only essential variables.

For an individually unate output `e` and an incident variable `v`, define

- `d(e,v)=0` if `e` is nondecreasing in `v`;
- `d(e,v)=1` if `e` is nonincreasing in `v`.

A set of unate outputs is **switching-balanced** if there exist bits

- `r_v` for each input variable, and
- `q_e` for each retained output,

such that for every incidence

`d(e,v) = r_v XOR q_e`.

Interpretation:

- replace input `x_v` by `x_v XOR r_v`;
- complement output `e` when `q_e=1`.

After these switches, every retained output is monotone nondecreasing.

Define `tau(C)` as the minimum number of outputs that must be deleted so that every retained output is unate and the retained signed incidence graph is switching-balanced.

All non-unate outputs are therefore mandatory members of any defect set; additional unate outputs may have to be removed only to eliminate inconsistent signed cycles.

## 3. V100 theorem candidate

### Theorem

If `tau(C) < m-n`, then a word outside the range of `C` can be constructed deterministically in fixed-parameter tractable time parameterized by `tau(C)`.

Using a standard FPT algorithm for Odd Cycle Transversal, the overall dependence can be bounded by

`3^tau * tau^O(1) * poly(|C|)`

with the polynomial-time monotone `NC⁰₃-Avoid` algorithm used after the parameterized preprocessing.

### Proof kernel

#### Step 1 — delete the mandatory non-unate outputs

Every non-unate output must belong to the defect set by definition. Because locality is at most three, unateness and every local direction bit are computable in constant time per output truth table.

#### Step 2 — rewrite switching balance as parity constraints

For the retained unate outputs, switching balance is exactly the binary system

`r_v XOR q_e = d(e,v)`.

This system is satisfiable if and only if the signed incidence graph is balanced. A parity BFS detects this in linear time when no deletions are allowed.

#### Step 3 — reduce output deletion to protected Odd Cycle Transversal

Construct an ordinary graph from every signed incidence constraint:

- if `d(e,v)=1`, add a direct edge `e--v`, forcing opposite bipartite colors;
- if `d(e,v)=0`, replace the incidence by a two-edge path `e--s--v`, forcing equal colors of `e` and `v`.

Only gate vertices `e` are allowed to be deleted. Input vertices and subdivision vertices are protected.

The resulting graph is bipartite after deleting a set `F` of gate vertices if and only if the parity system on the retained circuit is satisfiable. Thus finding at most `k` additional unate outputs to remove is a **protected Odd Cycle Transversal** problem.

#### Step 4 — remove the protection restriction

For a budget `k`, replace every protected vertex by `k+1` independent false twins with the same neighborhoods (edges between two protected originals become the complete bipartite connection between their copy sets).

- If a protected-OCT solution of size at most `k` exists, the blown-up graph is bipartite after deleting the same ordinary gate vertices.
- Conversely, an ordinary OCT of size at most `k` cannot delete all `k+1` copies of any protected vertex. Choose one surviving copy of each protected original; together with all surviving deletable vertices these representatives induce the original graph minus only the deleted gate vertices. Since an induced subgraph of a bipartite graph is bipartite, a valid protected solution exists.

Therefore protected OCT is FPT with the same exponential parameter dependence, up to a polynomial factor in `k`.

#### Step 5 — switch the retained circuit to monotone form

Let `F` be a minimum defect set, `|F|=tau`. The retained circuit has `m' = m-tau > n` outputs. Solve the parity system to obtain `r_v,q_e`, switch the inputs by `r` and complement retained outputs by `q`. This is a bijection on the domain and an invertible coordinate transformation on the retained output space, so it preserves range-avoidance exactly.

The retained circuit is now monotone and still has locality at most three.

#### Step 6 — invoke monotone `NC⁰₃-Avoid`

Kuntewar and Sarma give a deterministic polynomial-time algorithm for monotone `NC⁰₃-Avoid` whenever `m'>n`. Apply that algorithm to obtain a missing retained word `z`.

Undo the output complements, obtaining a missing word for the original retained coordinates. Assign arbitrary bits to every deleted coordinate in `F`. If the resulting full word were in the range of `C`, its restriction to the retained coordinates would be in the retained range, contradicting the construction. Hence the full word is outside `range(C)`.

This proves the parameterized statement, conditional only on the cited published monotone-Avoid and OCT algorithms, not on the finite experiments below.

## 4. Exact ternary truth-table census

V100 also exhaustively classifies distance to unateness for all ternary Boolean truth tables.

### All 256 three-input functions

- unate: **104**;
- non-unate: **152**;
- among the non-unate functions:
  - **144** are Hamming distance exactly **1** from a unate truth table;
  - **8** are Hamming distance exactly **2** from a unate truth table;
  - none requires distance greater than 2.

Therefore every Boolean output of fan-in at most three has a unate surrogate obtained by modifying at most two local truth-table entries.

### Essential ternary functions only

There are **218** essential ternary functions:

- **72** unate;
- **146** non-unate.

The 218 essential functions form **10 NPN classes**. For the 146 essential non-unate functions:

- **144** are distance exactly 1 from some unate function;
- the remaining **2** are the parity/XNOR orbit, represented canonically here by `0x69`, and have distance exactly 2.

NPN class table:

| representative | orbit size | unate | distance to unate |
|---|---:|---:|---:|
| `0x01` | 16 | yes | 0 |
| `0x06` | 24 | no | 1 |
| `0x07` | 48 | yes | 0 |
| `0x16` | 16 | no | 1 |
| `0x17` | 8 | yes | 0 |
| `0x18` | 8 | no | 1 |
| `0x19` | 48 | no | 1 |
| `0x1b` | 24 | no | 1 |
| `0x1e` | 24 | no | 1 |
| `0x69` | 2 | no | 2 |

This finite lemma is independent of the switching-defect theorem. Its importance is strategic: deleting every non-unate output is probably too destructive near minimal stretch, but almost every hard local predicate differs from a unate predicate on only one of eight local assignments.

## 5. Computational falsification and verification

`p_vs_np_lab_v100.py` ran three independent families of checks in addition to the exhaustive 256-function census.

### Signed-balance reduction

Seed `1000100`:

- 300 random signed incidence instances;
- direct parity satisfiability versus transformed graph bipartiteness: **0 mismatches**;
- 842 protected-OCT budget comparisons (`k<=2`) against the `k+1`-copy ordinary-OCT reduction: **0 mismatches**.

### Exact `tau` comparison

Seed `1000200`:

- 500 random signed incidence instances;
- direct brute-force minimum gate deletion compared with minimum protected-OCT deletion: **0 mismatches**.

Observed `tau` histogram in this test set:

- `tau=0`: 286;
- `tau=1`: 144;
- `tau=2`: 58;
- `tau=3`: 11;
- `tau=4`: 1.

The histogram is descriptive only; no distributional claim is made.

### Switching and target extension

Seed `1000300`:

- 300 constructed circuits with a switching-balanced unate core and 0–2 arbitrary non-unate defect outputs;
- direction-label mismatches: **0**;
- switching-equivalence mismatches under exhaustive input enumeration: **0**;
- failures of the “missing core word + arbitrary defect bits” extension argument: **0**.

For these finite tests the missing core word was deliberately found by brute force, so the test is independent of any implementation of the published monotone-Avoid algorithm. It verifies only the reduction/extension logic.

### Independent verifier

`verify_independent.py` does not import the main laboratory implementation. It independently recomputes:

- the exact 218/72/146 census;
- the 10 NPN orbit sizes;
- the 144/2 essential distance distribution;
- every one of the **512** signings of a complete `3 x 3` gate-variable incidence pattern, comparing direct brute-force parity satisfiability with graph bipartiteness.

Result: **all checks passed**.

`RESULTS.json` SHA-256:

`c8d09832714bf6338d59ecea1c63101580bd06aed5ac07991082936334ec5aa9`

## 6. Relation to the current frontier

The published monotone result solves monotone `NC⁰₃-Avoid` at the optimal expansion condition `m>n`. General `NC⁰_k-Avoid` remains substantially harder: ITCS 2026 gives improved exponential/local algorithms and equivalences to lower bounds, not a polynomial-time minimal-stretch algorithm for arbitrary `NC⁰₃` circuits.

V100 does **not** change that general frontier. It defines a new parameterized bridge to the monotone theorem:

`arbitrary NC⁰₃ circuit -> delete tau output defects -> switching-balanced unate core -> monotone NC⁰₃ core with m-tau>n -> polynomial-time avoided word`.

A targeted literature search did not locate this exact `tau(C)` formulation or this specific composition with protected OCT. That is not evidence of novelty; specialist prior-art review is still required before any external novelty claim.

## 7. What V100 actually advances

The useful advance is not a smaller worst-case stretch threshold. It is a **distance-to-monotone FPT theorem candidate** with an explicit, computable structural parameter and a proof-producing graph reduction.

At minimal stretch `m=n+1`, the condition `tau<m-n` forces `tau=0`; therefore V100 by itself gives no progress on arbitrary minimal-stretch circuits. At larger stretch, it tolerates a number of globally inconsistent/non-unate outputs strictly smaller than the available stretch.

This is best rated as an internal level-3-style structural extension, not a level-4 worst-case frontier result.

## 8. Strongest next hypothesis — V101

The exact census suggests a route that does not throw away non-unate outputs.

For each output `f_e`, choose a closest unate surrogate `h_e`. For fan-in at most three, the local exception set

`E_e = {a : f_e(a) != h_e(a)}`

has size at most two; for 144 of the 146 essential non-unate predicates it has size one.

Define the **simultaneous exception activation**

`beta = max_x |{e : x|supp(e) in E_e}|`.

For every input `x`, the original circuit `C(x)` and its unate surrogate `H(x)` differ in at most `beta` output coordinates. Consequently, any target whose Hamming distance from the entire range of `H` is greater than `beta` is automatically outside the range of `C`.

The V101 target is therefore:

1. make the unate surrogate globally switchable with fewer or no output deletions;
2. upper-bound `beta` from support/exception structure without enumerating all inputs;
3. construct a **remote point**, not merely an absent point, for the monotone surrogate;
4. combine the V85 pair-counting/remote-point direction with loose-`chi` cycle structure;
5. search adversarially for families where many one-point exceptions activate simultaneously;
6. promote only if the resulting theorem treats circuits with nonzero defect even at or near minimal stretch.

This attacks the real weakness of V100: at `m=n+1`, deletion budget disappears.

## 9. References used for the proof boundary

- Neha Kuntewar and Jayalal Sarma, *Range Avoidance in Boolean Circuits via Turan-type Bounds*, arXiv:2503.17114 (2025). Monotone `NC⁰₃-Avoid` in deterministic polynomial time for `m>n`.
- Bruce Reed, Kaleigh Smith, Adrian Vetta, *Finding odd cycle transversals*, Operations Research Letters 32(4), 2004. Establishes fixed-parameter tractability of Odd Cycle Transversal.
- Sudeshna Kolay, Pranabendu Misra, M. S. Ramanujan, Saket Saurabh, *Faster Graph Bipartization*, Journal of Computer and System Sciences 109, 2020. Gives `3^k k^{O(1)}(m+n)`-type running time.
- Shengtang Huang, Xin Li, Yan Zhong, *Range Avoidance and Remote Point: New Algorithms and Hardness*, ITCS 2026. Current algorithms/hardness connections for Range Avoidance and Remote Point.
- Karthik Gajulapalli, Alexander Golovnev, Satyajeet Nagargoje, Sidhant Saraogi, *Range Avoidance for Constant Depth Circuits: Hardness and Algorithms*, APPROX/RANDOM 2023. Hardness/algorithmic context for local circuits.
