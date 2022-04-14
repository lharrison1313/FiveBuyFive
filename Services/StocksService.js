require("dotenv").config();
const Client = require("ftp");
const fs = require("fs");

//helper function to parse dsv file
function parseDSV(data) {
  //first split by new line
  let rows = data.split("\n");
  rows.splice(0, 1);
  let result = rows.map((row) => {
    let cells = row.split("|");
    let ticker = cells[0];
    let name = String(cells[1]);
    return { ticker: ticker, name: name.split(" - ")[0] };
  });
  return result;
}

//get every ticker from nasdaq
function getAllTickers() {
  const myPromise = new Promise((resolve, reject) => {
    let c = new Client();
    c.on("ready", () => {
      c.get("/SymbolDirectory/nasdaqlisted.txt", (err, stream) => {
        if (err) reject(err);
        stream.once("close", () => {
          c.end();
        });
        stream.pipe(fs.createWriteStream("stocks.txt"));
      });
    });
    c.on("close", () => {
      let data = fs.readFileSync("stocks.txt", "utf-8");
      let tickers = parseDSV(data);
      resolve(tickers);
    });
    c.connect({ host: process.env.NASDAQ_ENDPOINT });
  });
  return myPromise;
}

//get n random tickers from nasdaq
function getRandomTickers(n) {
  const myPromise = new Promise((resolve, reject) => {
    getAllTickers()
      .then((tickers) => {
        let randomTickers = [];
        for (i = 0; i <= n; i++) {
          let index = Math.floor(Math.random() * (tickers.length - 1));
          randomTickers.push(tickers[index]);
        }
        resolve(randomTickers);
      })
      .catch((err) => {
        reject(err);
      });
  });
  return myPromise;
}

exports.getRandomTickers = getRandomTickers;
exports.getAllTickers = getAllTickers;
