
from flask import Flask, jsonify, request
import yfinance as yf
import pandas as pd
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

@app.route('/api/backtest', methods=['GET'])
def backtest():
    ticker = request.args.get('ticker')
    start_date = request.args.get('start', '2014-01-01')  # 10-year default
    monthly_investment = float(request.args.get('amount', 300))

    if not ticker:
        return jsonify({'error': 'Missing ticker parameter'}), 400

    try:
        data = yf.Ticker(ticker).history(start=start_date)
        if data.empty:
            return jsonify({'error': 'No data returned'}), 404

        data = data.resample('M').last()  # monthly NAV
        data['units'] = monthly_investment / data['Close']
        data['cum_units'] = data['units'].cumsum()
        data['portfolio_value'] = data['cum_units'] * data['Close']
        data['investment'] = monthly_investment * (range(1, len(data) + 1))
        data['profit'] = data['portfolio_value'] - data['investment']
        data['monthly_returns'] = data['portfolio_value'].pct_change().fillna(0)

        total_return = data['portfolio_value'].iloc[-1] / data['investment'].iloc[-1] - 1
        years = (data.index[-1] - data.index[0]).days / 365.25
        cagr = (data['portfolio_value'].iloc[-1] / monthly_investment) ** (1 / years) - 1

        drawdown = (data['portfolio_value'] / data['portfolio_value'].cummax()) - 1
        max_drawdown = drawdown.min()

        volatility = data['monthly_returns'].std() * (12 ** 0.5)

        return jsonify({
            'ticker': ticker,
            'months': [d.strftime('%Y-%m') for d in data.index],
            'values': data['portfolio_value'].round(2).tolist(),
            'investment': data['investment'].round(2).tolist(),
            'returns': data['monthly_returns'].round(4).tolist(),
            'total_return': round(total_return * 100, 2),
            'cagr': round(cagr * 100, 2),
            'volatility': round(volatility * 100, 2),
            'max_drawdown': round(max_drawdown * 100, 2)
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)
