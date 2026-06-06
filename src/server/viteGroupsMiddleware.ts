import type { Plugin } from 'vite';
import { connectToDatabase } from '../../api/utils/db';
import { ObjectId } from 'mongodb';

export function groupsApiMiddleware(): Plugin {
  return {
    name: 'groups-api-middleware',
    configureServer(server) {
      server.middlewares.use('/api/groups', async (req, res, next) => {
        try {
          const { db } = await connectToDatabase();
          const collection = db.collection('groups');

          res.setHeader('Content-Type', 'application/json');

          // Parse URL
          const url = new URL(req.url || '/', `http://${req.headers.host}`);
          
          // Helper to read JSON body
          const readBody = () => {
            return new Promise<any>((resolve, reject) => {
              let body = '';
              req.on('data', chunk => {
                body += chunk.toString();
              });
              req.on('end', () => {
                try {
                  resolve(body ? JSON.parse(body) : {});
                } catch (err) {
                  reject(err);
                }
              });
            });
          };

          if (req.method === 'GET') {
            const groups = await collection.find({}).toArray();
            res.statusCode = 200;
            res.end(JSON.stringify(groups));
            return;
          }

          if (req.method === 'POST') {
            const body = await readBody();
            const { name, patientIds } = body;
            if (!name || !Array.isArray(patientIds)) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'Missing name or patientIds' }));
              return;
            }
            const newGroup = { name, patientIds, createdAt: new Date() };
            const result = await collection.insertOne(newGroup);
            res.statusCode = 201;
            res.end(JSON.stringify({ _id: result.insertedId, ...newGroup }));
            return;
          }

          if (req.method === 'PUT') {
            const body = await readBody();
            const { id, name, patientIds } = body;
            if (!id || !name || !Array.isArray(patientIds)) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'Missing id, name, or patientIds' }));
              return;
            }
            await collection.updateOne(
              { _id: new ObjectId(id) },
              { $set: { name, patientIds, updatedAt: new Date() } }
            );
            res.statusCode = 200;
            res.end(JSON.stringify({ success: true }));
            return;
          }

          if (req.method === 'DELETE') {
            const id = url.searchParams.get('id');
            if (!id) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'Missing id parameter' }));
              return;
            }
            await collection.deleteOne({ _id: new ObjectId(id) });
            res.statusCode = 200;
            res.end(JSON.stringify({ success: true }));
            return;
          }

          next();
        } catch (error: any) {
          console.error('Local API Error:', error);
          res.statusCode = 500;
          res.end(JSON.stringify({ error: error.message }));
        }
      });

      server.middlewares.use('/api/concept-groups', async (req, res, next) => {
        try {
          const { db } = await connectToDatabase();
          const collection = db.collection('concept_groups');

          res.setHeader('Content-Type', 'application/json');

          // Parse URL
          const url = new URL(req.url || '/', `http://${req.headers.host}`);
          
          // Helper to read JSON body
          const readBody = () => {
            return new Promise<any>((resolve, reject) => {
              let body = '';
              req.on('data', chunk => {
                body += chunk.toString();
              });
              req.on('end', () => {
                try {
                  resolve(body ? JSON.parse(body) : {});
                } catch (err) {
                  reject(err);
                }
              });
            });
          };

          if (req.method === 'GET') {
            const groups = await collection.find({}).toArray();
            res.statusCode = 200;
            res.end(JSON.stringify(groups));
            return;
          }

          if (req.method === 'POST') {
            const body = await readBody();
            const { name, concepts } = body;
            if (!name || !Array.isArray(concepts)) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'Missing name or concepts' }));
              return;
            }
            const newGroup = { name, concepts, createdAt: new Date() };
            const result = await collection.insertOne(newGroup);
            res.statusCode = 201;
            res.end(JSON.stringify({ _id: result.insertedId, ...newGroup }));
            return;
          }

          if (req.method === 'PUT') {
            const body = await readBody();
            const { id, name, concepts } = body;
            if (!id || !name || !Array.isArray(concepts)) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'Missing id, name, or concepts' }));
              return;
            }
            await collection.updateOne(
              { _id: new ObjectId(id) },
              { $set: { name, concepts, updatedAt: new Date() } }
            );
            res.statusCode = 200;
            res.end(JSON.stringify({ success: true }));
            return;
          }

          if (req.method === 'DELETE') {
            const id = url.searchParams.get('id');
            if (!id) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'Missing id parameter' }));
              return;
            }
            await collection.deleteOne({ _id: new ObjectId(id) });
            res.statusCode = 200;
            res.end(JSON.stringify({ success: true }));
            return;
          }

          next();
        } catch (error: any) {
          console.error('Local API Error:', error);
          res.statusCode = 500;
          res.end(JSON.stringify({ error: error.message }));
        }
      });
    }
  };
}
