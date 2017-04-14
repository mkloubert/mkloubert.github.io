# Azure FTP

## settings.json

```json
{
    "deploy": {
        "targets": [
            {
                "type": "ftp",

                "name": "My FTP on Azure",

                "host": "<SUB-DOMAIN>.ftp.azurewebsites.windows.net",

                "user": "<NAME-OF-YOUR-SITE>\\$<NAME-OF-YOUR-SITE>",
                "password": "<PASSWORD>",

                "dir": "<DIRECTORY>"
            }
        ]
    }
}
```

### Tags

| Name | Description | Example |
| ---- | ---- | ---- |
| <DIRECTORY> | The directory on the server. | `/site/wwwroot`  |
| <NAME-OF-YOUR-SITE> | The name of your site (lower case).  |  |
| <PASSWORD> | The password. |  |
| <SUB-DOMAIN> | The sub domain. | `waws-prod-sn1-053` |

## Resources

* [Azure Web Sites FTP credentials](https://weblogs.asp.net/bleroy/azure-web-sites-ftp-credentials)
