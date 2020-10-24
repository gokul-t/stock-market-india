(function start() {
  const totalFund = 10000;
  const leverage = 15;
  const noOfTrades = 4;
  const riskAppetite = 0.5;
  const profitMargin = 0.004;
  const leastTicker = 0.1; // 0.05;

  const fundForOneTrade = (totalFund * leverage) / 4;

  const favourites = [
    {
      ub: 350,
      lb: 338,
      symbol: "WIPRO",
    },
    {
      ub: 174.65,
      lb: 171.1,
      symbol: "DLF",
    },
    {
      ub: 256,
      lb: 249,
      symbol: "AMBUJACEM",
    },
    {
      ub: 794.6,
      lb: 780,
      symbol: "GRASIM",
    },
    {
      ub: 465,
      lb: 456,
      symbol: "CUMMINSIND",
    },
    {
      ub: 965,
      lb: 952,
      symbol: "UBL",
    },
    {
      ub: 3040,
      lb: 2970,
      symbol: "BAJAJ-AUTO",
    },
    {
      ub: 771,
      lb: 756,
      symbol: "CIPLA",
    },
  ];

  //   const favourites = [
  //     {
  //       ub: 762,
  //       lb: 753,
  //       symbol: "CIPLA",
  //     },
  //     {
  //       ub: 1190,
  //       lb: 1174,
  //       symbol: "PVR",
  //     },
  //     {
  //       ub: 732,
  //       lb: 723,
  //       symbol: "HAVELLS",
  //     },
  //     {
  //       ub: 188,
  //       lb: 183,
  //       symbol: "ZEEL",
  //     },
  //     {
  //       ub: 476,
  //       lb: 466,
  //       symbol: "TATACONSUM",
  //     },
  //     {
  //       ub: 174.65,
  //       lb: 171.10,
  //       symbol: "DLF",
  //     },
  //     {
  //       ub: 794.6,
  //       lb: 780,
  //       symbol: "GRASIM",
  //     },
  //     {
  //       ub: 465,
  //       lb: 456,
  //       symbol: "CUMMINSIND",
  //     },
  //     {
  //       ub: 965,
  //       lb: 952,
  //       symbol: "UBL",
  //     },
  //   ];

  return processPreOpenMarket();

  async function processPreOpenMarket() {
    let result = await preOpenMarket();
    const filteredResults = result.data.filter((d) => {
      const symbol = d.metadata.symbol;
      const fav = favourites.find((f) => f.symbol === symbol);
      if (fav) {
        fav.data = d;
      }
      return !!fav;
    });

    const processedResults = favourites.map((favourite) => {
      const d = favourite.data;
      const symbol = d.metadata.symbol;
      const lastPrice = d.metadata.lastPrice;
      const pChange = d.metadata.pChange;
      const udiff = favourite.ub - lastPrice;
      const ldiff = lastPrice - favourite.lb;

      let position;
      let msg = "";

      if (udiff < 0) {
        position = "BUY";
        msg += "Upper breakpoint already crossed";
      } else if (ldiff < 0) {
        position = "SELL";
        msg += "Lower breakpoint already crossed";
      } else if (udiff === ldiff) {
        position = pChange > 0 ? "BUY" : "SELL";
      } else if (udiff < ldiff) {
        position = "BUY";
      } else {
        position = "SELL";
      }

      const ocoDetails =
        position === "BUY"
          ? oco(favourite.ub, lastPrice, true)
          : oco(favourite.lb, lastPrice, false);

      if (pChange > 0 && position === "SELL") {
        msg += `Moving in uptrend? ub : ${favourite.ub}`;
      } else if (pChange < 0 && position === "BUY") {
        msg += `Moving in downtrend? lb : ${favourite.lb}`;
      }

      return {
        symbol,
        position,
        ...ocoDetails,
        purpose: d.metadata.purpose,
        lastPrice,
        msg,
        pChange,
      };
    });

    return processedResults.sort((a, b) => {
      const aChange = a.perNeededToTrigger,
        bChange = b.perNeededToTrigger;
      if (aChange < bChange) {
        return -1;
      }
      if (aChange > bChange) {
        return 1;
      }
      // a must be equal to b
      return 0;
    });
  }

  function oco(breakpoint, lastPrice, buy) {
    const triggerChange = Math.max(
      leastTicker,
      leastTickerRounding(breakpoint * 0.0001)
    );
    const triggerPrice = leastTickerRounding(
      buy ? breakpoint + triggerChange : breakpoint - triggerChange
    );
    const bidPrice = leastTickerRounding(
      buy ? triggerPrice + triggerChange : triggerPrice - triggerChange
    );
    const volume = Math.floor(fundForOneTrade / bidPrice);
    const target = leastTickerRounding(bidPrice * profitMargin);
    const stopLoss = leastTickerRounding(target * riskAppetite);
    const changeNeeded = Math.abs(triggerPrice - lastPrice);
    let perNeededToTrigger = 0;
    if (buy && breakpoint <= lastPrice) {
      perNeededToTrigger = 0;
    } else if (!buy && breakpoint >= lastPrice) {
      perNeededToTrigger = 0;
    } else {
      perNeededToTrigger = (changeNeeded / triggerPrice) * 100;
    }
    return {
      volume,
      trigger: triggerPrice,
      price: bidPrice,
      stopLoss: stopLoss,
      target: target,
      trailing: Math.ceil(stopLoss / leastTicker),
      perNeededToTrigger,
    };
  }

  function leastTickerRounding(x) {
    return parseFloat((Math.floor(x / leastTicker) * leastTicker).toFixed(2));
  }

  async function preOpenMarket() {
    const response = await fetch(
      "https://www.nseindia.com/api/market-data-pre-open?key=ALL",
      {
        headers: {
          accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
          "accept-language": "en-US,en;q=0.9,ms;q=0.8,ml;q=0.7,fi;q=0.6",
          "cache-control": "max-age=0",
          "sec-fetch-dest": "document",
          "sec-fetch-mode": "navigate",
          "sec-fetch-site": "none",
          "sec-fetch-user": "?1",
          "upgrade-insecure-requests": "1",
        },
        referrerPolicy: "strict-origin-when-cross-origin",
        body: null,
        method: "GET",
        mode: "cors",
        credentials: "include",
      }
    );
    return await response.json();
  }
})()
  .then((results) => {
    console.clear();
    results.forEach((result) => {
      console.log(`${result.symbol} : ${result.position} - ${result.volume} 
      trigger : ${result.trigger}, price : ${result.price}
      stoploss : ${result.stopLoss}, target : ${result.target}
      trailing : ${result.trailing}
      lastPrice : ${result.lastPrice} , %change : ${result.pChange.toFixed(2)}, 
      %change needed : ${result.perNeededToTrigger.toFixed(2)},
       ${result.msg}`);
    });
  })
  .catch(console.error);
