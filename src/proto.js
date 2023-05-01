const protobuf = require('protobufjs');

run().catch(err => console.log(err));

async function run() {
  const root = await protobuf.load(__dirname + '/pilout.proto');

  const PilOut = root.lookupType('pilout.PilOut');
  console.log(PilOut);
}