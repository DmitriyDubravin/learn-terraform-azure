import { AzureFunction, Context } from "@azure/functions";
import { BlobServiceClient } from "@azure/storage-blob";
import { parse } from "csv-parse/sync";

const blobTrigger: AzureFunction = async function (
  context: Context
): Promise<void> {
  context.log(
    "Blob trigger function 'blob-import-products-form-file' processed a request."
  );

  const records = parse(context.bindings.blob, {
    columns: true,
    skip_empty_lines: true,
  });

  records.forEach(({ id, title, description, count }) => {
    context.log(id, title, description, count);
  });

  const [_, name] = context.bindingData.blobTrigger.split("/");
  const serviceClient = BlobServiceClient.fromConnectionString(
    process.env.CONNECTION_IMPORT_FILES_STORAGE_ACCOUNT as string
  );

  const srsClient = serviceClient.getContainerClient("uploaded");
  const distClient = serviceClient.getContainerClient("parsed");

  const blobSrcClient = srsClient.getBlobClient(name);
  const blobDistClient = distClient.getBlobClient(name);

  await blobDistClient.beginCopyFromURL(blobSrcClient.url);
  await blobSrcClient.delete();
};

export default blobTrigger;
