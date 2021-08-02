import * as azurerm from "./.gen/providers/azurerm";

import { Construct } from "constructs";
import { App, TerraformStack } from "cdktf";

class MyStack extends TerraformStack {
  constructor(scope: Construct, name: string) {
    super(scope, name);

    new azurerm.AzurermProvider(this, "azurerm", {
      features: [{}],
    });
    const azurermResourceGroupCdktfConvertRg = new azurerm.ResourceGroup(
      this,
      "cdktf_convert_rg",
      {
        location: "Central US",
        name: "cdktf-convert-resource-group",
      }
    );
    const azurermAppServicePlanCdktfConvertAppServicePlan =
      new azurerm.AppServicePlan(this, "cdktf_convert_app_service_plan", {
        location: azurermResourceGroupCdktfConvertRg.location,
        name: "cdktf-convert-appserviceplan",
        resourceGroupName: azurermResourceGroupCdktfConvertRg.name,
        sku: [
          {
            size: "F1",
            tier: "Free",
          },
        ],
      });
    new azurerm.AppService(this, "cdktf_convert_app_service", {
      appServicePlanId: azurermAppServicePlanCdktfConvertAppServicePlan.id,
      location: azurermResourceGroupCdktfConvertRg.location,
      name: "cdktf-convert-app-service",
      resourceGroupName: azurermResourceGroupCdktfConvertRg.name,
    });
  }
}

const app = new App();
new MyStack(app, "azure-app-service-cdktf");
app.synth();
