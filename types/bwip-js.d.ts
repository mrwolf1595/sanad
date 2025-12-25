/**
 * Type declarations for bwip-js
 * Barcode generation library
 */

declare module 'bwip-js' {
  export interface BwipOptions {
    bcid: string
    text: string
    scale?: number
    height?: number
    width?: number
    includetext?: boolean
    textxalign?: 'left' | 'center' | 'right' | 'offleft' | 'offcenter' | 'offright' | 'justify'
    textsize?: number
    alttext?: string
    textyoffset?: number
    textfont?: string
    textgaps?: number
    textxoffset?: number
    backgroundcolor?: string
    barcolor?: string
    paddingleft?: number
    paddingright?: number
    paddingtop?: number
    paddingbottom?: number
    monochrome?: boolean
    parsefnc?: boolean
    eclevel?: string | number
    version?: string | number
    sizelimit?: number
    inkspread?: number
    inkspreadh?: number
    inkspreadv?: number
  }

  export function toBuffer(options: BwipOptions): Promise<Buffer>
  export function toCanvas(canvas: any, options: BwipOptions): void
  export function loadFont(fontName: string, multiplier: number, fontFile: string): void
}
