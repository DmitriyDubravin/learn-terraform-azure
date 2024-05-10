terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.92.0"
    }
  }

  required_version = ">= 1.1.0"
}

provider "azurerm" {
  features {}
}


resource "azurerm_resource_group" "front_end_rg" {
  name     = "rg-frontend-sand-ne-001"
  location = "northeurope"
}

resource "azurerm_storage_account" "front_end_storage_account" {
  name                     = "rgfrontendsandne001"
  location                 = "northeurope"

  account_replication_type = "LRS"
  account_tier             = "Standard"
  account_kind             = "StorageV2"
  resource_group_name      = azurerm_resource_group.front_end_rg.name

  static_website {
    index_document = "index.html"
  }
}

resource "azurerm_resource_group" "product_service_rg" {
  location = "northeurope"
  name     = "rg-product-service-sand-ne-009"
}

resource "azurerm_storage_account" "products_service_fa" {
  name     = "stgsangproductsfane009"
  location = "northeurope"

  account_replication_type = "LRS"
  account_tier             = "Standard"
  account_kind             = "StorageV2"

  resource_group_name = azurerm_resource_group.product_service_rg.name
}

resource "azurerm_storage_share" "products_service_fa" {
  name  = "fa-products-service-share"
  quota = 2

  storage_account_name = azurerm_storage_account.products_service_fa.name
}

resource "azurerm_service_plan" "product_service_plan" {
  name     = "asp-product-service-sand-ne-009"
  location = "northeurope"

  os_type  = "Windows"
  sku_name = "Y1"

  resource_group_name = azurerm_resource_group.product_service_rg.name
}

resource "azurerm_application_insights" "products_service_fa" {
  name             = "appins-fa-products-service-sand-ne-009"
  application_type = "web"
  location         = "northeurope"


  resource_group_name = azurerm_resource_group.product_service_rg.name
}


resource "azurerm_windows_function_app" "products_service" {
  name     = "fa-products-service-ne-009"
  location = "northeurope"

  service_plan_id     = azurerm_service_plan.product_service_plan.id
  resource_group_name = azurerm_resource_group.product_service_rg.name

  storage_account_name       = azurerm_storage_account.products_service_fa.name
  storage_account_access_key = azurerm_storage_account.products_service_fa.primary_access_key

  functions_extension_version = "~4"
  builtin_logging_enabled     = false

  site_config {
    always_on = false

    application_insights_key               = azurerm_application_insights.products_service_fa.instrumentation_key
    application_insights_connection_string = azurerm_application_insights.products_service_fa.connection_string

    # For production systems set this to false, but consumption plan supports only 32bit workers
    use_32_bit_worker = true

    # Enable function invocations from Azure Portal.
    cors {
      allowed_origins = ["https://portal.azure.com"]
    }

    application_stack {
      node_version = "~16"
    }
  }

  app_settings = {
    WEBSITE_CONTENTAZUREFILECONNECTIONSTRING = azurerm_storage_account.products_service_fa.primary_connection_string
    WEBSITE_CONTENTSHARE                     = azurerm_storage_share.products_service_fa.name
  }

  # The app settings changes cause downtime on the Function App. e.g. with Azure Function App Slots
  # Therefore it is better to ignore those changes and manage app settings separately off the Terraform.
  lifecycle {
    ignore_changes = [
      app_settings,
      site_config["application_stack"], // workaround for a bug when azure just "kills" your app
      tags["hidden-link: /app-insights-instrumentation-key"],
      tags["hidden-link: /app-insights-resource-id"],
      tags["hidden-link: /app-insights-conn-string"]
    ]
  }
}

## Cosmos DB

resource "azurerm_cosmosdb_account" "cosmosdb_app" {
  location            = "northeurope"
  name                = "cosmos-app-sand-ne-009"
  offer_type          = "Standard"
  resource_group_name = azurerm_resource_group.product_service_rg.name
  kind                = "GlobalDocumentDB"

  consistency_policy {
    consistency_level = "Eventual"
  }

  capabilities {
    name = "EnableServerless"
  }

  geo_location {
    failover_priority = 0
    location          = "North Europe"
  }
}

resource "azurerm_cosmosdb_sql_database" "products_app" {
  account_name        = azurerm_cosmosdb_account.cosmosdb_app.name
  name                = "products-db"
  resource_group_name = azurerm_resource_group.product_service_rg.name
}

resource "azurerm_cosmosdb_sql_container" "products" {
  account_name        = azurerm_cosmosdb_account.cosmosdb_app.name
  database_name       = azurerm_cosmosdb_sql_database.products_app.name
  name                = "products"
  partition_key_path  = "/id"
  resource_group_name = azurerm_resource_group.product_service_rg.name

  # Cosmos DB supports TTL for the records
  default_ttl = -1


  indexing_policy {
    excluded_path {
      path = "/*"
    }
  }
}

resource "azurerm_cosmosdb_sql_container" "stocks" {
  account_name        = azurerm_cosmosdb_account.cosmosdb_app.name
  database_name       = azurerm_cosmosdb_sql_database.products_app.name
  name                = "stocks"
  partition_key_path  = "/id"
  resource_group_name = azurerm_resource_group.product_service_rg.name

  # Cosmos DB supports TTL for the records
  default_ttl = -1

  indexing_policy {
    excluded_path {
      path = "/*"
    }
  }
}



## Storage Account

resource "azurerm_storage_account" "import_service" {
  name                                       = "dd-import-sand-ne-009"
  location                                   = azurerm_resource_group.product_service_rg.location
  resource_group_name                        = azurerm_resource_group.product_service_rg.name

  account_tier                               = "Standard"
  account_kind                               = "StorageV2"
  account_replication_type                   = "LRS"
}

resource "azurerm_storage_account" "import_service_files" {
  name                                       = "dd-import-service-files-sand-ne-009"
  location                                   = azurerm_resource_group.product_service_rg.location
  resource_group_name                        = azurerm_resource_group.product_service_rg.name

  account_tier                               = "Standard"
  account_kind                               = "StorageV2"
  account_replication_type                   = "LRS"

  blob_properties {
    cors_rule {
      allowed_headers                        = ["*"]
      allowed_methods                        = ["PUT", "GET"]
      allowed_origins                        = ["*"]
      exposed_headers                        = ["*"]
      max_age_in_seconds                     = 0
    }
  }
}

resource "azurerm_storage_share" "import_service" {
  name                                       = "dd-share-import-service-sand-ne-009"
  quota                                      = 2
  storage_account_name                       = azurerm_storage_account.import_service.name
}

resource "azurerm_service_plan" "import_service_plan" {
  name                                       = "dd-plan-import-service-sand-ne-009"
  location                                   = azurerm_resource_group.product_service_rg.location
  resource_group_name                        = azurerm_resource_group.product_service_rg.name

  os_type  = "Windows"
  sku_name = "Y1"
}

resource "azurerm_application_insights" "import_service" {
  name                                       = "dd-appins-import-service-sand-ne-009"
  location                                   = azurerm_resource_group.product_service_rg.location
  resource_group_name                        = azurerm_resource_group.product_service_rg.name

  application_type                           = "web"
}

resource "azurerm_windows_function_app" "import_service" {
  name                                       = "dd-winfun-import-service-ne-009"
  location                                   = azurerm_resource_group.product_service_rg.location
  resource_group_name                        = azurerm_resource_group.product_service_rg.name

  service_plan_id                            = azurerm_service_plan.import_service_plan.id
  storage_account_name                       = azurerm_storage_account.import_service.name
  storage_account_access_key                 = azurerm_storage_account.import_service.primary_access_key

  functions_extension_version                = "~4"
  builtin_logging_enabled                    = false

  site_config {
    always_on = false

    application_insights_key                 = azurerm_application_insights.import_service.instrumentation_key
    application_insights_connection_string   = azurerm_application_insights.import_servicea.connection_string

    # For production systems set this to false
    use_32_bit_worker = true

    # Enable function invocations from Azure Portal.
    cors {
      allowed_origins = ["https://portal.azure.com", "https://rgfrontendsandne001.z16.web.core.windows.net/", "http://localhost:3000"]
    }

    application_stack {
      node_version                           = "~16"
    }
  }

  app_settings = {
    WEBSITE_CONTENTAZUREFILECONNECTIONSTRING = azurerm_storage_account.import_service.primary_connection_string
    WEBSITE_CONTENTSHARE                     = azurerm_storage_share.import_service.name
  }

  # The app settings changes cause downtime on the Function App. e.g. with Azure Function App Slots
  # Therefore it is better to ignore those changes and manage app settings separately off the Terraform.
  lifecycle {
    ignore_changes = [
      app_settings,
      site_config["application_stack"],
      tags["hidden-link: /app-insights-instrumentation-key"],
      tags["hidden-link: /app-insights-resource-id"],
      tags["hidden-link: /app-insights-conn-string"]
    ]
  }
}