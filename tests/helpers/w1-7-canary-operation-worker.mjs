import {createHash} from "node:crypto";
import {appendFile,copyFile,writeFile} from "node:fs/promises";
import path from "node:path";
import {pathToFileURL} from "node:url";

const [mode,landing,store]=process.argv.slice(2);
const knownDigest=process.env.ENGRAM_CANARY_DIGEST??"";
const syntheticSignature=createHash("sha256").update(`synthetic-signing-operation:${knownDigest}`).digest("hex");
const material=process.env.ENGRAM_CANARY_MATERIAL??"synthetic-safe";

if(mode.startsWith("protected_")){
  let input="";for await(const chunk of process.stdin)input+=chunk;const request=JSON.parse(input);
  if(!/^Bearer synthetic-canary-[0-9a-f]{64}$/.test(request.canary))throw new Error("CANARY_OPERATION_CONTEXT_REQUIRED");
  const {VaultTransitBoundary}=await import(pathToFileURL(path.join(request.moduleRoot,"packages/git-adapter/src/custody-service.mjs")));
  const boundary=new VaultTransitBoundary({token:request.token,allowedKeys:["synth-a"]});
  const signature=await boundary.sign("synth-a",request.digest);
  const safe={operation:"sign",digest:request.digest,signature_class:"vault-transit"};
  if(mode==="protected_logs")await appendFile(landing,JSON.stringify({level:"trace",...safe})+"\n");
  else if(mode==="protected_argv")await writeFile(landing,JSON.stringify({...safe,argv:process.argv}));
  else if(mode==="protected_environment")await writeFile(landing,JSON.stringify({...safe,environment:process.env}));
  else if(mode==="protected_backup"){
    await writeFile(store,JSON.stringify(safe));
    await copyFile(store,landing);
  }
  else if(mode==="protected_error"){
    try{throw new Error("SIGNING_OPERATION_FAILED");}catch(error){await writeFile(landing,JSON.stringify({...safe,message:error.message,stack:error.stack}));}
  }
  else throw new Error(`unknown protected canary operation ${mode}`);
  process.stdout.write(JSON.stringify({signature}));
}
else if(mode==="logs")await appendFile(landing,JSON.stringify({level:process.env.ENGRAM_LOG_LEVEL??"trace",operation:"sign",material,syntheticSignature})+"\n");
else if(mode==="argv")await writeFile(landing,JSON.stringify({operation:"sign",argv:process.argv,syntheticSignature}));
else if(mode==="environment")await writeFile(landing,JSON.stringify({operation:"sign",environment:process.env,syntheticSignature}));
else if(mode==="backup"){
  await writeFile(store,JSON.stringify({operation:"sign",material,syntheticSignature}));
  await copyFile(store,landing);
}
else if(mode==="error"){
  try{throw new Error(material);}catch(error){await writeFile(landing,JSON.stringify({message:error.message,stack:error.stack,syntheticSignature}));}
}
else throw new Error(`unknown canary operation ${mode}`);
