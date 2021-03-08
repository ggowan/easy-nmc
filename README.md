# easy-nmc

## Introduction
Easy NMC is an application for collecting financial reports from parishes that was developed for the Greek Orthodox Metropolis of San Francisco. The production deployment of Easy NMC can be found at https://easy-nmc.appspot.com/. 

## Technical Overview
Easy NMC is written entirely in HTML & JavaScript. It uses [Firebase Realtime Database](https://firebase.google.com/products/database/) as its database & backend. It is deployed on App Engine as a Python application in the Standard Environment, even though it doesn't have a single line of Python code.

## Basic Development Guide
If you want to make changes to Easy NMC, you should first install the Google Cloud SDK for Python on App Engine following the instructions here: https://cloud.google.com/appengine/docs/standard/python/download. Then clone the `dev` branch of this repository to your computer. If you're looking for a good editor, try [Visual Studio Code](https://code.visualstudio.com/).

Once you've made your changes and want to try them out, you can start a local development appserver using this command:

``` bash
dev_appserver.py app.yaml
```

Point your webrowser at http://localhost:8080 to try out your changes.

## Release Process
After committing and pushing your changes on the dev branch you can deploy the application to the development site using this command:

``` bash
gcloud app deploy app.yaml
```

Sometimes you may get an error saying you have too many versions deployed. In that case you can clean up using commands like this:

``` bash
gcloud app versions list
gcloud app versions delete VERSIONS
```

The development deployment can be accessed at https://friendly-aurora-855.appspot.com/. It has a separate Firebase database from the production deployment so can be used to safely try out changes without affecting the data in the production deployment.

In order to merge your changes into the production branch, you need to checkout the `prod` branch in Git and merge changes from the `dev` branch into it. 

``` bash
git checkout prod
git merge dev
```

You can try out the app with the production data using the same command to start the dev server (`dev_appserver.py app.yaml`). 

Commit any changes that you've made to the prod branch, then push them to github.

Deploy to production using the same command as above but with the `--project` flag: 

``` bash
gcloud app deploy app.yaml --project=easy-nmc
```

Don't forget to checkout the `dev` branch again after you are done doing the deployment so you'll be ready to make and test your next change.

## Updating Development Tools
If a significant amount of time has gone by, you should update your dev tools.

1. Update Cloud SDK. Right click on Google Cloud SDK shortcut on desktop and choose Run As Administrator. Then execute `gcloud components update` inside that shell.

2. Update Visual Studio Code.

3. Update Git for Windows.

## Updating the Form for a New Year
This is a summary of the steps needed to update the form for a new year.

1. Create a new directory for the next year.
2. Copy all files from the current year to the next year.
3. Update app.yaml. For URLs that don't have the year in the URL itself, but refer to a file within a directory having a year, just increment the year of the directory. Most of these are at the top but one is at the very bottom. For URLs that actually have the year in the URL itself, you'll want to make a copy of the URL entry for the new year rather than changing the existing one. That way existing links continue to work.
4. Within the directory for next year, make the following changes:

    a. Do a find-and-replace-in-files of the current year with next year (**only** affecting files within next year's directory). Visual Studio Code has a convenient way of doing this if you right-click on next year's directory. This should hit a bunch of href paths containing the year as well as the shared.FOR_YEAR variable in shared.js.

    b. Update the "Changes Since Last Year" section in data-form.html with whatever changes have occurred.

5. There is a security rule that needs to be updated each year in Firebase.
To do that, go to the Firebase admin console located at console.firebase.google.com and look for a security rule 
**on both the production and staging versions** which says something like $year == '2018'. Change the year
to the next year. Do it on both at the same time so you don't forget to do production on rollout!

6. We can automatically copy a lot of data from the prior year. The way to do this is to follow this sequence:

    a. If you are changing any field names this year, you'll need to update the copying code to map from old
       to new field names.

    b. Make sure that your git is synced to the dev branch for testing.

    c. Run `dev_appserver.py app.yaml` from within the easy-nmc directory.

    d. Open a web browser pointed at http://localhost:8080/metropolis/SF/admin

    e. Click "Copy Last Year's Data" on the admin screen.  

    f. Once you are happy with how things copied on the dev instance, you can repeat the above on the prod
       branch.

   Copying data from last year is supposed to provide the following:

     * Contact info of priest, president, treasurer and preparer are copied over.     
     * The most recent year from last year's report is copied over as the first of two years being reported this
       year. If adjustments were made by the reviewer, the adjusted values are copied over. This is helpful even 
       if we aren't allowing people to change the values for the first year because they are available for
       inclusion in the spreadsheet export and can potentially be displayed in the UI for review.     
     * We can also display the adjustments that were made last year to give guidance on what to watch out for
       this year.

7. Make sure to test making an edit on production before sending out the form links to everybody! Test in an
incognito window.