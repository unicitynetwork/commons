const CryptoJS = require('crypto-js');
const { normalizeObject } = require('@unicitylabs/utils');

class SHA256Hasher{
    static hash(hexMsg){
	return CryptoJS.SHA256(CryptoJS.enc.Hex.parse(hexMsg)).toString();
    }

    static objectHash(obj){
	const normalizedObjHex = normalizeObject(obj);
	return SHA256Hasher.hash(normalizedObjHex);
    }

    static getAlg(){
	return 'sha256';
    }
}

module.exports = { SHA256Hasher }

