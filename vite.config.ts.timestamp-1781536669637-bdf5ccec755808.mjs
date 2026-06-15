// vite.config.ts
import { defineConfig, loadEnv } from "file:///C:/BGU/Year%204/Project/Visitors%20Web/chart-stacks-pro/node_modules/vite/dist/node/index.js";
import react from "file:///C:/BGU/Year%204/Project/Visitors%20Web/chart-stacks-pro/node_modules/@vitejs/plugin-react-swc/index.js";
import path from "path";

// api/utils/db.ts
import { MongoClient } from "file:///C:/BGU/Year%204/Project/Visitors%20Web/chart-stacks-pro/node_modules/mongodb/lib/index.js";
var cachedClient = null;
var cachedDb = null;
async function connectToDatabase() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("Please define the MONGODB_URI environment variable inside .env");
  }
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }
  const client = await MongoClient.connect(uri, {
    // useNewUrlParser and useUnifiedTopology are deprecated in newer mongodb driver versions,
    // so we don't need to specify them.
  });
  const db = client.db("visitors");
  cachedClient = client;
  cachedDb = db;
  return { client, db };
}

// src/server/viteGroupsMiddleware.ts
import { ObjectId } from "file:///C:/BGU/Year%204/Project/Visitors%20Web/chart-stacks-pro/node_modules/mongodb/lib/index.js";
function groupsApiMiddleware() {
  return {
    name: "groups-api-middleware",
    configureServer(server) {
      server.middlewares.use("/api/groups", async (req, res, next) => {
        try {
          const { db } = await connectToDatabase();
          const collection = db.collection("groups");
          res.setHeader("Content-Type", "application/json");
          const url = new URL(req.url || "/", `http://${req.headers.host}`);
          const readBody = () => {
            return new Promise((resolve, reject) => {
              let body = "";
              req.on("data", (chunk) => {
                body += chunk.toString();
              });
              req.on("end", () => {
                try {
                  resolve(body ? JSON.parse(body) : {});
                } catch (err) {
                  reject(err);
                }
              });
            });
          };
          if (req.method === "GET") {
            const groups = await collection.find({}).toArray();
            res.statusCode = 200;
            res.end(JSON.stringify(groups));
            return;
          }
          if (req.method === "POST") {
            const body = await readBody();
            const { name, patientIds } = body;
            if (!name || !Array.isArray(patientIds)) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: "Missing name or patientIds" }));
              return;
            }
            const newGroup = { name, patientIds, createdAt: /* @__PURE__ */ new Date() };
            const result = await collection.insertOne(newGroup);
            res.statusCode = 201;
            res.end(JSON.stringify({ _id: result.insertedId, ...newGroup }));
            return;
          }
          if (req.method === "PUT") {
            const body = await readBody();
            const { id, name, patientIds } = body;
            if (!id || !name || !Array.isArray(patientIds)) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: "Missing id, name, or patientIds" }));
              return;
            }
            await collection.updateOne(
              { _id: new ObjectId(id) },
              { $set: { name, patientIds, updatedAt: /* @__PURE__ */ new Date() } }
            );
            res.statusCode = 200;
            res.end(JSON.stringify({ success: true }));
            return;
          }
          if (req.method === "DELETE") {
            const id = url.searchParams.get("id");
            if (!id) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: "Missing id parameter" }));
              return;
            }
            await collection.deleteOne({ _id: new ObjectId(id) });
            res.statusCode = 200;
            res.end(JSON.stringify({ success: true }));
            return;
          }
          next();
        } catch (error) {
          console.error("Local API Error:", error);
          res.statusCode = 500;
          res.end(JSON.stringify({ error: error.message }));
        }
      });
      server.middlewares.use("/api/concept-groups", async (req, res, next) => {
        try {
          const { db } = await connectToDatabase();
          const collection = db.collection("concept_groups");
          res.setHeader("Content-Type", "application/json");
          const url = new URL(req.url || "/", `http://${req.headers.host}`);
          const readBody = () => {
            return new Promise((resolve, reject) => {
              let body = "";
              req.on("data", (chunk) => {
                body += chunk.toString();
              });
              req.on("end", () => {
                try {
                  resolve(body ? JSON.parse(body) : {});
                } catch (err) {
                  reject(err);
                }
              });
            });
          };
          if (req.method === "GET") {
            const groups = await collection.find({}).toArray();
            res.statusCode = 200;
            res.end(JSON.stringify(groups));
            return;
          }
          if (req.method === "POST") {
            const body = await readBody();
            const { name, concepts } = body;
            if (!name || !Array.isArray(concepts)) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: "Missing name or concepts" }));
              return;
            }
            const newGroup = { name, concepts, createdAt: /* @__PURE__ */ new Date() };
            const result = await collection.insertOne(newGroup);
            res.statusCode = 201;
            res.end(JSON.stringify({ _id: result.insertedId, ...newGroup }));
            return;
          }
          if (req.method === "PUT") {
            const body = await readBody();
            const { id, name, concepts } = body;
            if (!id || !name || !Array.isArray(concepts)) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: "Missing id, name, or concepts" }));
              return;
            }
            await collection.updateOne(
              { _id: new ObjectId(id) },
              { $set: { name, concepts, updatedAt: /* @__PURE__ */ new Date() } }
            );
            res.statusCode = 200;
            res.end(JSON.stringify({ success: true }));
            return;
          }
          if (req.method === "DELETE") {
            const id = url.searchParams.get("id");
            if (!id) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: "Missing id parameter" }));
              return;
            }
            await collection.deleteOne({ _id: new ObjectId(id) });
            res.statusCode = 200;
            res.end(JSON.stringify({ success: true }));
            return;
          }
          next();
        } catch (error) {
          console.error("Local API Error:", error);
          res.statusCode = 500;
          res.end(JSON.stringify({ error: error.message }));
        }
      });
    }
  };
}

// vite.config.ts
var __vite_injected_original_dirname = "C:\\BGU\\Year 4\\Project\\Visitors Web\\chart-stacks-pro";
var vite_config_default = defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const dataServiceUrl = env.VITE_DATA_SERVICE_URL;
  if (env.MONGODB_URI) {
    process.env.MONGODB_URI = env.MONGODB_URI;
  }
  if (!dataServiceUrl) {
    console.log("VITE_DATA_SERVICE_URL could not load well");
  }
  return {
    server: {
      host: "::",
      port: 8080,
      proxy: {
        "/api/v1/concept/menu": {
          target: dataServiceUrl,
          changeOrigin: true,
          secure: false
        },
        "/api/v1/visitors-queries": {
          target: dataServiceUrl,
          changeOrigin: true,
          secure: false
        }
      },
      cors: true
    },
    plugins: [
      react(),
      groupsApiMiddleware()
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__vite_injected_original_dirname, "./src")
      }
    }
  };
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiLCAiYXBpL3V0aWxzL2RiLnRzIiwgInNyYy9zZXJ2ZXIvdml0ZUdyb3Vwc01pZGRsZXdhcmUudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxCR1VcXFxcWWVhciA0XFxcXFByb2plY3RcXFxcVmlzaXRvcnMgV2ViXFxcXGNoYXJ0LXN0YWNrcy1wcm9cIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkM6XFxcXEJHVVxcXFxZZWFyIDRcXFxcUHJvamVjdFxcXFxWaXNpdG9ycyBXZWJcXFxcY2hhcnQtc3RhY2tzLXByb1xcXFx2aXRlLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vQzovQkdVL1llYXIlMjA0L1Byb2plY3QvVmlzaXRvcnMlMjBXZWIvY2hhcnQtc3RhY2tzLXByby92aXRlLmNvbmZpZy50c1wiO2ltcG9ydCB7IGRlZmluZUNvbmZpZywgbG9hZEVudiB9IGZyb20gXCJ2aXRlXCI7XHJcbmltcG9ydCByZWFjdCBmcm9tIFwiQHZpdGVqcy9wbHVnaW4tcmVhY3Qtc3djXCI7XHJcbmltcG9ydCBwYXRoIGZyb20gXCJwYXRoXCI7XHJcbmltcG9ydCB7IGdyb3Vwc0FwaU1pZGRsZXdhcmUgfSBmcm9tIFwiLi9zcmMvc2VydmVyL3ZpdGVHcm91cHNNaWRkbGV3YXJlXCI7XHJcblxyXG4vLyBodHRwczovL3ZpdGVqcy5kZXYvY29uZmlnL1xyXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoKHsgbW9kZSB9KSA9PiB7XHJcbiAgY29uc3QgZW52ID0gbG9hZEVudihtb2RlLCBwcm9jZXNzLmN3ZCgpLCAnJyk7XHJcbiAgY29uc3QgZGF0YVNlcnZpY2VVcmwgPSBlbnYuVklURV9EQVRBX1NFUlZJQ0VfVVJMO1xyXG5cclxuICAvLyBNYW51YWxseSBtYXAgbm9uLVZJVEUgcHJlZml4ZWQgdmFyaWFibGVzIHRoYXQgb3VyIGxvY2FsIGJhY2tlbmQgcGx1Z2lucyBuZWVkXHJcbiAgaWYgKGVudi5NT05HT0RCX1VSSSkge1xyXG4gICAgcHJvY2Vzcy5lbnYuTU9OR09EQl9VUkkgPSBlbnYuTU9OR09EQl9VUkk7XHJcbiAgfVxyXG5cclxuICBpZiAoIWRhdGFTZXJ2aWNlVXJsKSB7XHJcbiAgICBjb25zb2xlLmxvZyhcIlZJVEVfREFUQV9TRVJWSUNFX1VSTCBjb3VsZCBub3QgbG9hZCB3ZWxsXCIpO1xyXG4gIH1cclxuXHJcbiAgcmV0dXJuIHtcclxuICAgIHNlcnZlcjoge1xyXG4gICAgICBob3N0OiBcIjo6XCIsXHJcbiAgICAgIHBvcnQ6IDgwODAsXHJcbiAgICAgIHByb3h5OiB7XHJcbiAgICAgICAgXCIvYXBpL3YxL2NvbmNlcHQvbWVudVwiOiB7XHJcbiAgICAgICAgICB0YXJnZXQ6IGRhdGFTZXJ2aWNlVXJsLFxyXG4gICAgICAgICAgY2hhbmdlT3JpZ2luOiB0cnVlLFxyXG4gICAgICAgICAgc2VjdXJlOiBmYWxzZSxcclxuICAgICAgICB9LFxyXG4gICAgICAgIFwiL2FwaS92MS92aXNpdG9ycy1xdWVyaWVzXCI6IHtcclxuICAgICAgICAgIHRhcmdldDogZGF0YVNlcnZpY2VVcmwsXHJcbiAgICAgICAgICBjaGFuZ2VPcmlnaW46IHRydWUsXHJcbiAgICAgICAgICBzZWN1cmU6IGZhbHNlLFxyXG4gICAgICAgIH0sXHJcbiAgICAgIH0sXHJcbiAgICAgIGNvcnM6IHRydWUsXHJcbiAgICB9LFxyXG4gICAgcGx1Z2luczogW1xyXG4gICAgICByZWFjdCgpLCBcclxuICAgICAgZ3JvdXBzQXBpTWlkZGxld2FyZSgpXHJcbiAgICBdLmZpbHRlcihCb29sZWFuKSxcclxuICAgIHJlc29sdmU6IHtcclxuICAgICAgYWxpYXM6IHtcclxuICAgICAgICBcIkBcIjogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgXCIuL3NyY1wiKSxcclxuICAgICAgfSxcclxuICAgIH0sXHJcbiAgfTtcclxufSk7XHJcbiIsICJjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZGlybmFtZSA9IFwiQzpcXFxcQkdVXFxcXFllYXIgNFxcXFxQcm9qZWN0XFxcXFZpc2l0b3JzIFdlYlxcXFxjaGFydC1zdGFja3MtcHJvXFxcXGFwaVxcXFx1dGlsc1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiQzpcXFxcQkdVXFxcXFllYXIgNFxcXFxQcm9qZWN0XFxcXFZpc2l0b3JzIFdlYlxcXFxjaGFydC1zdGFja3MtcHJvXFxcXGFwaVxcXFx1dGlsc1xcXFxkYi50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vQzovQkdVL1llYXIlMjA0L1Byb2plY3QvVmlzaXRvcnMlMjBXZWIvY2hhcnQtc3RhY2tzLXByby9hcGkvdXRpbHMvZGIudHNcIjtpbXBvcnQgeyBNb25nb0NsaWVudCwgRGIgfSBmcm9tICdtb25nb2RiJztcclxuXHJcbmxldCBjYWNoZWRDbGllbnQ6IE1vbmdvQ2xpZW50IHwgbnVsbCA9IG51bGw7XHJcbmxldCBjYWNoZWREYjogRGIgfCBudWxsID0gbnVsbDtcclxuXHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBjb25uZWN0VG9EYXRhYmFzZSgpIHtcclxuICBjb25zdCB1cmkgPSBwcm9jZXNzLmVudi5NT05HT0RCX1VSSTtcclxuXHJcbiAgaWYgKCF1cmkpIHtcclxuICAgIHRocm93IG5ldyBFcnJvcignUGxlYXNlIGRlZmluZSB0aGUgTU9OR09EQl9VUkkgZW52aXJvbm1lbnQgdmFyaWFibGUgaW5zaWRlIC5lbnYnKTtcclxuICB9XHJcblxyXG4gIGlmIChjYWNoZWRDbGllbnQgJiYgY2FjaGVkRGIpIHtcclxuICAgIHJldHVybiB7IGNsaWVudDogY2FjaGVkQ2xpZW50LCBkYjogY2FjaGVkRGIgfTtcclxuICB9XHJcblxyXG4gIGNvbnN0IGNsaWVudCA9IGF3YWl0IE1vbmdvQ2xpZW50LmNvbm5lY3QodXJpIGFzIHN0cmluZywge1xyXG4gICAgLy8gdXNlTmV3VXJsUGFyc2VyIGFuZCB1c2VVbmlmaWVkVG9wb2xvZ3kgYXJlIGRlcHJlY2F0ZWQgaW4gbmV3ZXIgbW9uZ29kYiBkcml2ZXIgdmVyc2lvbnMsXHJcbiAgICAvLyBzbyB3ZSBkb24ndCBuZWVkIHRvIHNwZWNpZnkgdGhlbS5cclxuICB9KTtcclxuXHJcbiAgY29uc3QgZGIgPSBjbGllbnQuZGIoJ3Zpc2l0b3JzJyk7IC8vIE9wdGlvbmFsOiByZXBsYWNlIHdpdGggeW91ciBkYiBuYW1lIG9yIHJlbW92ZSB0byB1c2UgZGVmYXVsdCBmcm9tIFVSSVxyXG5cclxuICBjYWNoZWRDbGllbnQgPSBjbGllbnQ7XHJcbiAgY2FjaGVkRGIgPSBkYjtcclxuXHJcbiAgcmV0dXJuIHsgY2xpZW50LCBkYiB9O1xyXG59XHJcbiIsICJjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZGlybmFtZSA9IFwiQzpcXFxcQkdVXFxcXFllYXIgNFxcXFxQcm9qZWN0XFxcXFZpc2l0b3JzIFdlYlxcXFxjaGFydC1zdGFja3MtcHJvXFxcXHNyY1xcXFxzZXJ2ZXJcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkM6XFxcXEJHVVxcXFxZZWFyIDRcXFxcUHJvamVjdFxcXFxWaXNpdG9ycyBXZWJcXFxcY2hhcnQtc3RhY2tzLXByb1xcXFxzcmNcXFxcc2VydmVyXFxcXHZpdGVHcm91cHNNaWRkbGV3YXJlLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9DOi9CR1UvWWVhciUyMDQvUHJvamVjdC9WaXNpdG9ycyUyMFdlYi9jaGFydC1zdGFja3MtcHJvL3NyYy9zZXJ2ZXIvdml0ZUdyb3Vwc01pZGRsZXdhcmUudHNcIjtpbXBvcnQgdHlwZSB7IFBsdWdpbiB9IGZyb20gJ3ZpdGUnO1xyXG5pbXBvcnQgeyBjb25uZWN0VG9EYXRhYmFzZSB9IGZyb20gJy4uLy4uL2FwaS91dGlscy9kYic7XHJcbmltcG9ydCB7IE9iamVjdElkIH0gZnJvbSAnbW9uZ29kYic7XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gZ3JvdXBzQXBpTWlkZGxld2FyZSgpOiBQbHVnaW4ge1xyXG4gIHJldHVybiB7XHJcbiAgICBuYW1lOiAnZ3JvdXBzLWFwaS1taWRkbGV3YXJlJyxcclxuICAgIGNvbmZpZ3VyZVNlcnZlcihzZXJ2ZXIpIHtcclxuICAgICAgc2VydmVyLm1pZGRsZXdhcmVzLnVzZSgnL2FwaS9ncm91cHMnLCBhc3luYyAocmVxLCByZXMsIG5leHQpID0+IHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgY29uc3QgeyBkYiB9ID0gYXdhaXQgY29ubmVjdFRvRGF0YWJhc2UoKTtcclxuICAgICAgICAgIGNvbnN0IGNvbGxlY3Rpb24gPSBkYi5jb2xsZWN0aW9uKCdncm91cHMnKTtcclxuXHJcbiAgICAgICAgICByZXMuc2V0SGVhZGVyKCdDb250ZW50LVR5cGUnLCAnYXBwbGljYXRpb24vanNvbicpO1xyXG5cclxuICAgICAgICAgIC8vIFBhcnNlIFVSTFxyXG4gICAgICAgICAgY29uc3QgdXJsID0gbmV3IFVSTChyZXEudXJsIHx8ICcvJywgYGh0dHA6Ly8ke3JlcS5oZWFkZXJzLmhvc3R9YCk7XHJcbiAgICAgICAgICBcclxuICAgICAgICAgIC8vIEhlbHBlciB0byByZWFkIEpTT04gYm9keVxyXG4gICAgICAgICAgY29uc3QgcmVhZEJvZHkgPSAoKSA9PiB7XHJcbiAgICAgICAgICAgIHJldHVybiBuZXcgUHJvbWlzZTxhbnk+KChyZXNvbHZlLCByZWplY3QpID0+IHtcclxuICAgICAgICAgICAgICBsZXQgYm9keSA9ICcnO1xyXG4gICAgICAgICAgICAgIHJlcS5vbignZGF0YScsIGNodW5rID0+IHtcclxuICAgICAgICAgICAgICAgIGJvZHkgKz0gY2h1bmsudG9TdHJpbmcoKTtcclxuICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICByZXEub24oJ2VuZCcsICgpID0+IHtcclxuICAgICAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICAgIHJlc29sdmUoYm9keSA/IEpTT04ucGFyc2UoYm9keSkgOiB7fSk7XHJcbiAgICAgICAgICAgICAgICB9IGNhdGNoIChlcnIpIHtcclxuICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycik7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICBpZiAocmVxLm1ldGhvZCA9PT0gJ0dFVCcpIHtcclxuICAgICAgICAgICAgY29uc3QgZ3JvdXBzID0gYXdhaXQgY29sbGVjdGlvbi5maW5kKHt9KS50b0FycmF5KCk7XHJcbiAgICAgICAgICAgIHJlcy5zdGF0dXNDb2RlID0gMjAwO1xyXG4gICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KGdyb3VwcykpO1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgaWYgKHJlcS5tZXRob2QgPT09ICdQT1NUJykge1xyXG4gICAgICAgICAgICBjb25zdCBib2R5ID0gYXdhaXQgcmVhZEJvZHkoKTtcclxuICAgICAgICAgICAgY29uc3QgeyBuYW1lLCBwYXRpZW50SWRzIH0gPSBib2R5O1xyXG4gICAgICAgICAgICBpZiAoIW5hbWUgfHwgIUFycmF5LmlzQXJyYXkocGF0aWVudElkcykpIHtcclxuICAgICAgICAgICAgICByZXMuc3RhdHVzQ29kZSA9IDQwMDtcclxuICAgICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHsgZXJyb3I6ICdNaXNzaW5nIG5hbWUgb3IgcGF0aWVudElkcycgfSkpO1xyXG4gICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBjb25zdCBuZXdHcm91cCA9IHsgbmFtZSwgcGF0aWVudElkcywgY3JlYXRlZEF0OiBuZXcgRGF0ZSgpIH07XHJcbiAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGNvbGxlY3Rpb24uaW5zZXJ0T25lKG5ld0dyb3VwKTtcclxuICAgICAgICAgICAgcmVzLnN0YXR1c0NvZGUgPSAyMDE7XHJcbiAgICAgICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoeyBfaWQ6IHJlc3VsdC5pbnNlcnRlZElkLCAuLi5uZXdHcm91cCB9KSk7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICBpZiAocmVxLm1ldGhvZCA9PT0gJ1BVVCcpIHtcclxuICAgICAgICAgICAgY29uc3QgYm9keSA9IGF3YWl0IHJlYWRCb2R5KCk7XHJcbiAgICAgICAgICAgIGNvbnN0IHsgaWQsIG5hbWUsIHBhdGllbnRJZHMgfSA9IGJvZHk7XHJcbiAgICAgICAgICAgIGlmICghaWQgfHwgIW5hbWUgfHwgIUFycmF5LmlzQXJyYXkocGF0aWVudElkcykpIHtcclxuICAgICAgICAgICAgICByZXMuc3RhdHVzQ29kZSA9IDQwMDtcclxuICAgICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHsgZXJyb3I6ICdNaXNzaW5nIGlkLCBuYW1lLCBvciBwYXRpZW50SWRzJyB9KSk7XHJcbiAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGF3YWl0IGNvbGxlY3Rpb24udXBkYXRlT25lKFxyXG4gICAgICAgICAgICAgIHsgX2lkOiBuZXcgT2JqZWN0SWQoaWQpIH0sXHJcbiAgICAgICAgICAgICAgeyAkc2V0OiB7IG5hbWUsIHBhdGllbnRJZHMsIHVwZGF0ZWRBdDogbmV3IERhdGUoKSB9IH1cclxuICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgcmVzLnN0YXR1c0NvZGUgPSAyMDA7XHJcbiAgICAgICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoeyBzdWNjZXNzOiB0cnVlIH0pKTtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgfVxyXG5cclxuICAgICAgICAgIGlmIChyZXEubWV0aG9kID09PSAnREVMRVRFJykge1xyXG4gICAgICAgICAgICBjb25zdCBpZCA9IHVybC5zZWFyY2hQYXJhbXMuZ2V0KCdpZCcpO1xyXG4gICAgICAgICAgICBpZiAoIWlkKSB7XHJcbiAgICAgICAgICAgICAgcmVzLnN0YXR1c0NvZGUgPSA0MDA7XHJcbiAgICAgICAgICAgICAgcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7IGVycm9yOiAnTWlzc2luZyBpZCBwYXJhbWV0ZXInIH0pKTtcclxuICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgYXdhaXQgY29sbGVjdGlvbi5kZWxldGVPbmUoeyBfaWQ6IG5ldyBPYmplY3RJZChpZCkgfSk7XHJcbiAgICAgICAgICAgIHJlcy5zdGF0dXNDb2RlID0gMjAwO1xyXG4gICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHsgc3VjY2VzczogdHJ1ZSB9KSk7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICBuZXh0KCk7XHJcbiAgICAgICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xyXG4gICAgICAgICAgY29uc29sZS5lcnJvcignTG9jYWwgQVBJIEVycm9yOicsIGVycm9yKTtcclxuICAgICAgICAgIHJlcy5zdGF0dXNDb2RlID0gNTAwO1xyXG4gICAgICAgICAgcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7IGVycm9yOiBlcnJvci5tZXNzYWdlIH0pKTtcclxuICAgICAgICB9XHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgc2VydmVyLm1pZGRsZXdhcmVzLnVzZSgnL2FwaS9jb25jZXB0LWdyb3VwcycsIGFzeW5jIChyZXEsIHJlcywgbmV4dCkgPT4ge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICBjb25zdCB7IGRiIH0gPSBhd2FpdCBjb25uZWN0VG9EYXRhYmFzZSgpO1xyXG4gICAgICAgICAgY29uc3QgY29sbGVjdGlvbiA9IGRiLmNvbGxlY3Rpb24oJ2NvbmNlcHRfZ3JvdXBzJyk7XHJcblxyXG4gICAgICAgICAgcmVzLnNldEhlYWRlcignQ29udGVudC1UeXBlJywgJ2FwcGxpY2F0aW9uL2pzb24nKTtcclxuXHJcbiAgICAgICAgICAvLyBQYXJzZSBVUkxcclxuICAgICAgICAgIGNvbnN0IHVybCA9IG5ldyBVUkwocmVxLnVybCB8fCAnLycsIGBodHRwOi8vJHtyZXEuaGVhZGVycy5ob3N0fWApO1xyXG4gICAgICAgICAgXHJcbiAgICAgICAgICAvLyBIZWxwZXIgdG8gcmVhZCBKU09OIGJvZHlcclxuICAgICAgICAgIGNvbnN0IHJlYWRCb2R5ID0gKCkgPT4ge1xyXG4gICAgICAgICAgICByZXR1cm4gbmV3IFByb21pc2U8YW55PigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XHJcbiAgICAgICAgICAgICAgbGV0IGJvZHkgPSAnJztcclxuICAgICAgICAgICAgICByZXEub24oJ2RhdGEnLCBjaHVuayA9PiB7XHJcbiAgICAgICAgICAgICAgICBib2R5ICs9IGNodW5rLnRvU3RyaW5nKCk7XHJcbiAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgcmVxLm9uKCdlbmQnLCAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgICByZXNvbHZlKGJvZHkgPyBKU09OLnBhcnNlKGJvZHkpIDoge30pO1xyXG4gICAgICAgICAgICAgICAgfSBjYXRjaCAoZXJyKSB7XHJcbiAgICAgICAgICAgICAgICAgIHJlamVjdChlcnIpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgaWYgKHJlcS5tZXRob2QgPT09ICdHRVQnKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGdyb3VwcyA9IGF3YWl0IGNvbGxlY3Rpb24uZmluZCh7fSkudG9BcnJheSgpO1xyXG4gICAgICAgICAgICByZXMuc3RhdHVzQ29kZSA9IDIwMDtcclxuICAgICAgICAgICAgcmVzLmVuZChKU09OLnN0cmluZ2lmeShncm91cHMpKTtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgfVxyXG5cclxuICAgICAgICAgIGlmIChyZXEubWV0aG9kID09PSAnUE9TVCcpIHtcclxuICAgICAgICAgICAgY29uc3QgYm9keSA9IGF3YWl0IHJlYWRCb2R5KCk7XHJcbiAgICAgICAgICAgIGNvbnN0IHsgbmFtZSwgY29uY2VwdHMgfSA9IGJvZHk7XHJcbiAgICAgICAgICAgIGlmICghbmFtZSB8fCAhQXJyYXkuaXNBcnJheShjb25jZXB0cykpIHtcclxuICAgICAgICAgICAgICByZXMuc3RhdHVzQ29kZSA9IDQwMDtcclxuICAgICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHsgZXJyb3I6ICdNaXNzaW5nIG5hbWUgb3IgY29uY2VwdHMnIH0pKTtcclxuICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgY29uc3QgbmV3R3JvdXAgPSB7IG5hbWUsIGNvbmNlcHRzLCBjcmVhdGVkQXQ6IG5ldyBEYXRlKCkgfTtcclxuICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgY29sbGVjdGlvbi5pbnNlcnRPbmUobmV3R3JvdXApO1xyXG4gICAgICAgICAgICByZXMuc3RhdHVzQ29kZSA9IDIwMTtcclxuICAgICAgICAgICAgcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7IF9pZDogcmVzdWx0Lmluc2VydGVkSWQsIC4uLm5ld0dyb3VwIH0pKTtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgfVxyXG5cclxuICAgICAgICAgIGlmIChyZXEubWV0aG9kID09PSAnUFVUJykge1xyXG4gICAgICAgICAgICBjb25zdCBib2R5ID0gYXdhaXQgcmVhZEJvZHkoKTtcclxuICAgICAgICAgICAgY29uc3QgeyBpZCwgbmFtZSwgY29uY2VwdHMgfSA9IGJvZHk7XHJcbiAgICAgICAgICAgIGlmICghaWQgfHwgIW5hbWUgfHwgIUFycmF5LmlzQXJyYXkoY29uY2VwdHMpKSB7XHJcbiAgICAgICAgICAgICAgcmVzLnN0YXR1c0NvZGUgPSA0MDA7XHJcbiAgICAgICAgICAgICAgcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7IGVycm9yOiAnTWlzc2luZyBpZCwgbmFtZSwgb3IgY29uY2VwdHMnIH0pKTtcclxuICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgYXdhaXQgY29sbGVjdGlvbi51cGRhdGVPbmUoXHJcbiAgICAgICAgICAgICAgeyBfaWQ6IG5ldyBPYmplY3RJZChpZCkgfSxcclxuICAgICAgICAgICAgICB7ICRzZXQ6IHsgbmFtZSwgY29uY2VwdHMsIHVwZGF0ZWRBdDogbmV3IERhdGUoKSB9IH1cclxuICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgcmVzLnN0YXR1c0NvZGUgPSAyMDA7XHJcbiAgICAgICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoeyBzdWNjZXNzOiB0cnVlIH0pKTtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgfVxyXG5cclxuICAgICAgICAgIGlmIChyZXEubWV0aG9kID09PSAnREVMRVRFJykge1xyXG4gICAgICAgICAgICBjb25zdCBpZCA9IHVybC5zZWFyY2hQYXJhbXMuZ2V0KCdpZCcpO1xyXG4gICAgICAgICAgICBpZiAoIWlkKSB7XHJcbiAgICAgICAgICAgICAgcmVzLnN0YXR1c0NvZGUgPSA0MDA7XHJcbiAgICAgICAgICAgICAgcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7IGVycm9yOiAnTWlzc2luZyBpZCBwYXJhbWV0ZXInIH0pKTtcclxuICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgYXdhaXQgY29sbGVjdGlvbi5kZWxldGVPbmUoeyBfaWQ6IG5ldyBPYmplY3RJZChpZCkgfSk7XHJcbiAgICAgICAgICAgIHJlcy5zdGF0dXNDb2RlID0gMjAwO1xyXG4gICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHsgc3VjY2VzczogdHJ1ZSB9KSk7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICBuZXh0KCk7XHJcbiAgICAgICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xyXG4gICAgICAgICAgY29uc29sZS5lcnJvcignTG9jYWwgQVBJIEVycm9yOicsIGVycm9yKTtcclxuICAgICAgICAgIHJlcy5zdGF0dXNDb2RlID0gNTAwO1xyXG4gICAgICAgICAgcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7IGVycm9yOiBlcnJvci5tZXNzYWdlIH0pKTtcclxuICAgICAgICB9XHJcbiAgICAgIH0pO1xyXG4gICAgfVxyXG4gIH07XHJcbn1cclxuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUEyVixTQUFTLGNBQWMsZUFBZTtBQUNqWSxPQUFPLFdBQVc7QUFDbEIsT0FBTyxVQUFVOzs7QUNGMFYsU0FBUyxtQkFBdUI7QUFFM1ksSUFBSSxlQUFtQztBQUN2QyxJQUFJLFdBQXNCO0FBRTFCLGVBQXNCLG9CQUFvQjtBQUN4QyxRQUFNLE1BQU0sUUFBUSxJQUFJO0FBRXhCLE1BQUksQ0FBQyxLQUFLO0FBQ1IsVUFBTSxJQUFJLE1BQU0sZ0VBQWdFO0FBQUEsRUFDbEY7QUFFQSxNQUFJLGdCQUFnQixVQUFVO0FBQzVCLFdBQU8sRUFBRSxRQUFRLGNBQWMsSUFBSSxTQUFTO0FBQUEsRUFDOUM7QUFFQSxRQUFNLFNBQVMsTUFBTSxZQUFZLFFBQVEsS0FBZTtBQUFBO0FBQUE7QUFBQSxFQUd4RCxDQUFDO0FBRUQsUUFBTSxLQUFLLE9BQU8sR0FBRyxVQUFVO0FBRS9CLGlC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
