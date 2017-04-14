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
| &lt;DIRECTORY&gt; | The directory on the server. | `/site/wwwroot`  |
| &lt;NAME-OF-YOUR-SITE&gt; | The name of your site (lower case).  |  |
| &lt;PASSWORD&gt; | The password. |  |
| &lt;SUB-DOMAIN&gt; | The sub domain. | `waws-prod-sn1-053` |

## Resources

* [Azure Web Sites FTP credentials](https://weblogs.asp.net/bleroy/azure-web-sites-ftp-credentials)
