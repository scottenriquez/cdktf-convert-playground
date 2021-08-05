import * as aws from "./.gen/providers/aws";

import { Construct } from "constructs";
import { App, TerraformStack } from "cdktf";

class MyStack extends TerraformStack {
  constructor(scope: Construct, name: string) {
    super(scope, name);

    new aws.AwsProvider(this, "aws", {
      region: "us-east-1",
    });
    new aws.Instance(this, "ec2_instance", {
      ami: "ami-0c2b8ca1dad447f8a",
      instanceType: "t2.micro",
      tags: {
        name: "Server ${max(1, 2, 12)}",
      },
    });
  }
}

const app = new App();
new MyStack(app, "count-ec2-cdktf");
app.synth();
