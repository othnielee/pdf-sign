import { PDFPage } from 'pdf-lib';
import { DEFAULT_FONT_SIZE, DEFAULT_PAGE_MARGIN, MAXIMUM_PAGE_MARGIN, SIGNATURE_LINE_HORIZONTAL_OFFSET, SIGNATURE_LINE_VERTICAL_OFFSET } from '../sign.constants';

export function getPlaceholderLayout(
  pages: PDFPage[],
  fontsize?: number,
  pageNumber?: number,
  pageMargin?: number,
  xPosition?: number,
  yPosition?: number,
  width?: number,
  height?: number,
): { page: PDFPage; isVisibleSignature: boolean; fontSize: number; rect: number[]; lineBaseXPos: number; lineBaseYPos: number } {

  // Check for a valid pages array
  if (!Array.isArray(pages) || (pages.length === 0)) {
    throw new Error('A valid pages array is required');
  }

  // Get the page and check its validity
  const page = (typeof pageNumber === 'number') && (pageNumber > 0) && (pageNumber <= pages.length) ? pages[pageNumber - 1] : pages[0];

  if (!(page instanceof PDFPage)) {
    throw new Error('A valid page object is required');
  }

  // Get the font size
  const fontSize = (typeof fontsize === 'number') && (fontsize > 0) ? fontsize : DEFAULT_FONT_SIZE;

  // Get the page dimensions
  const pageWidth = page.getWidth();
  const pageHeight = page.getHeight();

  // The margin is the minimum distance from the edge of the page to the signing rectangle
  // It should be no more than half the width or height of the page or the max margin value
  const margin = (typeof pageMargin === 'number') && (pageMargin >= 0) && (pageMargin <= Math.min(MAXIMUM_PAGE_MARGIN, (pageWidth / 2), (pageHeight / 2)))
    ? pageMargin
    : DEFAULT_PAGE_MARGIN;

  // The rectangle is the area on the page where the signature will be placed
  // It should be no more than the width or height of the page less the margin
  const rectWidth = (typeof width === 'number') && (width > 0) && (width <= (pageWidth - (2 * margin))) ? width : -1;
  const rectHeight = (typeof height === 'number') && (height > 0) && (height <= (pageHeight - (2 * margin))) ? height : -1;

  // `llx`, `lly`, `urx`, `ury` are the conventional names for PDF rectangle coordinates
  // ll = lower left, ur = upper right, x = horizontal, y = vertical
  const llx = (typeof xPosition === 'number') && (xPosition >= margin) && ((xPosition + rectWidth) <= (pageWidth - margin)) ? xPosition : -1;
  const lly = (typeof yPosition === 'number') && (yPosition >= margin) && ((yPosition + rectHeight) <= (pageHeight - margin)) ? yPosition : -1;
  const urx = (llx + rectWidth) <= (pageWidth - margin) ? (llx + rectWidth) : -1;
  const ury = (lly + rectHeight) <= (pageHeight - margin) ? (lly + rectHeight) : -1;

  const isVisibleSignature = [rectWidth, rectHeight, llx, lly, urx, ury].every(val => val !== -1);

  const rect = isVisibleSignature ? [llx, lly, urx, ury] : [0, 0, 0, 0];

  // Get base x and y coordinates for each signature line --
  // Lines are written from top to bottom, so we start at the top of the rectangle.
  // The appearance code will decrement the y coordinate for each line.
  const lineBaseXPos = isVisibleSignature ? (llx + SIGNATURE_LINE_HORIZONTAL_OFFSET) : 0;
  const lineBaseYPos = isVisibleSignature ? (ury - SIGNATURE_LINE_VERTICAL_OFFSET) : 0;

  return { page, isVisibleSignature, fontSize, rect, lineBaseXPos, lineBaseYPos };
}