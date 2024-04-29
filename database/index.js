const connectMongo = require("./connect-mongo");

// store user transactions based on user's address
const storeUserTransactions = async (address, data) => {
  try {
    // Mongo Db connection
    const client = await connectMongo();
    // connect with db and collection
    const db = client.db("koinx");
    const collection = db.collection("user-transactions");

    // Retrieve the latest document for the user
    const userTransactionDocument = await collection.findOne({
      userAddress: address,
    });

    // Extract the transactionArray from the document if it exists, otherwise set it to an empty array
    const oldData = userTransactionDocument
      ? userTransactionDocument.transactionArray
      : [];

    // Check if there are any new transactions to store
    const newData = data.slice(0, 10);
    let timestamp;
    let valueInEther;
    if (
      newData.length > 0 &&
      newData[0].hasOwnProperty("timeStamp") &&
      newData[0].hasOwnProperty("value")
    ) {
      timestamp = parseFloat(newData[0].timeStamp) * 1000;
      valueInEther = parseFloat(newData[0].value) / 10 ** 18;
    } else {
      // Handle the case where timestamp is undefined
      console.error("Timestamp is undefined or not found in newData.");
    }

    console.log("the timestamp is", timestamp);

    let toDate = new Date(timestamp).getDate();
    let toMonth = new Date(timestamp).getMonth() + 1;
    let toYear = new Date(timestamp).getFullYear();
    let original_date = toDate + "-" + toMonth + "-" + toYear;

    console.log("the original_date is", original_date);

    // const priceUrlAtSpecificDate = `https://pro-api.coingecko.com/api/v3/coins/ethereum/history?date=${newDate}`;

    const priceUrlAtSpecificDate = `https://pro-api.coingecko.com/api/v3/coins/ethereum/history?date=${original_date}`;
    const options = {
      method: "GET",
      headers: {
        accept: "application/json",
        "x-cg-pro-api-key": "CG-LnJhmyygGTtfypCsem5db19a",
      },
    };

    const value = await fetch(priceUrlAtSpecificDate, options)
      .then((res) => res.json())
      .catch((err) => {
        console.error("Error fetching price data:", err);
        throw err; // rethrow the error to be caught by the outer try-catch block
      });

    let valueInInr;
    if (value.hasOwnProperty("market_data")) {
      valueInInr = valueInEther * value.market_data.current_price.inr;
    } else {
      console.error("market_data not found in the fetched data.");
      // Assign a default value or handle the absence of market_data as needed
    }

    console.log("the valueInInr is", valueInInr);
    console.log("the valueInEther is", valueInEther);

    // Check if both newData and oldData are not empty before accessing their first elements
    if (newData.length > 0 && oldData.length > 0) {
      const newHash = newData[0].hash;
      const oldHash = oldData[0].hash;

      if (newHash !== oldHash) {
        // Insert one document
        await collection.insertOne({
          userAddress: address,
          transactionArray: newData,
          valueInInr: valueInInr,
          timestamp: new Date(),
        });
        console.log(`Transactions stored for ${address}`);
      } else {
        console.log(`No new transactions to store for ${address}`);
      }
    } else {
      // If oldData is undefined or empty, insert the newData
      await collection.insertOne({
        userAddress: address,
        transactionArray: newData,
        valueInInr: valueInInr,
        timestamp: new Date(),
      });
      console.log(`Transactions stored for ${address}`);
    }

    await client.close();
  } catch (error) {
    console.error("Error in storing user's transactions:", error);
  }
};

const storePrice = async () => {
  try {
    const client = await connectMongo();
    const db = client.db("koinx");
    const collection = db.collection("ether-price");
    const etherPriceUrl = `https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=inr`;
    const response = await fetch(etherPriceUrl);
    const responseData = await response.json();
    console.log("the ether price in INR: ", responseData.ethereum.inr);

    // Insert one document
    await collection.insertOne({
      price: responseData.ethereum.inr,
      timestamp: new Date(),
    });

    console.log("Price data stored successfully.");
    await client.close();
  } catch (error) {
    console.error("Error in storing ether price:", error);
  }
};

// fetch latest ether price from MongoDb
const fetchPrice = async (req, res) => {
  try {
    const client = await connectMongo();
    const db = client.db("koinx");
    const collection = db.collection("ether-price");

    const etherPrices = await collection
      .find({})
      .sort({ timestamp: -1 })
      .toArray();
    const latestPrice = await etherPrices[0].price;
    await res
      .status(200)
      .json({ latestEtherPriceStoredOnMongo: `Rs.${latestPrice}` });

    // await client.close();
  } catch (error) {
    console.log("Unable to connect and fetch Ether Price: ", error);
    // If res is provided, send an error response
    if (res) {
      await res.status(500).json({
        message: "Unable to fetch Ether prices",
        error: error.message,
      });
    } else {
      console.error("Error while fetching Ether prices:", error);
    }
  }
};

module.exports = { storeUserTransactions, storePrice, fetchPrice };
