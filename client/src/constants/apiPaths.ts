import { AppConfigurationClient } from "@azure/app-configuration";

const getAPIURL = async () => {
  const connection_string =
    process.env.AZURE_APP_CONFIG_CONNECTION_STRING || "";
  const client = new AppConfigurationClient(connection_string);

  const data = await client.getConfigurationSetting({
    key: "API_URL_PRODUCT_SERVICE",
  });

  return data.value;
};

const url = import.meta.env.DEV ? "http://localhost:7071/api" : getAPIURL();

const API_PATHS = {
  product: url,
  order: url,
  import: url,
  bff: url,
  cart: url,
};

export default API_PATHS;
