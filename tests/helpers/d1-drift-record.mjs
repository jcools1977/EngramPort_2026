import fs from 'node:fs';
const original = fs.writeFileSync;
fs.writeFileSync = function(file, ...args) {
  const result = original.call(this, file, ...args);
  if (process.env.D1_DRIFT_WRITES) original(process.env.D1_DRIFT_WRITES, `${file}\n`, {flag: "a"});
  return result;
};
