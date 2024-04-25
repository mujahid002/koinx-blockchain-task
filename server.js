const express = require("express");
const cron = require("node-cron");
const cors = require("cors");

// Import files
const connectMongo = require("./database/connect-mongo");
const {
  storeUserTransactions,
  storePrice,
  fetchPrice,
} = require("./database/index");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const port = process.env.PORT || 3001;

// Get Request for Testing
app.get("/", async (req, res) => {
  res.status(200).send(`Working on ${port} PORT!`);
});

// Fetch User Balance with address as input
// return: fetch user's balance in wei
app.get("/fetch-user-balance", async (req, res) => {
  try {
    const { userAddress } = req.query;

    // Check if userAddress is not provided or empty
    if (!userAddress || userAddress.trim() === "") {
      return res.status(400).send("Invalid user address!");
    }

    // Etherscan URL
    const etherscanUrl = `https://api.etherscan.io/api?module=account&action=balance&address=${userAddress}&tag=latest&apikey=${process.env.ETHERSCAN_API_KEY}`;

    // Fetch user balance
    const response = await fetch(etherscanUrl);
    const responseData = await response.json();

    // Check if no data found for the user
    if (!responseData || responseData.status !== "1") {
      return res.status(404).send("No balance found for the user");
    }

    // Return user balance
    return res.status(200).json(responseData);
  } catch (error) {
    console.error("Error fetching user balance:", error);
    return res.status(500).send("Internal server error");
  }
});

// Fetch User Transactions with address as input (upto 10,000 transactions)
// returns: fetch user transactions and store it on MongoDb with (key: value => userAddress: transactionArray)
app.get("/fetch-user-transactions", async (req, res) => {
  try {
    const { userAddress } = req.query;

    // Check if userAddress is not provided or empty
    if (!userAddress || userAddress.trim() === "") {
      return res.status(400).send("Invalid user address!");
    }

    const etherscanUrl = `https://api.etherscan.io/api?module=account&action=txlist&address=${userAddress}&startblock=0&endblock=99999999&page=3&offset=10&sort=asc&apikey=${process.env.ETHERSCAN_API_KEY}`;

    // Fetch user transactions
    const response = await fetch(etherscanUrl);
    const responseData = await response.json();

    // Check if no data found for the user
    if (
      !responseData ||
      responseData.status !== "1" ||
      !responseData.result ||
      responseData.result.length === 0
    ) {
      return res.status(404).send("No transactions found for the user");
    }

    // Store transactions on Mongo
    await storeUserTransactions(userAddress, responseData.result);

    // Return user transactions
    return res.status(200).json(responseData);
  } catch (error) {
    console.error("Error fetching user transactions:", error);
    return res.status(500).send("Internal server error");
  }
});

// Fetch Ether price in INR for every 10 minutes(used node-cron)
app.get("/fetch-price", fetchPrice);

// Fetches current Balance, Total Balance(from transactions) and Latest Ether Price(inr)
app.get("/fetch-balance-price", async (req, res) => {
  try {
    const { userAddress } = req.query;

    // Check if userAddress is not provided or empty
    if (!userAddress || userAddress.trim() === "") {
      return res.status(400).send("Invalid user address!");
    }

    const etherscanUrlForCurrentBalance = `https://api.etherscan.io/api?module=account&action=balance&address=${userAddress}&tag=latest&apikey=${process.env.ETHERSCAN_API_KEY}`;
    const transactionsUrl = `http://localhost:3001/fetch-user-transactions?userAddress=${userAddress}`;

    // Fetch user current balance
    const resBalance = await fetch(etherscanUrlForCurrentBalance);
    const resBalanceData = await resBalance.json();

    // Fetch user transactions
    const resTrx = await fetch(transactionsUrl);
    const resTrxData = await resTrx.json();

    let trxArray = resTrxData.result;
    // let userTotalBalance = parseFloat(resBalanceData.result);
    let userTotalBalance = 0;
    console.log("The user total balance is: ", userTotalBalance);

    for (let i = 0; i < trxArray.length; i++) {
      if (trxArray[i].to === userAddress) {
        userTotalBalance += parseFloat(trxArray[i].value);
      } else {
        userTotalBalance -= parseFloat(trxArray[i].value);
      }
    }

    const etherPriceUrl = `https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=inr`;
    const resPrice = await fetch(etherPriceUrl);
    const resData = await resPrice.json();

    // Check if no data found for the user
    if (!resBalanceData || resBalanceData.status !== "1") {
      return res.status(404).send("No balance found for the user");
    }

    // Return user balance
    return res.status(200).json({
      userBalance: resBalanceData.result,
      currentEtherPrice: resData.ethereum.inr,
      userTotalBalance: userTotalBalance,
    });
  } catch (error) {
    console.error(
      "Error while fetching User Balance & Ether Price in INR:",
      error
    );
    return res.status(500).send("Internal server error");
  }
});

app.listen(port, async () => {
  console.log(`Server listening on port: ${port}`);
  // store while running server!
  await storePrice();
  //   connectMongo();
});

// store ether price in INR for every 10 minutes in Mongo using node-cron(cronjob)
cron.schedule("*/10 * * * *", async () => {
  try {
    console.log("==============STORING===================");
    await storePrice();
    // await fetchPrice()
    console.log("===============STORED==================");
  } catch (error) {
    console.error("Error in cron job while storing ether price in db: ", error);
  }
});
