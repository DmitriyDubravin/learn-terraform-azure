import { AzureFunction, Context, HttpRequest } from "@azure/functions";
import { CosmosClient } from "@azure/cosmos";

const cosmosEndpoint = process.env.COSMOS_ENDPOINT;
const cosmosKey = process.env.COSMOS_KEY;

const databaseName = "products-db";
const containerName = "products";

const httpTrigger: AzureFunction = async function (
  context: Context,
  req: HttpRequest
): Promise<void> {
  context.log(
    "HTTP trigger function 'http-post-products' processed a request."
  );

  const cosmosClient = new CosmosClient({
    endpoint: cosmosEndpoint,
    key: cosmosKey,
  });
  const container = cosmosClient
    .database(databaseName)
    .container(containerName);

  const { id, title, description, price } = req.body;

  if (!(id && title && description && price)) {
    context.res = {
      status: 400,
      body: "Invalid request payload",
    };
    return;
  }

  try {
    const { resource } = await container.items.upsert({
      id,
      title,
      description,
      price,
    });

    context.res = {
      status: 200,
      body: resource,
    };
  } catch (error) {
    context.res = {
      status: 500,
      body: error.message,
    };
  }
};

export default httpTrigger;
