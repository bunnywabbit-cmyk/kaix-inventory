import type { DtfPrintSize } from '../types/api'

export const DTF_PRINT_SIZE_OPTIONS: DtfPrintSize[] = ['A4', 'A3', 'A3_PLUS']

export const dtfPrintSizeLabels: Record<DtfPrintSize, string> = {
  A4: 'A4',
  A3: 'A3',
  A3_PLUS: 'A3+',
}
