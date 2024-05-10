import { AzureFunction, Context, HttpRequest } from "@azure/functions";
import {
  BlobSASPermissions,
  BlobServiceClient,
  generateBlobSASQueryParameters,
  StorageSharedKeyCredential,
} from "@azure/storage-blob";

const httpTrigger: AzureFunction = async function (
  context: Context,
  req: HttpRequest
): Promise<void> {
  context.log(
    "HTTP trigger function 'http-get-import-products-files' processed a request."
  );

  const name = context.req?.query.name as string;

  if (!name) {
    context.res = {
      status: 404,
      body: {
        message: "No query params were specified",
      },
    };
    return;
  }

  const containerName = "uploaded";

  const blobServiceClient = BlobServiceClient.fromConnectionString(process.env.CONNECTION_IMPORT_FILES_STORAGE_ACCOUNT as string);
  const containerClient = blobServiceClient.getContainerClient(containerName);

  const permissions = BlobSASPermissions.parse("rw");
  const expiryDate = new Date();
  expiryDate.setMinutes(expiryDate.getMinutes() + 15);

  const sasToken = generateBlobSASQueryParameters(
    { containerName, blobName: name, permissions, startsOn: new Date(), expiresOn: expiryDate },
    // @ts-ignore
    new StorageSharedKeyCredential(containerClient.accountName, (containerClient.credential as StorageSharedKeyCredential)!.accountKey)
  ).toString();

  context.res = {
    body: { sasToken },
  };
};

export default httpTrigger;
