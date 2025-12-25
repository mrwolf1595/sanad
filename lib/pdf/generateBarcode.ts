/**
 * Barcode Generation Utility
 * Generates Code128 barcodes for receipt verification
 */

import bwip from 'bwip-js'

export interface BarcodeOptions {
  text: string
  width?: number
  height?: number
  includetext?: boolean
}

/**
 * Generate a barcode image as PNG buffer
 * @param options - Barcode configuration options
 * @returns PNG image buffer
 */
export async function generateBarcode(options: BarcodeOptions): Promise<Buffer> {
  const {
    text,
    width = 2,
    height = 50,
    includetext = true,
  } = options

  try {
    const png = await bwip.toBuffer({
      bcid: 'code128',       // Barcode type
      text: text,            // Text to encode
      scale: width,          // 3x scaling factor
      height: height,        // Bar height, in millimeters
      includetext: includetext, // Show human-readable text
      textxalign: 'center',  // Always good to set this
    })

    return png
  } catch (error) {
    console.error('Failed to generate barcode:', error)
    throw new Error('Failed to generate barcode')
  }
}

/**
 * Generate a QR code image as PNG buffer
 * @param options - Barcode configuration options
 * @returns PNG image buffer
 */
export async function generateQRCode(options: BarcodeOptions): Promise<Buffer> {
  const {
    text,
    width = 2, // scale factor
  } = options

  try {
    const png = await bwip.toBuffer({
      bcid: 'qrcode',        // QR Code type
      text: text,            // Text to encode
      scale: width,          // scaling factor
      includetext: false,    // QR codes don't have human-readable text usually
    })

    return png
  } catch (error) {
    console.error('Failed to generate QR code:', error)
    throw new Error('Failed to generate QR code')
  }
}

/**
 * Generate a barcode ID for a receipt
 * Format: RCP-YYYY-NNNNNN
 * @param receiptNumber - The receipt number
 * @param year - The year of receipt creation
 * @returns Formatted barcode ID
 */
export function generateBarcodeId(receiptNumber: string, year?: number): string {
  const currentYear = year || new Date().getFullYear()
  const paddedNumber = receiptNumber.padStart(6, '0')
  return `RCP-${currentYear}-${paddedNumber}`
}

/**
 * Validate barcode ID format
 * @param barcodeId - The barcode ID to validate
 * @returns true if valid, false otherwise
 */
export function isValidBarcodeId(barcodeId: string): boolean {
  const pattern = /^RCP-\d{4}-\d{6}$/
  return pattern.test(barcodeId)
}
