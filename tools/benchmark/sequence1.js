let __values = [];
for(let _i1=0n;_i1<=255n;_i1=_i1+1n){__values.push(_i1)}
for(let _i2=0;_i2<16383;++_i2) { __values = __values.concat(__values.slice(-256)); }
console.log(__values.length);
