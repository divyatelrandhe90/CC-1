const mongoose = require('mongoose');

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

const safeErrorDetails = (error, uri) => {
  let message = String(error?.message || 'Unknown connection error');
  if (uri) message = message.split(uri).join('[redacted MongoDB URI]');
  message = message
    .replace(/mongodb(?:\+srv)?:\/\/[^\s"'<>]+/gi, '[MongoDB URI]')
    .replace(/(password|passwd|pwd)\s*[:=]\s*[^,\s;]+/gi, '$1=[redacted]');

  const code = error?.code ? `, code ${String(error.code).slice(0, 60)}` : '';
  return `${error?.name || 'Error'}${code}: ${message.slice(0, 300)}`;
};

const connectDB = async () => {
  const uri = process.env.MONGODB_URI?.trim();
  const schemeIsValid = typeof uri === 'string' && /^mongodb(?:\+srv)?:\/\/\S+$/i.test(uri);
  const authority = schemeIsValid ? uri.match(/^mongodb(?:\+srv)?:\/\/([^/?#]+)/i)?.[1] : null;
  const host = authority?.split('@').pop();

  if (!uri) {
    console.error('MongoDB is not configured: set MONGODB_URI in the Render service environment.');
    return null;
  }
  if (!schemeIsValid || !host) {
    console.error('MongoDB configuration is invalid: MONGODB_URI must be an Atlas mongodb+srv:// URI or mongodb:// URI. Copy the connection string from Atlas and do not include surrounding quotes.');
    return null;
  }

  let retryDelayMs = 1000;
  let attempt = 0;

  while (true) {
    attempt += 1;
    try {
      const connection = await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 10000,
        connectTimeoutMS: 10000,
      });
      console.log('MongoDB connection established.');
      return connection;
    } catch (error) {
      console.error(`MongoDB connection attempt ${attempt} failed: ${safeErrorDetails(error, uri)}`);
      console.warn(`MongoDB will retry in ${Math.ceil(retryDelayMs / 1000)} seconds. Check the Atlas URI, database user credentials, DNS/SRV access, and Atlas Network Access allowlist.`);
      await sleep(retryDelayMs);
      retryDelayMs = Math.min(retryDelayMs * 2, 30000);
    }
  }
};

module.exports = connectDB;
