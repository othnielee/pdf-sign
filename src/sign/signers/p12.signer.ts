/**
 * This implementation is based on the P12Signer class from the
 * @signpdf/signpdf library. Credit to https://github.com/vbuch.
 *
 * https://github.com/vbuch/node-signpdf/blob/develop/packages/signer-p12/src/P12Signer.js
 *
 */

import forge from 'node-forge';
import { Signer } from './signer.interface';

export class P12Signer implements Signer {
  constructor(private readonly p12buffer: Buffer, private readonly password: string = '') {
    if (!p12buffer || !Buffer.isBuffer(p12buffer)) {
      throw new Error('Invalid P12 buffer provided.');
    }

    const cert = forge.util.createBuffer(p12buffer.toString('binary'));
    const p12Asn1 = forge.asn1.fromDer(cert);
    const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, password);
    const certBags = p12.getBags({ bagType: forge.pki.oids.certBag })[forge.pki.oids.certBag];
    const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })[forge.pki.oids.pkcs8ShroudedKeyBag];

    if (!Array.isArray(certBags) || (certBags.length === 0)) {
      throw new Error('No certificates found in the P12 file.');
    }

    if (!Array.isArray(keyBags) || (keyBags.length === 0)) {
      throw new Error('No private key found in the P12 file.');
    }

    this._certificates = certBags.map(bag => bag.cert as forge.pki.Certificate);

    const privateKey = keyBags[0].key as forge.pki.rsa.PrivateKey;

    // Find the certificate that matches the private key
    for (const cert of this._certificates) {
      const publicKey = cert.publicKey as forge.pki.rsa.PublicKey;
      if ((privateKey.n.compareTo(publicKey.n) === 0) && (privateKey.e.compareTo(publicKey.e) === 0)) {
        this._privateKey = privateKey;
        this._certificate = cert;
        break;
      }
    }

    if (!this._privateKey) {
      throw new Error('No matching private key found for any certificate in the P12 file.');
    }
  }

  private readonly _privateKey!: forge.pki.rsa.PrivateKey;
  private readonly _certificate!: forge.pki.Certificate;
  private readonly _certificates: forge.pki.Certificate[];

  isAsync = (): boolean => false;
  key = (): forge.pki.rsa.PrivateKey => this._privateKey;
  certificate = (): forge.pki.Certificate => this._certificate;
  certificateChain = (): forge.pki.Certificate[] => this._certificates;
}