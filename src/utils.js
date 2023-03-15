
exports.log2 = function log2( V )
{
    return( ( ( V & 0xFFFF0000 ) !== 0 ? ( V &= 0xFFFF0000, 16 ) : 0 ) | ( ( V & 0xFF00FF00 ) !== 0 ? ( V &= 0xFF00FF00, 8 ) : 0 ) | ( ( V & 0xF0F0F0F0 ) !== 0 ? ( V &= 0xF0F0F0F0, 4 ) : 0 ) | ( ( V & 0xCCCCCCCC ) !== 0 ? ( V &= 0xCCCCCCCC, 2 ) : 0 ) | ( ( V & 0xAAAAAAAA ) !== 0 ) );
}


exports.getKs = function getKs(Fr, n) {
    const ks = [Fr.k];
    for (let i=1; i<n; i++) {
        ks[i] = Fr.mul(ks[i-1], ks[0]);
    }
    return ks;
}

exports.getRoots = function getRoots(Fr) {
    let roots = Array(33);
    roots[32] = Fr.e(7277203076849721926n);
    for (let i=31; i>=0; i--) roots[i] = Fr.square(roots[i+1]);
    return roots;
}