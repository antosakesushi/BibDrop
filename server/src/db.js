import mongoose from "mongoose";

export async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri)
    throw new Error(
      "MONGODB_URI is not set. Copy .env.example to .env and fill it in.",
    );
  mongoose.set("strictQuery", true);
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
      console.log("[db] connected to MongoDB");
      return;
    } catch (error) {
      await mongoose.disconnect();
      if (attempt === 2) throw error;
      console.warn("[db] Initial connection failed; retrying.");
      await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
    }
  }
}
