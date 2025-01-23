const { NODEL_FAILED, NOT_INCLUDED, NOT_MATCHING, NOT_AUTHENTICATED, WRONG_AUTH_TYPE, PATH_INVALID, OK } = require("../constants.js");
const { wordArrayToHex, hexToWordArray, isWordArray, smthash } = require("@unicitylabs/utils");
const { verifyPath, includesPath } = require('@unicitylabs/prefix-hash-tree');

const { AggregatorAPI } = require('../api/api.js');
const { SignerEC, verify } = require('../signer/SignerEC.js');
const { hash } = require('../hasher/sha256hasher.js').SHA256Hasher;
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
	return UnicityProvider.calculateRequestId(await this.signer.getPubKey(), sourceStateHash, this.hasher);
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

function getMinterProvider(transport, tokenId){
	const signer = SignerEC.getMinterSigner(tokenId);
	return new UnicityProvider(transport, signer, hash);
}

function verifyInclusionProofs(path, requestId){
    if(!path) throw new Error("Internal error: malformed unicity response. No path field");
    const leaf = path[path.length-1];
    if(!leaf)return NOT_INCLUDED;
    if(!leaf.leaf)return NOT_INCLUDED;
    if(!verify(leaf.authenticator.pubkey, leaf.payload, leaf.authenticator.signature))return NOT_AUTHENTICATED;
    const unserializedPath = deserializeHashPath(path)?.path?.slice(0, -1);
    if(!verifyPath(smthash, unserializedPath))return PATH_INVALID;
    if(!includesPath(smthash, BigInt('0x'+requestId), unserializedPath))return NOT_INCLUDED;
    return OK;
}

function serializeHashPath(path, leaf){
    return {path: [...path.map((entry) => {return {prefix: entry.prefix?.toString(16), 
    covalue: wordArrayToHex(entry.covalue), value:isWordArray(entry.value)?
    ('0x'+wordArrayToHex(entry.value)):(typeof entry.value === 'bigint')?
    ('0x'+entry.value.toString(16)):entry.value};}), ...[leaf]]};
}

function deserializeHashPath(serializedPath){
    return {path: serializedPath.map((entry) => {return entry.leaf?entry:{
        prefix: entry.prefix?BigInt('0x'+entry.prefix):undefined,
        covalue: entry.covalue?hexToWordArray(entry.covalue):undefined,
        value: entry.value?.startsWith('0x')?hexToWordArray(entry.value):entry.value
    }
    })};
}

module.exports = { UnicityProvider, getMinterProvider, verifyInclusionProofs, serializeHashPath, deserializeHashPath }
