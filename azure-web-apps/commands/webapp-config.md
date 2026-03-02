---
name: webapp-config
description: Manage app settings, connection strings, and custom domains
argument-hint: "<app-name> [settings|domain|tls]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - AskUserQuestion
---

# Web App Configuration

Manage application settings, connection strings, custom domains, and TLS.

## App Settings

```bash
az webapp config appsettings set --name <app-name> --resource-group <rg> \
  --settings KEY1=value1 KEY2=value2
```

### Key Vault References

Instead of storing secrets directly:
```bash
az webapp config appsettings set --name <app-name> --resource-group <rg> \
  --settings "DB_CONNECTION=@Microsoft.KeyVault(VaultName=myvault;SecretName=db-conn-string)"
```

## Custom Domain

```bash
az webapp config hostname add --webapp-name <app-name> --resource-group <rg> --hostname www.contoso.com
```

## TLS Certificate

```bash
az webapp config ssl bind --name <app-name> --resource-group <rg> \
  --certificate-thumbprint <thumbprint> --ssl-type SNI
```

## Output Summary

Display current configuration, custom domains, and TLS status.
