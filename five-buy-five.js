const { Telegraf } = require("telegraf");
const Alpaca = require("@alpacahq/alpaca-trade-api");
require("dotenv").config();
const commands = ["positions", "pl", "winners", "losers", "movers"];
const bot = new Telegraf(process.env.TELEGRAM_KEY);
const alpaca = new Alpaca({
  keyId: process.env.PAPER_KEY_ID,
  secretKey: process.env.PAPER_SECRET_KEY,
  paper: true,
});

bot.launch();
bot.command(commands, async (ctx) => {
  try {
    const chatID = ctx.update.message.chat.id;
    switch (ctx.update.message.text) {
      case "/positions":
        let positions = await getPositions();
        await bot.telegram.sendMessage(chatID, positions);
        break;
      case "/pl":
        let pl = await getPL();
        await bot.telegram.sendMessage(chatID, pl);
        break;
      case "/winners":
        let winners = await getMovers("winners");
        await bot.telegram.sendMessage(chatID, winners);
        break;
      case "/losers":
        let losers = await getMovers("losers");
        await bot.telegram.sendMessage(chatID, losers);
        break;
      case "/movers":
        let movers = await getMovers("both");
        await bot.telegram.sendMessage(chatID, movers);
        break;
      default:
        break;
    }
  } catch (error) {
    console.log(error);
  }
});

async function getPositions() {
  let positions = await alpaca.getPositions();
  let formattedPositions = "";
  let pl = await getPL();
  formattedPositions = formattedPositions.concat("-----------------------------------------------\n");
  formattedPositions = formattedPositions.concat(pl);
  formattedPositions = formattedPositions.concat("-----------------------------------------------\n");
  formattedPositions = formattedPositions.concat(formatPositions(positions));
  return formattedPositions;
}

async function getPL() {
  let portfolio = await alpaca.getPortfolioHistory({
    period: "all",
  });
  let totalPL = (portfolio.equity.at(-1) - portfolio.equity[0]) / portfolio.equity[0];
  return `Total P/L: $${Number(portfolio.equity.at(-1)).toFixed(2)} (${Number(totalPL).toFixed(4)})\n`;
}

function formatPositions(positions) {
  let formattedPositions = "";
  positions.forEach((position) => {
    formattedPositions = formattedPositions.concat(
      `${position.symbol}: $${Number(position.market_value).toFixed(2)} (${Number(
        position.unrealized_intraday_plpc
      ).toFixed(2)})\n`
    );
  });
  return formattedPositions;
}

async function getMovers(direction) {
  let positions = await alpaca.getPositions();
  let formattedPositions = "";
  if (positions.length < 5) return "There are not enough assets to determine movers";
  positions.sort((posA, posB) => posA.unrealized_intraday_plpc - posB.unrealized_intraday_plpc);
  if (direction === "winners" || direction === "both") {
    let winners = positions.slice(positions.length - 5, positions.length);
    winners.reverse();
    formattedPositions = formattedPositions.concat("-----------------------------------------------\n");
    formattedPositions = formattedPositions.concat("Today's Winners\n");
    formattedPositions = formattedPositions.concat("-----------------------------------------------\n");
    formattedPositions = formattedPositions.concat(formatPositions(winners));
  }
  if (direction === "losers" || direction === "both") {
    let losers = positions.slice(0, 5);
    formattedPositions = formattedPositions.concat("-----------------------------------------------\n");
    formattedPositions = formattedPositions.concat("Today's Losers\n");
    formattedPositions = formattedPositions.concat("-----------------------------------------------\n");
    formattedPositions = formattedPositions.concat(formatPositions(losers));
  }
  return formattedPositions;
}
