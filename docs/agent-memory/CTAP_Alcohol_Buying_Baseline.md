# CTAP / Never 86'd Agent Brief — Alcohol Buying Baseline

**Author:** Manus AI  
**Date:** 2026-05-29  
**Status:** Sales-grounded operating baseline for future CTAP agents.

## Purpose

This note preserves the corrected CTAP beer-versus-liquor buying baseline from the alcohol order-guide and POS product-mix analysis. Future agents must use this baseline when helping Mychael Mueller review liquor orders, beer orders, par sheets, inventory, or vendor spend.

> **Standing rule:** Do not judge alcohol purchasing from static par levels alone. Ground recommendations in actual POS movement, recent product mix, category sales, on-hand inventory, and replacement need.

## Owner-Level Conclusion

The latest sales-supported review showed that **$1,400 per week in combined alcohol spend is not automatically too high** when compared with recent alcohol sales. The actual risk is not the weekly dollar amount by itself. The real overbuy risk comes from using a full par-fill order guide that tries to stock every listed beer and liquor item regardless of recent sales movement.

| Baseline Item | Corrected Finding |
|---|---:|
| Latest weekly beer sales | $7,956.00 |
| Latest weekly liquor sales | $5,100.50 |
| Total weekly alcohol sales | $13,158.50 |
| Current approximate weekly alcohol spend | $1,400.00 |
| Spend as share of alcohol sales | ~10.6% |
| Sales-supported liquor replacement need | ~$874.00 |
| Full guide par-fill spend risk | ~$3,355.00 |

## Category Rules To Preserve

The CTAP operating targets used in this analysis are owner-level controls for food, beer, liquor, and labor. Future agents should use these numbers as default guardrails unless Mychael updates them.

| Cost Category | Target Rule |
|---|---:|
| Food cost | Under 30% |
| Beer cost | Under 21% |
| Liquor cost | Under 20% |
| Labor cost | Under 28% |

## Corrected Interpretation

The first important correction was separating beer and liquor rather than treating all alcohol as one flat category. Beer movement and liquor movement behave differently, have different cost targets, and should not be combined when deciding whether individual bottles or cases should be replaced.

The second important correction was distinguishing **cash-flow spend** from **replacement need**. A $1,400 weekly alcohol buy may be acceptable if the bar sold more than $13,000 in alcohol that week and the order replenishes fast movers. However, a full guide-based order that fills every par level can still create overbuying because slow-moving bottles, backup inventory, and duplicate guide items absorb cash without matching the week’s actual sales.

## Agent Use Rules

Future agents should apply the following rules before recommending an alcohol buy.

| Rule | Required Agent Behavior |
|---|---|
| Separate beer and liquor | Analyze beer spend against beer sales and liquor spend against liquor sales. |
| Use POS movement | Base replacement recommendations on product-mix sales and depletion, not only on par-sheet holes. |
| Flag full par-fill risk | Treat order-guide totals as a risk estimate unless matched to current on-hand counts and recent movement. |
| Protect cash flow | Recommend holding slow movers, duplicates, and items with no recent sales unless Mychael explicitly wants par rebuild. |
| Keep owner language direct | Explain whether the spend is acceptable, risky, or cash-heavy in plain operating terms. |

## Key Files From The Analysis

| File | Purpose |
|---|---|
| `/home/ubuntu/liquor_sales_deep_dive/analysis/Beer_Liquor_Sales_Based_Buying_Control.xlsx` | Final workbook with beer/liquor split, buy caps, hold list, and risk flags. |
| `/home/ubuntu/liquor_sales_deep_dive/analysis/beer_liquor_split_deep_dive.md` | Owner-facing explanation of corrected beer/liquor spending logic. |
| `/home/ubuntu/liquor_sales_deep_dive/analysis/sales_based_liquor_buy_model.csv` | Item-level liquor replacement model from POS movement. |
| `/home/ubuntu/liquor_sales_deep_dive/analysis/aggregated_alcohol_product_mix.csv` | Aggregated alcohol product-mix movement across downloaded POS report weeks. |
| `/home/ubuntu/liquor_guides/downloads/NEW_CTAP_LIQUOR_BEER_ORDERING_SHEET_BLANK.xlsx` | Current/new beer and liquor ordering guide. |
| `/home/ubuntu/liquor_guides/downloads/OLD_Liquor_Order_2024.xlsx` | Old 2024 liquor order guide used for comparison. |

## Recommended Next Step

The best operational next step is a weekly **par-vs-depletion tracker** that starts with POS movement and current on-hand inventory, then calculates what to buy by category. The tracker should separate beer and liquor, highlight slow movers, and show whether the suggested buy keeps beer under 21% and liquor under 20% of recent category sales.
