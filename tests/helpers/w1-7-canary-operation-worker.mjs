import {createHash} from "node:crypto";
import {appendFile,copyFile,writeFile} from "node:fs/promises";

const [mode,landing,store]=process.argv.slice(2);
const knownDigest=process.env.ENGRAM_CANARY_DIGEST??"";
const syntheticSignature=createHash("sha256").update(`synthetic-signing-operation:${knownDigest}`).digest("hex");
const material=process.env.ENGRAM_CANARY_MATERIAL??"synthetic-safe";

if(mode==="logs")await appendFile(landing,JSON.stringify({level:process.env.ENGRAM_LOG_LEVEL??"trace",operation:"sign",material,syntheticSignature})+"\n");
else if(mode==="argv")await writeFile(landing,JSON.stringify({operation:"sign",argv:process.argv,syntheticSignature}));
else if(mode==="environment")await writeFile(landing,JSON.stringify({operation:"sign",environment:process.env.ENGRAM_CANARY_MATERIAL??null,syntheticSignature}));
else if(mode==="backup"){
  await writeFile(store,JSON.stringify({operation:"sign",material,syntheticSignature}));
  await copyFile(store,landing);
}
else if(mode==="error"){
  try{throw new Error(material);}catch(error){await writeFile(landing,JSON.stringify({message:error.message,stack:error.stack,syntheticSignature}));}
}
else throw new Error(`unknown canary operation ${mode}`);
