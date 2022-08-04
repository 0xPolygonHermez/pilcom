# PIL Compiler
Polynomial Identity Language (pil) compiler

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
const pilConfig =
    { defines: {N: 2 ** 21},
      namespaces: ['Global', 'Main', 'Rom', 'Byte4', 'Arith'],
      verbose: true,
      color: true,
      disableUnusedError: true});

const pil = await compile(Fr, "pil/main.pil", null,  pilConfig);
```
- **define**: object (key, value) with constants to define, if constant is defined in pil, use value specified on config and shown a warning during compilation.
- **namespaces**: list of namespace used, if namespace not present in this list, it will be ignored, and warning was shown. If any namespace of list, not was found in pils and exception was produced.
- **verbose**: source code ignored inside a namespace was shown (first 3 lines).
- **color**: verbose source code was shown with other color.
- **disableUnusedError**: ignore error when found an unused expression.
### Command Line

In command line compilation, could specify config with json file and using option -P or --config.
## License

### Copyright
Polygon `pilcom` was developed by Polygon. While we plan to adopt an open source license, we haven’t selected one yet, so all rights are reserved for the time being. Please reach out to us if you have thoughts on licensing.

### Disclaimer
This code has not yet been audited, and should not be used in any production systems.
