/**
 * This implementation is based on the @signpdf/signpdf and forge libraries.
 * Credit to https://github.com/vbuch and https://github.com/digitalbazaar.
 *
 * https://github.com/vbuch/node-signpdf/blob/develop/packages/signpdf/src/signpdf.js
 * https://github.com/vbuch/node-signpdf/blob/develop/packages/signer-p12/src/P12Signer.js
 * https://github.com/digitalbazaar/forge/blob/main/examples/sign-p7.js
 *
 */

import forge from 'node-forge';
import { removeTrailingNewLine, findByteRange } from '@signpdf/utils';
import type { SignedData } from './sign.types';
import { SignatureOptions } from './interfaces';
import { Signer } from './signers';
import { addPlaceholder, resolveP7SignerInfos, resolveP7Signers } from './helpers';

export async function sign(unsigned: Buffer, signer: Signer, signatureOptions: SignatureOptions): Promise<Buffer> {
  if (!unsigned || !Buffer.isBuffer(unsigned)) {
    throw new Error('Invalid buffer provided.');
  }

  // Add the signature placeholder
  let pdf = await addPlaceholder(unsigned, signatureOptions);

  pdf = removeTrailingNewLine(pdf);

  // Find the ByteRange placeholder
  const { byteRangePlaceholder } = findByteRange(pdf);

  if (!byteRangePlaceholder) {
    throw new Error(`Could not find empty ByteRange placeholder: ${byteRangePlaceholder}`);
  }

  const byteRangePos = pdf.indexOf(byteRangePlaceholder);

  // Calculate the actual ByteRange that needs to replace the placeholder
  const byteRangeEnd = byteRangePos + byteRangePlaceholder.length;
  const contentsTagPos = pdf.indexOf('/Contents ', byteRangeEnd);
  const placeholderPos = pdf.indexOf('<', contentsTagPos);
  const placeholderEnd = pdf.indexOf('>', placeholderPos);
  const placeholderLengthWithBrackets = placeholderEnd + 1 - placeholderPos;
  const placeholderLength = placeholderLengthWithBrackets - 2;
  const byteRange = [0, 0, 0, 0];
  byteRange[1] = placeholderPos;
  byteRange[2] = byteRange[1] + placeholderLengthWithBrackets;
  byteRange[3] = pdf.length - byteRange[2];
  let actualByteRange = `/ByteRange [${byteRange.join(' ')}]`;
  actualByteRange += ' '.repeat(byteRangePlaceholder.length - actualByteRange.length);

  // Replace the /ByteRange placeholder with the actual ByteRange
  pdf = Buffer.concat([
    Buffer.from(pdf.subarray(0, byteRangePos)),
    Buffer.from(actualByteRange),
    Buffer.from(pdf.subarray(byteRangeEnd)),
  ]);

  // Remove the placeholder signature
  pdf = Buffer.concat([
    Buffer.from(pdf.subarray(0, byteRange[1])),
    Buffer.from(pdf.subarray(byteRange[2], byteRange[2] + byteRange[3])),
  ]);

  // Create a PKCS #7 signature --
  // `SignedData` is an extension of `forge.pkcs7.PkcsSignedData`,
  // with exposed `signerInfos` and `signers` properties. This
  // allows us to resolve signature values asynchronously.
  const p7 = forge.pkcs7.createSignedData() as SignedData;

  // Set the content to be signed
  p7.content = forge.util.createBuffer(pdf.toString('binary'));

  // Add certificate chain to the PKCS #7 signature
  for (const certificate of signer.certificateChain()) {
    p7.addCertificate(certificate);
  }

  // Add the signer
  p7.addSigner({
    key: signer.key(),
    certificate: signer.certificate(),
    digestAlgorithm: forge.pki.oids.sha256,
    authenticatedAttributes: [
      { type: forge.pki.oids.contentType, value: forge.pki.oids.data },
      { type: forge.pki.oids.signingTime, value: new Date().toISOString() },
      { type: forge.pki.oids.messageDigest },
    ],
  });

  // Perform the PKCS #7 signing --
  // This calls the `sign()` function on the signer's key, which sets
  // PKCS #7 signer info, including assigning the computed digital signature
  // as the `signature` property on the signer. When using an async signer,
  // we need to await the Promises before extracting the signature bytes.
  p7.sign({ detached: true });

  if (signer.isAsync()) {
    // If the signer is async, wait for the signer info to resolve
    p7.signerInfos = await resolveP7SignerInfos(p7.signerInfos);

    // Just for completeness, assign resolved values to signer's signature
    p7.signers = await resolveP7Signers(p7.signers);
  }

  // Get the signature
  const sig = Buffer.from(forge.asn1.toDer(p7.toAsn1()).getBytes(), 'binary');

  // Check if the PDF has a good enough placeholder to fit the signature
  if ((sig.length * 2) > placeholderLength) {
    throw new Error(`Signature exceeds placeholder length: ${sig.length * 2} > ${placeholderLength}`);
  }

  // Convert the signature to hex
  let signature = Buffer.from(sig).toString('hex');

  // Pad the signature with zeroes so the it is the same length as the placeholder
  signature += Buffer.from(String.fromCharCode(0).repeat((placeholderLength / 2) - sig.length)).toString('hex');

  // Place it in the document
  const signed = Buffer.concat([
    Buffer.from(pdf.subarray(0, byteRange[1])),
    Buffer.from(`<${signature}>`),
    Buffer.from(pdf.subarray(byteRange[1])),
  ]);

  // Return the signed PDF
  return signed;
}
