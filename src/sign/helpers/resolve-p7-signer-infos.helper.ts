/**
 * This implements a key area of functionality identified in the following
 * issue comment. That is, awaiting the resolution of all the signer info
 * values when we sign using an async function, such as Azure Key Vault or
 * a PKCS #11 API. Credit to https://github.com/dhensby.
 *
 * https://github.com/digitalbazaar/forge/issues/861#issuecomment-979905948
 *
 */

import type { P7SignerInfo } from '../sign.types';

export const resolveP7SignerInfos = (signerInfos: P7SignerInfo[]): Promise<P7SignerInfo[]> => {
  // Wait for all the signer info values to resolve --
  // Values that aren't Promises will pass through
  return Promise.all(signerInfos.map(async (signerInfo) => {
    signerInfo.value = await Promise.all(signerInfo.value.map(async (property) => {
      property.value = await property.value;
      return property;
    }));
    return signerInfo;
  }));
}