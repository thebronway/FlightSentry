export const OTA_DOMAINS = [
  'expedia.com',
  'priceline.com',
  'kayak.com',
  'hopper.com',
  'chase.com',
  'amextravel.com',
  'capitalone.com',
  'travelocity.com',
  'orbitz.com',
  'cheapoair.com',
];

export const NON_AIRPORT_CODES = new Set([
  'THE', 'AND', 'FOR', 'YOU', 'ARE', 'NOT', 'ALL', 'ANY', 'CAN', 'HAS', 'HAD',
  'EST', 'EDT', 'CST', 'CDT', 'MST', 'MDT', 'PST', 'PDT', 'UTC', 'GMT',
  'USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF', 'NZD', 'MXN',
  'PNR', 'AIR', 'JET', 'FLY', 'NON', 'ONE', 'TWO', 'VIA', 'PER', 'TAX',
  'FEE', 'BAG', 'MAX', 'MIN', 'NEW', 'OLD', 'ADD', 'GET', 'SET', 'USE',
  'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN',
  'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC',
]);

export const PNR_STOPWORDS = new Set([
  'FLIGHT', 'STATUS', 'CHANGE', 'CANCEL', 'TICKET', 'NUMBER', 'ONLINE',
  'TRAVEL', 'DIRECT', 'RETURN', 'DEPART', 'ARRIVE', 'VERIFY', 'UPDATE',
  'MANAGE', 'SEARCH', 'BOOKED', 'POINTS', 'REWARD', 'CREDIT', 'AMOUNT',
]);

export const MONTH_MAP: Record<string, string> = {
  jan: '01', january: '01',
  feb: '02', february: '02',
  mar: '03', march: '03',
  apr: '04', april: '04',
  may: '05',
  jun: '06', june: '06',
  jul: '07', july: '07',
  aug: '08', august: '08',
  sep: '09', sept: '09', september: '09',
  oct: '10', october: '10',
  nov: '11', november: '11',
  dec: '12', december: '12',
};