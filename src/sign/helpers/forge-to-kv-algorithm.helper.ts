/**
 * This helper converts the forge md and signing scheme to the Azure
 * Key Vault equivalent. Credit to https://github.com/dhensby.
 *
 * https://github.com/digitalbazaar/forge/issues/861#issuecomment-979905948
 *
 */

import forge from 'node-forge';

export const forgeMdToKeyVaultAlgorithm = (md: forge.md.MessageDigest, scheme?: string): string => {
  const encoding = (scheme === 'RSASSA-PKCS1-V1_5') ? 'RS' : 'PS';
  switch (md.algorithm) {
    case 'sha256':
      return `${encoding}256`;
    case 'sha384':
      return `${encoding}384`;
    case 'sha512':
      return `${encoding}512`;
    default:
      throw new Error('Unsupported digest algorithm');
  }
}