import fs from 'fs';
import path from 'path';
import tinify from 'tinify';

const key = '';
const directory = '';

function setUpTinify() {
  tinify.key = key;
}

function getImageFilesFromDirectory(dir: string) {
  return fs
    .readdirSync(dir)
    .filter(
      (file) =>
        file.endsWith('.jpg') ||
        file.endsWith('.jpeg') ||
        file.endsWith('.webp') ||
        file.endsWith('.png')
    )
    .map((file) => path.resolve(dir, file))
    .filter((file) => fs.statSync(file).size > 0);
}

async function processImageFiles(imageFiles: string[]) {
  let processed = 0;
  let totalOriginalSizeKb = 0n;
  let totalNewSizeKb = 0n;
  let failed: string[] = [];

  for (const imageFilePath of imageFiles) {
    try {
      console.log(`🖼️  Processing ${imageFilePath}`);
      const originalImageFilePrefix = imageFilePath.substring(0, imageFilePath.lastIndexOf('.'));

      const originalStats = await fs.promises.stat(imageFilePath, { bigint: true });
      const originalSizeKb = originalStats.size / 1024n;

      const source = tinify.fromFile(imageFilePath);

      let convertedExtension = await source.result().extension();
      if (convertedExtension == "jpeg") 
        convertedExtension = "jpg";

      const newImageFilePath = `${originalImageFilePrefix}.${convertedExtension}`;
      await source.toFile(newImageFilePath);

      const newStats = await fs.promises.stat(newImageFilePath, { bigint: true });
      const newSizeKb = newStats.size / 1024n;

      const imageFileName = path.basename(imageFilePath);
      const newImageFileName = path.basename(newImageFilePath);

      totalOriginalSizeKb += originalSizeKb;
      totalNewSizeKb += newSizeKb;

      console.log(`
- 🔴 ${originalSizeKb}kb - ${imageFileName}
- 🟢 ${newSizeKb}kb - ${newImageFileName}
- 🔽 ${calculatePercentageReduction({ originalSizeKb, newSizeKb }).toFixed(2)}% reduction ✅ Processed! (${++processed} of ${imageFiles.length})----------------------`);
    } catch (e) {
      console.log(`\n❌ Failed to process ${imageFilePath}`);
      failed.push(imageFilePath);
    }
  }

  console.log(`************************************************* Total savings for ${imageFiles.length} images 
- 🔴 ${totalOriginalSizeKb}kb
- 🟢 ${totalNewSizeKb}kb
- 🔽 ${calculatePercentageReduction({ originalSizeKb: totalOriginalSizeKb, newSizeKb: totalNewSizeKb }).toFixed(2)}% reduction ************************************************`);

  if (failed.length > 0) console.log('Failed to process', failed);
}

function calculatePercentageReduction({ originalSizeKb, newSizeKb }: { originalSizeKb: bigint; newSizeKb: bigint; }) {
  return (((Number(originalSizeKb) - Number(newSizeKb)) / Number(originalSizeKb)) * 100);
}

async function run() {
  setUpTinify();

  if (!directory) {
    console.log('No directory specified!');
    process.exit(1);
  }

  const imageFiles = getImageFilesFromDirectory(directory);
  console.log(`Found ${imageFiles.length} image files in ${directory}`);
  await processImageFiles(imageFiles);
}

run();