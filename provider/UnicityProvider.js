const { NODEL_FAILED, NOT_INCLUDED, NOT_MATCHING, NOT_AUTHENTICATED, WRONG_AUTH_TYPE, PATH_INVALID, OK } = require("../constants.js");
const { wordArrayToHex, hexToWordArray, isWordArray, isHexString, smthash } = require("@unicitylabs/utils");
const { verifyPath, includesPath } = require('@unicitylabs/prefix-hash-tree');

const { AggregatorAPI } = require('../api/api.js');
const { SignerEC, verify, getTxSigner } = require('../signer/SignerEC.js');
const { hash, objectHash } = require('../hasher/sha256hasher.js').SHA256Hasher;
const { SHA256Hasher } = require('../hasher/sha256hasher.js');

class UnicityProvider{

    constructor(transport, signer){
	this.api = new AggregatorAPI(transport);
	this.signer = signer;
    }

    async submitStateTransition(sourceStateHash, transitionHash){
	return await this.api.submitStateTransition(await this.getRequestId(sourceStateHash), transitionHash, 
	    await this.getAuthenticator(sourceStateHash, transitionHash));
    }

    async extractProofs(requestId){
	const { path } = (await this.api.getInclusionProof(requestId)).result;
	return { status: verifyInclusionProofs(path, requestId), path };
    }

    async getRequestId(sourceStateHash){
	return calculateRequestId(hash, await this.signer.getPubKey(), sourceStateHash);
    }

    async getAuthenticator(sourceStateHash, transitionHash){
	return {
	    state: sourceStateHash,
	    pubkey: await this.signer.getPubKey(), 
	    signature: await this.signer.sign(transitionHash), 
	    sign_alg: SignerEC.getAlg(), 
	    hash_alg: SHA256Hasher.getAlg()
	};
    }

}

function getMinterSigner(tokenId){
    return new SignerEC(hash(MINTER_SECRET+tokenId));
}

function getMinterProvider(transport, tokenId){
	const signer = getMinterSigner(tokenId);
	return new UnicityProvider(transport, signer, hash);
}

const MINT_SUFFIX_HEX = hash('TOKENID');
const MINTER_SECRET = 'I_AM_UNIVERSAL_MINTER_FOR_';

function calculateGenesisStateHash(tokenId){
    return hash(tokenId+MINT_SUFFIX_HEX);
}

function calculateStateHash({token_class_id, token_id, sign_alg, hash_alg, data, pubkey, nonce}){
    const signAlgCode = hash(sign_alg);
    const hashAlgCode = hash(hash_alg);
    return hash(token_class_id+signAlgCode+token_id+hashAlgCode+(data?hash(data):'')+pubkey+nonce);
}

function calculatePointer({token_class_id, sign_alg, hash_alg, secret, nonce}){
    const signer = getTxSigner(secret, nonce);
    const pubkey = signer.publicKey;
    const signAlgCode = hash(sign_alg);
    const hashAlgCode = hash(hash_alg);
    return hash(token_class_id+signAlgCode+hashAlgCode+pubkey+nonce);
}

function calculateExpectedPointer({token_class_id, sign_alg, hash_alg, pubkey, nonce}){
    const signAlgCode = hash(sign_alg);
    const hashAlgCode = hash(hash_alg);
    return hash(token_class_id+signAlgCode+hashAlgCode+pubkey+nonce);
}

function calculatePointerFromPubKey({token_class_id, sign_alg, hash_alg, secret, salt, sourceState}){
    const signer = getTxSigner(secret);
    const pubkey = signer.publicKey;
    const signAlgCode = hash(sign_alg);
    const hashAlgCode = hash(hash_alg);
    const signature = signer.sign(salt);
    const nonce=hash(sourceState+signature);
    return { pointer: hash(token_class_id+signAlgCode+hashAlgCode+pubkey+nonce), signature };
}

function calculateExpectedPointerFromPubAddr({token_class_id, sign_alg, hash_alg, pubkey, salt, signature, nonce, sourceState}){
    if(!verify(pubkey, salt, signature))
    throw new Error("Salt was not signed correctly");

    const signAlgCode = hash(sign_alg);
    const hashAlgCode = hash(hash_alg);
    if(hash(sourceState+signature) !== nonce)
    throw new Error("Nonce was not derived correctly");
    return hash(token_class_id+signAlgCode+hashAlgCode+pubkey+nonce);
}

function calculatePubkey(secret){
    const signer = getTxSigner(secret);
    return signer.publicKey;
}

function calculatePubAddr(pubkey){
    return 'pub'+pubkey;
}

function calculatePubPointer(pointer){
    return 'point'+pointer;
}

function generateRecipientPointerAddr(token_class_id, sign_alg, hash_alg, secret, nonce){
    return calculatePubPointer(calculatePointer({token_class_id, sign_alg, hash_alg, secret, nonce}));
}

function generateRecipientPubkeyAddr(secret){
    return calculatePubAddr(calculatePubkey(secret));
}

function calculateRequestId(hash, pubKey, state){
    return hash(pubKey+state);
}

async function calculateGenesisRequestId(tokenId){
    const minterSigner = getMinterSigner(tokenId);
    const minterPubkey = minterSigner.getPubKey();
    const genesisState = calculateGenesisStateHash(tokenId);
    return calculateRequestId(hash, minterPubkey, genesisState);
}

function calculateMintPayload(tokenId, tokenClass, tokenValue, dataHash, destPointer, salt){
    const value = `${tokenValue.toString(16).slice(2).padStart(64, "0")}`;
    return hash(tokenId+tokenClass+value+dataHash+destPointer+salt);
}

async function calculatePayload(source, destPointer, salt, dataHash){
    return hash(source.calculateStateHash()+destPointer+salt+(dataHash?dataHash:''));
}

function resolveReference(dest_ref){
    if(dest_ref.startsWith('point'))
    return { pointer: dest_ref.substring(5) };
    if(dest_ref.startsWith('pub'))
    return { pubkey: dest_ref.substring(3) };
    return dest_ref;
}

async function isUnspent(provider, state){
    const { status, path } = await provider.extractProofs(await provider.getRequestId(state));
    return status == NOT_INCLUDED;
}

async function confirmOwnership(token, signer){
    return token.state.challenge.pubkey == signer.getPubKey();
}


function verifyInclusionProofs(path, requestId){
    if(!path) throw new Error("Internal error: malformed unicity response. No path field");
    const leaf = path[path.length-1];
    if(!leaf)return NOT_INCLUDED;
    if(!leaf.leaf)return NOT_INCLUDED;
    if(!verify(leaf.authenticator.pubkey, leaf.payload, leaf.authenticator.signature))return NOT_AUTHENTICATED;
    if(BigInt('0x'+objectHash(path[path.length-1])) !== BigInt('0x'+path[path.length-2]?.value))return NOT_INCLUDED;
    const unserializedPath = deserializeHashPath(path)?.path?.slice(0, -1);
    if(!verifyPath(smthash, unserializedPath))return PATH_INVALID;
    if(!includesPath(smthash, BigInt('0x'+requestId), unserializedPath))return NOT_INCLUDED;
    return OK;
}

function serializeHashPath(path, leaf){
    return {path: [...path.map((entry) => {return {prefix: entry.prefix?.toString(16), 
    covalue: wordArrayToHex(entry.covalue), value:isWordArray(entry.value)?
    (wordArrayToHex(entry.value)):(typeof entry.value === 'bigint')?
    ('0x'+entry.value.toString(16)):entry.value};}), ...[leaf]]};
}

function deserializeHashPath(serializedPath){
    return {path: serializedPath.map((entry) => {return entry.leaf?entry:{
        prefix: entry.prefix?BigInt('0x'+entry.prefix):undefined,
        covalue: entry.covalue?hexToWordArray(entry.covalue):undefined,
        value: entry.value?.startsWith('0x')?BigInt(entry.value):isHexString(entry.value)?hexToWordArray(entry.value):entry.value
    }
    })};
}

module.exports = { 
    UnicityProvider, 
    getMinterProvider, 
    verifyInclusionProofs, 
    serializeHashPath, 
    deserializeHashPath,
    calculateGenesisStateHash,
    calculateStateHash,
    calculatePointer,
    calculateExpectedPointer,
    calculateGenesisRequestId,
    calculateMintPayload,
    calculatePayload,
    calculateExpectedPointerFromPubAddr,
    calculatePubAddr,
    calculatePubPointer,
    calculatePubkey,
    calculateRequestId,
    generateRecipientPointerAddr,
    generateRecipientPubkeyAddr,
    resolveReference,
    confirmOwnership,
//    getMinterSigner,
    getMinterProvider,
    getTxSigner,
    verifyInclusionProofs,
    isUnspent,
    MINT_SUFFIX_HEX,
    MINTER_SECRET
 }
