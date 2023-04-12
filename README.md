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
$ node src/pil.js <input.pil> -c -n namespace
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
- **compileFromString**: use to indicate to compiler that parameter fileName contains directly code of pil, to avoid to use a temporal directory on dynamic pil generation.
- **includePaths**: an array of paths used to find includes.
- **includePathFirst**: a boolean value (true), to force to find first on include path and after on current pil directory. Default: false
### Command Line

In command line compilation:
- config with json file and using option -P or --config.
- define include paths with option -I or --include, and paths separated by comma.
- define includePathFirst with option -f.


## License

Licensed under either of

* Apache License, Version 2.0, (LICENSE-APACHE or http://www.apache.org/licenses/LICENSE-2.0)
* MIT license (LICENSE-MIT or http://opensource.org/licenses/MIT)
at your option.

### Contribution
Unless you explicitly state otherwise, any contribution intentionally submitted for inclusion in the work by you, as defined in the Apache-2.0 license, shall be dual licensed as above, without any additional terms or conditions.
