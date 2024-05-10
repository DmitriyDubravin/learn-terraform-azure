import { AzureFunction, Context, HttpRequest } from "@azure/functions";
import { CosmosClient } from "@azure/cosmos";

const cosmosEndpoint = process.env.COSMOS_ENDPOINT;
const cosmosKey = process.env.COSMOS_KEY;

const databaseName = "products-db";
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
  const stocksContainer = cosmosClient
    .database(databaseName)
    .container(stocksContainerName);

  try {
    const { resources: stocksResources } = await stocksContainer.items
      .readAll()
      .fetchAll();

    const data = stocksResources.reduce((acc, { count }) => {
      return acc + count;
    }, 0);

    context.res = {
      status: 200,
      body: data,
    };
  } catch (error) {
    context.res = {
      status: 400,
      body: error.message,
    };
  }
};

export default httpTrigger;
