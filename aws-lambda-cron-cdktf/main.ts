import * as cdktf from "cdktf";
import * as aws from "./.gen/providers/aws";
import { AwsProvider } from './.gen/providers/aws'

import { Construct } from "constructs";
import { App, TerraformStack } from "cdktf";

class MyStack extends TerraformStack {
  constructor(scope: Construct, name: string) {
    super(scope, name);

    new AwsProvider(this, 'aws', {
      region: 'us-east-1'
    });

    const commentPrefix = new cdktf.TerraformVariable(this, "comment_prefix", {
      default: "Lambda Cronjob: ",
      description:
        "This will be included in comments for resources that are created",
    });
    const cronjobName = new cdktf.TerraformVariable(this, "cronjob_name", {
      default: "cronjob",
      description:
        'Name which will be used to create your Lambda function (e.g. `"my-important-cronjob"`)',
    });
    // const functionEnvVars = new cdktf.TerraformVariable(
    //   this,
    //   "function_env_vars",
    //   {
    //     default: "[{awsLambdaCronjob: \"\",},]",
    //     description: "Which env vars (if any) to invoke the Lambda with",
    //   }
    // );
    const functionHandler = new cdktf.TerraformVariable(
      this,
      "function_handler",
      {
        default: "index.handler",
        description:
          "Instructs Lambda on which function to invoke within the ZIP file",
      }
    );
    const functionRuntime = new cdktf.TerraformVariable(
      this,
      "function_runtime",
      {
        default: "nodejs12.x",
        description:
          "Which node.js version should Lambda use for this function",
      }
    );
    const functionS3Bucket = new cdktf.TerraformVariable(
      this,
      "function_s3_bucket",
      {
        default: "cdktfs3testingconvert",
        description:
          "When provided, the zipfile is retrieved from an S3 bucket by this name instead (filename is still provided via `function_zipfile`)",
      }
    );
    const functionTimeout = new cdktf.TerraformVariable(
      this,
      "function_timeout",
      {
        default: 3,
        description:
          "The amount of time your Lambda Function has to run in seconds",
      }
    );
    const functionZipfile = new cdktf.TerraformVariable(
      this,
      "function_zipfile",
      {
        default: "build.zip",
        description:
          'Path to a ZIP file that will be installed as the Lambda function (e.g. `"my-cronjob.zip"`)',
      }
    );
    const lambdaLoggingEnabled = new cdktf.TerraformVariable(
      this,
      "lambda_logging_enabled",
      {
        default: false,
        description:
          "When true, writes any console output to the Lambda function's CloudWatch group",
      }
    );
    const memorySize = new cdktf.TerraformVariable(this, "memory_size", {
      default: 128,
      description:
        "Amount of memory in MB your Lambda Function can use at runtime",
    });
    const namePrefix = new cdktf.TerraformVariable(this, "name_prefix", {
      default: "aws-lambda-cronjob---",
      description:
        "Name prefix to use for objects that need to be created (only lowercase alphanumeric characters and hyphens allowed, for S3 bucket name compatibility)",
    });
    const scheduleExpression = new cdktf.TerraformVariable(
      this,
      "schedule_expression",
      {
        default: "rate(60 minutes)",
        description:
          'How often to run the Lambda (see https://docs.aws.amazon.com/AmazonCloudWatch/latest/events/ScheduledEvents.html); e.g. `"rate(15 minutes)"` or `"cron(0 12 * * ? *)"`',
      }
    );
    const prefixWithName = `${namePrefix.value}-${cronjobName.value}`;
    const awsCloudwatchEventRuleThis = new aws.CloudwatchEventRule(
      this,
      "this",
      {
        name: `${prefixWithName}---scheduled-invocation`,
        scheduleExpression: scheduleExpression.value
      }
    );
    const awsIamPolicyThis = new aws.IamPolicy(this, "this_14", {
      name: prefixWithName,
      policy:
        '{\n  "Version": "2012-10-17",\n  "Statement": [\n    {\n      "Action": [\n        "logs:CreateLogGroup",\n        "logs:CreateLogStream",\n        "logs:PutLogEvents"\n      ],\n      "Resource": "arn:aws:logs:*:*:*",\n      "Effect": "Allow"\n    }\n  ]\n}\n',
    });

    /*In most cases loops should be handled in the programming language context and 
not inside of the Terraform context. If you are looping over something external, e.g. a variable or a file input
you should consider using a for loop. If you are looping over something only known to Terraform, e.g. a result of a data source
you need to keep this like it is.*/
    const awsIamRoleThis = new aws.IamRole(this, "this_15", {
      assumeRolePolicy:
        '{\n  "Version": "2012-10-17",\n  "Statement": [\n    {\n      "Effect": "Allow",\n      "Principal": {\n        "Service": [\n          "lambda.amazonaws.com"\n        ]\n      },\n      "Action": "sts:AssumeRole"\n    }\n  ]\n}\n',
      name: prefixWithName
    });
    const awsIamRolePolicyAttachmentThis = new aws.IamRolePolicyAttachment(
      this,
      "this_16",
      {
        policyArn: `${awsIamPolicyThis.arn}`,
        role: awsIamRoleThis.name,
      }
    );

    /*In most cases loops should be handled in the programming language context and 
not inside of the Terraform context. If you are looping over something external, e.g. a variable or a file input
you should consider using a for loop. If you are looping over something only known to Terraform, e.g. a result of a data source
you need to keep this like it is.*/
    awsIamRolePolicyAttachmentThis.addOverride(
      "count",
      `${lambdaLoggingEnabled.value ? 1 : 0}`
    );
    const awsLambdaFunctionLocalZipfile = new aws.LambdaFunction(
      this,
      "local_zipfile",
      {
        description: `${commentPrefix.value}-${cronjobName.value}`,
        // environment: [
        //   {
        //     variables: functionEnvVars.value,
        //   },
        // ],
        filename: functionZipfile.value,
        functionName: prefixWithName,
        handler: functionHandler.value,
        memorySize: memorySize.value,
        role: awsIamRoleThis.arn,
        runtime: functionRuntime.value,
        timeout: functionTimeout.value,
      }
    );

    /*In most cases loops should be handled in the programming language context and 
not inside of the Terraform context. If you are looping over something external, e.g. a variable or a file input
you should consider using a for loop. If you are looping over something only known to Terraform, e.g. a result of a data source
you need to keep this like it is.*/
    awsLambdaFunctionLocalZipfile.addOverride(
      "count",
      `${functionS3Bucket.value == "" ? 1 : 0}`
    );
    const awsLambdaFunctionS3Zipfile = new aws.LambdaFunction(
      this,
      "s3_zipfile",
      {
        description: `${commentPrefix.value}-${cronjobName.value}`,
        // environment: [
        //   {
        //     variables: functionEnvVars.value,
        //   },
        // ],
        functionName: prefixWithName,
        handler: functionHandler.value,
        memorySize: memorySize.value,
        role: awsIamRoleThis.arn,
        runtime: functionRuntime.value,
        s3Bucket: functionS3Bucket.value,
        s3Key: functionZipfile.value,
        timeout: functionTimeout.value,
      }
    );

    /*In most cases loops should be handled in the programming language context and 
not inside of the Terraform context. If you are looping over something external, e.g. a variable or a file input
you should consider using a for loop. If you are looping over something only known to Terraform, e.g. a result of a data source
you need to keep this like it is.*/
    awsLambdaFunctionS3Zipfile.addOverride(
      "count",
      `${functionS3Bucket.value == "" ? 0 : 1}`
    );
    const functionArn = `\${element(concat(${awsLambdaFunctionLocalZipfile.fqn}.*.arn, [""]), 0)}\${element(concat(${awsLambdaFunctionS3Zipfile.fqn}.*.arn, [""]), 0)}`;
    const functionId = `\${element(concat(${awsLambdaFunctionLocalZipfile.fqn}.*.id, [""]), 0)}\${element(concat(${awsLambdaFunctionS3Zipfile.fqn}.*.id, [""]), 0)}`;
    new cdktf.TerraformOutput(this, "function_name", {
      value: functionId,
      description:
        "This is the unique name of the Lambda function that was created",
    });
    new aws.CloudwatchEventTarget(this, "this_20", {
      arn: functionArn,
      rule: awsCloudwatchEventRuleThis.name,
      targetId: awsCloudwatchEventRuleThis.name,
    });
    new aws.LambdaPermission(this, "this_21", {
      action: "lambda:InvokeFunction",
      functionName: functionId,
      principal: "events.amazonaws.com",
      sourceArn: awsCloudwatchEventRuleThis.arn,
      statementId: `${prefixWithName}---scheduled-invocation`,
    });
  }
}

const app = new App();
new MyStack(app, "aws-lambda-cron-cdktf");
app.synth();
