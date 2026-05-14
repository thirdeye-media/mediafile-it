async function fetchCSV() {
  const response = await fetch("https://docs.google.com/spreadsheets/d/1p_VQI3HhaNQj9BiLpzvuH4WRgIxrxbDsUWnnRmKlktM/export?format=csv");
  const text = await response.text();
  console.log(text.substring(0, 1500));
}

fetchCSV();
