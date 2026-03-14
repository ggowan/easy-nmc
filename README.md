# easy-nmc

## Introduction
Easy NMC is an application for collecting financial reports from parishes that was developed for the Greek Orthodox Metropolis of San Francisco. The production deployment of Easy NMC can be found at https://easy-nmc.web.app/, and the dev site is https://easy-nmc-dev.web.app/

## Technical Overview
Easy NMC is written entirely in HTML & JavaScript. It uses [Firebase Realtime Database](https://firebase.google.com/products/database/) as its database & backend. It is deployed using Firebase Hosting.

## Basic Development Guide
I used [Project IDX](https://idx.dev/) as my IDE for working on this project, though Visual Studio Code or pretty much any other IDE that integrates with Github would work fine. All development should be done in the `firebase-dev` branch. When changes are pushed to this branch, the changes will automatically be pushed by Github to the dev site a minute or two later. All testing is done manually on the dev site. It's recommended to test in a Guest profile in Chrome to make sure unauthenticated users can access the data form using the access key.

## Release Process
Once you have tested your changes on the dev site and you want to release them to prod, merge your changes into the `firebase-prod` branch and push them. They will be pushed automatically to the production site a minute or two later. Make sure to refresh your browser and verify your changes are working in production as expected.

Don't forget to change back to the `firebase-dev` branch before you make further changes.

## Updating the Form for a New Year
This is a summary of the steps needed to update the form for a new year.

1. Create a new directory for the next year.
2. Copy all files from the current year to the next year.
3. Update firebase.json. For rewrites that don't have the year in the request path itself, but refer to a file within a directory having a year, just increment the year of the directory. Most of these are at the top but one is at the very bottom. For request paths that contain the year, you'll want to make a copy of the rewrite for the new year rather than changing the existing one. That way existing links continue to work.
4. Within the directory for next year, make the following changes:

    a. Do a find-and-replace-in-files of the current year with next year (**only** affecting files within next year's directory). Visual Studio Code has a convenient way of doing this if you right-click on next year's directory. This should hit a bunch of href paths containing the year as well as the shared.FOR_YEAR variable in shared.js.

    b. Update the "Changes Since Last Year" section in data-form.html with whatever changes have occurred.

5. Update the security rules in the database.rules.json file by finding and replacing the current year with the next year.
Then you can manually deploy them by going to the Firebase admin console located at console.firebase.google.com, clicking into the realtime database component, changing to the Rules tab,
then copy-pasting the entire file to replace all of the rules. Then click the Publish button. This will allow the data for next year to be written to and prevent writes to older data.
Do this for both "Easy NMC Dev" and "Easy NMC Prod" projects at the same time so you don't forget to do production on rollout!

6. We can automatically copy a lot of data from the prior year. The way to do this is to follow this sequence:

    a. Make sure you are on the dev branch!

    b. If you are changing any field names this year, you'll need to update the copying code to map from old
       to new field names.

    c. Submit your changes and wait for them to be pushed to the dev site.

    d. Open a web browser pointed at https://easy-nmc-dev.web.app/metropolis/SF/admin.
       Refresh your browser to make sure you got the latest changes.

    e. Click "Copy Last Year's Data" on the admin screen.  

    f. Once you are happy with how things copied on the dev instance, you can merge your changes into the prod
       branch, push them, open the prod admin page at https://easy-nmc.web.app/metropolis/SF/admin and click 
       the same button there.

   Copying data from last year is supposed to provide the following:

     * Contact info of priest, president, treasurer and preparer are copied over.     
     * The most recent year from last year's report is copied over as the first of two years being reported this
       year. If adjustments were made by the reviewer, the adjusted values are copied over. This is helpful even 
       if we aren't allowing people to change the values for the first year because they are available for
       inclusion in the spreadsheet export and can potentially be displayed in the UI for review.     
     * We can also display the adjustments that were made last year to give guidance on what to watch out for
       this year.

7. Make sure to test making an edit on production before sending out the form links to everybody! Test in a guest
   profile tab in Chrome.
