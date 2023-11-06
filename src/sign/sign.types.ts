import forge from 'node-forge';

export type P7SignerInfo = { value: { value: any | Promise<any> }[] };
export type P7Signer = { signature: string | Promise<string> };
export type SignedData = forge.pkcs7.PkcsSignedData & { signerInfos: P7SignerInfo[]; signers: P7Signer[] };
