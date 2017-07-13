# easy-nmc

## Introduction
Easy NMC is an application for collecting financial reports from parishes that was developed for the Greek Orthodox Metropolis of San Francisco. The production deployment of Easy NMC can be found at https://easy-nmc.appspot.com/. 

## Developer Info
Easy NMC is written entirely in HTML & JavaScript. It uses [Firebase Realtime Database](https://firebase.google.com/products/database/) as its database/backend. It is deployed on AppEngine as a Python application in the Standard Environment, even though it doesn't have a single line of Python code.

If you want to make changes to Easy NMC, you should first install the Google Cloud SDK for Python on AppEngine following the instructions here: https://cloud.google.com/appengine/docs/standard/python/download. Then clone the `dev` branch of this repository to your computer. If you're looking for a good editor, try [Visual Studio Code](https://code.visualstudio.com/).

Once you've made your changes and want to try them out, you can start the a local development appserver using this command:

```
dev_appserver.py app.yaml
```

Point your webrowser at http://localhost:8080 to try out your changes.

After committing and pushing your changes you can deploy the application to the development site using this command:

```
gcloud app deploy app.yaml
```
