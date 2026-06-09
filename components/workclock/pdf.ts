import { formatEntryDate, formatDuration, getEntryDurationMs, HOUR_MS } from '@/lib/workclock'
import { formatTime } from '@/lib/workclock'
import type { Entry } from './types'

export function createPayPeriodPdf({
  endDate,
  entries,
  startDate,
  workerName,
}: {
  endDate: string
  entries: Entry[]
  startDate: string
  workerName: string
}): Uint8Array {
  const pageWidth = 612
  const pageHeight = 792
  const marginLeft = 44
  const marginRight = 44
  const topStart = 730
  const bottomMargin = 52
  const rowHeight = 34
  const contentWidth = pageWidth - marginLeft - marginRight
  const dateColumnX = marginLeft + 16
  const timeColumnX = marginLeft + 200
  const durationColumnX = marginLeft + 430
  const totalHours = entries.reduce((sum, entry) => sum + getEntryDurationMs(entry), 0) / HOUR_MS

  const rows = entries.map((entry) => ({
    date: formatEntryDate(new Date(entry.start)),
    time: formatPdfTimeRange(entry),
    duration: formatDuration(getEntryDurationMs(entry) / HOUR_MS),
  }))

  const pages: string[] = []
  let rowIndex = 0

  while (rowIndex < rows.length || pages.length === 0) {
    let cursorY = topStart
    let content = ''

    content += pdfRect(marginLeft, cursorY - 56, contentWidth, 78, '0.12 0.16 0.28 rg')
    content += pdfText('Pay Period Report', marginLeft + 20, cursorY - 22, 22, {
      color: '1 1 1 rg',
      font: 'bold',
    })
    cursorY -= 108

    content += pdfRect(marginLeft, cursorY - 8, contentWidth / 2 - 8, 48, '0.96 0.97 0.99 rg')
    content += pdfRect(marginLeft + contentWidth / 2 + 8, cursorY - 8, contentWidth / 2 - 8, 48, '0.96 0.97 0.99 rg')
    content += pdfText('WORKER', marginLeft + 16, cursorY + 22, 9, {
      color: '0.39 0.45 0.58 rg',
      font: 'bold',
    })
    content += pdfText(workerName || 'Not set', marginLeft + 16, cursorY + 6, 12, { font: 'bold' })
    content += pdfText('RANGE', marginLeft + contentWidth / 2 + 24, cursorY + 22, 9, {
      color: '0.39 0.45 0.58 rg',
      font: 'bold',
    })
    content += pdfText(formatPdfDateRange(startDate, endDate), marginLeft + contentWidth / 2 + 24, cursorY + 6, 12, {
      font: 'bold',
    })
    cursorY -= 40
    content += pdfStrokeLine(marginLeft, cursorY - 8, pageWidth - marginRight, cursorY - 8, '0.84 G')
    cursorY -= 38

    content += pdfRect(marginLeft, cursorY - 24, contentWidth, 34, '0.21 0.27 0.40 rg')
    content += pdfText('DATE', dateColumnX, cursorY - 4, 10, { color: '1 1 1 rg', font: 'bold' })
    content += pdfText('TIME', timeColumnX, cursorY - 4, 10, { color: '1 1 1 rg', font: 'bold' })
    content += pdfText('HOURS', durationColumnX, cursorY - 4, 10, { color: '1 1 1 rg', font: 'bold' })
    cursorY -= 42

    while (rowIndex < rows.length && cursorY > bottomMargin + rowHeight * 2) {
      const row = rows[rowIndex]
      if (rowIndex % 2 === 0) {
        content += pdfRect(marginLeft, cursorY - 20, contentWidth, 28, '0.985 0.988 0.995 rg')
      }
      content += pdfText(row.date, dateColumnX, cursorY, 10, { font: 'bold' })
      content += pdfText(row.time, timeColumnX, cursorY, 10)
      content += pdfText(row.duration, durationColumnX, cursorY, 10, { font: 'bold' })
      content += pdfStrokeLine(marginLeft, cursorY - 14, pageWidth - marginRight, cursorY - 14, '0.88 G')
      cursorY -= rowHeight
      rowIndex += 1
    }

    if (rowIndex >= rows.length) {
      const totalBoxY = Math.max(cursorY - 38, 58)
      content += pdfRect(marginLeft, totalBoxY, contentWidth, 56, '0.89 0.93 0.99 rg')
      content += pdfText('TOTAL HOURS', marginLeft + 18, totalBoxY + 33, 11, {
        color: '0.21 0.27 0.40 rg',
        font: 'bold',
      })
      content += pdfText(formatDuration(totalHours), durationColumnX, totalBoxY + 33, 14, { font: 'bold' })
    }

    pages.push(content)
  }

  return buildPdfDocument({ pageHeight, pageWidth, pages })
}

function buildPdfDocument({
  pageHeight,
  pageWidth,
  pages,
}: {
  pageHeight: number
  pageWidth: number
  pages: string[]
}): Uint8Array {
  const objects: string[] = []
  const pageObjectNumbers: number[] = []

  objects.push('<< /Type /Catalog /Pages 2 0 R >>')
  objects.push('')

  for (const pageContent of pages) {
    const contentObjectNumber = objects.length + 1
    const contentStream = toPdfBytes(pageContent)
    objects.push(`<< /Length ${contentStream.length} >>\nstream\n${pageContent}\nendstream`)

    const pageObjectNumber = objects.length + 1
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> /F2 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >> >> >> /Contents ${contentObjectNumber} 0 R >>`
    )
    pageObjectNumbers.push(pageObjectNumber)
  }

  objects[1] = `<< /Type /Pages /Kids [${pageObjectNumbers.map((value) => `${value} 0 R`).join(' ')}] /Count ${pageObjectNumbers.length} >>`

  let pdf = '%PDF-1.4\n'
  const offsets: number[] = [0]

  objects.forEach((object, index) => {
    offsets.push(pdf.length)
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`
  })

  const xrefOffset = pdf.length
  pdf += `xref\n0 ${objects.length + 1}\n`
  pdf += '0000000000 65535 f \n'

  for (let index = 1; index <= objects.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, '0')} 00000 n \n`
  }

  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`

  return toPdfBytes(pdf)
}

function pdfText(
  value: string,
  x: number,
  y: number,
  fontSize: number,
  options?: { color?: string; font?: 'regular' | 'bold' }
): string {
  const fontName = options?.font === 'bold' ? 'F2' : 'F1'
  const colorCommand = options?.color ? `${options.color} ` : ''
  return `q ${colorCommand}BT /${fontName} ${fontSize} Tf 1 0 0 1 ${x} ${y} Tm (${escapePdfText(value)}) Tj ET Q\n`
}

function pdfRect(x: number, y: number, width: number, height: number, fillColorCommand: string): string {
  return `q ${fillColorCommand} ${x} ${y} ${width} ${height} re f Q\n`
}

function pdfStrokeLine(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  strokeColorCommand: string
): string {
  return `q ${strokeColorCommand} ${startX} ${startY} m ${endX} ${endY} l S Q\n`
}

function escapePdfText(value: string): string {
  return sanitizePdfText(value).replaceAll('\\', '\\\\').replaceAll('(', '\\(').replaceAll(')', '\\)')
}

function sanitizePdfText(value: string): string {
  return value.replaceAll(/[^\x20-\x7E]/g, '?')
}

function toPdfBytes(value: string): Uint8Array {
  return new TextEncoder().encode(value)
}

function formatPdfTimeRange(entry: Entry): string {
  return `${formatTime(new Date(entry.start))} - ${formatTime(new Date(entry.end))}`
}

function formatPdfDateRange(startDate: string, endDate: string): string {
  return `${formatEntryDate(new Date(`${startDate}T12:00:00`))} - ${formatEntryDate(
    new Date(`${endDate}T12:00:00`)
  )}`
}
