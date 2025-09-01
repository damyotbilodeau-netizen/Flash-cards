/**
 * Ce code est une fonction Google Apps Script qui gère les flashcards, les e-mails
 * et les mises à jour de feuille de calcul via une application Web.
 *
 * Pour une utilisation complète, vous devez :
 * 1. Créer un projet Google Apps Script lié à votre feuille de calcul.
 * 2. Copier ce code dans le fichier Code.gs.
 * 3. Créer un fichier HTML nommé 'EmailTemplate.html' et y coller le contenu fourni.
 * 4. Remplacer l'identifiant de la feuille de calcul et l'URL du script par les vôtres.
 * 5. Déployer le script en tant qu'application Web.
 * 6. Configurer un déclencheur basé sur le temps si vous souhaitez un envoi d'e-mails quotidien.
 */

// IMPORTANT : Remplacez ces valeurs par les vôtres une fois le déploiement terminé.
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycby8W9kNoFnhNeE1rlP2YER_9vPfkoJqsodPm30_vfU9arEq57JDYmtwCuwVMlqbTMLH/exec';

// REMPLACEZ cet ID par l'ID de votre document Google Sheets qui contient
// les feuilles "Flash-cards" et "Utilisateurs".
const SPREADSHEET_ID = '1g4pzxRrOVTfiCABXCsqRyp6Alm-Ia-Q7gRE-7zX3Ydk';

// L'URL de publication du fichier CSV est utilisée pour la lecture des données.
const QUIZ_SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQEKy1QsKofpaZHdYRvf9dTymCBiBZO5fWU4S-cXLJLblvUpdTTE54ESMBDFv8yP_aAMYfcnxqaZnju/pub?output=csv';

// L'URL de votre application React est maintenant définie sur localhost.
const REACT_APP_URL = 'http://localhost:3000/';

// Algorithme de répétition espacée (intervalles en jours)
const REPETITION_INTERVALS = [0, 1, 3, 7, 14, 30, 90, 180];

/**
 * Récupère le contenu CSV d'une URL et le convertit en un tableau d'objets.
 * @return {Array<Object>} Le tableau des données.
 */
function getQuizData() {
  try {
    const csvContent = UrlFetchApp.fetch(QUIZ_SHEET_CSV_URL).getContentText();
    if (!csvContent) {
      Logger.log('Le contenu CSV est vide.');
      return [];
    }
    const data = Utilities.parseCsv(csvContent);
    const headers = data.shift(); // Supprime l'en-tête et le stocke

    return data.map(row => {
      const rowObject = {};
      headers.forEach((header, i) => {
        rowObject[header] = row[i];
      });
      return rowObject;
    });
  } catch (e) {
    Logger.log('Erreur lors de la récupération des données de la feuille de calcul: ' + e.toString());
    return [];
  }
}

/**
 * Met à jour une flashcard dans la feuille de calcul.
 * @param {number} rowIndex L'index de la ligne à mettre à jour.
 * @param {string} difficulty Le niveau de difficulté choisi ('Difficile', 'Moyen', 'Facile').
 */
function updateFlashcard(rowIndex, difficulty) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('Flash-cards');

  // Gère la feuille de calcul avec les colonnes dans l'ordre suivant:
  // C: Commentaires
  // D: Date réponse difficile
  // E: Date bonne réponse Moyen
  // F: Date bonne réponse Facile
  // G: Date prochaine répétition
  // H: Nombre de réponses
  const dateDifficileCol = 4; // Colonne D
  const dateMoyenCol = 5;     // Colonne E
  const dateFacileCol = 6;    // Colonne F
  const nextReviewCol = 7;    // Colonne G
  const numResponsesCol = 8;  // Colonne H

  // On récupère la valeur actuelle du nombre de réponses, on gère le cas où elle est vide
  const numResponsesRange = sheet.getRange(rowIndex, numResponsesCol);
  let currentNumResponses = parseInt(numResponsesRange.getValue()) || 0;
  const today = new Date();
  const formattedToday = Utilities.formatDate(today, SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone(), "dd/MM/yyyy");

  let newLevel;
  let newInterval;

  // Logique de mise à jour pour chaque niveau de difficulté
  switch (difficulty) {
    case 'Facile':
      newLevel = Math.min(currentNumResponses + 2, REPETITION_INTERVALS.length - 1);
      newInterval = REPETITION_INTERVALS[newLevel];
      sheet.getRange(rowIndex, dateFacileCol).setValue(formattedToday);
      sheet.getRange(rowIndex, dateMoyenCol).clearContent();
      sheet.getRange(rowIndex, dateDifficileCol).clearContent();
      break;
    case 'Moyen':
      newLevel = Math.min(currentNumResponses + 1, REPETITION_INTERVALS.length - 1);
      newInterval = REPETITION_INTERVALS[newLevel];
      sheet.getRange(rowIndex, dateMoyenCol).setValue(formattedToday);
      sheet.getRange(rowIndex, dateFacileCol).clearContent();
      sheet.getRange(rowIndex, dateDifficileCol).clearContent();
      break;
    case 'Difficile':
      newLevel = 0;
      newInterval = REPETITION_INTERVALS[newLevel];
      sheet.getRange(rowIndex, dateDifficileCol).setValue(formattedToday);
      sheet.getRange(rowIndex, dateMoyenCol).clearContent();
      sheet.getRange(rowIndex, dateFacileCol).clearContent();
      break;
    default:
      // Si la difficulté n'est pas reconnue, ne rien faire.
      return;
  }

  // Calcule la nouvelle date de répétition
  const nextRepetitionDate = addDays(today, newInterval);

  // Met à jour la feuille de calcul
  sheet.getRange(rowIndex, numResponsesCol).setValue(newLevel);
  sheet.getRange(rowIndex, nextReviewCol).setValue(Utilities.formatDate(nextRepetitionDate, SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone(), "dd/MM/yyyy"));
}

/**
 * Envoie un e-mail quotidien avec une question de révision.
 * @param {string} userEmail L'adresse e-mail de l'utilisateur.
 * @param {string} userFirstName Le prénom de l'utilisateur.
 */
function sendDailyReviewEmail(userEmail, userFirstName) {
  const quizData = getQuizData();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const questionsToReview = quizData.filter(question => {
    const nextReviewDateStr = question['Date prochaine répétition'];
    if (!nextReviewDateStr) {
      return false;
    }

    const nextReviewDate = parseDate(nextReviewDateStr);

    if (nextReviewDate) {
      nextReviewDate.setHours(0, 0, 0, 0);
      return nextReviewDate.getTime() <= today.getTime();
    }

    return false;
  });

  if (questionsToReview.length === 0) {
    Logger.log('Aucune question à réviser aujourd\'hui pour %s.', userEmail);
    return;
  }

  // Sélectionner une question au hasard
  const randomIndex = Math.floor(Math.random() * questionsToReview.length);
  const featuredQuestion = questionsToReview[randomIndex];

  // Trouver l'index de la question dans le tableau original
  const featuredQuestionIndex = quizData.findIndex(q => q.Question === featuredQuestion.Question);

  // Construire l'URL de l'application React avec les paramètres de la question
  const quizLink = `${REACT_APP_URL}?rowIndex=${featuredQuestionIndex + 2}`;

  const templateData = {
    userFirstName: userFirstName,
    totalQuestions: questionsToReview.length,
    featuredQuestion: {
      question: featuredQuestion.Question,
      rowIndex: featuredQuestionIndex + 2 // +2 car l'en-tête et l'index sont basés sur 0
    },
    quizLink: quizLink // Ajouter l'URL du lien de l'application React
  };

  const htmlTemplate = HtmlService.createTemplateFromFile('EmailTemplate');
  Object.assign(htmlTemplate, templateData);
  htmlTemplate.scriptUrl = APPS_SCRIPT_URL; // Utilise l'URL du script Apps Script
  const htmlBody = htmlTemplate.evaluate().getContent();
  const options = {
    htmlBody: htmlBody,
  };

  try {
    MailApp.sendEmail({
      to: userEmail,
      subject: "Votre révision quotidienne de flashcards",
      body: 'Veuillez activer l\'affichage HTML pour voir ce message.', // Texte brut de secours
      htmlBody: htmlBody // Le contenu HTML
    });
    Logger.log('E-mail de révision envoyé avec succès à %s', userEmail);
  } catch (e) {
    Logger.log('Erreur lors de l\'envoi de l\'e-mail à %s: %s', userEmail, e.toString());
  }
}

/**
 * Fonction principale à déclencher pour envoyer les e-mails de révision.
 * Elle lit la feuille "Utilisateurs" et envoie un e-mail à chaque utilisateur.
 */
function sendDailyEmails() {
  const usersSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('Utilisateurs');
  const usersData = usersSheet.getDataRange().getValues();
  const headers = usersData.shift();

  usersData.forEach(row => {
    const user = {};
    headers.forEach((header, i) => {
      user[header] = row[i];
    });

    if (user['Avis activés'] === 'Oui') {
      sendDailyReviewEmail(user.Courriel, user.Prénom);
    }
  });
}

/**
 * Gère les requêtes GET pour l'application web.
 * Elle est utilisée pour traiter les clics sur les liens dans les e-mails.
 * @param {Object} e L'événement de requête GET.
 * @return {Object} L'objet de réponse.
 */
function doGet(e) {
  try {
    const { action, rowIndex, difficulty } = e.parameter;

    if (action === 'update_card' && rowIndex && difficulty) {
      updateFlashcard(parseInt(rowIndex), difficulty);
      const output = HtmlService.createHtmlOutput(`
        <h1>Mise à jour réussie! ✅</h1>
        <p>Merci pour votre révision. Votre carte a été mise à jour.</p>
        <p>Vous pouvez <a href="${REACT_APP_URL}" target="_top">retourner à l'application</a> pour continuer.</p>
        <p>Vous pouvez fermer cette page.</p>
      `).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
      return output;
    } else {
      return HtmlService.createHtmlOutput('<h1>Application Web Flashcards</h1><p>Cette application Web est active et prête à recevoir des requêtes. Le code source est disponible sur votre projet Google Apps Script. Vous devriez l\'utiliser pour envoyer les courriels de révision et traiter les réponses de votre application React.</p>');
    }

  } catch (error) {
    return HtmlService.createHtmlOutput(`<h1>Erreur</h1><p>Une erreur est survenue : ${error.message}</p>`);
  }
}

/**
 * Gère les requêtes POST pour l'application web.
 * Elle est utilisée pour traiter les requêtes de l'application React.
 * @param {Object} e L'événement de requête POST.
 * @return {Object} L'objet de réponse.
 */
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const { action, rowIndex, difficulty } = data;

    if (action === 'update_card') {
      updateFlashcard(rowIndex, difficulty);
      return ContentService.createTextOutput(JSON.stringify({ success: true, message: 'Flashcard mise à jour.' })).setMimeType(ContentService.MimeType.JSON);
    } else if (action === 'send_emails') {
      sendDailyEmails();
      return ContentService.createTextOutput(JSON.stringify({ success: true, message: 'Emails envoyés avec succès.' })).setMimeType(ContentService.MimeType.JSON);
    } else {
      return ContentService.createTextOutput(JSON.stringify({ success: false, message: 'Action non reconnue.' })).setMimeType(ContentService.MimeType.JSON);
    }

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, message: error.message })).setMimeType(ContentService.MimeType.JSON);
  }
}

// Fonction utilitaire pour ajouter des jours à une date
function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Analyse une chaîne de date au format "jj/mm/aaaa" et renvoie un objet Date.
 * @param {string} dateString La chaîne de date à analyser.
 * @return {Date|null} L'objet Date si l'analyse est réussie, sinon null.
 */
function parseDate(dateString) {
  if (!dateString) {
    return null;
  }
  const parts = dateString.split('/');
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // Le mois est sur 0
    const year = parseInt(parts[2], 10);

    // Vérifier si les valeurs sont valides
    if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
      const date = new Date(year, month, day);
      // Vérifier que la date est valide (empêche les erreurs de débordement)
      if (date.getFullYear() === year && date.getMonth() === month && date.getDate() === day) {
        return date;
      }
    }
  }
  return null;
}
