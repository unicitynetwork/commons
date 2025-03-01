import { PointerCalculationError } from './PointerCalculationError.js';
import { AggregatorClient } from '../api/AggregatorClient.js';
import { Authenticator } from '../api/Authenticator.js';
import { DataHasher, HashAlgorithm } from '../hash/DataHasher.js';
import { ISigningService } from '../signing/ISigningService.js';
import { SigningService } from '../signing/SigningService.js';
import { HexConverter } from '../util/HexConverter.js';

const {
  NODEL_FAILED,
  NOT_INCLUDED,
  NOT_MATCHING,
  NOT_AUTHENTICATED,
  WRONG_AUTH_TYPE,
  PATH_INVALID,
  OK,
} = require('../constants.js');

class UnicityProvider {
  public constructor(
    private readonly signingService: ISigningService,
    private readonly client: AggregatorClient,
  ) {}

  public async submitStateTransition(sourceStateHash: Uint8Array, transitionHash: Uint8Array): Promise<string> {
    return await this.client.submitStateTransition(
      await this.getRequestId(sourceStateHash),
      transitionHash,
      await this.getAuthenticator(sourceStateHash, transitionHash),
    );
  }

  public async extractProofs(requestId: Uint8Array) {
    const { path } = (await this.client.getInclusionProof(requestId)).result;
    return { status: verifyInclusionProofs(path, requestId), path };
  }

  public getRequestId(sourceStateHash: Uint8Array): Promise<Uint8Array> {
    return calculateRequestId(this.signingService.publicKey, sourceStateHash);
  }

  public async getAuthenticator(sourceStateHash: Uint8Array, transitionHash: Uint8Array): Promise<Authenticator> {
    return new Authenticator(
      HashAlgorithm.SHA256.name,
      this.signingService.publicKey,
      this.signingService.algorithm,
      await this.signingService.sign(transitionHash),
      sourceStateHash,
    );
  }
}

const MINTER_PREFIX = 'I_AM_UNIVERSAL_MINTER_FOR_';
const MINTER_PREFIX_BYTES = new TextEncoder().encode(MINTER_PREFIX);

async function getMinterSigner(tokenId: Uint8Array): Promise<ISigningService> {
  return new SigningService(
    await new DataHasher(HashAlgorithm.SHA256).update(MINTER_PREFIX_BYTES).update(tokenId).digest(),
  );
}

async function getMinterProvider(client: AggregatorClient, tokenId: Uint8Array): Promise<UnicityProvider> {
  const signer = await getMinterSigner(tokenId);
  return new UnicityProvider(signer, client);
}

const MINT_SUFFIX_HEX_PROMISE = new DataHasher(HashAlgorithm.SHA256)
  .update(new TextEncoder().encode('TOKENID'))
  .digest();

async function calculateGenesisStateHash(tokenId: Uint8Array): Promise<Uint8Array> {
  return new DataHasher(HashAlgorithm.SHA256)
    .update(tokenId)
    .update(await MINT_SUFFIX_HEX_PROMISE)
    .digest();
}

async function calculateStateHash({
  token_class_id,
  token_id,
  sign_alg,
  hash_alg,
  data,
  pubkey,
  nonce,
}): Promise<Uint8Array> {
  const signAlgCode = await new DataHasher(HashAlgorithm.SHA256).update(sign_alg).digest();
  const hashAlgCode = await new DataHasher(HashAlgorithm.SHA256).update(hash_alg).digest();
  return new DataHasher(HashAlgorithm.SHA256)
    .update(token_class_id)
    .update(signAlgCode)
    .update(token_id)
    .update(hashAlgCode)
    .update(data ? await new DataHasher(HashAlgorithm.SHA256).update(data).digest() : new Uint8Array())
    .update(pubkey)
    .update(nonce)
    .digest();
}

async function calculatePointer({ token_class_id, sign_alg, hash_alg, secret, nonce }): Promise<Uint8Array> {
  const signer = await SigningService.createFromSecret(secret, nonce);
  return new DataHasher(HashAlgorithm.SHA256)
    .update(token_class_id)
    .update(await new DataHasher(HashAlgorithm.SHA256).update(sign_alg).digest())
    .update(await new DataHasher(HashAlgorithm.SHA256).update(hash_alg).digest())
    .update(signer.publicKey)
    .update(nonce)
    .digest();
}

async function calculateExpectedPointer({ token_class_id, sign_alg, hash_alg, pubkey, nonce }): Promise<Uint8Array> {
  return new DataHasher(HashAlgorithm.SHA256)
    .update(token_class_id)
    .update(await new DataHasher(HashAlgorithm.SHA256).update(sign_alg).digest())
    .update(await new DataHasher(HashAlgorithm.SHA256).update(hash_alg).digest())
    .update(pubkey)
    .update(nonce)
    .digest();
}

async function calculatePointerFromPubKey({ token_class_id, sign_alg, hash_alg, secret, salt, sourceState }) {
  const signer = await SigningService.createFromSecret(secret);
  const signature = await signer.sign(salt);
  const nonce = await new DataHasher(HashAlgorithm.SHA256).update(sourceState).update(signature).digest();

  return {
    pointer: await new DataHasher(HashAlgorithm.SHA256)
      .update(token_class_id)
      .update(await new DataHasher(HashAlgorithm.SHA256).update(sign_alg).digest())
      .update(await new DataHasher(HashAlgorithm.SHA256).update(hash_alg).digest())
      .update(signer.publicKey)
      .update(nonce)
      .digest(),
    signature,
  };
}

async function calculateExpectedPointerFromPubAddr({
  token_class_id,
  sign_alg,
  hash_alg,
  pubkey,
  salt,
  signature,
  nonce,
  sourceState,
}): Promise<Uint8Array> {
  if (!(await SigningService.verifyWithPublicKey(salt, signature, pubkey))) {
    throw new PointerCalculationError('Salt was not signed correctly.');
  }

  const calculatedNonce = new DataHasher(HashAlgorithm.SHA256).update(sourceState).update(signature).digest();
  if (calculatedNonce !== nonce) {
    throw new PointerCalculationError('Nonce was not derived correctly.');
  }

  return new DataHasher(HashAlgorithm.SHA256)
    .update(token_class_id)
    .update(await new DataHasher(HashAlgorithm.SHA256).update(sign_alg).digest())
    .update(await new DataHasher(HashAlgorithm.SHA256).update(hash_alg).digest())
    .update(pubkey)
    .update(nonce)
    .digest();
}

async function calculatePubkey(secret): Promise<Uint8Array> {
  const signingService = await SigningService.createFromSecret(secret);
  return signingService.publicKey;
}

function calculatePubAddr(pubkey) {
  return 'pub' + pubkey;
}

function calculatePubPointer(pointer) {
  return 'point' + pointer;
}

function generateRecipientPointerAddr(token_class_id, sign_alg, hash_alg, secret, nonce) {
  return calculatePubPointer(calculatePointer({ token_class_id, sign_alg, hash_alg, secret, nonce }));
}

function generateRecipientPubkeyAddr(secret) {
  return calculatePubAddr(calculatePubkey(secret));
}

function calculateRequestId(pubKey, state): Promise<Uint8Array> {
  return new DataHasher(HashAlgorithm.SHA256).update(pubKey + state).digest();
}

async function calculateGenesisRequestId(tokenId) {
  const minterSigner = await getMinterSigner(tokenId);
  const genesisState = calculateGenesisStateHash(tokenId);
  return calculateRequestId(minterSigner.publicKey, genesisState);
}

function calculateMintPayload(tokenId, tokenClass, tokenValue, dataHash, destPointer, salt) {
  const value = `${tokenValue.toString(16).slice(2).padStart(64, '0')}`;
  return new DataHasher(HashAlgorithm.SHA256)
    .update(tokenId)
    .update(tokenClass)
    .update(HexConverter.decode(value))
    .update(dataHash)
    .update(destPointer)
    .update(salt);
}

function calculatePayload(source, destPointer, salt, dataHash) {
  return new DataHasher(HashAlgorithm.SHA256)
    .update(source.calculateStateHash())
    .update(destPointer)
    .update(salt)
    .update(dataHash ? dataHash : new Uint8Array());
}

function resolveReference(dest_ref) {
  if (dest_ref.startsWith('point')) return { pointer: dest_ref.substring(5) };
  if (dest_ref.startsWith('pub')) return { pubkey: dest_ref.substring(3) };
  if (dest_ref.startsWith('nametag')) return { nametag: dest_ref.substring(7) };
  return dest_ref;
}

function destRefFromNametag(requestedNametagId, nametagTokens) {
  //    console.log(nametagTokens);
  const nametagToken = nametagTokens['nametag_' + requestedNametagId];
  if (!nametagToken) throw new Error('Requested nametag token  ' + requestedNametagId + ' not provided');
  return resolveReference(nametagToken.state.data.dest_ref).nametag
    ? destRefFromNametag(nametagToken.state.data.dest_ref, nametagTokens)
    : nametagToken.state.data.dest_ref;
}

async function isUnspent(provider, state): Promise<boolean> {
  const { status, path } = await provider.extractProofs(await provider.getRequestId(state));
  return status == NOT_INCLUDED;
}

function confirmOwnership(token, signer): boolean {
  return token.state.challenge.pubkey == signer.getPubKey();
}
