function required(value,label){if(typeof value!=="string"||value.length===0)throw new TypeError(`${label} required`);return value;}

export function normalizeOidcTransaction(record){
  if(!record||typeof record!=="object")throw new TypeError("OIDC transaction required");
  const expiresAt=record.expiresAt;
  if(!Number.isSafeInteger(expiresAt)||expiresAt<=0)throw new TypeError("OIDC transaction expiresAt required");
  if(record.status!=="pending")throw new TypeError("OIDC transaction must begin pending");
  return Object.freeze({
    state:required(record.state,"OIDC transaction state"),
    nonce:required(record.nonce,"OIDC transaction nonce"),
    codeVerifier:required(record.codeVerifier,"OIDC transaction codeVerifier"),
    redirectUri:required(record.redirectUri,"OIDC transaction redirectUri"),
    expiresAt,
    status:"pending",
  });
}

export class InMemoryOidcTransactionStore{
  #transactions=new Map();
  async create(record){
    const transaction=normalizeOidcTransaction(record);
    if(this.#transactions.has(transaction.state))return Object.freeze({status:"conflict"});
    this.#transactions.set(transaction.state,transaction);
    return Object.freeze({status:"stored"});
  }
  async claim(state,now,consume){
    required(state,"OIDC state");
    if(!Number.isSafeInteger(now))throw new TypeError("OIDC claim clock required");
    if(typeof consume!=="function")throw new TypeError("OIDC transaction consumer required");
    const transaction=this.#transactions.get(state);
    if(!transaction)return Object.freeze({status:"absent"});
    this.#transactions.delete(state); /* W1_1_OIDC_TRANSACTION_CONSUME_BEFORE_EXCHANGE */
    if(transaction.expiresAt<=now)return Object.freeze({status:"expired"});
    return Object.freeze({status:"claimed",value:await consume(transaction)});
  }
  transientCount(){return this.#transactions.size;}
}
