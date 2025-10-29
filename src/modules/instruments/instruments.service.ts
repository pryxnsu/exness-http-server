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

    if (type === 'forex') {
        const parsedData = await fetchData(
            `https://api.twelvedata.com/quote?symbol=${symbol}&apikey=5a0b6d1a791b473f8a35715ee73c56be`
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
            `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=YMFE1B2C3319DD54`
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
