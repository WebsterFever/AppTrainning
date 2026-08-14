import { createContext, useContext, useEffect, useState } from 'react';

export type Language = 'en' | 'fr' | 'ht';

const STORAGE_KEY = 'classboard_language';

type Vars = Record<string, string | number>;
type TranslationValue = string | ((vars: Vars) => string);
type Entry = { en: TranslationValue; fr: TranslationValue; ht: TranslationValue };

function resolve(value: TranslationValue, vars?: Vars): string {
  if (typeof value === 'function') return value(vars ?? {});
  if (!vars) return value;
  return value.replace(/\{(\w+)\}/g, (_, key) => String(vars[key] ?? ''));
}

// BCP-47 locale to use for Intl date/number formatting. Haitian Creole
// (ht-HT) has poor Intl support in most JS engines, so fr-HT is used
// instead — it keeps Haiti's day/month/year date ordering while resolving
// reliably, even though all surrounding UI text is in Kreyòl.
export function localeFor(language: Language): string {
  if (language === 'fr') return 'fr-FR';
  if (language === 'ht') return 'fr-HT';
  return 'en-US';
}

const dict = {
  // Header
  navUpcoming: { en: 'Upcoming Classes', fr: 'Cours à venir', ht: 'Kou k ap vini' },
  navPast: { en: 'Past Classes', fr: 'Cours passés', ht: 'Kou ki pase' },
  navBookClass: { en: 'Book a Class', fr: 'Réserver un cours', ht: 'Rezève yon kou' },
  navTeacher: { en: 'Teacher', fr: 'Enseignant', ht: 'Pwofesè' },
  navOpenMenu: { en: 'Open menu', fr: 'Ouvrir le menu', ht: 'Ouvri meni' },
  navCloseMenu: { en: 'Close menu', fr: 'Fermer le menu', ht: 'Fèmen meni' },

  // Footer
  footerTagline: {
    en: 'Live training, hosted on Zoom.',
    fr: 'Formation en direct, sur Zoom.',
    ht: 'Fòmasyon an dirèk, sou Zoom.',
  },
  footerRights: {
    en: (v: Vars) => `© ${v.year} Webster Technology School. All rights reserved.`,
    fr: (v: Vars) => `© ${v.year} Webster Technology School. Tous droits réservés.`,
    ht: (v: Vars) => `© ${v.year} Webster Technology School. Tout dwa rezève.`,
  },

  // Not found
  notFoundTitle: {
    en: "This page doesn't exist.",
    fr: "Cette page n'existe pas.",
    ht: "Paj sa a pa egziste.",
  },
  backToAllClasses: {
    en: '← Back to all classes',
    fr: '← Retour à tous les cours',
    ht: '← Retounen nan tout kou yo',
  },

  // Shared
  somethingWentWrong: {
    en: 'Something went wrong',
    fr: "Une erreur s'est produite",
    ht: 'Gen yon bagay ki mal pase',
  },

  // Theme toggle
  switchToLight: { en: 'Switch to light mode', fr: 'Passer au mode clair', ht: 'Pase nan mòd klè' },
  switchToDark: { en: 'Switch to dark mode', fr: 'Passer au mode sombre', ht: 'Pase nan mòd fonse' },

  // Notification bell
  notifications: { en: 'Notifications', fr: 'Notifications', ht: 'Notifikasyon' },
  notificationsAria: {
    en: (v: Vars) => (v.count ? `Notifications (${v.count} new)` : 'Notifications'),
    fr: (v: Vars) => (v.count ? `Notifications (${v.count} nouvelles)` : 'Notifications'),
    ht: (v: Vars) => (v.count ? `Notifikasyon (${v.count} nouvo)` : 'Notifikasyon'),
  },
  noNewNotifications: { en: 'No new classes.', fr: 'Aucun nouveau cours.', ht: 'Pa gen nouvo kou.' },
  newClassBadge: { en: 'New class', fr: 'Nouveau cours', ht: 'Nouvo kou' },
  newVideoBadge: { en: 'New video', fr: 'Nouvelle vidéo', ht: 'Nouvo videyo' },

  // Countdown (frontend/src/lib/countdown.ts, ClassCard/ClassManager)
  startingNow: { en: 'Starting now', fr: 'Commence maintenant', ht: 'Kòmanse kounye a' },
  startsIn: {
    en: (v: Vars) => `Starts in ${v.parts}`,
    fr: (v: Vars) => `Commence dans ${v.parts}`,
    ht: (v: Vars) => `Kòmanse nan ${v.parts}`,
  },
  anyMomentNow: { en: 'any moment now', fr: "d'un instant à l'autre", ht: 'nan yon ti moman' },

  // ClassCard
  selfPaced: { en: 'Self-paced', fr: 'À votre rythme', ht: 'Nan pwòp vitès ou' },
  past: { en: 'PAST', fr: 'PASSÉ', ht: 'PASE' },
  paid: { en: 'PAID', fr: 'PAYANT', ht: 'PEYE' },
  registered: {
    en: (v: Vars) => `${v.count} registered`,
    fr: (v: Vars) => `${v.count} inscrits`,
    ht: (v: Vars) => `${v.count} enskri`,
  },
  registerArrow: { en: 'Register →', fr: "S'inscrire →", ht: 'Enskri →' },

  // ClassDetail
  allClasses: { en: '← All classes', fr: '← Tous les cours', ht: '← Tout kou yo' },
  classNotFound: { en: 'Class not found.', fr: 'Cours introuvable.', ht: 'Kou a pa jwenn.' },
  downloadPdf: {
    en: (v: Vars) => `📄 Download ${v.name}`,
    fr: (v: Vars) => `📄 Télécharger ${v.name}`,
    ht: (v: Vars) => `📄 Telechaje ${v.name}`,
  },
  downloadPicture: {
    en: (v: Vars) => `🖼️ Download ${v.name}`,
    fr: (v: Vars) => `🖼️ Télécharger ${v.name}`,
    ht: (v: Vars) => `🖼️ Telechaje ${v.name}`,
  },
  defaultPdfName: { en: 'PDF', fr: 'le PDF', ht: 'PDF la' },
  defaultPictureName: { en: 'picture', fr: "l'image", ht: 'imaj la' },
  youreIn: { en: "You're in.", fr: "C'est fait.", ht: 'Ou antre.' },
  copyZoomHint: {
    en: "Copy your Zoom link below and save it — you'll need it to join the class.",
    fr: 'Copiez votre lien Zoom ci-dessous et enregistrez-le — vous en aurez besoin pour rejoindre le cours.',
    ht: "Kopye lyen Zoom ou anba a epi konsève li — ou ap bezwen li pou antre nan kou a.",
  },
  copied: { en: 'Copied ✓', fr: 'Copié ✓', ht: 'Kopye ✓' },
  copy: { en: 'Copy', fr: 'Copier', ht: 'Kopye' },
  paidGateText: {
    en: "This is a paid class. Enter the email you purchased access with to unlock the full class details and Zoom link.",
    fr: "Ceci est un cours payant. Entrez l'e-mail utilisé pour votre achat afin de débloquer tous les détails du cours et le lien Zoom.",
    ht: "Sa a se yon kou peye. Antre imèl ou te itilize pou achte a pou ou ka wè tout detay kou a ak lyen Zoom nan.",
  },
  freeGateText: {
    en: 'Register with your name and email to see the full class details and get the Zoom link.',
    fr: 'Inscrivez-vous avec votre nom et e-mail pour voir tous les détails du cours et obtenir le lien Zoom.',
    ht: 'Enskri ak non ou ak imèl ou pou wè tout detay kou a epi jwenn lyen Zoom nan.',
  },
  fullName: { en: 'Full name', fr: 'Nom complet', ht: 'Non konplè' },
  email: { en: 'Email', fr: 'E-mail', ht: 'Imèl' },
  checking: { en: 'Checking…', fr: 'Vérification…', ht: 'N ap verifye…' },
  unlockThisClass: { en: 'Unlock this class', fr: 'Débloquer ce cours', ht: 'Debloke kou sa a' },
  registerToUnlock: {
    en: 'Register to unlock details',
    fr: 'Inscrivez-vous pour voir les détails',
    ht: 'Enskri pou wè detay yo',
  },
  payWithCardOrPaypal: {
    en: (v: Vars) => `Pay ${v.price} — Card or PayPal`,
    fr: (v: Vars) => `Payer ${v.price} — Carte ou PayPal`,
    ht: (v: Vars) => `Peye ${v.price} — Kat oswa PayPal`,
  },
  startingCheckout: { en: 'Starting checkout…', fr: 'Ouverture du paiement…', ht: 'N ap ouvri peman an…' },
  alreadyPurchasedUnlock: {
    en: 'Already purchased? Unlock',
    fr: 'Déjà acheté ? Débloquer',
    ht: 'Ou deja achte? Debloke',
  },
  confirmingPayment: {
    en: 'Confirming your payment — this usually takes just a few seconds…',
    fr: 'Confirmation de votre paiement — cela prend généralement quelques secondes…',
    ht: 'N ap konfime peman ou — sa pran anjeneral kèk segond sèlman…',
  },
  fillNameEmailFirst: {
    en: 'Enter your name and email first.',
    fr: "Entrez d'abord votre nom et e-mail.",
    ht: 'Antre non ou ak imèl ou anvan.',
  },
  studyNotes: { en: 'Study notes', fr: "Notes d'étude", ht: 'Nòt etid' },
  moreVideos: { en: 'More videos', fr: 'Plus de vidéos', ht: 'Plis videyo' },
  whatYoullLearn: { en: "What You'll Learn", fr: 'Ce que vous allez apprendre', ht: 'Sa ou pral aprann' },
  curriculumIntro: {
    en: 'Explore the complete curriculum before enrolling.',
    fr: "Explorez le programme complet avant de vous inscrire.",
    ht: 'Gade tout pwogram nan anvan ou enskri.',
  },
  moduleObjectiveLabel: { en: 'Objective', fr: 'Objectif', ht: 'Objektif' },
  moduleTopicsLabel: { en: 'Topics', fr: 'Sujets', ht: 'Sijè' },
  moduleProjectLabel: { en: 'Project', fr: 'Projet', ht: 'Pwojè' },
  exerciseLabel: { en: 'Exercise', fr: 'Exercice', ht: 'Egzèsis' },
  downloadResource: { en: 'Download', fr: 'Télécharger', ht: 'Telechaje' },
  moduleLocked: { en: '🔒 Locked', fr: '🔒 Verrouillé', ht: '🔒 Fèmen' },
  moduleApproved: { en: '✓ Approved', fr: '✓ Approuvé', ht: '✓ Apwouve' },
  modulePending: { en: 'Pending review', fr: 'En attente', ht: 'Ap tann revizyon' },
  moduleNeedsChanges: { en: 'Needs changes', fr: 'Modifications requises', ht: 'Bezwen chanjman' },
  completeToUnlock: {
    en: 'Complete and get approval on the previous module to unlock this one.',
    fr: 'Terminez et faites approuver le module précédent pour débloquer celui-ci.',
    ht: 'Fini epi fè apwouve modil anvan an pou debloke sa a.',
  },
  submitModuleProject: {
    en: (v: Vars) => `Submit ${v.module} project`,
    fr: (v: Vars) => `Soumettre le projet ${v.module}`,
    ht: (v: Vars) => `Soumèt pwojè ${v.module}`,
  },
  githubUrlLabel: { en: 'GitHub repository URL', fr: 'URL du dépôt GitHub', ht: 'URL depo GitHub' },
  optionalNotesToInstructor: {
    en: 'Optional notes for the instructor',
    fr: "Notes facultatives pour l'instructeur",
    ht: 'Nòt opsyonèl pou enstriktè a',
  },
  submitProject: { en: 'Submit project', fr: 'Soumettre le projet', ht: 'Soumèt pwojè a' },
  resubmitProject: { en: 'Resubmit project', fr: 'Resoumettre le projet', ht: 'Re-soumèt pwojè a' },
  submittingProject: { en: 'Submitting…', fr: 'Envoi…', ht: 'Ap voye…' },
  projectApprovedMessage: {
    en: 'Your project was approved — the next module is unlocked.',
    fr: 'Votre projet a été approuvé — le module suivant est débloqué.',
    ht: 'Yo apwouve pwojè ou — pwochen modil la debloke.',
  },
  yourFeedbackFromInstructor: {
    en: 'Feedback from your instructor',
    fr: "Retour de votre instructeur",
    ht: 'Kòmantè enstriktè ou',
  },
  videoUnavailable: {
    en: 'This video is currently unavailable.',
    fr: "Cette vidéo n'est actuellement pas disponible.",
    ht: 'Videyo sa a pa disponib kounye a.',
  },
  watchOriginalLink: { en: 'Watch original link', fr: 'Voir le lien original', ht: 'Gade lyen orijinal la' },
  aiTeacherLabel: { en: 'AI Teacher', fr: 'Professeur IA', ht: 'Pwofesè AI' },
  startLesson: { en: 'Start Lesson', fr: 'Démarrer la leçon', ht: 'Kòmanse leson an' },
  pauseLesson: { en: 'Pause', fr: 'Pause', ht: 'Pòz' },
  resumeLesson: { en: 'Resume', fr: 'Reprendre', ht: 'Kontinye' },
  replayLesson: { en: 'Replay', fr: 'Rejouer', ht: 'Rejwe' },
  stopLesson: { en: 'Stop', fr: 'Arrêter', ht: 'Kanpe' },
  robotSpeaking: { en: 'Speaking…', fr: 'En train de parler…', ht: 'Ap pale…' },
  robotPaused: { en: 'Paused', fr: 'En pause', ht: 'Nan pòz' },
  volumeLabel: { en: 'Volume', fr: 'Volume', ht: 'Volim' },
  speedLabel: { en: 'Speed', fr: 'Vitesse', ht: 'Vitès' },
  voiceLabel: { en: 'Voice', fr: 'Voix', ht: 'Vwa' },
  autoVoiceOption: { en: 'Auto (recommended)', fr: 'Auto (recommandé)', ht: 'Otomatik (rekòmande)' },
  speechNotSupported: {
    en: "Voice narration isn't supported in this browser. Here's the lesson text:",
    fr: "La narration vocale n'est pas prise en charge par ce navigateur. Voici le texte de la leçon :",
    ht: 'Navigatè sa a pa sipòte vwa pale. Men tèks leson an:',
  },
  noScriptYet: { en: 'No lesson script yet.', fr: "Aucun script de leçon pour l'instant.", ht: 'Pa gen skript leson toujou.' },
  instructionsLabel: { en: 'Instructions', fr: 'Instructions', ht: 'Enstriksyon' },
  audioUnavailable: {
    en: "This lesson's voice audio is unavailable right now.",
    fr: "L'audio de cette leçon n'est pas disponible pour le moment.",
    ht: 'Odyo leson sa a pa disponib kounye a.',
  },
  yourZoomLink: { en: 'Your Zoom link', fr: 'Votre lien Zoom', ht: 'Lyen Zoom ou' },
  zoomLinkLabel: { en: 'Zoom link:', fr: 'Lien Zoom :', ht: 'Lyen Zoom:' },
  peopleRegistered: {
    en: (v: Vars) => `${v.count} people registered`,
    fr: (v: Vars) => `${v.count} personnes inscrites`,
    ht: (v: Vars) => `${v.count} moun enskri`,
  },
  whosRegistered: { en: "Who's registered", fr: 'Qui est inscrit', ht: 'Kiyès ki enskri' },

  // BookClass
  requestSentTitle: { en: 'Request sent.', fr: 'Demande envoyée.', ht: 'Demann voye.' },
  requestSentBody: {
    en: (v: Vars) =>
      `We got your class request and will reach out at ${v.email} to confirm the schedule.`,
    fr: (v: Vars) =>
      `Nous avons bien reçu votre demande et vous contacterons à ${v.email} pour confirmer l'horaire.`,
    ht: (v: Vars) =>
      `Nou resevwa demann kou ou a e n ap kontakte ou nan ${v.email} pou konfime orè a.`,
  },
  bookAClass: { en: 'Book a class', fr: 'Réserver un cours', ht: 'Rezève yon kou' },
  bookClassIntro: {
    en: "Tell us what you'd like to learn and when works for you — we'll set it up and confirm the details.",
    fr: 'Dites-nous ce que vous aimeriez apprendre et quand cela vous convient — nous organiserons le cours et confirmerons les détails.',
    ht: "Di nou sa ou ta renmen aprann ak ki lè ki bon pou ou — n ap òganize l epi konfime detay yo.",
  },
  phone: { en: 'Phone', fr: 'Téléphone', ht: 'Telefòn' },
  whatLearn: { en: 'What do you want to learn?', fr: 'Que voulez-vous apprendre ?', ht: 'Kisa ou vle aprann?' },
  describeClassPlaceholder: {
    en: "Describe the class you'd like — topic, level, goals…",
    fr: 'Décrivez le cours souhaité — sujet, niveau, objectifs…',
    ht: 'Dekri kou ou ta renmen an — sijè, nivo, objektif…',
  },
  preferredDateTime: { en: 'Preferred date & time', fr: 'Date et heure préférées', ht: 'Dat ak lè ou pi pito' },
  yourZoomLinkLabel: { en: 'Your Zoom link', fr: 'Votre lien Zoom', ht: 'Lyen Zoom ou' },
  shareZoomHint: {
    en: 'Share your Zoom room so the teacher can join you there.',
    fr: 'Partagez votre salle Zoom pour que le professeur puisse vous y rejoindre.',
    ht: 'Pataje sal Zoom ou pou pwofesè a ka rantre avè w la.',
  },
  sending: { en: 'Sending…', fr: 'Envoi…', ht: 'N ap voye…' },
  requestThisClass: { en: 'Request this class', fr: 'Demander ce cours', ht: 'Mande kou sa a' },

  // VideoComments
  comments: {
    en: (v: Vars) => `Comments${v.count ? ` (${v.count})` : ''}`,
    fr: (v: Vars) => `Commentaires${v.count ? ` (${v.count})` : ''}`,
    ht: (v: Vars) => `Kòmantè${v.count ? ` (${v.count})` : ''}`,
  },
  loadingComments: { en: 'Loading comments…', fr: 'Chargement des commentaires…', ht: 'N ap chaje kòmantè yo…' },
  noCommentsYet: {
    en: 'No comments yet — be the first.',
    fr: 'Aucun commentaire pour le moment — soyez le premier.',
    ht: 'Poko gen kòmantè — se ou ki premye.',
  },
  yourName: { en: 'Your name', fr: 'Votre nom', ht: 'Non ou' },
  yourRegisteredEmail: { en: 'Your registered email', fr: 'Votre e-mail enregistré', ht: 'Imèl ou te enskri a' },
  addCommentPlaceholder: { en: 'Add a comment…', fr: 'Ajouter un commentaire…', ht: 'Ajoute yon kòmantè…' },
  posting: { en: 'Posting…', fr: 'Publication…', ht: 'N ap pibliye…' },
  postComment: { en: 'Post comment', fr: 'Publier', ht: 'Pibliye kòmantè' },

  // ChatWidget
  chatWithUs: { en: 'Chat with us', fr: 'Discutez avec nous', ht: 'Chat avèk nou' },
  closeChat: { en: 'Close chat', fr: 'Fermer le chat', ht: 'Fèmen chat' },
  openChat: { en: 'Open chat', fr: 'Ouvrir le chat', ht: 'Ouvri chat' },
  continuingAs: {
    en: (v: Vars) => `Continuing as ${v.name} (${v.email})`,
    fr: (v: Vars) => `Vous continuez en tant que ${v.name} (${v.email})`,
    ht: (v: Vars) => `W ap kontinye kòm ${v.name} (${v.email})`,
  },
  howCanWeHelp: { en: 'How can we help?', fr: 'Comment pouvons-nous vous aider ?', ht: 'Kòman nou ka ede w?' },
  startChat: { en: 'Start chat', fr: 'Démarrer le chat', ht: 'Kòmanse chat' },
  notYouDifferent: {
    en: 'Not you? Use a different name/email',
    fr: "Pas vous ? Utilisez un autre nom/e-mail",
    ht: 'Se pa ou? Itilize yon lòt non/imèl',
  },
  chatIntro: {
    en: "Send us a message and we'll get back to you here.",
    fr: 'Envoyez-nous un message et nous vous répondrons ici.',
    ht: 'Voye nou yon mesaj epi n ap reponn ou isit la.',
  },
  yourEmail: { en: 'Your email', fr: 'Votre e-mail', ht: 'Imèl ou' },
  alreadyChatted: {
    en: 'Already chatted with us? See your messages',
    fr: 'Déjà discuté avec nous ? Voir vos messages',
    ht: 'Ou te deja chat avèk nou? Gade mesaj ou yo',
  },
  resumeChatIntro: {
    en: 'Enter the email you used before to see your conversation.',
    fr: "Entrez l'e-mail utilisé précédemment pour voir votre conversation.",
    ht: 'Antre imèl ou te itilize anvan pou wè konvèsasyon ou.',
  },
  looking: { en: 'Looking…', fr: 'Recherche…', ht: 'N ap chèche…' },
  viewMyChat: { en: 'View my chat', fr: 'Voir mon chat', ht: 'Gade chat mwen' },
  backArrow: { en: '← Back', fr: '← Retour', ht: '← Retounen' },
  loadingEllipsis: { en: 'Loading…', fr: 'Chargement…', ht: 'N ap chaje…' },
  noMessagesYet: { en: 'No messages yet.', fr: 'Aucun message pour le moment.', ht: 'Poko gen mesaj.' },
  typeMessagePlaceholder: { en: 'Type a message…', fr: 'Écrire un message…', ht: 'Ekri yon mesaj…' },
  send: { en: 'Send', fr: 'Envoyer', ht: 'Voye' },
  notYouStartOver: {
    en: 'Not you? Start a new chat',
    fr: 'Pas vous ? Démarrer un nouveau chat',
    ht: 'Se pa ou? Kòmanse yon nouvo chat',
  },
  haveQuestion: {
    en: 'Have a question? Chat with us',
    fr: 'Une question ? Discutez avec nous',
    ht: 'Ou gen yon kesyon? Chat avèk nou',
  },
  couldNotSendMessage: {
    en: 'Could not send your message.',
    fr: "Impossible d'envoyer votre message.",
    ht: "Nou pa t' ka voye mesaj ou.",
  },
  couldNotFindConversation: {
    en: "We couldn't find a conversation for that email.",
    fr: "Nous n'avons trouvé aucune conversation pour cet e-mail.",
    ht: "Nou pa t' jwenn okenn konvèsasyon pou imèl sa a.",
  },
  newMessageFrom: {
    en: (v: Vars) => `New message from ${v.school}`,
    fr: (v: Vars) => `Nouveau message de ${v.school}`,
    ht: (v: Vars) => `Nouvo mesaj nan men ${v.school}`,
  },

  // WinnerOfMonth
  winnerOfMonth: { en: '🏆 Winner of the Month', fr: '🏆 Gagnant du mois', ht: '🏆 Gayan mwa a' },
  contestIntro: {
    en: "Answer the daily question first to score points. Most points by month's end wins $100.",
    fr: "Répondez le premier à la question du jour pour marquer des points. Le plus de points à la fin du mois gagne 100 $.",
    ht: "Reponn premye a kesyon chak jou a pou fè pwen. Moun ki gen plis pwen nan fen mwa a genyen $100.",
  },
  newQuestionAt: {
    en: (v: Vars) => `New question at 12pm ET · next in ${v.countdown}`,
    fr: (v: Vars) => `Nouvelle question à 12h ET · prochaine dans ${v.countdown}`,
    ht: (v: Vars) => `Nouvo kesyon a 12è ET · pwochen nan ${v.countdown}`,
  },
  monthWinnerSuffix: {
    en: (v: Vars) => ` won this month with ${v.points} points!`,
    fr: (v: Vars) => ` a gagné ce mois-ci avec ${v.points} points !`,
    ht: (v: Vars) => ` genyen mwa sa a ak ${v.points} pwen!`,
  },
  contestEndedNoWinner: {
    en: "This month's contest has ended.",
    fr: 'Le concours de ce mois-ci est terminé.',
    ht: 'Konkou mwa sa a fini.',
  },
  waitingForAdminReset: {
    en: 'Waiting for the admin to start a new contest.',
    fr: "En attente que l'administrateur relance un nouveau concours.",
    ht: 'N ap tann administratè a kòmanse yon nouvo konkou.',
  },
  noQuestionYetCheckBack: {
    en: (v: Vars) => `No question posted yet today — check back in ${v.countdown}.`,
    fr: (v: Vars) => `Aucune question publiée aujourd'hui — revenez dans ${v.countdown}.`,
    ht: (v: Vars) => `Poko gen kesyon pibliye jodi a — tounen vin gade nan ${v.countdown}.`,
  },
  notYouSwitchAccount: {
    en: 'Not you? Switch account',
    fr: 'Pas vous ? Changer de compte',
    ht: 'Se pa ou? Chanje kont',
  },
  joinNowToBeReady: {
    en: 'Join now to be ready',
    fr: 'Inscrivez-vous dès maintenant',
    ht: 'Enskri kounye a pou ou pare',
  },
  phoneNumberPlaceholder: { en: 'Phone number', fr: 'Numéro de téléphone', ht: 'Nimewo telefòn' },
  choosePhoto: { en: 'Choose a photo…', fr: 'Choisir une photo…', ht: 'Chwazi yon foto…' },
  joining: { en: 'Joining…', fr: 'Inscription…', ht: 'N ap enskri…' },
  joinNow: { en: 'Join now', fr: "S'inscrire", ht: 'Enskri kounye a' },
  alreadyAnsweredBy: {
    en: (v: Vars) => `Already answered${v.winner ? ` by ${v.winner}` : ''}. Check back tomorrow.`,
    fr: (v: Vars) => `Déjà répondu${v.winner ? ` par ${v.winner}` : ''}. Revenez demain.`,
    ht: (v: Vars) => `Deja reponn${v.winner ? ` pa ${v.winner}` : ''}. Tounen vin gade demen.`,
  },
  alreadyAnsweredToday: {
    en: "You've already answered today's question. Check back tomorrow.",
    fr: "Vous avez déjà répondu à la question du jour. Revenez demain.",
    ht: 'Ou deja reponn kesyon jodi a. Tounen vin gade demen.',
  },
  yourAnswerPlaceholder: { en: 'Your answer', fr: 'Votre réponse', ht: 'Repons ou' },
  submitting: { en: 'Submitting…', fr: 'Envoi…', ht: 'N ap voye…' },
  submitAnswer: { en: 'Submit answer', fr: 'Envoyer la réponse', ht: 'Voye repons' },
  joinSubmitAnswer: { en: 'Join & submit answer', fr: "S'inscrire et répondre", ht: 'Enskri epi voye repons' },
  leaderboard: { en: 'Leaderboard', fr: 'Classement', ht: 'Klasman' },
  loadingEllipsisShort: { en: 'Loading…', fr: 'Chargement…', ht: 'N ap chaje…' },
  noContestantsYet: {
    en: 'No contestants yet — be the first to join.',
    fr: 'Aucun participant pour le moment — soyez le premier à vous inscrire.',
    ht: 'Poko gen patisipan — se ou ki premye pou enskri.',
  },
  pointsToGoal: {
    en: (v: Vars) => `${v.points} / ${v.goal} points (${v.pct}% to goal)`,
    fr: (v: Vars) => `${v.points} / ${v.goal} points (${v.pct} % de l'objectif)`,
    ht: (v: Vars) => `${v.points} / ${v.goal} pwen (${v.pct}% nan objektif la)`,
  },
  rankHash: {
    en: (v: Vars) => `Rank #${v.rank}`,
    fr: (v: Vars) => `Rang n°${v.rank}`,
    ht: (v: Vars) => `Ran #${v.rank}`,
  },
  joinedOn: {
    en: (v: Vars) => `Joined ${v.date}`,
    fr: (v: Vars) => `Inscrit le ${v.date}`,
    ht: (v: Vars) => `Enskri ${v.date}`,
  },
  hidePastWinners: { en: 'Hide past winners', fr: 'Masquer les anciens gagnants', ht: 'Kache ansyen gayan yo' },
  seePastWinners: { en: 'See past winners', fr: 'Voir les anciens gagnants', ht: 'Gade ansyen gayan yo' },
  noPastWinnersYet: { en: 'No past winners yet.', fr: 'Aucun ancien gagnant pour le moment.', ht: 'Poko gen ansyen gayan.' },
  addPhotoToJoin: { en: 'Add a photo to join.', fr: 'Ajoutez une photo pour vous inscrire.', ht: 'Ajoute yon foto pou enskri.' },
  couldNotJoinContest: {
    en: 'Could not join the contest.',
    fr: 'Impossible de rejoindre le concours.',
    ht: "Nou pa t' ka enskri ou nan konkou a.",
  },
  couldNotSubmitAnswer: {
    en: 'Could not submit your answer.',
    fr: "Impossible d'envoyer votre réponse.",
    ht: "Nou pa t' ka voye repons ou.",
  },
  correctFirstResult: {
    en: 'Correct — you were first! +10 points 🎉',
    fr: 'Correct — vous êtes le premier ! +10 points 🎉',
    ht: 'Kòrèk — ou te premye! +10 pwen 🎉',
  },
  correctNotFirstResult: {
    en: 'Correct, but someone else answered first today.',
    fr: "Correct, mais quelqu'un d'autre a répondu en premier aujourd'hui.",
    ht: "Kòrèk, men yon lòt moun te reponn avan jodi a.",
  },
  incorrectResult: {
    en: 'Not quite — try again tomorrow.',
    fr: 'Pas tout à fait — réessayez demain.',
    ht: 'Se pa sa — eseye ankò demen.',
  },

  // Home
  loadingClasses: { en: 'Loading classes', fr: 'Chargement des cours', ht: 'N ap chaje kou yo' },
  heroLine1: { en: 'Build the technology', fr: 'Développez les compétences', ht: 'Devlope konpetans' },
  heroLine2: { en: 'skills of tomorrow.', fr: 'technologiques de demain.', ht: 'teknolojik demen an.' },
  heroSubtitle: {
    en: 'Join practical live classes in artificial intelligence, and modern technology.',
    fr: 'Suivez des cours en direct et pratiques en intelligence artificielle et en technologies modernes.',
    ht: 'Patisipe nan kou pratik an dirèk nan entèlijans atifisyèl ak teknoloji modèn.',
  },
  liveTechTraining: {
    en: 'Live technology training',
    fr: 'Formation technologique en direct',
    ht: 'Fòmasyon teknolojik an dirèk',
  },
  heroFeatureLiveZoom: { en: 'Live Zoom classes', fr: 'Cours en direct sur Zoom', ht: 'Kou an dirèk sou Zoom' },
  heroFeatureHandsOn: { en: 'Hands-on projects', fr: 'Projets pratiques', ht: 'Pwojè pratik' },
  heroFeatureIndustry: { en: 'Industry skills', fr: 'Compétences professionnelles', ht: 'Konpetans pwofesyonèl' },
  exploreUpcomingClasses: {
    en: 'Explore upcoming classes',
    fr: 'Découvrir les cours à venir',
    ht: 'Dekouvri kou k ap vini yo',
  },
  statUpcoming: { en: 'Upcoming', fr: 'À venir', ht: 'K ap vini' },
  statCompleted: { en: 'Completed', fr: 'Terminés', ht: 'Fini' },
  statRegistrations: { en: 'Registrations', fr: 'Inscriptions', ht: 'Enskripsyon' },
  monthlyCompetition: {
    en: (v: Vars) => `Monthly Competition · Win $${v.amount}`,
    fr: (v: Vars) => `Concours mensuel · Gagnez ${v.amount} $`,
    ht: (v: Vars) => `Konkou chak mwa · Genyen ${v.amount} $`,
  },
  winnerOfTheMonth: { en: 'Winner of the Month', fr: 'Gagnant du mois', ht: 'Gayan mwa a' },
  competitionBody: {
    en: (v: Vars) =>
      `Answer the daily question, earn points, and climb the leaderboard. The participant with the most points at the end of each month wins $${v.amount}.`,
    fr: (v: Vars) =>
      `Répondez à la question du jour, gagnez des points et grimpez au classement. Le participant avec le plus de points à la fin de chaque mois gagne ${v.amount} $.`,
    ht: (v: Vars) =>
      `Reponn kesyon chak jou a, ranmase pwen, epi monte nan klasman an. Patisipan ki gen plis pwen nan fen chak mwa genyen ${v.amount} $.`,
  },
  place: { en: (v: Vars) => `${v.place} Place`, fr: (v: Vars) => `${v.place}e place`, ht: (v: Vars) => `${v.place}yèm plas` },
  placeOrdinal: { en: (v: Vars) => `${v.place}ST`, fr: (v: Vars) => `${v.place}E`, ht: (v: Vars) => `${v.place}È` },
  pts: { en: (v: Vars) => `${v.points} pts`, fr: (v: Vars) => `${v.points} pts`, ht: (v: Vars) => `${v.points} pwen` },
  monthlyScore: { en: 'Monthly score', fr: 'Score du mois', ht: 'Eskò mwa a' },
  wantToBeNextWinner: {
    en: "Want to be next month's winner?",
    fr: 'Envie de gagner le mois prochain ?',
    ht: 'Ou vle vin gayan mwa pwochen an?',
  },
  competitionEncourage: {
    en: 'Come back every day, answer the question correctly, and collect as many points as possible. The leaderboard resets every month, giving everyone a new chance to win.',
    fr: "Revenez chaque jour, répondez correctement à la question et accumulez le plus de points possible. Le classement est remis à zéro chaque mois, donnant à chacun une nouvelle chance de gagner.",
    ht: "Tounen vin gade chak jou, reponn kesyon an kòrèkteman, epi ranmase kantite pwen posib. Klasman an rekòmanse chak mwa, sa bay tout moun yon nouvo chans pou genyen.",
  },
  upcoming: { en: 'Upcoming', fr: 'À venir', ht: 'K ap vini' },
  pastClasses: { en: 'Past classes', fr: 'Cours passés', ht: 'Kou ki pase' },
  classCount: {
    en: (v: Vars) => `${v.count} ${v.count === 1 ? 'class' : 'classes'}`,
    fr: (v: Vars) => `${v.count} cours`,
    ht: (v: Vars) => `${v.count} kou`,
  },
  noUpcomingClasses: {
    en: 'No upcoming classes right now.',
    fr: 'Aucun cours à venir pour le moment.',
    ht: 'Pa gen kou k ap vini kounye a.',
  },
  checkBackSoon: {
    en: 'Check back soon. New technology sessions are added regularly.',
    fr: 'Revenez bientôt. De nouvelles sessions technologiques sont ajoutées régulièrement.',
    ht: 'Tounen vin gade byento. Nouvo seyans teknolojik ajoute regilyèman.',
  },
  noClassesForLanguage: {
    en: 'No classes in this language yet.',
    fr: 'Aucun cours dans cette langue pour le moment.',
    ht: 'Poko gen kou nan lang sa a.',
  },

  // TechnologyAside carousel (aria-labels + slide controls)
  schoolInfoAria: {
    en: 'School information and announcements',
    fr: "Informations et annonces de l'école",
    ht: 'Enfòmasyon ak anons lekòl la',
  },
  previousSlide: { en: 'Previous slide', fr: 'Diapositive précédente', ht: 'Slide anvan' },
  nextSlide: { en: 'Next slide', fr: 'Diapositive suivante', ht: 'Slide apre' },
  openSlide: {
    en: (v: Vars) => `Open slide ${v.index}: ${v.label}`,
    fr: (v: Vars) => `Ouvrir la diapositive ${v.index}: ${v.label}`,
    ht: (v: Vars) => `Ouvri slide ${v.index}: ${v.label}`,
  },
} satisfies Record<string, Entry>;

export type TranslationKey = keyof typeof dict;

interface LanguageContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey, vars?: Vars) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

function getInitialLanguage(): Language {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === 'en' || stored === 'fr' || stored === 'ht' ? stored : 'en';
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(getInitialLanguage);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, language);
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = (lang: Language) => setLanguageState(lang);
  const t = (key: TranslationKey, vars?: Vars) => resolve(dict[key][language], vars);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within a LanguageProvider');
  return ctx;
}
