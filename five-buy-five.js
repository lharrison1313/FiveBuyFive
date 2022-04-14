const { Telegraf } = require("telegraf");
const Alpaca = require("@alpacahq/alpaca-trade-api");
require("dotenv").config();
const bot = new Telegraf(process.env.TELEGRAM_KEY);
const alpaca = new Alpaca({
  keyId: process.env.PAPER_KEY_ID,
  secretKey: process.env.PAPER_SECRET_KEY,
  paper: true,
});

bot.launch();
bot.command(["positions"], async (ctx) => {
  switch (ctx.update.message.text) {
    case "/positions":
      await getPositions(ctx);
      break;
    default:
      break;
  }
});

async function getPositions(ctx) {
  try {
    let chatID = ctx.update.message.chat.id;
    let positions = await alpaca.getPositions();
    let portfolio = await alpaca.getPortfolioHistory({
      period: "all",
    });
    let totalPL = (portfolio.equity.at(-1) - portfolio.equity[0]) / portfolio.equity[0];
    let formattedPositions = "Here Are Our Positions:\n";
    formattedPositions = formattedPositions.concat("-------------------------------------\n");
    formattedPositions = formattedPositions.concat(`Total P/L: ${Number(totalPL).toFixed(4)}\n`);
    formattedPositions = formattedPositions.concat("-------------------------------------\n");
    positions.forEach((position) => {
      formattedPositions = formattedPositions.concat(
        `${position.symbol}: ${Number(position.market_value).toFixed(2)} (${Number(
          position.unrealized_intraday_plpc
        ).toFixed(2)})\n`
      );
    });
    await bot.telegram.sendMessage(chatID, formattedPositions);
  } catch (error) {
    console.log(error);
  }
}
