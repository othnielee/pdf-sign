/**
 * This implements the pdf-lib approach to adding a signature placeholder,
 * as outlined in the following issue comment. This is an alternative to
 * the `plainAddPlaceholder` function in @signpdf/signpdf, which cannot
 * handle streams. Note that we take a slightly different approach from
 * the custom `PDFArrayCustom` class that formats the byte range array.
 * Credit to https://github.com/Hopding.
 *
 * https://github.com/Hopding/pdf-lib/issues/112#issuecomment-569085380
 *
 */

import { PDFDocument, PDFDict, PDFRef, PDFArray, PDFFont, PDFName, PDFHexString, PDFString, PDFBool, StandardFonts } from 'pdf-lib';
import { DEFAULT_SIGNATURE_LENGTH } from '@signpdf/utils';
import { SignatureOptions } from '../interfaces';
import { DEFAULT_SIGNATURE_REASON } from '../sign.constants';
import { getPlaceholderLayout } from './placeholder-layout';
import { PlaceholderByteRange } from './placeholder-byte-range';

export async function addPlaceholder(pdfBuffer: Buffer, signatureOptions: SignatureOptions): Promise<Buffer> {
  const pdfDoc = await PDFDocument.load(pdfBuffer).catch(() => null) as PDFDocument;

  if (!pdfDoc) {
    throw new Error('Could not load the PDF document');
  }

  // Set some basic signing params
  const signatureDate = new Date();
  const signatureReason = signatureOptions.reason || DEFAULT_SIGNATURE_REASON;
  const widgetName = `Signature_${signatureDate.getTime()}`;

  // Get parameters to position the signature --
  // `isVisibleSignature` determines whether the signature will be visible on the page.
  // This is determined by the signature size and position within page boundaries.

  const { page, isVisibleSignature, fontSize, rect, lineBaseXPos, lineBaseYPos } = getPlaceholderLayout(
    pdfDoc.getPages(),
    signatureOptions.fontSize,
    signatureOptions.pageNumber,
    signatureOptions.pageMargin,
    signatureOptions.xPosition,
    signatureOptions.yPosition,
    signatureOptions.width,
    signatureOptions.height,
  );

  // Setup the signature appearance --
  // There will be an appearance if the signature is visible. Otherwise,
  // the document will be signed and have an interactive signature panel,
  // but signature information will not be visible as part of page content.

  let appearanceStreamRef!: PDFRef;

  if (isVisibleSignature) {
    // Embed the Helvetica font to guarantee it will be available for the appearance stream
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica).catch(() => null) as PDFFont;

    if (!helveticaFont) {
      throw new Error('Failed to embed Helvetica font');
    }

    const fontName = 'Helv';
    const fontDict = pdfDoc.context.obj({
      Type: 'Font',
      Subtype: 'Type1',
      BaseFont: StandardFonts.Helvetica,
    });

    const resourcesDict = pdfDoc.context.obj({
      Font: { [fontName]: fontDict },
    });

    // Setup the appearance content --
    // Text is drawn left to right, top to bottom in the appearance rectangle.
    // So we start at the top and decrement the vertical position for each line.
    // Horizontal and vertical padding is built in to each line's base position.

    const appearanceLines = [
      `Digitally signed by ${signatureOptions.name}`,
      `Date: ${signatureDate.toISOString()}`,
      `Reason: ${signatureReason}`,
      `Location: ${signatureOptions.location}`,
    ];

    const appearanceContent = appearanceLines.map((line: string, idx: number): string =>
      `BT /${fontName} ${fontSize} Tf 0 0 0 rg ${lineBaseXPos} ${lineBaseYPos - (idx * (fontSize + 2))} Td (${line}) Tj ET`
    ).join('\n');

    const appearanceStreamDict = {
      Type: 'XObject',
      Subtype: 'Form',
      BBox: rect,
      Resources: resourcesDict,
      Length: (appearanceContent.length + 2),
    };

    const appearanceStream = pdfDoc.context.stream(appearanceContent, appearanceStreamDict);

    appearanceStreamRef = pdfDoc.context.register(appearanceStream);
  }

  // Setup the signature dictionary --
  // Since this is a placeholder, the contents property is filled with zeros.
  // The signing code will replace it with the actual signature data.

  // `PlaceholderByteRange` is a custom class that is modeled after `PDFArray`.
  // Unlike PDFArray, it formats the byte range array in a way that the
  // @signpdf/signpdf library expects.

  const signatureDict = pdfDoc.context.obj({
    Type: 'Sig',
    Filter: 'Adobe.PPKLite',
    SubFilter: 'adbe.pkcs7.detached',
    ByteRange: PlaceholderByteRange.of(pdfDoc.context),
    Contents: PDFHexString.of('0'.repeat(DEFAULT_SIGNATURE_LENGTH * 2)),
    Name: PDFString.of(signatureOptions.name),
    Location: PDFString.of(signatureOptions.location),
    ContactInfo: PDFString.of(signatureOptions.contact),
    Reason: PDFString.of(signatureReason),
    M: PDFString.fromDate(signatureDate),
  });

  const signatureDictRef = pdfDoc.context.register(signatureDict);

  // Setup the signature widget annotation dictionary --
  // We include the appearance stream if the signature is visible.

  const widgetDict = pdfDoc.context.obj({
    Type: 'Annot',
    Subtype: 'Widget',
    FT: 'Sig',
    Rect: rect,
    V: signatureDictRef,
    T: PDFString.of(widgetName),
    F: 4,
    P: page.ref,
    AP: isVisibleSignature ? { N: appearanceStreamRef } : undefined,
  });

  const widgetDictRef = pdfDoc.context.register(widgetDict);

  // Add the signature widget to the document catalog --
  // First, we check whether the document already has an AcroForm
  // dictionary with a usable fields array. If not, create the
  // objects to ensure they are available in the document catalog.
  // Then we add the widget annotation to AcroForm's Fields array.

  let acroForm = pdfDoc.catalog.get(PDFName.of('AcroForm')) as PDFDict;

  if (!acroForm) {
    acroForm = pdfDoc.context.obj({
      SigFlags: 3,
      Fields: [],
    });

    pdfDoc.catalog.set(PDFName.of('AcroForm'), acroForm);

  } else if (!acroForm.has(PDFName.of('Fields'))) {
    acroForm.set(PDFName.of('Fields'), pdfDoc.context.obj([]));
  }

  const formFields = acroForm.lookup(PDFName.of('Fields'), PDFArray);

  formFields.push(widgetDictRef);

  // Add the signature widget to the page annotations array --
  // Create the Annots array if it doesn't exist.

  let annotsArray = page.node.get(PDFName.of('Annots')) as PDFArray;

  if (!annotsArray) {
    annotsArray = pdfDoc.context.obj([]);
    page.node.set(PDFName.of('Annots'), annotsArray);
  }

  annotsArray.push(widgetDictRef);

  // If the signature is visible, tell PDF readers to generate the appearance stream
  if (isVisibleSignature) {
    pdfDoc.catalog.set(PDFName.of('NeedAppearances'), PDFBool.True);
  }

  // Get the resulting bytes, convert to a buffer, and return
  const signableBytes = await pdfDoc.save({ useObjectStreams: false });

  return Buffer.from(signableBytes);
}