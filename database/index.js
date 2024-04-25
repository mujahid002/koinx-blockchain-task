const connectMongo = require("./connect-mongo");
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

const fetchPrice = async (req, res) => {
  try {
    const client = await connectMongo();
    const db = client.db("koinx");
    const collection = db.collection("ether-price");

    const etherPrices = await collection
      .find({})
      .sort({ timestamp: -1 })
      .toArray();

    await res.status(200).json({ latestEtherPrices: etherPrices });

    // await client.close();
  } catch (error) {
    console.log("Unable to connect and fetch Ether Prices: ", error);
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

module.exports = { storePrice, fetchPrice };
