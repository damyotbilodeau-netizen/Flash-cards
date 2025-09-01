# Flashcard App Deployment Guide

Hello! This guide will walk you through the process of setting up your new flashcard application. Please follow these steps carefully. Since you have no coding experience, I've made them as detailed as possible!

## Part 1: Set Up Your Google Sheet

This is where all your questions, answers, and progress will be stored.

### 1.1. Create the Google Sheet
1.  Go to [sheets.new](https://sheets.new) to create a new, blank Google Sheet.
2.  Rename the spreadsheet to something you'll remember, like "Flashcard App Data".
3.  **Important:** Find and copy the **Spreadsheet ID** from the URL in your browser's address bar. It's the long string of letters and numbers between `.../d/` and `/edit...`.
    *   Example: In `https://docs.google.com/spreadsheets/d/1g4pzxRrOVTfiCABXCsqRyp6Alm-Ia-Q7gRE-7zX3Ydk/edit#gid=0`, the ID is `1g4pzxRrOVTfiCABXCsqRyp6Alm-Ia-Q7gRE-7zX3Ydk`.
    *   Keep this ID handy. You'll need it soon.

### 1.2. Create the "Flash-cards" Sheet
1.  The first sheet (tab at the bottom) is already created. Rename it from "Sheet1" to **`Flash-cards`**.
2.  In the first row of this sheet, create the following column headers **exactly** as they appear below:
    *   `Question`
    *   `Reponse`
    *   `Commentaires`
    *   `Date réponse difficile`
    *   `Date bonne réponse Moyen`
    *   `Date bonne réponse Facile`
    *   `Date prochaine répétition`
    *   `Nombre de réponses`
3.  You can now add your questions and answers in the `Question` and `Reponse` columns. Leave the other columns blank; the script will manage them automatically.

### 1.3. Create the "Utilisateurs" (Users) Sheet
1.  Click the `+` icon at the bottom left to add a new sheet.
2.  Rename this new sheet to **`Utilisateurs`**.
3.  In the first row, create the following headers:
    *   `Prénom`
    *   `Courriel`
    *   `Avis activés`
4.  Add your information here. For example:
    *   In the `Prénom` column: Your first name.
    *   In the `Courriel` column: Your email address.
    *   In the `Avis activés` column: Type **`Oui`** to enable daily email reminders.

### 1.4. Publish the "Flash-cards" Sheet to the Web
The web app needs a way to read your questions. Publishing the `Flash-cards` sheet as a CSV file is the easiest way to do this.
1.  In your Google Sheet, make sure you have the `Flash-cards` sheet selected.
2.  Go to the menu: `File` -> `Share` -> `Publish to web`.
3.  In the dialog box:
    *   Under `Link`, select the **`Flash-cards`** sheet.
    *   In the dropdown on the right, select **`Comma-separated values (.csv)`**.
4.  Click the **`Publish`** button.
5.  A box will appear with a URL. **Copy this URL.** This is your `QUIZ_SHEET_CSV_URL`. Keep it handy.

## Part 2: Set Up the Google Apps Script

This script is the "brain" of your application.

### 2.1. Create the Script
1.  In your Google Sheet, go to `Extensions` -> `Apps Script`.
2.  A new browser tab will open with the Apps Script editor.
3.  Delete any placeholder code in the `Code.gs` file.
4.  Copy the entire contents of the `google-apps-script/Code.gs` file from this project and paste it into the `Code.gs` file in the editor.
5.  **Update the Spreadsheet ID:** In the `Code.gs` file, find the line `const SPREADSHEET_ID = '...'` and replace the placeholder ID with the **Spreadsheet ID** you copied in step 1.1.
6.  **Create the Email Template:**
    *   In the Apps Script editor, click the `+` icon next to `Files`.
    *   Select `HTML`.
    *   Name the file **`EmailTemplate`** (without the `.html` extension) and press Enter.
    *   Delete any placeholder code.
    *   Copy the entire contents of `google-apps-script/EmailTemplate.html` from this project and paste it into the `EmailTemplate.html` file in the editor.
7.  Click the "Save project" icon (looks like a floppy disk).

### 2.2. Deploy the Script
1.  At the top right of the Apps Script editor, click the **`Deploy`** button and select **`New deployment`**.
2.  Click the gear icon next to "Select type" and choose **`Web app`**.
3.  In the `Configuration` section:
    *   **Description:** Give it a name, like "Flashcard App v1".
    *   **Execute as:** `Me (your@email.com)`.
    *   **Who has access:** **`Anyone`**. This is very important for the app to work.
4.  Click **`Deploy`**.
5.  Google will ask you to authorize the script. Click **`Authorize access`**, choose your Google account, and click **`Allow`** (you may need to click "Advanced" and "Go to ... (unsafe)").
6.  After a moment, a `Deployment successfully updated` box will appear. **Copy the Web app URL.** This is your `SCRIPT_URL`.

## Part 3: Deploy the Frontend to Firebase

This is the final step! We will publish the web application to the internet using Firebase, which is free and reliable.

### 3.1. Download the Code
First, you need to download all the application code from this repository. Look for a "Code" button, click it, and select "Download ZIP". Unzip the file on your computer.

### 3.2. Install Required Tools
You only need to do this once. If you've ever done web development before, you may already have these.
1.  **Install Node.js:** Go to the [official Node.js website](https://nodejs.org/) and download the "LTS" version. Run the installer and accept the default options.
2.  **Open a Terminal (Command Prompt):**
    *   **Windows:** Press the Windows key, type `cmd`, and press Enter.
    *   **Mac:** Open the Spotlight search (Cmd+Space), type `Terminal`, and press Enter.
3.  **Install Firebase Tools:** In the terminal window you just opened, type the following command and press Enter:
    ```bash
    npm install -g firebase-tools
    ```
    Wait for it to finish installing.

### 3.3. Deploy the App
1.  **Login to Firebase:** In the same terminal window, type this command and press Enter. It will open a browser window for you to log in to your Google account.
    ```bash
    firebase login
    ```
2.  **Navigate to the Code Directory:** In the terminal, you need to move into the folder you unzipped earlier.
    *   Type `cd ` (with a space after it).
    *   Drag the unzipped project folder from your file explorer directly into the terminal window. The path to the folder should appear.
    *   Press Enter.
3.  **Initialize Firebase:** Now, type this command and press Enter:
    ```bash
    firebase init
    ```
    This will ask you a series of questions. Use the arrow keys and Enter key to answer them.
    *   `Are you ready to proceed?` -> **Yes**
    *   `Which Firebase features do you want to set up?` -> Select **Hosting: Configure files for Firebase Hosting...** (press Space to select, then Enter).
    *   `Please select an option:` -> Select **Use an existing project**.
    *   `Select a default Firebase project for this directory:` -> Select the Firebase project you created when you first started.
    *   `What do you want to use as your public directory?` -> **IMPORTANT:** Type `frontend` and press Enter.
    *   `Configure as a single-page app (rewrite all urls to /index.html)?` -> **No**
    *   `Set up automatic builds and deploys with GitHub?` -> **No**
4.  **Deploy!** Finally, type this command and press Enter:
    ```bash
    firebase deploy
    ```
    After a minute, it will show you a **Hosting URL**. This is the live link to your flashcard application! You can visit it in your browser.

## Part 4: Set Up Daily Email Reminders

This creates a trigger that will automatically run the script to send you an email every day.

1.  Go back to the Apps Script editor.
2.  On the left-hand menu, click the "Triggers" icon (looks like a clock).
3.  Click the **`Add Trigger`** button in the bottom right.
4.  Configure the trigger as follows:
    *   **Choose which function to run:** `sendDailyEmails`
    *   **Choose which deployment should run:** `Head`
    *   **Select event source:** `Time-driven`
    *   **Select type of time based trigger:** `Day timer`
    *   **Select time of day:** Choose a time you'd like to receive your daily email.
5.  Click **`Save`**.

---

And that's it! Your application is now fully configured and deployed. Visit your Hosting URL to start using it.
