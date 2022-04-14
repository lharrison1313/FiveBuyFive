const Alpaca = require("@alpacahq/alpaca-trade-api");
const fs = require("fs");
require("dotenv").config();
const { Telegraf } = require("telegraf");
const bot = new Telegraf(process.env.TELEGRAM_KEY);
const alpaca = new Alpaca({
  keyId: process.env.PAPER_KEY_ID,
  secretKey: process.env.PAPER_SECRET_KEY,
  paper: true,
});
const FRACTIONAL_PRICE = 1;
const args = process.argv;
// to get group id use this below and set bot privacy
// bot.hears("hello", (ctx) => {
//   console.log(ctx.update.message.chat);
// });

async function createPoll() {
  try {
    bot.launch();
    let results = await alpaca.getAssets({ status: "active" });
    //filtering only fractionable tickers
    let tickers = results.filter((asset) => {
      return asset.fractionable;
    });
    //picking 5 random tickers
    let randomTickers = [];
    for (i = 0; i <= 5; i++) {
      let index = Math.floor(Math.random() * (tickers.length - 1));
      randomTickers.push(tickers[index].symbol);
    }
    //sending poll
    let poll = await bot.telegram.sendPoll(
      process.env.TELEGRAM_GROUP_ID,
      "The stock market is about to open! You have 1 hour to choose todays stock pick.",
      randomTickers
    );
    fs.writeFileSync("./poll.txt", String(poll.message_id));
    bot.stop();
    console.log("poll opened successfully");
  } catch (error) {
    console.log(error);
  }
}

async function closePoll() {
  try {
    bot.launch();
    //stopping poll
    let pollID = Number(fs.readFileSync("./poll.txt", "utf-8"));
    let poll = await bot.telegram.stopPoll(process.env.TELEGRAM_GROUP_ID, pollID);
    //calculating winner
    let winner = poll.options.reduce((prev, current) => {
      return prev.voter_count > current.voter_count ? prev : current;
    });
    //placing order
    let order = await alpaca.createOrder({
      symbol: winner.text,
      notional: FRACTIONAL_PRICE,
      side: "buy",
      type: "market",
      time_in_force: "day",
    });
    console.log("Order Placed: ", order);
    //sending winner message
    await bot.telegram.sendMessage(
      process.env.TELEGRAM_GROUP_ID,
      `Congratulations ${winner.text} is the winner! A market order for $${FRACTIONAL_PRICE} worth of ${winner.text} has been placed.`
    );
    bot.stop();
    console.log("poll closed successfully");
  } catch (error) {
    console.log(error);
  }
}

if (args[2] === "open") {
  createPoll();
} else if (args[2] === "close") {
  closePoll();
} else {
  console.log("Error: invalid arguments");
}
