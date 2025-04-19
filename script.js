
let etfCount = 0;
let forecastCount = 0;

function switchTab(tabId) {
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(tabId).classList.add('active');
  document.querySelector('.tab-btn[onclick="switchTab(\'' + tabId + '\')"]').classList.add('active');
}

function addETFRow(ticker = '', allocation = 30) {
  const row = document.createElement('div');
  row.className = 'etf-row';
  row.innerHTML = \`
    <input type="text" placeholder="Ticker" value="\${ticker}" id="ticker-\${etfCount}" />
    <input type="number" placeholder="%" value="\${allocation}" id="alloc-\${etfCount}" />%
    <button onclick="this.parentElement.remove()">✖</button>
  \`;
  document.getElementById('etf-inputs').appendChild(row);
  etfCount++;
}

function addForecastRow(ticker = '', cagr = 10) {
  const row = document.createElement('div');
  row.className = 'etf-row';
  row.innerHTML = \`
    <input type="text" placeholder="Ticker" value="\${ticker}" />
    <input type="number" placeholder="CAGR %" value="\${cagr}" />%
    <button onclick="this.parentElement.remove()">✖</button>
  \`;
  document.getElementById('forecast-etfs').appendChild(row);
  forecastCount++;
}

async function fetchBacktest(ticker, amount = 300) {
  const res = await fetch(\`https://etf-api.onrender.com/api/backtest?ticker=\${ticker}&amount=\${amount}\`);
  return await res.json();
}

async function runBacktest() {
  const inputs = document.querySelectorAll('#etf-inputs .etf-row');
  const totalAlloc = Array.from(inputs).reduce((acc, row) => acc + parseFloat(row.querySelector('input[type="number"]').value || 0), 0);
  if (totalAlloc !== 100) {
    alert("Total allocation must equal 100%");
    return;
  }

  const monthly = parseFloat(document.getElementById('monthly').value);
  const months = [];
  const portfolio = [];
  let stats = { total_return: 0, cagr: 0, volatility: 0, max_drawdown: 0 };

  for (let row of inputs) {
    const ticker = row.querySelector('input[type="text"]').value;
    const alloc = parseFloat(row.querySelector('input[type="number"]').value) / 100;
    const result = await fetchBacktest(ticker, monthly * alloc);
    if (months.length === 0) months.push(...result.months);
    result.values.forEach((v, i) => portfolio[i] = (portfolio[i] || 0) + v);
    stats.total_return += result.total_return * alloc;
    stats.cagr += result.cagr * alloc;
    stats.volatility += result.volatility * alloc;
    stats.max_drawdown += result.max_drawdown * alloc;
  }

  const ctx = document.getElementById('backtestChart').getContext('2d');
  if (window.backtestChart) window.backtestChart.destroy();
  window.backtestChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: months,
      datasets: [{
        label: 'Portfolio Value',
        data: portfolio.map(v => v.toFixed(2)),
        borderColor: '#007bff',
        fill: false
      }]
    }
  });

  document.getElementById('total-return').innerText = stats.total_return.toFixed(2) + '%';
  document.getElementById('cagr').innerText = stats.cagr.toFixed(2) + '%';
  document.getElementById('volatility').innerText = stats.volatility.toFixed(2) + '%';
  document.getElementById('drawdown').innerText = stats.max_drawdown.toFixed(2) + '%';

  document.getElementById('download-csv').onclick = () => {
    let csv = 'Month,Portfolio Value\n';
    months.forEach((m, i) => csv += \`\${m},\${portfolio[i].toFixed(2)}\n\`);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'backtest.csv';
    a.click();
  };
}

function runForecast() {
  const rows = document.querySelectorAll('#forecast-etfs .etf-row');
  const monthly = parseFloat(document.getElementById('forecast-monthly').value);
  const years = parseInt(document.getElementById('forecast-years').value);
  const months = years * 12;
  const values = Array(months).fill(0);

  for (let row of rows) {
    const cagr = parseFloat(row.querySelector('input[type="number"]').value) / 100;
    const r = Math.pow(1 + cagr, 1/12) - 1;
    let v = 0;
    for (let i = 0; i < months; i++) {
      v = (v + monthly / rows.length) * (1 + r);
      values[i] += v;
    }
  }

  const labels = Array.from({length: months}, (_, i) => 'Month ' + (i + 1));
  const ctx = document.getElementById('forecastChart').getContext('2d');
  if (window.forecastChart) window.forecastChart.destroy();
  window.forecastChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Forecasted Portfolio',
        data: values.map(v => v.toFixed(2)),
        borderColor: '#28a745',
        fill: false
      }]
    }
  });

  document.getElementById('download-forecast').onclick = () => {
    let csv = 'Month,Forecast Value\n';
    labels.forEach((l, i) => csv += \`\${l},\${values[i].toFixed(2)}\n\`);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'forecast.csv';
    a.click();
  };
}

addETFRow('SPY', 50);
addETFRow('QQQ', 50);
addForecastRow('SPY', 10);
addForecastRow('QQQ', 12);
