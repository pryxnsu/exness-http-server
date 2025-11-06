import { env } from '../../env';

async function fetchData(url: string) {
    try {
        const response = await fetch(url);
        const parsedData = await response.json();

        if (parsedData.status === 'error') {
            console.error(`Error fetching ${url}:`, parsedData.message);
            return null;
        }
        return parsedData;
    } catch (err: unknown) {
        console.error(`Error fetching ${url}:`, err);
        return null;
    }
}

/**
 * @returns bid, ask and change of favorites instruments
 */
export async function fetchPriceOfSymbol(symbol: string, type: string) {
    let data = undefined;
    let spreadPercent: number;

    type = type.toLowerCase();

    switch (type) {
        case 'forex':
            spreadPercent = 0.3;
            break;
        case 'stock':
        case 'indices':
        case 'commodities':
            spreadPercent = 0.02;
            break;
        default:
            spreadPercent = 0.02;
    }

    if (type === 'forex' || type === 'crypto') {
        const parsedData = await fetchData(
            `https://api.twelvedata.com/quote?symbol=${symbol}&apikey=${env.twelveDataApiKey}`
        );

        const signal = parseFloat(parsedData.change) < 0 ? 'down' : 'up';
        const price = parseFloat(parsedData.close);
        const halfSpread = (price * (spreadPercent / 100)) / 2;
        const bid = price - halfSpread;
        const ask = price + halfSpread;

        data = {
            signal, //up or down
            symbol: symbol,
            bid: bid.toFixed(4),
            ask: ask.toFixed(4),
            change: parseFloat(parsedData.percent_change).toFixed(2), // one day change
        };
    } else if (type === 'stock') {
        const parsedData = await fetchData(
            `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${env.alphaVantageApiKey}`
        );
        const quoteData = parsedData['Global Quote'];

        const price = parseFloat(quoteData['05. price']);
        const signal = parseFloat(quoteData['09. change']) < 0 ? 'down' : 'up';
        const changePercent = parseFloat(quoteData['10. change percent']).toFixed(2);
        const halfSpread = (price * (spreadPercent / 100)) / 2;
        const bid = price - halfSpread;
        const ask = price + halfSpread;

        data = {
            signal,
            symbol: quoteData['01. symbol'],
            bid,
            ask,
            change: changePercent,
        };
    }
    return data;
}

/**
 * @returns candles data of instrument
 */
export async function fetchInstrumentCandles({
    symbol,
    type,
    timeFrame,
    from,
    count,
}: {
    symbol: string;
    type: string;
    timeFrame: string;
    from: string;
    count: string;
}) {
    const interval = timeFrame; // in minutes
    const startTime = from ? new Date(from).getTime() : undefined;
    const candleCount = count || 300;

    let data = undefined;
    type = type.toLowerCase();

    if (type == 'forex' || type == 'crypto') {
        let url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}m&limit=${candleCount}`;
        if (startTime) url += `&startTime=${startTime}`;
        const parsedData = await fetchData(url);

        if (!Array.isArray(parsedData)) {
            return null;
        }

        data = parsedData
            .map((c: any) => ({
                time: c[0],
                open: c[1],
                high: c[2],
                low: c[3],
                close: c[4],
                volume: c[5],
            }))
            .reverse();
    } else if (type == 'stock') {
        const url = `https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol=${symbol}&interval=${interval}min&apikey=${env.alphaVantageApiKey}`;
        let parsedData = await fetchData(url);

        parsedData = parsedData['Time Series (5min)'];

        data = Object.entries(parsedData).map(([k, v]: [string, any]) => {
            const date = new Date(k);
            const currDate = date.getTime();

            return {
                time: currDate,
                open: v['1. open'],
                high: v['2. high'],
                low: v['3. low'],
                close: v['4. close'],
                volume: v['5. volume'],
            };
        });
    }
    return data;
}
