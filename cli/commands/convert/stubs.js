import { join } from 'path';
import { readFileSync, mkdirSync, chmodSync } from 'fs';
import { writeFileSync } from './fs.js';

import { LambdaUpdateTask } from '../../../lib/tasks/update.js';

export function writeAllStubs(betty, { secrets, stages }) {
  writeTerraformScript(betty);
  writeMainStub(betty);
  writeMainVariables(betty, secrets);
  for (const stage of stages) {
    writeStageStub(betty, { stage, secrets });
  }
}

export function writeTerraformScript(betty) {
  const source = readFileSync(join(__dirname, 'tf.sh'));
  const destination = join(betty.context.cwd, 'tf.sh');
  writeFileSync(destination, source);
  chmodSync(destination, '755');
}

export function writeMainStub(betty) {
  writeFileSync(join(betty.context.cwd, 'main.tf'), `
terraform {
  required_version = ">= 0.12"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 3.18.0"
    }
  }
  backend "s3" {
    encrypt = true
  }
}

provider "aws" {
  region = "${betty.context.awsRegion}"
}
      `.trim() + '\n');
}

export function writeMainVariables(betty, secrets) {
  const params = LambdaUpdateTask.buildLambdaWriteParams(betty.resource, {
    account: betty.context.awsAccountId,
    region: betty.context.awsRegion,
    role: '__unused__',
  });
  let contents = '';
  contents += `
variable "awsAccountId" {
  description = "The AWS account ID to target"
}

variable "awsRegion" {
  description = "The AWS region to target"
}
  `.trim() + '\n\n';
  if (params.Environment) {
    const { Variables } = params.Environment;
    for (const key of Object.keys(Variables)) {
      const value = Variables[key];
      contents += `
variable "${key}" {
  description = "${secrets.indexOf(key) > -1 ? 'This variable should be encrypted' : ''}"
}
      `.trim() + '\n\n';
    }
  }
  writeFileSync(join(betty.context.cwd, 'variables.tf'), contents);
}

export function writeStageStub(betty, { stage, secrets }) {
  mkdirSync(join(betty.context.cwd, 'configs', stage), { recursive: true });
  writeStageBackend(betty, stage);
  writeStageVariables(betty, { stage, secrets });
}

export function writeStageBackend(betty, stage) {
  writeFileSync(join(betty.context.cwd, 'configs', stage, 'backend.config'), `
bucket  = "bucket_name"
key     = "${stage}/component/state.tfstate"
encrypt = true
region  = ""
    `.trim() + '\n');
}

export function writeStageVariables(betty, {
  stage,
  secrets,
}) {
  const params = LambdaUpdateTask.buildLambdaWriteParams(betty.resource, {
    account: betty.context.awsAccountId,
    region: betty.context.awsRegion,
    role: '__unused__',
  });
  let contents = '';
  contents += `
awsAccountId = "${betty.context.awsAccountId}"
awsRegion = "${betty.context.awsRegion}"
  `.trim() + '\n\n';
  if (params.Environment) {
    const { Variables } = params.Environment;
    for (const key of Object.keys(Variables)) {
      const value = secrets.indexOf(key) > -1 ? 'TODO: this value should be encrypted' : Variables[key];
      contents += `${key} = ${JSON.stringify(value)}\n`;
    }
  }
  writeFileSync(join(betty.context.cwd, 'configs', stage, 'variables.tfvars'), contents);
}
