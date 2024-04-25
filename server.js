const express = require("express");
const connectMongo = require("./database/connect-mongo");
const { storePrice, fetchPrice } = require("./database/index");
const cron = require("node-cron");
const cors = require("cors");

const app = express();
app.use(cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", async (req, res) => {
  res.status(200).send("Working on 3001 PORT!");
});
app.get("/fetch-user-balance", async (req, res) => {
  try {
    const { userAddress } = req.query;

    // Check if userAddress is not provided or empty
    if (!userAddress || userAddress.trim() === "") {
      return res.status(400).send("Invalid user address!");
    }

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

app.get("/fetch-user-transactions", async (req, res) => {
  try {
    const { userAddress } = req.query;

    // Check if userAddress is not provided or empty
    if (!userAddress || userAddress.trim() === "") {
      return res.status(400).send("Invalid user address!");
    }

    const etherscanUrl = `https://api.etherscan.io/api?module=account&action=txlist&address=${userAddress}&startblock=0&endblock=99999999&page=1&offset=10&sort=asc&apikey=${process.env.ETHERSCAN_API_KEY}`;

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

    // Return user transactions
    return res.status(200).json(responseData);
  } catch (error) {
    console.error("Error fetching user transactions:", error);
    return res.status(500).send("Internal server error");
  }
});
app.get("/fetch-price", fetchPrice);

app.get("/fetch-balance-price", async (req, res) => {
  try {
    const { userAddress } = req.query;

    // Check if userAddress is not provided or empty
    if (!userAddress || userAddress.trim() === "") {
      return res.status(400).send("Invalid user address!");
    }

    const etherscanUrl = `https://api.etherscan.io/api?module=account&action=balance&address=${userAddress}&tag=latest&apikey=${process.env.ETHERSCAN_API_KEY}`;

    // Fetch user balance
    const response = await fetch(etherscanUrl);
    const responseData = await response.json();

    const etherPriceUrl = `https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=inr`;
    const resPrice = await fetch(etherPriceUrl);
    const resData = await resPrice.json();

    // Check if no data found for the user
    if (!responseData || responseData.status !== "1") {
      return res.status(404).send("No balance found for the user");
    }
    // if (!resData || resData.status !== "1") {
    //   return res.status(404).send("Invalid ether price url");
    // }

    // Return user balance
    return res.status(200).json({
      userBalance: responseData.result,
      currentEtherPrice: resData.ethereum.inr,
    });
  } catch (error) {
    console.error(
      "Error while fetching User Balance & Ether Price in INR:",
      error
    );
    return res.status(500).send("Internal server error");
  }
});

const port = process.env.PORT || 3001;
app.listen(port, async () => {
  console.log(`Server listening on port: ${port}`);
  // await storePrice();

  //   connectMongo();
});

cron.schedule("*/10 * * * *", async () => {
  try {
    console.log("==============START===================");
    await storePrice();
    // await fetchPrice()
    console.log("===============END==================");
  } catch (error) {
    console.error("Error in cron job while fetching price from db: ", error);
  }
});
