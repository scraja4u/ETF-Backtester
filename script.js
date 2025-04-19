
async function fetchCAGR(ticker) {
  try {
    const response = await fetch(`https://etf-api.onrender.com/api/etf?ticker=${ticker}`);
    const data = await response.json();
    if (data.cagr) {
      document.getElementById('cagrBase').value = data.cagr;
      return parseFloat(data.cagr);
    } else {
      console.error("Error fetching CAGR:", data.error);
      return null;
    }
  } catch (err) {
    console.error("Network error:", err);
    return null;
  }
}

async function runForecast() {
  const ticker = document.getElementById('etf-select').value;
  const monthly = parseFloat(document.getElementById('monthly').value);
  const years = parseInt(document.getElementById('years').value);
  const months = years * 12;

  const liveCAGR = await fetchCAGR(ticker);
  const baseCAGR = liveCAGR !== null ? liveCAGR / 100 : 0.10;

  const cagrBull = parseFloat(document.getElementById('cagrBull').value) / 100;
  const cagrBear = parseFloat(document.getElementById('cagrBear').value) / 100;

  const calcForecast = (rate) => {
    const r = Math.pow(1 + rate, 1/12) - 1;
    let fv = [];
    let value = 0;
    for (let i = 0; i < months; i++) {
      value = (value + monthly) * (1 + r);
      fv.push(value.toFixed(2));
    }
    return fv;
  };

  const monthsLabels = Array.from({length: months}, (_, i) => 'Month ' + (i + 1));
  const bull = calcForecast(cagrBull);
  const base = calcForecast(baseCAGR);
  const bear = calcForecast(cagrBear);

  const ctx = document.getElementById('forecastChart').getContext('2d');
  if (window.portfolioChart) window.portfolioChart.destroy();
  window.portfolioChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: monthsLabels,
      datasets: [
        { label: 'Bull Case', data: bull, borderColor: 'green', fill: false },
        { label: 'Base Case (Live CAGR)', data: base, borderColor: 'blue', fill: false },
        { label: 'Bear Case', data: bear, borderColor: 'red', fill: false }
      ]
    },
    options: {
      responsive: true,
      scales: {
        y: { title: { display: true, text: 'Value (SGD)' } },
        x: { title: { display: true, text: 'Month' } }
      }
    }
  });

  document.getElementById('download-csv').onclick = () => {
    let csv = "Month,Bull Case,Base Case (Live CAGR),Bear Case\n";
    for (let i = 0; i < months; i++) {
      csv += `${monthsLabels[i]},${bull[i]},${base[i]},${bear[i]}\n`;
    }
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', 'forecast.csv');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };
}
