import forge from 'node-forge';
import { chainToArray } from '../helpers';
import { Signer } from './signer.interface';
import { PemKeyRegExp, PemCertRegExp } from './signer.constants';

export class PemSigner implements Signer {
  constructor(private readonly privkey: string | Buffer, private readonly fullchain: string | Buffer) {
    if (!privkey || ((typeof privkey !== 'string') && !Buffer.isBuffer(privkey))) {
      throw new Error('Invalid private key provided.');
    }

    if (!fullchain || ((typeof fullchain !== 'string') && !Buffer.isBuffer(fullchain))) {
      throw new Error('Invalid certificate chain provided.');
    }

    const key = (typeof privkey === 'string') ? privkey : privkey.toString('utf-8');
    const chain = (typeof fullchain === 'string') ? fullchain : fullchain.toString('utf-8');

    if (!PemKeyRegExp.test(key)) {
      throw new Error('Invalid PEM format for the private key.');
    }

    if (!PemCertRegExp.test(chain)) {
      throw new Error('Invalid PEM format for the certificate chain.');
    }

    const certs = chainToArray(chain);

    this._certificates = certs.map(cert => forge.pki.certificateFromPem(cert));

    const privateKey = forge.pki.privateKeyFromPem(key);

    // Find a certificate that matches the private key
    for (const cert of this._certificates) {
      const publicKey = cert.publicKey as forge.pki.rsa.PublicKey;
      if ((privateKey.n.compareTo(publicKey.n) === 0) && (privateKey.e.compareTo(publicKey.e) === 0)) {
        this._privateKey = privateKey;
        break;
      }
    }

    if (!this._privateKey) {
      throw new Error('No matching private key found for any certificate in the PEM chain.');
    }
  }

  private readonly _privateKey!: forge.pki.rsa.PrivateKey;
  private readonly _certificates: forge.pki.Certificate[];

  isAsync = (): boolean => false;
  key = (): forge.pki.rsa.PrivateKey => this._privateKey;
  certificate = (): forge.pki.Certificate => this._certificates[0];
  certificateChain = (): forge.pki.Certificate[] => this._certificates;
}