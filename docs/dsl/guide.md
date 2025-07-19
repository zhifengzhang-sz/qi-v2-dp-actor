1. market data should have two parts, data context and data content
   - data context includes market, exchange and ticker
   - data content: price, ohlcv and level1, should be compliant with fix protocal
2. market data context manager contract:
   - set context fields
   - get context fields (query)
3. marekt data content: key issue how does this work with mareket data context
   - MareketDataReader
     - get price: current and historical (start_date, end_date)
     - get ohlcv: current and historical
     - get level1: current and historical
     - realtime (streaming) for price, ohlcv and level1
   - MarketDataWriter: same as MarketDataReader with oposite direction