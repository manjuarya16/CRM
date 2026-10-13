import { IReportColumnDefinition } from '@/interface';

/**
 * Formats a number to Indian Rupee representation (e.g. ₹48,500)
 */
export const formatCurrencyInr = (amount: number | string | null | undefined): string => {
  const numericAmount = Math.round(Number(amount) || 0);
  return '₹' + numericAmount.toLocaleString('en-IN');
};

/**
 * Formats large amounts into compact Crores/Lakhs/Thousands (e.g. ₹1.25 Cr, ₹4.50 L, ₹48,500)
 */
export const formatCompactInr = (amount: number | string | null | undefined): string => {
  const numericAmount = Math.round(Number(amount) || 0);
  if (Math.abs(numericAmount) >= 10000000) {
    return '₹' + (numericAmount / 10000000).toFixed(2) + ' Cr';
  }
  if (Math.abs(numericAmount) >= 100000) {
    return '₹' + (numericAmount / 100000).toFixed(2) + ' L';
  }
  return '₹' + numericAmount.toLocaleString('en-IN');
};

/**
 * Formats an integer number with commas (e.g. 1,234)
 */
export const formatDisplayNumber = (numberValue: number | string | null | undefined): string => {
  const numericVal = Math.round(Number(numberValue) || 0);
  return numericVal.toLocaleString('en-IN');
};

/**
 * Formats an ISO date string to readable UK/India format (e.g. 13 Oct 2026)
 */
export const formatDateDisplay = (dateString: string | null | undefined): string => {
  if (!dateString) return '—';
  try {
    const parsedDate = new Date(dateString);
    if (isNaN(parsedDate.getTime())) return '—';
    return parsedDate.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
};

/**
 * Formats an ISO date string to date and time (e.g. 13 Oct, 14:05)
 */
export const formatDateTimeDisplay = (dateString: string | null | undefined): string => {
  if (!dateString) return '—';
  try {
    const parsedDate = new Date(dateString);
    if (isNaN(parsedDate.getTime())) return '—';
    return (
      parsedDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) +
      ', ' +
      parsedDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    );
  } catch {
    return '—';
  }
};

/**
 * Computes percentage safely
 */
export const computePercentage = (
  numerator: number,
  denominator: number,
  decimals: number = 1
): number => {
  if (!denominator) return 0;
  return Number(((numerator / denominator) * 100).toFixed(decimals));
};

/**
 * Utility to export table data to a downloadable CSV file
 */
export const exportTableToCsv = (
  columns: IReportColumnDefinition[],
  rows: any[],
  filename: string
): void => {
  if (!rows || rows.length === 0) return;

  const escapeCsvCell = (value: any): string => {
    if (value === null || value === undefined) return '';
    const stringValue = String(value);
    if (/[",\n\r]/.test(stringValue)) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
  };

  const headerRow = columns.map((column) => escapeCsvCell(column.header)).join(',');
  const dataRows = rows.map((row) =>
    columns
      .map((column) => {
        let cellValue: any = null;
        if (column.exportAccessor) {
          cellValue = column.exportAccessor(row);
        } else if (column.accessor) {
          cellValue = column.accessor(row);
        } else {
          cellValue = row[column.key];
        }
        return escapeCsvCell(cellValue);
      })
      .join(',')
  );

  const csvContent = [headerRow, ...dataRows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const downloadUrl = URL.createObjectURL(blob);
  const downloadLink = document.createElement('a');
  downloadLink.href = downloadUrl;
  downloadLink.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
  URL.revokeObjectURL(downloadUrl);
};
