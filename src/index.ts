// Import necessary libraries
import express from 'express';
import multer from 'multer';
import AWS from 'aws-sdk';
import fs from 'fs';
import path from 'path';

// Configure AWS SDK
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});
const s3 = new AWS.S3();

// Express app setup
const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.static('public'));

// Configure multer for file uploads
const upload = multer({ dest: 'uploads/' });

// Serve a simple HTML page
app.get('/', (req: express.Request, res: express.Response) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

// Endpoint to handle file uploads
app.post('/upload/:word', upload.single('audio'), async (req: express.Request, res: express.Response): Promise<any> => {
  const file = req.file;
  const wordId = req.body.wordId;

  if (!file || !wordId) {
    return res.status(400).send('Missing file or word ID');
  }

  saveToDisk(`words/${req.params.word}.ogg`, file);

  const bucket = process.env.S3_BUCKET_NAME;
  if (bucket) {
    try {
      await saveToS3(bucket, file, wordId);
    } catch (e) {
      return res.status(500).send('S3 bucket name is not defined');
    }
  }

  res.status(200).send('Success');
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});


function saveToDisk(path: string, file: any) {
  // fs.renameSync(file.path, path);
  const fileContent = fs.readFileSync(file.path);
  fs.writeFileSync(path, fileContent);
}

async function saveToS3(bucket: string, file: any, wordId: string) {
  const fileContent = fs.readFileSync(file.path);
  const s3Params = {
    Bucket: bucket,
    Key: `pronunciations/${wordId}-${file.originalname}`,
    Body: fileContent,
  };

  await s3.upload(s3Params).promise();
  fs.unlinkSync(file.path); // Clean up temporary file
}