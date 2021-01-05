import { dirname } from 'path';

import { documentFromAssets } from '../../../lib/aws/policies.js';
import { LambdaUpdateTask } from '../../../lib/tasks/update.js';

const SPACE = String.fromCharCode(32);
const INDENT = SPACE + SPACE;

export const roleResourceName = 'role';
export const basePolicyResourceName = 'base';
export const resourcePolicyResourceNamePrefix = 'resource_';
export const assetsPolicyResourceName = 'assets';

export const hasAssets = ({ data }) =>
  Array.isArray(data.assets) && data.assets.length > 0;

export function renderAllTemplates(betty, { secrets }) {
  return [
    buildScript(betty),
    awsIamRole(betty),
    awsLambdaFunction(betty, { secrets }),
    awsIamRolePolicyAttachments(betty),
  ].join('\n\n');
}

export function buildScript(betty) {
  return `
resource "null_resource" "build" {
  provisioner "local-exec" {
    working_dir = path.root
    command = "npm run build"
  }
}`.trim();
}


export function awsIamRole(betty) {
  return `
resource "aws_iam_role" "${roleResourceName}" {
  name = "${betty.resource.name}"
  assume_role_policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Action": "sts:AssumeRole",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Effect": "Allow",
      "Sid": ""
    }
  ]
}
EOF
}`.trim();
}

export function awsLambdaFunction(betty, {
  secrets,
}) {
  let secretDecryption = '';
  for (const secret of secrets) {
    secretDecryption += `
data "external" "secret_${secret}" {
  working_dir = path.root
  program = [
    "npm",
    "run",
    "--silent",
    "decrypt",
    base64encode(var.${secret}),
  ]
}
    `.trim() + '\n';
  }
  // TODO: also depends_on resource policy attachments: const resourceDeps = Object.keys(betty.resource.data.resources || {}); -> resource_${dep}
  const dependsOn = [
    `aws_iam_role_policy_attachment.${basePolicyResourceName}`,
  ];
  const resourceDeps = Object.keys(betty.resource.data.resources || {});
  for (const dep of resourceDeps) {
    dependsOn.push(`aws_iam_role_policy_attachment.${resourcePolicyResourceNamePrefix + dep}`);
  }
  if (hasAssets(betty.resource)) {
    dependsOn.push(`aws_iam_role_policy.${assetsPolicyResourceName}`);
  }
  const params = LambdaUpdateTask.buildLambdaWriteParams(betty.resource, {
    account: betty.context.awsAccountId,
    region: betty.context.awsRegion,
    role: '__unused_and_deleted_below__',
  });
  delete params.Role;
  params.DeadLetterConfig && console.error('DeadLetterConfig is not currently supported and will not be included in result', JSON.stringify(params.DeadLetterConfig, null, 2));
  params.VpcConfig && console.error('VpcConfig is not currently supported and will not be included in result', JSON.stringify(params.VpcConfig, null, 2));
  params.TracingConfig && console.error('TracingConfig is not currently supported and will not be included in result', JSON.stringify(params.TracingConfig, null, 2));
  let envVariablesSource = '';
  if (params.Environment) {
    const { Variables } = params.Environment;
    for (const key of Object.keys(Variables)) {
      const value = secrets.indexOf(key) > -1 ? `data.external.secret_${key}.result["value"]` : `var.${key}`;
      envVariablesSource += `\t\t\t${key} = ${value}\n`;
    }
  }
  return `
${secretDecryption}

data "archive_file" "dist" {
  type = "zip"
  source_dir = "${dirname(betty.context.configuration.main)}"
  output_path = "bundle.zip"
  depends_on = [
    null_resource.build
  ]
}

resource "aws_lambda_function" "function" {
  filename = data.archive_file.dist.output_path
  function_name = "${betty.resource.name}"
  description = "${params.Description}"
  handler = "${params.Handler}"
  memory_size = "${params.MemorySize}"
  role = aws_iam_role.${roleResourceName}.arn
  runtime = "${params.Runtime}"
  timeout = "${params.Timeout}"

  publish = true

  source_code_hash = data.archive_file.dist.output_base64sha256

  depends_on = ${JSON.stringify(dependsOn, null, 2).split('"').join('')}

  environment {
    variables = {
      ${envVariablesSource.split('\t').join(INDENT).trim()}
    }
  }
}`.trim();
}

export function awsIamRolePolicyAttachments(betty) {
  let result = '';
  // attach base policy to lambda exec role
  result += `
resource "aws_iam_role_policy_attachment" "${basePolicyResourceName}" {
  role       = aws_iam_role.${roleResourceName}.name
  policy_arn = "arn:aws:iam::\${var.awsAccountId}:policy/${betty.context.awsLambdaRole}"
}`.trim();
  // attach resource policies
  const resourceDeps = Object.keys(betty.resource.data.resources || {});
  for (const dep of resourceDeps) {
    result += '\n';
    result += `
resource "aws_iam_role_policy_attachment" "${resourcePolicyResourceNamePrefix + dep}" {
  role       = aws_iam_role.${roleResourceName}.name
  policy_arn = "arn:aws:iam::\${var.awsAccountId}:policy/resource/${dep}"
}`.trim();
  }
  // attach inline policies
  if (hasAssets(betty.resource)) {
    const policyDocument = documentFromAssets(betty.resource.data.assets, betty.resource.regions);
    result += '\n';
    result += `
resource "aws_iam_role_policy" "${assetsPolicyResourceName}" {
  name = "combined-assets"
  role = aws_iam_role.${roleResourceName}.id

  policy = <<-EOF
${JSON.stringify(policyDocument, null, 2)}
  EOF
}
`.trim();
    }
  return result;
}

// Doing this requires the current policy be deleted since importing
// to terraform is a difficult process.  This feature never really
// panned out anyway, so just deprecating it and not supporting it for
// conversion.  Projects should migrate resources to assets.

// // This is a separate policy document that is created for each
// // resource that is attached (as a managed policy) to a downstream
// // service if part of resource.json -> resources: {}
// export function awsIamPolicy(betty) {
//   if (!Array.isArray(betty.resource.data.policy) || betty.resource.data.policy.length > 1) {
//     console.error('resource.policy that contain more than invoke function are not supported and will not be included in rendered output', JSON.stringify(betty.resource.data.policy, null, 2));
//   }
//   return `
// resource "aws_iam_policy" "usage" {
//   name        = "${betty.resource.name}"
//   path        = "/resource/"
//   description = "Allows downstream resources to invoke ${betty.resource.name}. Generated by betty (terraform)."
//   policy = <<EOF
// {
//   "Version": "2012-10-17",
//   "Statement": [
//     {
//       "Action": [ "lambda:InvokeFunction" ],
//       "Resource": "arn:aws:lambda:*:*:function:${betty.resource.name}",
//       "Effect": "Allow"
//     }
//   ]
// }
// EOF
// }`.trim();
// }
