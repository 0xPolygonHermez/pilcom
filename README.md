# pilcom
Polynomial Identity Language (pil) compiler

## General info

## Setup
```sh
$ npm install
$ npm run build
```
## Usage

### Command line
Generate json file from pil file:
```sh
$ node src/pil.js <input.pil> -o <output.pil.json>
```
Generate C++ code from pil file (.hpp files will be generated in the `./pols_generated` folder):
```sh
$ node src/pil.js <input.pil> -c
```

### Javascript
Basic usage:
```javascript
const pil = await compile(Fr, "pil/main.pil");
```
Advanced usage:
```javascript
const pilConfig = {
    defines: {N: Math.max(verifyPilFlag ? minDegree : 2 ** 16)},
    excludeSelF: ['sRD','sWR', 'memAlign' ],
    excludeModules: ['storage', 'mem_align']
};

const pil = await compile(Fr, "pil/main.pil", null,  pilConfig);
```
Modules information:
```javascript
const pilModuleInfo = {
    mem_align: {
        selF: ['memAlign'],
        minDegree: 2**21,
        dependencies: []
    },
    arith: {
        selF: ['arith'],
        minDegree: 2**19,
        dependencies: []
    },
    binary: {
        selF: ['bin'],
        minDegree: 2**21,
        dependencies: ['poseidong', 'padding_pg']
    },
    poseidong: {
        selF: ['sRD', 'sWR'],
        minDegree: 2**21,
        dependencies: ['padding_pg', 'storage']
    },
    padding_pg: {
        selF: ['hashP', 'hashPLen', 'hashPDigest'],
        minDegree: 2**21,
        dependencies: ['storage']
    },
    storage: {
        selF: ['sRD', 'sWR', 'hashPDigest'],
        minDegree: 2**21,
        dependencies: ['poseidong', 'padding_pg']
    },
    padding_kk: {
        selF: ['hashK', 'hashKLen', 'hashKDigest'],
        minDegree: 2**21,
        dependencies: []
    },
    mem: {
        selF: ['mOp'],
        minDegree: 2**16,
        dependencies: []
    }

```

## License

### Copyright
Polygon zkevm-proverjs was developed by Polygon. While we plan to adopt an open source license, we haven’t selected one yet, so all rights are reserved for the time being. Please reach out to us if you have thoughts on licensing.  
  
### Disclaimer
This code has not yet been audited, and should not be used in any production systems.
