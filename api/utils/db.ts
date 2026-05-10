import { MongoClient, Db } from 'mongodb';

const uri = process.env.MONGODB_URI;

if (!uri) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env');
}

let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

export async function connectToDatabase() {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  const client = await MongoClient.connect(uri as string, {
    // useNewUrlParser and useUnifiedTopology are deprecated in newer mongodb driver versions,
    // so we don't need to specify them.
  });

  const db = client.db('visitors'); // Optional: replace with your db name or remove to use default from URI

  cachedClient = client;
  cachedDb = db;

  return { client, db };
}
