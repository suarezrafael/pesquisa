"""Independent verifier for P versus NP Lab V100.

Uses separate brute-force routines rather than importing p_vs_np_lab_v100.py.
"""
from __future__ import annotations
import argparse, json
from itertools import product, permutations
from collections import defaultdict, Counter
from pathlib import Path

PTS=list(product((0,1), repeat=3))

def val(mask,a):
    return (mask >> (a[0] + 2*a[1] + 4*a[2])) & 1

def depends(mask,i):
    for other in product((0,1), repeat=2):
        a=[0,0,0]; b=[0,0,0]; j=0
        for t in range(3):
            if t==i: continue
            a[t]=b[t]=other[j]; j+=1
        a[i]=0; b[i]=1
        if val(mask,tuple(a)) != val(mask,tuple(b)):
            return True
    return False

def unate(mask):
    for i in range(3):
        pairs=[]
        for a in PTS:
            if a[i]: continue
            b=list(a); b[i]=1
            pairs.append((val(mask,a),val(mask,tuple(b))))
        increasing=all(x<=y for x,y in pairs)
        decreasing=all(x>=y for x,y in pairs)
        if not (increasing or decreasing): return False
    return True

def npn(mask):
    out=set()
    for p in permutations(range(3)):
        for flips in product((0,1), repeat=3):
            for oc in (0,1):
                z=0
                for a in PTS:
                    x=tuple(a[p[i]]^flips[i] for i in range(3))
                    z |= (val(mask,x)^oc) << (a[0]+2*a[1]+4*a[2])
                out.add(z)
    return out

def census():
    essential=[m for m in range(256) if all(depends(m,i) for i in range(3))]
    eu=[m for m in essential if unate(m)]
    en=[m for m in essential if not unate(m)]
    ua=[m for m in range(256) if unate(m)]
    dh=Counter(min((m^u).bit_count() for u in ua) for m in en)
    reps={min(npn(m)) for m in essential}
    sizes={r:sum(min(npn(m))==r for m in essential) for r in reps}
    return len(essential),len(eu),len(en),dict(dh),sizes

def parity_sat_bruteforce(n,m,labels):
    # labels[e][v], complete m x n signed incidence
    for bits in product((0,1), repeat=n+m):
        r=bits[:n]; q=bits[n:]
        if all((r[v]^q[e])==labels[e][v] for e in range(m) for v in range(n)):
            return True
    return False

def transformed_graph(n,m,labels):
    g=defaultdict(set)
    for e in range(m):
        E=('e',e); g[E]
        for v in range(n):
            V=('v',v); g[V]
            if labels[e][v]==1:
                g[E].add(V); g[V].add(E)
            else:
                S=('s',e,v); g[S]
                g[E].add(S);g[S].add(E);g[S].add(V);g[V].add(S)
    return dict(g)

def bip(g,deleted=frozenset()):
    c={}
    for s in g:
        if s in deleted or s in c: continue
        c[s]=0; Q=[s]
        while Q:
            u=Q.pop()
            for v in g[u]:
                if v in deleted: continue
                if v not in c: c[v]=c[u]^1;Q.append(v)
                elif c[v]==c[u]: return False
    return True

def exhaustive_balance():
    # Every signing of K_{3,3}: 2^9=512 cases.
    mism=0
    for flat in product((0,1), repeat=9):
        labels=[flat[3*e:3*e+3] for e in range(3)]
        if parity_sat_bruteforce(3,3,labels) != bip(transformed_graph(3,3,labels)):
            mism+=1
    return mism

def main():
    ap=argparse.ArgumentParser();ap.add_argument('results',type=Path);args=ap.parse_args()
    data=json.loads(args.results.read_text())
    e,u,nu,dh,sizes=census()
    assert (e,u,nu)==(218,72,146)
    assert dh=={1:144,2:2}
    assert sizes=={1:16,6:24,7:48,22:16,23:8,24:8,25:48,27:24,30:24,105:2}
    assert exhaustive_balance()==0
    assert data['all_internal_checks_passed'] is True
    assert data['finite_census']['all_unate_functions']==104
    assert data['finite_census']['all_nonunate_functions']==152
    assert data['finite_census']['all_nonunate_distance_histogram']=={'1':144,'2':8}
    assert data['finite_census']['essential_ternary_functions']==e
    assert data['finite_census']['nonunate_distance_histogram']=={'1':144,'2':2}
    print('V100 independent verification passed: census exact; 512/512 K3,3 signings agree with bipartite reduction; RESULTS consistent.')
if __name__=='__main__': main()
