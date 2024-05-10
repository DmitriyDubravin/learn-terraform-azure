import { AzureFunction, Context, HttpRequest } from "@azure/functions";
import { faker } from "@faker-js/faker";
import { CosmosClient } from "@azure/cosmos";

const cosmosEndpoint = process.env.COSMOS_ENDPOINT;
const cosmosKey = process.env.COSMOS_KEY;

const databaseName = "products-db";
const productsContainerName = "products";
const stocksContainerName = "stocks";

const createRandomProduct = () => ({
  id: faker.string.uuid(),
  title: faker.commerce.product(),
  description: faker.commerce.productDescription(),
  price: faker.number.float({ min: 0, max: 10, fractionDigits: 1 }),
});

const createRandomStock = (productId) => ({
  productId,
  count: faker.number.int({ min: 0, max: 20 }),
});

const httpTrigger: AzureFunction = async function (
  context: Context,
  req: HttpRequest
): Promise<void> {
  context.log(
    "HTTP trigger function 'http-fill-products-stocks' processed a request."
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

  const randomProducts = faker.helpers.multiple(createRandomProduct, {
    count: 5,
  });

  const randomStocks = randomProducts.map(({ id }) => createRandomStock(id));

  try {
    randomProducts.forEach(async (randomProduct) => {
      await productsContainer.items.create(randomProduct);
    });
    randomStocks.forEach(async (randomStock) => {
      await stocksContainer.items.create(randomStock);
    });
  } catch (error) {
    context.res = {
      status: 400,
      body: error.message,
    };
  }

  context.res = {
    body: {
      products: randomProducts,
      stocks: randomStocks,
    },
  };
};

export default httpTrigger;
