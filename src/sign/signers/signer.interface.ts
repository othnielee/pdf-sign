import forge from 'node-forge';

export interface Signer {
  isAsync(): boolean;
  key(): forge.pki.rsa.PrivateKey;
  certificate(): forge.pki.Certificate;
  certificateChain(): forge.pki.Certificate[];
}