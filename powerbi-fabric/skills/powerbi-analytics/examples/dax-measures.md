# DAX Measure Examples

Complete DAX measures following the standard header comment format. Each measure includes the name, description, dependencies, and full DAX code.

## 1. Total Revenue YTD (with Fiscal Year Offset)

```dax
-- Measure: Revenue YTD (Fiscal)
-- Description: Year-to-date revenue using fiscal year starting April 1.
--              Uses TOTALYTD with fiscal year end date parameter.
-- Dependencies: Sales[Amount], 'Date'[Date] (date table marked as date table)
-- ============================================
Revenue YTD (Fiscal) =
TOTALYTD(
    SUM(Sales[Amount]),
    'Date'[Date],
    "3/31"
)
```

```dax
-- Measure: Revenue YTD (Calendar)
-- Description: Calendar year-to-date revenue. Resets on January 1.
-- Dependencies: Sales[Amount], 'Date'[Date]
-- ============================================
Revenue YTD (Calendar) =
VAR _ytdDates = DATESYTD('Date'[Date])
RETURN
    CALCULATE(
        SUM(Sales[Amount]),
        _ytdDates
    )
```

## 2. Year-over-Year Growth %

```dax
-- Measure: YoY Growth %
-- Description: Percentage change in revenue compared to the same period last year.
--              Returns BLANK if prior year has no data (avoids misleading 100% growth).
-- Dependencies: Sales[Amount], 'Date'[Date]
-- ============================================
YoY Growth % =
VAR _currentRevenue = SUM(Sales[Amount])
VAR _priorYearRevenue =
    CALCULATE(
        SUM(Sales[Amount]),
        SAMEPERIODLASTYEAR('Date'[Date])
    )
RETURN
    IF(
        NOT ISBLANK(_priorYearRevenue) && _priorYearRevenue <> 0,
        DIVIDE(_currentRevenue - _priorYearRevenue, _priorYearRevenue),
        BLANK()
    )
```

```dax
-- Measure: YoY Growth (Absolute)
-- Description: Absolute difference in revenue vs. same period last year.
-- Dependencies: Sales[Amount], 'Date'[Date]
-- ============================================
YoY Growth (Absolute) =
VAR _currentRevenue = SUM(Sales[Amount])
VAR _priorYearRevenue =
    CALCULATE(
        SUM(Sales[Amount]),
        SAMEPERIODLASTYEAR('Date'[Date])
    )
RETURN
    IF(
        NOT ISBLANK(_priorYearRevenue),
        _currentRevenue - _priorYearRevenue,
        BLANK()
    )
```

## 3. Rolling 3-Month Average

```dax
-- Measure: Rolling 3M Average Revenue
-- Description: Average monthly revenue over the last 3 complete months from the
--              latest date in context. Uses DATESINPERIOD for the date window and
--              averages by distinct year-month values.
-- Dependencies: Sales[Amount], 'Date'[Date], 'Date'[YearMonth]
-- ============================================
Rolling 3M Average Revenue =
VAR _lastVisibleDate = MAX('Date'[Date])
VAR _rolling3M =
    CALCULATE(
        SUM(Sales[Amount]),
        DATESINPERIOD('Date'[Date], _lastVisibleDate, -3, MONTH)
    )
VAR _monthCount =
    CALCULATE(
        DISTINCTCOUNT('Date'[YearMonth]),
        DATESINPERIOD('Date'[Date], _lastVisibleDate, -3, MONTH)
    )
RETURN
    DIVIDE(_rolling3M, _monthCount)
```

```dax
-- Measure: Rolling 12M Revenue
-- Description: Sum of revenue for the trailing 12 months from the latest date in context.
-- Dependencies: Sales[Amount], 'Date'[Date]
-- ============================================
Rolling 12M Revenue =
VAR _lastVisibleDate = MAX('Date'[Date])
RETURN
    CALCULATE(
        SUM(Sales[Amount]),
        DATESINPERIOD('Date'[Date], _lastVisibleDate, -12, MONTH)
    )
```

## 4. Percent of Grand Total

```dax
-- Measure: % of Total Revenue
-- Description: Current selection's revenue as a percentage of the grand total.
--              Uses ALL to remove all filters from the Sales table.
-- Dependencies: Sales[Amount]
-- ============================================
% of Total Revenue =
VAR _selectedRevenue = SUM(Sales[Amount])
VAR _totalRevenue =
    CALCULATE(
        SUM(Sales[Amount]),
        ALL(Sales)
    )
RETURN
    DIVIDE(_selectedRevenue, _totalRevenue)
```

```dax
-- Measure: % of Category Total
-- Description: Revenue as percentage of the parent category total.
--              Uses ALLEXCEPT to keep category filter but remove all others.
-- Dependencies: Sales[Amount], Products[Category]
-- ============================================
% of Category Total =
VAR _selectedRevenue = SUM(Sales[Amount])
VAR _categoryRevenue =
    CALCULATE(
        SUM(Sales[Amount]),
        ALLEXCEPT(Products, Products[Category])
    )
RETURN
    DIVIDE(_selectedRevenue, _categoryRevenue)
```

## 5. Customer Count with Date Slicer

```dax
-- Measure: Active Customers
-- Description: Distinct count of customers who had at least one transaction in the
--              current filter context (respects date slicer). More accurate than
--              DISTINCTCOUNT alone when date filtering is needed.
-- Dependencies: Sales[CustomerId], 'Date'[Date]
-- ============================================
Active Customers =
CALCULATE(
    DISTINCTCOUNT(Sales[CustomerId]),
    FILTER(
        VALUES(Sales[CustomerId]),
        NOT ISBLANK(
            CALCULATE(SUM(Sales[Amount]))
        )
    )
)
```

```dax
-- Measure: New Customers
-- Description: Count of customers whose first purchase falls within the current date
--              filter context.
-- Dependencies: Sales[CustomerId], Sales[Amount], 'Date'[Date]
-- ============================================
New Customers =
VAR _minDateInContext = MIN('Date'[Date])
VAR _maxDateInContext = MAX('Date'[Date])
RETURN
    COUNTROWS(
        FILTER(
            VALUES(Sales[CustomerId]),
            VAR _firstPurchase =
                CALCULATE(
                    MIN(Sales[OrderDate]),
                    ALL('Date')
                )
            RETURN
                _firstPurchase >= _minDateInContext &&
                _firstPurchase <= _maxDateInContext
        )
    )
```

## 6. ABC Classification

```dax
-- Measure: ABC Class
-- Description: Classifies products into ABC categories based on cumulative revenue
--              contribution. A = top 70% of revenue, B = next 20%, C = bottom 10%.
--              Uses RANKX and a running percentage calculation.
-- Dependencies: [Total Revenue], Products[ProductName]
-- ============================================
ABC Class =
VAR _allProducts = ALL(Products[ProductName])
VAR _totalRevenue = CALCULATE([Total Revenue], _allProducts)
VAR _currentRank =
    RANKX(_allProducts, [Total Revenue], , DESC, Dense)
VAR _cumulativeRevenue =
    SUMX(
        FILTER(
            _allProducts,
            RANKX(_allProducts, [Total Revenue], , DESC, Dense) <= _currentRank
        ),
        [Total Revenue]
    )
VAR _cumulativePct = DIVIDE(_cumulativeRevenue, _totalRevenue)
RETURN
    SWITCH(
        TRUE(),
        _cumulativePct <= 0.70, "A",
        _cumulativePct <= 0.90, "B",
        "C"
    )
```

## 7. Dynamic Top N (with What-If Parameter)

```dax
-- Measure: Top N Revenue
-- Description: Shows revenue only for the top N products (controlled by a What-If
--              parameter slicer). Products outside Top N show BLANK.
-- Dependencies: [Total Revenue], Products[ProductName], 'Top N Parameter'[Top N Value]
-- Notes: Create a What-If parameter named "Top N Parameter" with range 1-50
-- ============================================
Top N Revenue =
VAR _topN = SELECTEDVALUE('Top N Parameter'[Top N Value], 10)
VAR _currentRank =
    RANKX(
        ALLSELECTED(Products[ProductName]),
        [Total Revenue],
        ,
        DESC,
        Dense
    )
RETURN
    IF(
        _currentRank <= _topN,
        [Total Revenue],
        BLANK()
    )
```

```dax
-- Measure: Top N Other
-- Description: Aggregates all products outside the Top N into an "Other" category.
--              Use with a virtual table or conditional formatting.
-- Dependencies: [Total Revenue], Products[ProductName], 'Top N Parameter'[Top N Value]
-- ============================================
Top N Other Revenue =
VAR _topN = SELECTEDVALUE('Top N Parameter'[Top N Value], 10)
VAR _totalVisible =
    CALCULATE([Total Revenue], ALLSELECTED(Products[ProductName]))
VAR _topNTotal =
    SUMX(
        TOPN(
            _topN,
            ALLSELECTED(Products[ProductName]),
            [Total Revenue],
            DESC
        ),
        [Total Revenue]
    )
RETURN
    _totalVisible - _topNTotal
```

## 8. Budget vs Actual Variance

```dax
-- Measure: Budget Variance
-- Description: Difference between actual revenue and budgeted amount.
--              Positive = over budget (favorable for revenue).
-- Dependencies: Sales[Amount], Budget[BudgetAmount], 'Date'[Date]
-- ============================================
Budget Variance =
VAR _actual = SUM(Sales[Amount])
VAR _budget = SUM(Budget[BudgetAmount])
RETURN
    _actual - _budget
```

```dax
-- Measure: Budget Variance %
-- Description: Percentage variance from budget. Positive = above target.
-- Dependencies: Sales[Amount], Budget[BudgetAmount]
-- ============================================
Budget Variance % =
VAR _actual = SUM(Sales[Amount])
VAR _budget = SUM(Budget[BudgetAmount])
RETURN
    DIVIDE(_actual - _budget, _budget)
```

```dax
-- Measure: Budget Attainment %
-- Description: Actual as a percentage of budget (100% = on target).
-- Dependencies: Sales[Amount], Budget[BudgetAmount]
-- ============================================
Budget Attainment % =
VAR _actual = SUM(Sales[Amount])
VAR _budget = SUM(Budget[BudgetAmount])
RETURN
    DIVIDE(_actual, _budget)
```

## 9. Running Total

```dax
-- Measure: Running Total Revenue
-- Description: Cumulative revenue from the beginning of data up to the current date
--              in the filter context. Useful for line charts showing accumulation.
-- Dependencies: Sales[Amount], 'Date'[Date]
-- ============================================
Running Total Revenue =
VAR _maxDate = MAX('Date'[Date])
RETURN
    CALCULATE(
        SUM(Sales[Amount]),
        FILTER(
            ALL('Date'[Date]),
            'Date'[Date] <= _maxDate
        )
    )
```

## 10. Dynamic Period Comparison

```dax
-- Measure: Prior Period Revenue
-- Description: Revenue from the prior period, dynamically determined by the
--              granularity of the current visual (year, quarter, month, day).
--              Uses ISINSCOPE to detect the visual's drill level.
-- Dependencies: Sales[Amount], 'Date'[Date], 'Date'[Year], 'Date'[Quarter], 'Date'[Month]
-- ============================================
Prior Period Revenue =
SWITCH(
    TRUE(),
    ISINSCOPE('Date'[Month]),
        CALCULATE(
            SUM(Sales[Amount]),
            DATEADD('Date'[Date], -1, MONTH)
        ),
    ISINSCOPE('Date'[Quarter]),
        CALCULATE(
            SUM(Sales[Amount]),
            DATEADD('Date'[Date], -1, QUARTER)
        ),
    ISINSCOPE('Date'[Year]),
        CALCULATE(
            SUM(Sales[Amount]),
            DATEADD('Date'[Date], -1, YEAR)
        ),
    BLANK()
)
```
