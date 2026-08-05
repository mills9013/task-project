# Infrastructure Setup

This directory contains the AWS IAM policies required to set up OpenID Connect (OIDC) federation between GitHub Actions and AWS. This allows the CI/CD pipeline to push Docker images to Amazon ECR without needing long-lived access keys.

## Setup Instructions

### 1. Create the OIDC Identity Provider in AWS

1. Open the AWS IAM Console.
2. Go to **Identity providers** -> **Add provider**.
3. Select **OpenID Connect**.
4. Set the **Provider URL** to `https://token.actions.githubusercontent.com`.
5. Click **Get thumbprint**.
6. Set the **Audience** to `sts.amazonaws.com`.
7. Click **Add provider**.

### 2. Create the IAM Role (Custom Trust Policy)

1. Open the AWS IAM Console.
2. Go to **Roles** -> **Create role**.
3. Select **Custom trust policy** (Do not select Web identity, as the AWS UI sometimes fails to generate the required scoping).
4. Paste the JSON contents from `github-oidc-trust-policy.json` into the editor.
5. **IMPORTANT**: Replace `<YOUR_ACCOUNT_ID>` with your AWS Account ID (e.g., `123456789012`), and `<YOUR_GITHUB_ORG>` with your GitHub Username (`mills9013`).
6. Click **Next**.
7. Skip attaching policies for now and click **Next**.
8. Name the role `github-actions-task-project-role` and click **Create role**.

### 4. Attach the Permissions Policy

1. Still on the role page, go to the **Permissions** tab.
2. Click **Add permissions** -> **Create inline policy**.
3. Go to the **JSON** tab and paste the contents of `iam-policy.json`.
4. **IMPORTANT**: Replace `<YOUR_REGION>` and `<YOUR_ACCOUNT_ID>` with the correct values for your ECR repository.
5. Click **Next**.
6. Name the policy `ECRPushPullPolicy` and click **Create policy**.

### 5. Configure GitHub Repository Variables

In your GitHub repository, go to **Settings** -> **Secrets and variables** -> **Actions** -> **Variables**, and add:

- `AWS_ACCOUNT_ID`: Your AWS Account ID.
- `AWS_REGION`: The AWS region where your ECR repository is located (e.g., `us-east-1`).
- `ECR_REPOSITORY`: The name of your ECR repository (e.g., `task-project`).
