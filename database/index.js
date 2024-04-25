const connectMongo = require("./connect-mongo");

// store user transactions based on user's address
const storeUserTransactions = async (address, data) => {
  try {
    // Mongo Db connection
    const client = await connectMongo();
    // connect with db and collection
    const db = client.db("koinx");
    const collection = db.collection("user-transactions");

    // Insert one document
    await collection.insertOne({
      userAddress: address,
      transactionArray: data,
    });

    console.log(`Transactions stored for ${userAddress}`);
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

    await res.status(200).json({ latestEtherPrices: etherPrices[0] });

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
