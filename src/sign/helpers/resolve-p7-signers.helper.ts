/**
 * This implements a key area of functionality identified in the following
 * issue comment. That is, awaiting the resolution of all the signature
 * values when we sign using an async function, such as Azure Key Vault or
 * a PKCS #11 API. Credit to https://github.com/dhensby.
 *
 * https://github.com/digitalbazaar/forge/issues/861#issuecomment-979905948
 *
 */

import type { P7Signer } from '../sign.types';

export const resolveP7Signers = (signers: P7Signer[]): Promise<P7Signer[]> => {
  // Wait for the signature to resolve --
  // Values that aren't Promises will pass through
  return Promise.all(signers.map(async (signer) => {
    signer.signature = await signer.signature;
    return signer;
  }));
}