# CTAP / Never 86'd Agent Brief — CoinGecko Connector

**Author:** Manus AI  
**Date:** 2026-05-29  
**Status:** Tested in current task and ready for agent use.

## Purpose

This note preserves the tested **CoinGecko connector** capability for CTAP / Never 86'd agents. The connector should be treated as a live crypto-market intelligence source that can fetch prices, coin-market rows, global market data, historical market series, token lookup information, categories, exchange rates, and related market context when the user asks for crypto or token analysis.

> **Standing rule:** When Mychael asks for crypto prices, coin screening, market-cap lists, historical price movement, or crypto-market summaries, the agent should use the CoinGecko connector rather than guessing or relying on stale memory.

## What Was Tested

The connector was tested by listing available tools, searching the CoinGecko SDK documentation, and executing a live market-data request through the connector. The sample request successfully fetched current price information for **Bitcoin**, **Ethereum**, and **Solana**, plus global crypto-market statistics.

| Connector Test | Result |
|---|---|
| Tool discovery | Successful |
| SDK documentation search | Successful |
| Live simple price fetch | Successful |
| Coin market rows fetch | Successful |
| Global market data fetch | Successful |

## Sample Data Fetched During Test

The following values were fetched during the connector test and should be understood as a point-in-time sample, not a permanent market quote.

| Data Point | Sample Value Fetched |
|---|---:|
| Bitcoin price | $77,393 |
| Ethereum price | $2,117.60 |
| Solana price | $85.60 |
| Bitcoin 24h change | +1.05% |
| Ethereum 24h change | +1.24% |
| Solana 24h change | +0.78% |
| Total crypto market cap | $2.66T |
| Total crypto 24h volume | $67.77B |
| Active cryptocurrencies reported | 17,393 |
| Tracked markets reported | 1,474 |

## Capabilities For CTAP Agents

The connector exposes a documentation-search workflow and an execution workflow. Agents should first use documentation search when they are unsure of the exact method or parameters, then use execution to call the appropriate CoinGecko API client method.

| Agent Need | CoinGecko Connector Use |
|---|---|
| Check live prices | Fetch simple prices for one or more coins in USD or another currency. |
| Build a top-coins table | Fetch market rows sorted by market cap, volume, or other market metrics. |
| Create a historical chart | Pull historical price or market-chart data for a selected coin and time window. |
| Summarize crypto market conditions | Pull global market cap, volume, market dominance, and active market counts. |
| Screen tokens | Look up coin IDs, symbols, categories, volume, market cap, and recent movement. |
| Support reports or dashboards | Feed live or historical market data into owner-facing summaries, spreadsheets, or dashboards. |

## Example Agent Prompt Patterns

Use the connector when the user asks questions such as these:

| User Request | Agent Action |
|---|---|
| “Get BTC, ETH, and SOL prices.” | Fetch simple prices with 24h change and market cap. |
| “Show me the top 10 coins by market cap.” | Fetch coin markets ordered by market cap descending. |
| “Pull Bitcoin for the last 30 days.” | Fetch Bitcoin historical market chart data. |
| “What is the overall crypto market doing?” | Fetch global market data and summarize market cap, volume, and dominance. |
| “Find recently listed coins.” | Use the appropriate CoinGecko endpoint for recently added or trending coins if available. |

## Tested Code Shape

```ts
async function run(client) {
  const prices = await client.simple.price.get({
    ids: 'bitcoin,ethereum,solana',
    vs_currencies: 'usd',
    include_24hr_change: true,
    include_market_cap: true,
    include_last_updated_at: true
  });

  return prices;
}
```

## Implementation Note

This note is not a trading recommendation and should not be presented as financial advice. The connector is for **data retrieval and market intelligence** only. Any output that could influence investing should include the usual caution that crypto markets are volatile and the user should verify before taking action.

## Reference

[CoinGecko API Documentation](https://docs.coingecko.com/reference/introduction)
