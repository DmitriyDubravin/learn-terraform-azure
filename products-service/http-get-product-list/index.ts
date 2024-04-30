import { AzureFunction, Context, HttpRequest } from "@azure/functions";
import { CosmosClient } from "@azure/cosmos";

const cosmosEndpoint = process.env.COSMOS_ENDPOINT;
const cosmosKey = process.env.COSMOS_KEY;

const databaseName = "products-db";
const productsContainerName = "products";
const stocksContainerName = "stocks";

const httpTrigger: AzureFunction = async function (
  context: Context,
  req: HttpRequest
): Promise<void> {
  context.log(
    "HTTP trigger function 'http-get-product-list' processed a request."
  );

  const cosmosClient = new CosmosClient({
    endpoint: cosmosEndpoint,
    key: cosmosKey,
  });
  const productsContainer = cosmosClient
    .database(databaseName)
    .container(productsContainerName);
  const stocksContainer = cosmosClient
    .database(databaseName)
    .container(stocksContainerName);

  try {
    const { resources: productsResources } = await productsContainer.items
      .readAll()
      .fetchAll();
    const { resources: stocksResources } = await stocksContainer.items
      .readAll()
      .fetchAll();

    const data = productsResources.map(({ id, title, description, price }) => ({
      id,
      title,
      description,
      price,
      count: stocksResources.find((stock) => stock.productId === id)?.count || 0,
    }));

    context.res = {
      status: 200,
      body: data,
    };
  } catch (error) {
    context.res = {
      status: 404,
      body: error.message,
    };
  }
};

export default httpTrigger;
