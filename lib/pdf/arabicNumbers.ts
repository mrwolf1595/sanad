// تحويل الأرقام إلى كلمات عربية
export function convertNumberToArabicWords(num: number): string {
  if (num === 0) return 'صفر ريال'

  const ones = [
    '', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة',
    'ستة', 'سبعة', 'ثمانية', 'تسعة'
  ]

  const tens = [
    '', '', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون',
    'ستون', 'سبعون', 'ثمانون', 'تسعون'
  ]

  const teens = [
    'عشرة', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر',
    'خمسة عشر', 'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'
  ]

  const hundreds = [
    '', 'مائة', 'مائتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة',
    'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة'
  ]

  const scales = ['', 'ألف', 'مليون', 'مليار', 'تريليون']

  function convertLessThanThousand(n: number): string {
    if (n === 0) return ''

    const parts: string[] = []

    // Hundreds
    const h = Math.floor(n / 100)
    if (h > 0) {
      parts.push(hundreds[h])
    }

    // Tens and ones
    const remainder = n % 100

    if (remainder >= 10 && remainder <= 19) {
      parts.push(teens[remainder - 10])
    } else {
      const t = Math.floor(remainder / 10)
      const o = remainder % 10

      if (t > 0) {
        parts.push(tens[t])
      }

      if (o > 0) {
        parts.push(ones[o])
      }
    }

    return parts.filter(p => p).join(' و ')
  }

  function convertWholeNumber(n: number): string {
    if (n === 0) return 'صفر'

    const parts: string[] = []
    let scaleIndex = 0

    while (n > 0) {
      const chunk = n % 1000
      if (chunk > 0) {
        const chunkWords = convertLessThanThousand(chunk)
        if (scaleIndex > 0) {
          // Handle plural forms for thousands, millions, etc.
          let scale = scales[scaleIndex]
          if (scaleIndex === 1) { // ألف
            if (chunk === 1) {
              parts.unshift('ألف')
            } else if (chunk === 2) {
              parts.unshift('ألفان')
            } else if (chunk <= 10) {
              parts.unshift(`${chunkWords} آلاف`)
            } else {
              parts.unshift(`${chunkWords} ألف`)
            }
          } else {
            parts.unshift(`${chunkWords} ${scale}`)
          }
        } else {
          parts.unshift(chunkWords)
        }
      }
      n = Math.floor(n / 1000)
      scaleIndex++
    }

    return parts.join(' و ')
  }

  // Split into whole and decimal parts
  const wholePart = Math.floor(num)
  const decimalPart = Math.round((num - wholePart) * 100)

  let result = convertWholeNumber(wholePart) + ' ريال'

  if (decimalPart > 0) {
    result += ' و ' + convertWholeNumber(decimalPart) + ' هللة'
  }

  return result + ' فقط لا غير'
}
