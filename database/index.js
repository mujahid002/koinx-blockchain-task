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
    const newData = data.slice(0, 10); // Get the latest 10 elements from data

    // Check if both newData and oldData are not empty before accessing their first elements
    if (newData.length > 0 && oldData.length > 0) {
      const newHash = newData[0].hash; // Retrieve the hash value of the first element of newData
      const oldHash = oldData[0].hash; // Retrieve the hash value of the first element of oldData

      if (newHash !== oldHash) {
        // Insert one document
        await collection.insertOne({
          userAddress: address,
          transactionArray: newData,
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
