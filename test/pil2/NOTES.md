# PIL2
## Feature Table (Language)

| Feature | State | Development | Test | Notes |
|---------|-------|-------------|------|-------|
| **general** |  |  |  |  |
| refactoring, classes | wip | 50% |  |  |
| **randomness access** |  |  |  |  |
| challenge |  |  |  |  |
| stage |  |  |  |  |
| **conditional constraints** |  |  |  |  |
| when | yacc |  |  |  |
| when-block | yacc  |  |  |  |
| condition json output  |  |  |  |  |
| **language** |  |  |  |  |
| vars | yacc |  |  |  |
| references |  |  |  |  |
| for-loop | yacc |  |  |  |
| while/do loop | yacc |  |  |  |
| break, continue |  |  |  |  |
| switch-case |  |  |  |  |
| if-elseif-else |  |  |  |  |
| assignation |  |  |  |  |
| comparation |  |  |  |  |
| constraint | done | 100% |  |  |
| pols single assign | done | 100% |  |  |
| pols deferred assign | done | 100% |  |  |
| accumulative expressions |  |  |  |  |
| built-in-functions (println) | wip | 40% |  |  |
| functions  |  |  |  |  |
| bigint expressions  |  |  |  |  |
| reserved (N, prime) |  |  |  |  |
| multidimensional arrays  |  |  |  |  |
| **constants generation** |  |  |  |  |
| s3 short-sequence-syntax |  |  |  |  |
| usign language |  |  |  |  |
| long tables (keccak states) |  |  |  |  |
| constants optimization |  |  |  |  |
| **subproofs** |  |  |  |  |
| compatible syntax | done | 100% |  |  |
| subproof syntax | done | 100% |  |  |
| multiple executions (n) |  |  |  |  |
| subproof json output |  |  |  |  |
| **prior/next** |  |  |  |  |
| static prior/next |  |  |  |  |
| dynamic prior/next  |  |  |  |  |
| **range check** |  |  |  |  |
| range check |  |  |  |  |
| range check json output |  |  |  |  |
| **connect** |  |  |  |  |
| built-in-functions (connect) |  |  |  |  |
| built-in-functions (setIdentity) |  |  |  |  |
| **miscelaneous** |  |  |  |  |
| no degree limitation |  |  |  |  |

## Randomness access


```
    challenge alfa stage 2;


    pol commit z stage 1;

    pol commit a;  // equivalent to `pol commit a stage 1`

    // Optional
    pol commit z[10] stage 3;

    // Optional (Not in first version)
    challenge ys[12]{0..31} stage 3;

````

stage 0 for constants (pre-processing)

Default stage is 1 (first committed pols)

pol is committed at stage 2 (it is available from this stage)

## Conditionals constraints

```
    // Proposal 1
    (1- L1) { b*c === a };

    // Proposal 2  THE GOOD ONE
    when L1 { a === a'; };
    when 1-L1 { a === b*c; };

    d == e*f' when 1- LLAST

    defaultwhen 1-LLAST

    when L1 {
        a === a';
        b === b';
    };

    // Actual way
    L1* (a' -a) === 0;
    (1-L1)* (b*c -a) === 0;

```
selector binary.


## Boundary constraints

It's a concrete case of the construction conditions.

## Constructive language

```
TO_REVIEW:

// variable (var)
// expressions (expr)
// public
// challenge
// pol constant
// pol commit
// pol temporal
// constant (const)
// refpol reference to pol (constant, commit, temporal) (or an array of polynomials)
// refvar reference to var ¿? (the var can be an array)
// refexpr reference to expr ¿?¿


// asignation =
// comparation ==
// constraint ===

// pols only single assignation
//
// defered constant initilization
// accumulative expressions
// no limited variables, conversion to field on asignment
// N reserved word


// references
for (var i = 0; i<16; ++i) {
    for(refpol p in [x1,y1,x2,y2,x3,y3,s,q0,q1,q2]) {
        p[i]' * (1-Global.CLK32[31]) === p[i] * (1-Global.CLK32[31]);
    }
}

// if-elseif-else
// for(;;)
// for (x in [])
// while (cond) { }
// do { } while (cond)
// break, continue

// functions (namespace)

// N
// Padding.N
// prime
// Padding.prime

// multidimensional arrays
```

## Constant generations

```
pol constant L1 = [1,0..]
pol constant L_LAST = [..0,1]

pol constant L1 = [1,0:N-1]
pol constant L_LAST = [0:N-1,1]

// discrete values (separated by commas)
pol constant J = [2,3,5,7,11,13,17]...

// range of values/repetitions (..)
pol constant J = [0..255]...
pol constant J = [0..254,255,254..0]...

// repetitions <value>:<times>
pol constant J = [0:10,1,2:30]...

// combinations
pol constant J = [0:256..127:256,128:4..255:4]...
pol constant J = [[0,1,2,3]:10, [4,5,6]:10]...

// padding value <value>... (only one for expression)
pol constant J = [[0..3]:4,[4..5]:8]:20,0...
pol constant J = [2,3]:20,[0,1]...

// N was a reserved word
pol constant LLAST = [0:N-1,1]
pol constant LLAST = [0...,1]

// as expression
pol L2 = L1 + L_LAST

// using constructive language
pol constant a;

for (var i=0; i<N; ++i) {
    a[i] = i*2;
}

TO_REVIEW:
// defered constant initialization
pol constant FACTOR[8];
FACTOR[0] = [0:28,2**24,2**16,2**8,1]
FACTOR[1] = [0:24,2**24,2**16,2**8,1,0:4]
FACTOR[2] = [0:20,2**24,2**16,2**8,1,0:8]
:
FACTOR[7] = [2**24,2**16,2**8,1,0:28]


// alternative:

pol constant FACTOR;
for (var i=0; i<7; i++) {
    FACTOR[i] = [0:(7-i)*4,2**24,2**16,2**8,1,0:i*4]...
}

// alternative2

pol constant FACTOR0[0:28,2**24,2**16,2**8,1]
pol FACTOR[8]
for (var i=0; i<7; i++) {
    FACTOR[i] = FACTOR0'(i*4);
}

```
**REVIEW**:
in Rust range not include last element, if you would include it must use ..=
in Python range function not include last element


## Subproofs

```
subproof [aggregable] keccak (2**10, 2**16)


namespace Padding subproof keccak
:
:

namespace Ninetoone subproof keccak
:
:
```




## Prior and next N
```

<n>'<pol>
<pol>'<n>

4'carry
carry'4

carry'(i*3+1)
(i*3+1)'carry

// alternative2

pol constant FACTOR0[0:28,2**24,2**16,2**8,1]
pol FACTOR[8]
for (var i=0; i<7; i++) {
    FACTOR[i] = FACTOR0'(i*4);
}

// actual

m0[0]' = (1-RESET) * m0[0] + FACTOR[0] * inM[0];
m0[1]' = (1-RESET) * m0[1] + FACTOR[1] * inM[0];
m0[2]' = (1-RESET) * m0[2] + FACTOR[2] * inM[0];
:
m0[6]' = (1-RESET) * m0[6] + FACTOR[6] * inM[0];
m0[7]' = (1-RESET) * m0[7] + FACTOR[7] * inM[0];

// vs

m0[0]' = (1-RESET) * m0[0] + FACTOR * inM[0];
m0[1]' = (1-RESET) * m0[1] + FACTOR'4 * inM[0];
m0[2]' = (1-RESET) * m0[2] + FACTOR'8 * inM[0];
:
m0[6]' = (1-RESET) * m0[6] + FACTOR'24 * inM[0];
m0[7]' = (1-RESET) * m0[7] + FACTOR'28 * inM[0];

for (var i=0; i<7; ++i {
    m0[i]' === (1-RESET) * m0[i] + FACTOR'(i*4) * inM[0];
})

```

## Range checks


  sel { a } in [0..255];

  a in [0..255];
  b in [0..255];

## Connect


    setIdentity(S[0],S[1],S[2]);  // setIdentity is a buildin function

    function connect(ref S1, var p1, ref S2, var p2) {
        var tmp = S1[p1];
        S1[p1] = S2[p2];
        S2[p2] = tmp;
    }


## Constant Optimizations


## Witness computation
No.

## System constants

N
prime


## NOTES
- constants could be change with N, in subproof could define multiple N needs to compute all for each N.
- expressions could change if has an variable or reference inside.

## TEST
- Deferred temporal polynomials
  - unitialized (index, single) - manually tested
  - multiple initialization (index, single) - manually tested