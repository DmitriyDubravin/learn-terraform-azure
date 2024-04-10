import { AzureFunction, Context } from "@azure/functions";
import { products } from "../mocks";

const httpTrigger: AzureFunction = async function (
  context: Context
): Promise<void> {
  context.log("HTTP trigger function processed a request.");

  context.res = {
    body: products,
  };
};

export default httpTrigger;
