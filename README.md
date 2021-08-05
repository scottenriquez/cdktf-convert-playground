I previously wrote [a blog post](https://scottie.is/writing/cdktf-alpha-csharp-infrastructure/) about getting started with Terraform for CDK and the benefits. At that time, the latest version was 0.3. Last week, [version 0.5](https://github.com/hashicorp/terraform-cdk/releases/tag/v0.5.0) was released. In this version, some new experimental features could make adopting CDK for Terraform exponentially easier.

## The Convert Command
The CLI command takes in a Terraform file and converts it to the language specified.

```shell
cat terraform.tf | cdktf convert --language csharp
```

I started with a single `terraform.tf` file that creates an Azure App Service.

```hcl
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
```

The command creates a C# snippet.

```csharp
using Gen.Providers.Azurerm;

new AzurermProvider(this, "azurerm", new Struct {
    Features = new [] { new Struct { } }
});

var azurermResourceGroupCdktfConvertRg = new ResourceGroup(this, "cdktf_convert_rg", new Struct {
    Location = "Central US",
    Name = "cdktf-convert-resource-group"
});

var azurermAppServicePlanCdktfConvertAppServicePlan =
new AppServicePlan(this, "cdktf_convert_app_service_plan", new Struct {
    Location = azurermResourceGroupCdktfConvertRg.Location,
    Name = "cdktf-convert-appserviceplan",
    ResourceGroupName = azurermResourceGroupCdktfConvertRg.Name,
    Sku = new [] { new Struct {
        Size = "F1",
        Tier = "Free"
    } }
});

new AppService(this, "cdktf_convert_app_service", new Struct {
    AppServicePlanId = azurermAppServicePlanCdktfConvertAppServicePlan.Id,
    Location = azurermResourceGroupCdktfConvertRg.Location,
    Name = "cdktf-convert-app-service",
    ResourceGroupName = azurermResourceGroupCdktfConvertRg.Name
});
```

While this alone is extremely powerful, the C# code cannot be executed until the provider objects (i.e., `Gen.Providers.Azurerm` from the `using` statement) are generated with `cdktf get`. I see the use case for this command being translation of individual files for migration into an existing CDK for Terraform project. The `--language` flag currently supports all languages that CDK does. Instead, the option to generate an entire project from a folder seems much more helpful for converting entire solutions.

## Initializing from an Existing Terraform Project
Rather than converting a single file, the `init` command has been updated to support creating from an existing project. At the time of writing, only TypeScript is supported.

```shell
cdktf init --from-terraform-project terraform-project-folder --template typescript
```

I tested against [a Terraform example on GitHub from Futurice](https://github.com/futurice/terraform-examples/tree/master/aws/aws_lambda_cronjob) that creates a scheduled Lambda function. I forked and [updated the template](https://github.com/scottenriquez/cdktf-convert-playground/tree/main/aws-lambda-cron) to work with Terraform version 1.0.3. The HCL is split across multiple files (i.e., main, variables, outputs, and permissions). I also created a Lambda function via the SAM CLI and built a ZIP artifact. The updated `init` command was smart enough to merge all of the `.tf` files into a single stack. However, the command does not migrate folders and assets outside of Terraform (i.e., my Lambda code, SAM folders, etc.). For now, these will need to be copied manually. Find the full output project [here](https://github.com/scottenriquez/cdktf-convert-playground/tree/main/aws-lambda-cron-cdktf).

## Notes About Conversion 

### Interacting with the Provider
I did not specify the region in the source HCL `provider` like so:

```hcl
provider "aws" {
  region = "us-east-1"
}
```

To modify the provider settings, instantiate a provider object. The `convert` method will translate this, but it was not apparent to me how to code this manually.

```typescript
new AwsProvider(this, 'aws', {
    region: 'us-east-1'
});
```

### Counts
At the time of writing, the `count` meta-argument does not work consistently yet. I've opened up [an issue on GitHub](https://github.com/hashicorp/terraform-cdk/issues/889) accordingly. The following HCL throws an error when converting:

```hcl
resource "aws_instance" "multiple_server" {
  count = 4
  ami = "ami-0c2b8ca1dad447f8a"
  instance_type = "t2.micro"
  tags = {
    Name = "Server ${count.index}"
  }
}
```

I'm not sure if the intent is that this will be translated into a for loop or if the `count` meta-argument will just be modified. In any case, this can easily be rewritten using the general-purpose language in a much cleaner way (i.e., a loop).

I've seen a common pattern in Terraform templates that uses the `count` attribute to create resources conditionally. In the snippet below, a Lambda function resource is created based on whether or not an S3 bucket name is specified.

```hcl
resource "aws_lambda_function" "local_zipfile" {
    count = var.function_s3_bucket == "" ? 1 : 0
    filename = var.function_zipfile
}
```

This pattern does not convert directly because in CDK for Terraform, `count` is set via [an escape hatch](https://github.com/hashicorp/terraform-cdk/blob/main/docs/working-with-cdk-for-terraform/escape-hatch.md) using the `addOverride` method. The underlying Terraform configuration will be modified, but there is not a way to access individual constructs in the list of constructs in the code. However, this is another opportunity to leverage the benefits of using a general-purpose language by using conditionals, lists, for loops, etc.

### Built-In Functions
Terraform built-in functions are converted and supported by CDK for Terraform. Below is a simple example using the `max()` function in the instance's tag:

```hcl
resource "aws_instance" "ec2_instance" {
  ami = "ami-0c2b8ca1dad447f8a"
  instance_type = "t2.micro"
  tags = {
    Name = "Server ${max(1, 2, 12)}"
  }
}
```

This converts to the following TypeScript:
```typescript
new aws.Instance(this, "ec2_instance", {
    ami: "ami-0c2b8ca1dad447f8a", 
    instanceType: "t2.micro", 
    tags: {
        name: "Server ${max(1, 2, 12)}",
    },
});
```

The string containing the built-in function is preserved in the `cdk.tf.json` build artifact file and evaluated accordingly. As best practices form, I'm curious how often built-in functions will be used versus their corresponding equivalents in the general-purpose language. While this is useful for easily converting templates with built-in functions, I would argue that there are many benefits to rewriting this logic in TypeScript (i.e., unit testing, readability, etc.).
