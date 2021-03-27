#!/bin/bash
dbSecret=$(aws secretsmanager get-secret-value --secret-id grafanaDB --query SecretString --output text --region us-east-1 | jq -r .password)
echo  $dbSecret;

aws ssm put-parameter --name /grafana/GF_DATABASE_PASSWORD --value $dbSecret --type SecureString --overwrite $true --region us-east-1

exit 0
