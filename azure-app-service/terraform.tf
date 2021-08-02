terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "=2.46.0"
    }
  }
}

provider "azurerm" {
  features {}
}

resource "azurerm_resource_group" "cdktf_convert_rg" {
  name     = "cdktf-convert-resource-group"
  location = "Central US"
}

resource "azurerm_app_service_plan" "cdktf_convert_app_service_plan" {
  name                = "cdktf-convert-appserviceplan"
  location            = azurerm_resource_group.cdktf_convert_rg.location
  resource_group_name = azurerm_resource_group.cdktf_convert_rg.name

  sku {
    tier = "Free"
    size = "F1"
  }
}

resource "azurerm_app_service" "cdktf_convert_app_service" {
  name                = "cdktf-convert-app-service"
  location            = azurerm_resource_group.cdktf_convert_rg.location
  resource_group_name = azurerm_resource_group.cdktf_convert_rg.name
  app_service_plan_id = azurerm_app_service_plan.cdktf_convert_app_service_plan.id
}