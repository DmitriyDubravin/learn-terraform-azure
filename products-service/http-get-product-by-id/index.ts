import { AzureFunction, Context, HttpRequest } from "@azure/functions";
import { products } from "../mocks";

const httpTrigger: AzureFunction = async function (
  context: Context,
  req: HttpRequest
): Promise<void> {
  context.log("HTTP trigger function processed a request.");

  context.res = {
    body: products.find(({ id }) => id === req.params.productId),
  };
};

export default httpTrigger;
