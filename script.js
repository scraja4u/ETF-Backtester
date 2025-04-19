
let etfCount = 0;

function addETFRow(ticker = '', allocation = 20) {
  const row = document.createElement('div');
  row.className = 'etf-row';
  row.innerHTML = \`
    <input type="text" placeholder="ETF Ticker" value="\${ticker}" id="ticker-\${etfCount}" />
    <input type="number" value="\${allocation}" id="alloc-\${etfCount}" />%
    <button class="remove-btn" onclick="this.parentElement.remove()">✖</button>
  \`;
  document.getElementById('etf-list').appendChild(row);
  etfCount++;
}

function initDefaultETFs() {
  addETFRow('SPYL', 20);
  addETFRow('IWDA.L', 20);
  addETFRow('EIMI.L', 20);
  addETFRow('DGTL.L', 20);
  addETFRow('GLDA.L', 20);
}

async function fetchCAGR(ticker) {
  try {
    const response = await fetch(\`https://etf-api.onrender.com/api/etf?ticker=\${ticker}\`);
    const data = await response.json();
    return data.cagr ? parseFloat(data.cagr) : 8;
  } catch {
    return 8;
  }
}

async function runPortfolioForecast() {
  const monthly = parseFloat(document.getElementById('monthly').value);
  const years = parseInt(document.getElementById('years').value);
  const months = years * 12;

  const etfInputs = document.querySelectorAll('.etf-row');
  const tickers = [];
  const allocations = [];
  const cagrMap = {};
  let totalAlloc = 0;

  etfInputs.forEach((row, index) => {
    const ticker = row.querySelector('input[type="text"]').value;
    const alloc = parseFloat(row.querySelector('input[type="number"]').value);
    if (ticker && alloc > 0) {
      tickers.push(ticker);
      allocations.push(alloc);
      totalAlloc += alloc;
    }
  });

  if (totalAlloc !== 100) {
    alert('Total allocation must be 100%');
    return;
  }

  for (let t of tickers) {
    cagrMap[t] = await fetchCAGR(t);
  }

  const labels = Array.from({ length: months }, (_, i) => 'Month ' + (i + 1));
  const values = Array(months).fill(0);

  tickers.forEach((ticker, idx) => {
    const alloc = allocations[idx] / 100;
    const r = Math.pow(1 + cagrMap[ticker] / 100, 1 / 12) - 1;
    let v = 0;
    for (let i = 0; i < months; i++) {
      v = (v + monthly * alloc) * (1 + r);
      values[i] += v;
    }
  });

  const ctx = document.getElementById('portfolioChart').getContext('2d');
  if (window.portfolioChart) window.portfolioChart.destroy();
  window.portfolioChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Projected Portfolio Value',
        data: values.map(v => v.toFixed(2)),
        borderColor: '#007bff',
        fill: false
      }]
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
    let csv = 'Month,Value\n';
    values.forEach((val, i) => {
      csv += \`\${labels[i]},\${val.toFixed(2)}\n\`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'portfolio_forecast.csv';
    a.click();
  };
}

initDefaultETFs();
