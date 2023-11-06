/**
 * This impmements a custom signing function to support an external,
 * async signer, as demonstrated in the following issue comments.
 * Credit to https://github.com/dhensby and https://github.com/andres-blanco.
 *
 * https://github.com/digitalbazaar/forge/issues/861#issue-840846749
 * https://github.com/vbuch/node-signpdf/issues/46#issuecomment-562649529
 *
 */

import forge from 'node-forge';
import { CryptographyClient } from '@azure/keyvault-keys';
import { chainToArray, forgeMdToKeyVaultAlgorithm } from '../helpers';
import { Signer } from './signer.interface';
import { PemCertRegExp } from './signer.constants';

export class KeyVaultSigner implements Signer {
  constructor(private readonly client: CryptographyClient, private readonly fullchain: string | Buffer) {
    if (!client || !(client instanceof CryptographyClient)) {
      throw new Error('Invalid CryptographyClient provided.');
    }

    if (!fullchain || ((typeof fullchain !== 'string') && !Buffer.isBuffer(fullchain))) {
      throw new Error('Invalid certificate chain provided.');
    }

    const chain = (typeof fullchain === 'string') ? fullchain : fullchain.toString('utf-8');

    if (!PemCertRegExp.test(chain)) {
      throw new Error('Invalid PEM format for the certificate chain.');
    }

    const certs = chainToArray(chain);
    this._certificates = certs.map(cert => forge.pki.certificateFromPem(cert));
  }

  private readonly _certificates: forge.pki.Certificate[];

  isAsync = (): boolean => true;
  certificate = (): forge.pki.Certificate => this._certificates[0];
  certificateChain = (): forge.pki.Certificate[] => this._certificates;

  // This is the factory that will yield the signature --
  // A message digest is automatically created by forge from the
  // content to be signed, and is passed in to the `signer.key.sign()`
  // function during `addSignerInfos()`. The result is assigned to
  // `signer.signature` then packaged into the PKCS #7 structure.

  key(): forge.pki.rsa.PrivateKey {
    const signer = {
      sign: async (md: forge.md.MessageDigest, scheme?: string): Promise<string> => {
        // Get the correct algorithm, and convert the message
        // digest to a buffer for the Key Vault client
        const algorithm = forgeMdToKeyVaultAlgorithm(md, scheme);
        const digest = Buffer.from(md.digest().getBytes(), 'binary');

        // Sign the digest in the Key Vault and return the signature
        const signResult = await this.client.sign(algorithm, digest)
          .catch(() => {
            throw new Error('Error signing the digest in the Key Vault.');
          });

        return Buffer.from(signResult.result).toString('binary');
      }
    };

    // `signer` has type `{ sign: (md: forge.md.MessageDigest, scheme?: string) => Promise<string> }`.
    // It's not a real private key, but we only need it for the `sign()` function. So we assert that
    // it has type `forge.pki.rsa.PrivateKey` to make it compatible with the `p7.addSigner()` function.
    return signer as unknown as forge.pki.rsa.PrivateKey;
  }
}