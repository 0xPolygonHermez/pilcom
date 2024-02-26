let __values = [];
for(let _i1=0n;_i1<=255n;_i1=_i1+1n){__values.push(_i1)}
let base = __values.length - 256
for(let _i2=0;_i2<2048000;++_i2) {__values.push(__values[(base+_i2)%255])}
// console.log(__values.join());
