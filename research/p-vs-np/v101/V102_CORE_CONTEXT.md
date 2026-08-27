# P versus NP Laboratory — V102 Core Context

## Load this first

V101 studies a circuit `C` through a local surrogate `H` with the same output supports.
For each output `e`, local exception events are assignments `a` on `supp(e)` where
`C_e(a) != H_e(a)`.

Define

`beta(C,H)=max_x dist(C(x),H(x))`.

### V101 theorem 1 — robustification

If `dist(z,range(H))>beta`, then `z` is outside `range(C)` by the triangle inequality.

### V101 theorem 2 — exact exception conflict geometry

Build `G_exc` with one vertex per local exception event; two events are adjacent iff their partial assignments disagree on some shared input variable. Then

`beta(C,H)=alpha(G_exc)`.

Reason: every input activates a pairwise-compatible event set, and every pairwise-compatible set of Boolean partial assignments has a common global extension.

Exact beta is NP-hard even when every exception set has size one relative to a fixed nearest unate surrogate. Max-Cut reduction: each graph edge `{u,v}` becomes two XOR outputs in `C`; in `H` use `u & !v` for one copy and `!u & v` for the other. Exactly one copy differs iff the edge is cut, hence beta=MaxCut.

If only k input variables occur in exception events, beta is exactly computable in `O(2^k |events|)`.

### V101 theorem 3 — bounded-width remote construction

Let `b>=beta` be certified and suppose H has an input-variable elimination order of induced width w. Define

`B(m,r)=sum_{j<=r} binom(m,j)`.

If

`2^n B(m,b) < 2^m`, equivalently `B(m,b)<2^(m-n)`,

then V101 deterministically constructs a b-remote point for H and therefore an avoided word for C.

For prefix p of length j,

`A(p)=sum_x B(m-j, b-dist(H_[j](x),p))`.

`A(p)=A(p0)+A(p1)`. Starting from `A(empty)<2^m`, choose the smaller child at each step. Polynomial-valued variable elimination computes exact prefix mismatch distributions in `2^O(w) poly(n,m,b)` time. At a full word the integer pair count is <1, hence zero.

Total runtime:

`m * 2^O(w) * poly(n,m,b)` plus beta certification.

Near-unate NC0_3 corollary: V100 gives <=2 local truth-table exceptions per output. If exception-variable count k and surrogate elimination width w are small, this is FPT in k+w and retains every output coordinate.

For constant beta, the volume condition needs surplus `Theta(beta log m)`; beta=1 requires `m-n > log2(m+1)`.

### V101 barrier — symmetric balls cannot reach minimal stretch

There is an all-essential ternary monotone `H_3:{0,1}^3->{0,1}^4`:

- `h1=x0&x1&x2`
- `h2=x0|(x1&x2)`
- `h3=x1|(x0&x2)`
- `h4=x2|(x0&x1)`

Its image is

`{0000,0001,0010,0100,0111,1111}`

and has covering radius exactly 1 in the 4-cube. Appending identity coordinates gives an infinite monotone NC0_3 family with `m=n+1` and covering radius 1.

Therefore a framework that only knows `dist(C(x),H(x))<=1` and asks for a point at distance >1 from `range(H)` cannot solve minimal stretch. The symmetric Hamming envelope loses too much information.

## V102 primary direction — oriented exception geometry

Do **not** replace realizable corrections by a full Hamming ball.

Write

`C(x)=H(x) XOR D(x)`,

where D(x) is the exact correction pattern induced by the exception events activated by x.

Define the directed exceptional image

`S_exc = { H(x) XOR D(x) : x in {0,1}^n } = range(C)`

but represent/count it through H plus the local event structure rather than evaluating all inputs.

### Required V102 work

1. Define prefix pair counts that include only **realizable directed correction patterns**, not every subset of <=beta coordinates.
2. Use the conflict graph / partial-assignment representation to characterize which correction sets can activate simultaneously.
3. Test whether average directed-neighborhood size can be <2 at `m=n+1`, even though radius-1 Hamming balls cover the entire cube in the V101 barrier family.
4. Build exact small-instance counters for directed prefix completions and compare against symmetric-ball counts; preserve smallest strict separation examples.
5. Search for structural sufficient conditions (bounded conflict width, bounded event-variable treewidth, laminar supports, one-point exceptions, switching-balanced surrogate) under which directed prefix counts are polynomial/FPT.
6. Treat parity/XNOR two-point exception gates separately.
7. Try to combine H's monotone/loose-cycle structure with event orientation rather than using only bounded primal treewidth.
8. Promotion criterion: produce a theorem that handles beta>0 with surplus asymptotically below `Theta(beta log m)`, ideally including a nontrivial `m=n+1` subclass.

## Scientific boundary

General `NC0_3-Avoid[n,n+1]` remains open here. V101/V102 do not prove P=NP or P!=NP. Novelty is not established.
