import { VercelRequest, VercelResponse } from '@vercel/node';
import { connectToDatabase } from './utils/db';
import { ObjectId } from 'mongodb';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { db } = await connectToDatabase();
    const collection = db.collection('groups');

    // CORS handling for local dev if needed
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
      'Access-Control-Allow-Headers',
      'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }

    if (req.method === 'GET') {
      const groups = await collection.find({}).toArray();
      res.status(200).json(groups);
      return;
    }

    if (req.method === 'POST') {
      const { name, patientIds } = req.body;
      if (!name || !Array.isArray(patientIds)) {
        res.status(400).json({ error: 'Missing name or patientIds' });
        return;
      }
      
      const newGroup = { name, patientIds, createdAt: new Date() };
      const result = await collection.insertOne(newGroup);
      res.status(201).json({ _id: result.insertedId, ...newGroup });
      return;
    }

    if (req.method === 'PUT') {
      const { id, name, patientIds } = req.body;
      if (!id || !name || !Array.isArray(patientIds)) {
        res.status(400).json({ error: 'Missing id, name, or patientIds' });
        return;
      }
      
      await collection.updateOne(
        { _id: new ObjectId(id) },
        { $set: { name, patientIds, updatedAt: new Date() } }
      );
      res.status(200).json({ success: true });
      return;
    }

    if (req.method === 'DELETE') {
      const { id } = req.query;
      if (!id || typeof id !== 'string') {
        res.status(400).json({ error: 'Missing id parameter' });
        return;
      }
      
      await collection.deleteOne({ _id: new ObjectId(id) });
      res.status(200).json({ success: true });
      return;
    }

    res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  } catch (error: any) {
    console.error('API Error:', error);
    res.status(500).json({ error: error.message });
  }
}
