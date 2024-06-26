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
    "HTTP trigger function 'http-get-product-by-id' processed a request."
  );

  const cosmosClient = new CosmosClient({
    endpoint: cosmosEndpoint,
    key: cosmosKey,
  });
  const container = cosmosClient
    .database(databaseName)
    .container(containerName);

  const productId = req.params.id || req.query.id;

  try {
    const {
      resource: { id, title, description, price },
    } = await container.item(productId, productId).read();

    context.res = {
      status: 200,
      body: { id, title, description, price },
    };
  } catch (error) {
    context.res = {
      status: 404,
      body: `Document with id '${productId}' not found`,
    };
  }
};

export default httpTrigger;
