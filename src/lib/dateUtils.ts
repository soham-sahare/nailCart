export const formatDateIST = (dateString: string) => {
  if (!dateString) return '';
  
  const date = new Date(dateString);

  // Options for 02-Jan-2026
  const datePart = date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata'
  }).toUpperCase().replace(/ /g, '-');

  // Options for 02:30:05 PM
  const timePart = date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata'
  }).toUpperCase(); // AM/PM uppercase just in case

  return `${datePart} ${timePart}`;
};
