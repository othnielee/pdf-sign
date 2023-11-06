/**
 * This is a modified version of the `PDFArrayCustom` class from
 * https://github.com/Hopding/pdf-lib/issues/112#issuecomment-569085380.
 *
 * Instead of extending PDFArray with a few custom methods, this class
 * is a clone of PDFArray with key methods modified to ensure that the
 * byte range array is formatted in a way that is compatible with the
 * @signpdf/signpdf library. We also implement an `of` method to return
 * the formatted array, avoiding the need to manually construct it in
 * the `addPlaceholder` function. Credit to https://github.com/Hopding.
 */

import { DEFAULT_BYTE_RANGE_PLACEHOLDER } from '@signpdf/utils';
import {
  PDFArray,
  PDFBool,
  PDFDict,
  PDFHexString,
  PDFName,
  PDFNull,
  PDFNumber,
  PDFObject,
  PDFRef,
  PDFStream,
  PDFString,
  PDFContext,
  CharCodes,
  PDFArrayIsNotRectangleError,
  PDFRawStream,
} from 'pdf-lib';

export class PlaceholderByteRange extends PDFObject {
  static of = (context: PDFContext) => {
    const byteRange = new PlaceholderByteRange(context);

    byteRange.push(PDFNumber.of(0));
    byteRange.push(PDFName.of(DEFAULT_BYTE_RANGE_PLACEHOLDER));
    byteRange.push(PDFName.of(DEFAULT_BYTE_RANGE_PLACEHOLDER));
    byteRange.push(PDFName.of(DEFAULT_BYTE_RANGE_PLACEHOLDER));

    return byteRange;
  };

  private readonly array: PDFObject[];
  private readonly context: PDFContext;

  private constructor(context: PDFContext) {
    super();
    this.array = [];
    this.context = context;
  }

  size(): number {
    return this.array.length;
  }

  push(object: PDFObject): void {
    this.array.push(object);
  }

  insert(index: number, object: PDFObject): void {
    this.array.splice(index, 0, object);
  }

  indexOf(object: PDFObject): number | undefined {
    const index = this.array.indexOf(object);
    return index === -1 ? undefined : index;
  }

  remove(index: number): void {
    this.array.splice(index, 1);
  }

  set(idx: number, object: PDFObject): void {
    this.array[idx] = object;
  }

  get(index: number): PDFObject {
    return this.array[index];
  }

  lookupMaybe(index: number, type: typeof PDFArray): PDFArray | undefined;
  lookupMaybe(index: number, type: typeof PDFBool): PDFBool | undefined;
  lookupMaybe(index: number, type: typeof PDFDict): PDFDict | undefined;
  lookupMaybe(
    index: number,
    type: typeof PDFHexString,
  ): PDFHexString | undefined;
  lookupMaybe(index: number, type: typeof PDFName): PDFName | undefined;
  lookupMaybe(index: number, type: typeof PDFNull): typeof PDFNull | undefined;
  lookupMaybe(index: number, type: typeof PDFNumber): PDFNumber | undefined;
  lookupMaybe(index: number, type: typeof PDFStream): PDFStream | undefined;
  lookupMaybe(
    index: number,
    type: typeof PDFRawStream,
  ): PDFRawStream | undefined;
  lookupMaybe(index: number, type: typeof PDFRef): PDFRef | undefined;
  lookupMaybe(index: number, type: typeof PDFString): PDFString | undefined;
  lookupMaybe(
    index: number,
    type1: typeof PDFString,
    type2: typeof PDFHexString,
  ): PDFString | PDFHexString | undefined;

  lookupMaybe(index: number, ...types: any[]) {
    return this.context.lookupMaybe(
      this.get(index),
      // @ts-ignore
      ...types,
    ) as any;
  }

  lookup(index: number): PDFObject | undefined;
  lookup(index: number, type: typeof PDFArray): PDFArray;
  lookup(index: number, type: typeof PDFBool): PDFBool;
  lookup(index: number, type: typeof PDFDict): PDFDict;
  lookup(index: number, type: typeof PDFHexString): PDFHexString;
  lookup(index: number, type: typeof PDFName): PDFName;
  lookup(index: number, type: typeof PDFNull): typeof PDFNull;
  lookup(index: number, type: typeof PDFNumber): PDFNumber;
  lookup(index: number, type: typeof PDFStream): PDFStream;
  lookup(index: number, type: typeof PDFRawStream): PDFRawStream;
  lookup(index: number, type: typeof PDFRef): PDFRef;
  lookup(index: number, type: typeof PDFString): PDFString;
  lookup(
    index: number,
    type1: typeof PDFString,
    type2: typeof PDFHexString,
  ): PDFString | PDFHexString;

  lookup(index: number, ...types: any[]) {
    return this.context.lookup(
      this.get(index),
      // @ts-ignore
      ...types,
    ) as any;
  }

  asRectangle(): { x: number; y: number; width: number; height: number } {
    if (this.size() !== 4) throw new PDFArrayIsNotRectangleError(this.size());

    const lowerLeftX = this.lookup(0, PDFNumber).asNumber();
    const lowerLeftY = this.lookup(1, PDFNumber).asNumber();
    const upperRightX = this.lookup(2, PDFNumber).asNumber();
    const upperRightY = this.lookup(3, PDFNumber).asNumber();

    const x = lowerLeftX;
    const y = lowerLeftY;
    const width = upperRightX - lowerLeftX;
    const height = upperRightY - lowerLeftY;

    return { x, y, width, height };
  }

  asArray(): PDFObject[] {
    return this.array.slice();
  }

  clone(context?: PDFContext): PlaceholderByteRange {
    const clone = PlaceholderByteRange.of(context || this.context);
    for (let idx = 0, len = this.size(); idx < len; idx++) {
      clone.push(this.array[idx]);
    }
    return clone;
  }

  toString(): string {
    let arrayString = '[';
    for (let idx = 0, len = this.size(); idx < len; idx++) {
      arrayString += this.get(idx).toString();
      if (idx < (len - 1)) {
        arrayString += ' ';
      }
    }
    arrayString += ']';
    return arrayString;
  }

  sizeInBytes(): number {
    let size = 2;
    for (let idx = 0, len = this.size(); idx < len; idx++) {
      size += this.get(idx).sizeInBytes();
      if (idx < (len - 1)) {
        size += 1;
      }
    }
    return size;
  }

  copyBytesInto(buffer: Uint8Array, offset: number): number {
    const initialOffset = offset;

    buffer[offset++] = CharCodes.LeftSquareBracket;
    for (let idx = 0, len = this.size(); idx < len; idx++) {
      offset += this.get(idx).copyBytesInto(buffer, offset);
      if (idx < (len - 1)) {
        buffer[offset++] = CharCodes.Space;
      }
    }
    buffer[offset++] = CharCodes.RightSquareBracket;

    return offset - initialOffset;
  }

  scalePDFNumbers(x: number, y: number): void {
    for (let idx = 0, len = this.size(); idx < len; idx++) {
      const el = this.lookup(idx);
      if (el instanceof PDFNumber) {
        const factor = ((idx % 2) === 0) ? x : y;
        this.set(idx, PDFNumber.of(el.asNumber() * factor));
      }
    }
  }
}
