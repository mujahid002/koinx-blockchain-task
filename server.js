const express = require("express");
const connectMongo = require("./database/connect-mongo");
const cors = require("cors");

const app = express();
const {
  storeBlogAttest,
  fetchBlogAttest,
  fetchUserBlogAttest,
} = require("./database/index");
app.use(cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", async (req, res) => {
  res.status(200).send("Working on 7001 PORT!");
});
app.get("/fetch-user-transactions", async (req, res) => {
  try {
    const { userAddress } = req.query; // Use req.query to access query parameters

    // Check if userAddress is not provided or empty
    if (!userAddress || userAddress.trim() === "") {
      return res.status(400).send("Invalid user address!");
    }

    const etherscanUrl = `https://api.etherscan.io/api?module=account&action=balance&address=${userAddress}&tag=latest&apikey=${process.env.ETHERSCAN_API_KEY}`;

    // Fetch user transactions
    const userTransactions = await fetch(etherscanUrl);
    const responseData = await userTransactions.json();

    // Check if no data found for the user
    if (!responseData || responseData.length === 0) {
      return res.status(404).send("No data found for the user");
    }

    // Return user transactions
    return res.status(200).json(responseData);
  } catch (error) {
    console.error("Error fetching user transactions:", error);
    return res.status(500).send("Internal server error");
  }
});

const port = process.env.PORT || 3001;
app.listen(port, async () => {
  console.log(`Server listening on port: ${port}`);

  //   connectMongo();
});
