import { createContext, useContext, useEffect, useState } from 'react';

export type Language = 'en' | 'fr';

const STORAGE_KEY = 'classboard_language';

type Vars = Record<string, string | number>;
type TranslationValue = string | ((vars: Vars) => string);
type Entry = { en: TranslationValue; fr: TranslationValue };

function resolve(value: TranslationValue, vars?: Vars): string {
  if (typeof value === 'function') return value(vars ?? {});
  if (!vars) return value;
  return value.replace(/\{(\w+)\}/g, (_, key) => String(vars[key] ?? ''));
}

const dict = {
  // Header
  navUpcoming: { en: 'Upcoming Classes', fr: 'Cours à venir' },
  navPast: { en: 'Past Classes', fr: 'Cours passés' },
  navBookClass: { en: 'Book a Class', fr: 'Réserver un cours' },
  navTeacher: { en: 'Teacher', fr: 'Enseignant' },
  navOpenMenu: { en: 'Open menu', fr: 'Ouvrir le menu' },
  navCloseMenu: { en: 'Close menu', fr: 'Fermer le menu' },

  // Footer
  footerTagline: { en: 'Live training, hosted on Zoom.', fr: 'Formation en direct, sur Zoom.' },
  footerRights: {
    en: (v: Vars) => `© ${v.year} Webster Technology School. All rights reserved.`,
    fr: (v: Vars) => `© ${v.year} Webster Technology School. Tous droits réservés.`,
  },

  // Not found
  notFoundTitle: { en: "This page doesn't exist.", fr: "Cette page n'existe pas." },
  backToAllClasses: { en: '← Back to all classes', fr: '← Retour à tous les cours' },

  // Shared
  somethingWentWrong: { en: 'Something went wrong', fr: "Une erreur s'est produite" },

  // Theme toggle
  switchToLight: { en: 'Switch to light mode', fr: 'Passer au mode clair' },
  switchToDark: { en: 'Switch to dark mode', fr: 'Passer au mode sombre' },

  // Countdown (frontend/src/lib/countdown.ts, ClassCard/ClassManager)
  startingNow: { en: 'Starting now', fr: 'Commence maintenant' },
  startsIn: {
    en: (v: Vars) => `Starts in ${v.parts}`,
    fr: (v: Vars) => `Commence dans ${v.parts}`,
  },
  anyMomentNow: { en: 'any moment now', fr: "d'un instant à l'autre" },

  // ClassCard
  selfPaced: { en: 'Self-paced', fr: 'À votre rythme' },
  past: { en: 'PAST', fr: 'PASSÉ' },
  paid: { en: 'PAID', fr: 'PAYANT' },
  registered: { en: (v: Vars) => `${v.count} registered`, fr: (v: Vars) => `${v.count} inscrits` },
  registerArrow: { en: 'Register →', fr: "S'inscrire →" },

  // ClassDetail
  allClasses: { en: '← All classes', fr: '← Tous les cours' },
  classNotFound: { en: 'Class not found.', fr: 'Cours introuvable.' },
  downloadPdf: { en: (v: Vars) => `📄 Download ${v.name}`, fr: (v: Vars) => `📄 Télécharger ${v.name}` },
  downloadPicture: { en: (v: Vars) => `🖼️ Download ${v.name}`, fr: (v: Vars) => `🖼️ Télécharger ${v.name}` },
  defaultPdfName: { en: 'PDF', fr: 'le PDF' },
  defaultPictureName: { en: 'picture', fr: "l'image" },
  youreIn: { en: "You're in.", fr: "C'est fait." },
  copyZoomHint: {
    en: "Copy your Zoom link below and save it — you'll need it to join the class.",
    fr: 'Copiez votre lien Zoom ci-dessous et enregistrez-le — vous en aurez besoin pour rejoindre le cours.',
  },
  copied: { en: 'Copied ✓', fr: 'Copié ✓' },
  copy: { en: 'Copy', fr: 'Copier' },
  paidGateText: {
    en: "This is a paid class. Enter the email you purchased access with to unlock the full class details and Zoom link.",
    fr: "Ceci est un cours payant. Entrez l'e-mail utilisé pour votre achat afin de débloquer tous les détails du cours et le lien Zoom.",
  },
  freeGateText: {
    en: 'Register with your name and email to see the full class details and get the Zoom link.',
    fr: 'Inscrivez-vous avec votre nom et e-mail pour voir tous les détails du cours et obtenir le lien Zoom.',
  },
  fullName: { en: 'Full name', fr: 'Nom complet' },
  email: { en: 'Email', fr: 'E-mail' },
  checking: { en: 'Checking…', fr: 'Vérification…' },
  unlockThisClass: { en: 'Unlock this class', fr: 'Débloquer ce cours' },
  registerToUnlock: { en: 'Register to unlock details', fr: 'Inscrivez-vous pour voir les détails' },
  studyNotes: { en: 'Study notes', fr: "Notes d'étude" },
  moreVideos: { en: 'More videos', fr: 'Plus de vidéos' },
  unplayableVideo: {
    en: (v: Vars) =>
      `This link couldn't be recognized as a playable video (${v.url}). It needs to be a specific YouTube/Vimeo video link, or a direct .mp4 file — not just the site's homepage.`,
    fr: (v: Vars) =>
      `Ce lien n'a pas pu être reconnu comme une vidéo lisible (${v.url}). Il doit s'agir d'un lien précis vers une vidéo YouTube/Vimeo, ou d'un fichier .mp4 direct — pas seulement la page d'accueil du site.`,
  },
  yourZoomLink: { en: 'Your Zoom link', fr: 'Votre lien Zoom' },
  zoomLinkLabel: { en: 'Zoom link:', fr: 'Lien Zoom :' },
  peopleRegistered: {
    en: (v: Vars) => `${v.count} people registered`,
    fr: (v: Vars) => `${v.count} personnes inscrites`,
  },
  whosRegistered: { en: "Who's registered", fr: 'Qui est inscrit' },

  // BookClass
  requestSentTitle: { en: 'Request sent.', fr: 'Demande envoyée.' },
  requestSentBody: {
    en: (v: Vars) =>
      `We got your class request and will reach out at ${v.email} to confirm the schedule.`,
    fr: (v: Vars) =>
      `Nous avons bien reçu votre demande et vous contacterons à ${v.email} pour confirmer l'horaire.`,
  },
  bookAClass: { en: 'Book a class', fr: 'Réserver un cours' },
  bookClassIntro: {
    en: "Tell us what you'd like to learn and when works for you — we'll set it up and confirm the details.",
    fr: 'Dites-nous ce que vous aimeriez apprendre et quand cela vous convient — nous organiserons le cours et confirmerons les détails.',
  },
  phone: { en: 'Phone', fr: 'Téléphone' },
  whatLearn: { en: 'What do you want to learn?', fr: 'Que voulez-vous apprendre ?' },
  describeClassPlaceholder: {
    en: "Describe the class you'd like — topic, level, goals…",
    fr: 'Décrivez le cours souhaité — sujet, niveau, objectifs…',
  },
  preferredDateTime: { en: 'Preferred date & time', fr: 'Date et heure préférées' },
  yourZoomLinkLabel: { en: 'Your Zoom link', fr: 'Votre lien Zoom' },
  shareZoomHint: {
    en: 'Share your Zoom room so the teacher can join you there.',
    fr: 'Partagez votre salle Zoom pour que le professeur puisse vous y rejoindre.',
  },
  sending: { en: 'Sending…', fr: 'Envoi…' },
  requestThisClass: { en: 'Request this class', fr: 'Demander ce cours' },

  // VideoComments
  comments: { en: (v: Vars) => `Comments${v.count ? ` (${v.count})` : ''}`, fr: (v: Vars) => `Commentaires${v.count ? ` (${v.count})` : ''}` },
  loadingComments: { en: 'Loading comments…', fr: 'Chargement des commentaires…' },
  noCommentsYet: { en: 'No comments yet — be the first.', fr: 'Aucun commentaire pour le moment — soyez le premier.' },
  yourName: { en: 'Your name', fr: 'Votre nom' },
  yourRegisteredEmail: { en: 'Your registered email', fr: 'Votre e-mail enregistré' },
  addCommentPlaceholder: { en: 'Add a comment…', fr: 'Ajouter un commentaire…' },
  posting: { en: 'Posting…', fr: 'Publication…' },
  postComment: { en: 'Post comment', fr: 'Publier' },

  // ChatWidget
  chatWithUs: { en: 'Chat with us', fr: 'Discutez avec nous' },
  closeChat: { en: 'Close chat', fr: 'Fermer le chat' },
  openChat: { en: 'Open chat', fr: 'Ouvrir le chat' },
  continuingAs: {
    en: (v: Vars) => `Continuing as ${v.name} (${v.email})`,
    fr: (v: Vars) => `Vous continuez en tant que ${v.name} (${v.email})`,
  },
  howCanWeHelp: { en: 'How can we help?', fr: 'Comment pouvons-nous vous aider ?' },
  startChat: { en: 'Start chat', fr: 'Démarrer le chat' },
  notYouDifferent: { en: 'Not you? Use a different name/email', fr: "Pas vous ? Utilisez un autre nom/e-mail" },
  chatIntro: {
    en: "Send us a message and we'll get back to you here.",
    fr: 'Envoyez-nous un message et nous vous répondrons ici.',
  },
  yourEmail: { en: 'Your email', fr: 'Votre e-mail' },
  alreadyChatted: {
    en: 'Already chatted with us? See your messages',
    fr: 'Déjà discuté avec nous ? Voir vos messages',
  },
  resumeChatIntro: {
    en: 'Enter the email you used before to see your conversation.',
    fr: 'Entrez l\'e-mail utilisé précédemment pour voir votre conversation.',
  },
  looking: { en: 'Looking…', fr: 'Recherche…' },
  viewMyChat: { en: 'View my chat', fr: 'Voir mon chat' },
  backArrow: { en: '← Back', fr: '← Retour' },
  loadingEllipsis: { en: 'Loading…', fr: 'Chargement…' },
  noMessagesYet: { en: 'No messages yet.', fr: 'Aucun message pour le moment.' },
  typeMessagePlaceholder: { en: 'Type a message…', fr: 'Écrire un message…' },
  send: { en: 'Send', fr: 'Envoyer' },
  notYouStartOver: { en: 'Not you? Start a new chat', fr: 'Pas vous ? Démarrer un nouveau chat' },
  haveQuestion: { en: 'Have a question? Chat with us', fr: 'Une question ? Discutez avec nous' },
  couldNotSendMessage: { en: 'Could not send your message.', fr: "Impossible d'envoyer votre message." },
  couldNotFindConversation: {
    en: "We couldn't find a conversation for that email.",
    fr: "Nous n'avons trouvé aucune conversation pour cet e-mail.",
  },
  newMessageFrom: { en: (v: Vars) => `New message from ${v.school}`, fr: (v: Vars) => `Nouveau message de ${v.school}` },

  // WinnerOfMonth
  winnerOfMonth: { en: '🏆 Winner of the Month', fr: '🏆 Gagnant du mois' },
  contestIntro: {
    en: "Answer the daily question first to score points. Most points by month's end wins $100.",
    fr: "Répondez le premier à la question du jour pour marquer des points. Le plus de points à la fin du mois gagne 100 $.",
  },
  newQuestionAt: {
    en: (v: Vars) => `New question at 12pm ET · next in ${v.countdown}`,
    fr: (v: Vars) => `Nouvelle question à 12h ET · prochaine dans ${v.countdown}`,
  },
  monthWinnerSuffix: {
    en: (v: Vars) => ` won this month with ${v.points} points!`,
    fr: (v: Vars) => ` a gagné ce mois-ci avec ${v.points} points !`,
  },
  contestEndedNoWinner: { en: "This month's contest has ended.", fr: 'Le concours de ce mois-ci est terminé.' },
  waitingForAdminReset: {
    en: 'Waiting for the admin to start a new contest.',
    fr: 'En attente que l\'administrateur relance un nouveau concours.',
  },
  noQuestionYetCheckBack: {
    en: (v: Vars) => `No question posted yet today — check back in ${v.countdown}.`,
    fr: (v: Vars) => `Aucune question publiée aujourd'hui — revenez dans ${v.countdown}.`,
  },
  notYouSwitchAccount: { en: 'Not you? Switch account', fr: 'Pas vous ? Changer de compte' },
  joinNowToBeReady: { en: 'Join now to be ready', fr: 'Inscrivez-vous dès maintenant' },
  phoneNumberPlaceholder: { en: 'Phone number', fr: 'Numéro de téléphone' },
  choosePhoto: { en: 'Choose a photo…', fr: 'Choisir une photo…' },
  joining: { en: 'Joining…', fr: 'Inscription…' },
  joinNow: { en: 'Join now', fr: "S'inscrire" },
  alreadyAnsweredBy: {
    en: (v: Vars) => `Already answered${v.winner ? ` by ${v.winner}` : ''}. Check back tomorrow.`,
    fr: (v: Vars) => `Déjà répondu${v.winner ? ` par ${v.winner}` : ''}. Revenez demain.`,
  },
  alreadyAnsweredToday: {
    en: "You've already answered today's question. Check back tomorrow.",
    fr: "Vous avez déjà répondu à la question du jour. Revenez demain.",
  },
  yourAnswerPlaceholder: { en: 'Your answer', fr: 'Votre réponse' },
  submitting: { en: 'Submitting…', fr: 'Envoi…' },
  submitAnswer: { en: 'Submit answer', fr: 'Envoyer la réponse' },
  joinSubmitAnswer: { en: 'Join & submit answer', fr: "S'inscrire et répondre" },
  leaderboard: { en: 'Leaderboard', fr: 'Classement' },
  loadingEllipsisShort: { en: 'Loading…', fr: 'Chargement…' },
  noContestantsYet: { en: 'No contestants yet — be the first to join.', fr: 'Aucun participant pour le moment — soyez le premier à vous inscrire.' },
  pointsToGoal: {
    en: (v: Vars) => `${v.points} / ${v.goal} points (${v.pct}% to goal)`,
    fr: (v: Vars) => `${v.points} / ${v.goal} points (${v.pct} % de l'objectif)`,
  },
  rankHash: { en: (v: Vars) => `Rank #${v.rank}`, fr: (v: Vars) => `Rang n°${v.rank}` },
  joinedOn: {
    en: (v: Vars) => `Joined ${v.date}`,
    fr: (v: Vars) => `Inscrit le ${v.date}`,
  },
  hidePastWinners: { en: 'Hide past winners', fr: 'Masquer les anciens gagnants' },
  seePastWinners: { en: 'See past winners', fr: 'Voir les anciens gagnants' },
  noPastWinnersYet: { en: 'No past winners yet.', fr: 'Aucun ancien gagnant pour le moment.' },
  addPhotoToJoin: { en: 'Add a photo to join.', fr: 'Ajoutez une photo pour vous inscrire.' },
  couldNotJoinContest: { en: 'Could not join the contest.', fr: 'Impossible de rejoindre le concours.' },
  couldNotSubmitAnswer: { en: 'Could not submit your answer.', fr: "Impossible d'envoyer votre réponse." },
  correctFirstResult: { en: 'Correct — you were first! +10 points 🎉', fr: 'Correct — vous êtes le premier ! +10 points 🎉' },
  correctNotFirstResult: {
    en: 'Correct, but someone else answered first today.',
    fr: "Correct, mais quelqu'un d'autre a répondu en premier aujourd'hui.",
  },
  incorrectResult: { en: 'Not quite — try again tomorrow.', fr: "Pas tout à fait — réessayez demain." },

  // Home
  loadingClasses: { en: 'Loading classes', fr: 'Chargement des cours' },
  heroLine1: { en: 'Build the technology', fr: 'Développez les compétences' },
  heroLine2: { en: 'skills of tomorrow.', fr: 'technologiques de demain.' },
  heroSubtitle: {
    en: 'Join practical live classes in artificial intelligence, and modern technology.',
    fr: "Suivez des cours en direct et pratiques en intelligence artificielle et en technologies modernes.",
  },
  liveTechTraining: { en: 'Live technology training', fr: 'Formation technologique en direct' },
  heroFeatureLiveZoom: { en: 'Live Zoom classes', fr: 'Cours en direct sur Zoom' },
  heroFeatureHandsOn: { en: 'Hands-on projects', fr: 'Projets pratiques' },
  heroFeatureIndustry: { en: 'Industry skills', fr: 'Compétences professionnelles' },
  exploreUpcomingClasses: { en: 'Explore upcoming classes', fr: 'Découvrir les cours à venir' },
  statUpcoming: { en: 'Upcoming', fr: 'À venir' },
  statCompleted: { en: 'Completed', fr: 'Terminés' },
  statRegistrations: { en: 'Registrations', fr: 'Inscriptions' },
  monthlyCompetition: {
    en: (v: Vars) => `Monthly Competition · Win $${v.amount}`,
    fr: (v: Vars) => `Concours mensuel · Gagnez ${v.amount} $`,
  },
  winnerOfTheMonth: { en: 'Winner of the Month', fr: 'Gagnant du mois' },
  competitionBody: {
    en: (v: Vars) =>
      `Answer the daily question, earn points, and climb the leaderboard. The participant with the most points at the end of each month wins $${v.amount}.`,
    fr: (v: Vars) =>
      `Répondez à la question du jour, gagnez des points et grimpez au classement. Le participant avec le plus de points à la fin de chaque mois gagne ${v.amount} $.`,
  },
  place: { en: (v: Vars) => `${v.place} Place`, fr: (v: Vars) => `${v.place}e place` },
  placeOrdinal: { en: (v: Vars) => `${v.place}ST`, fr: (v: Vars) => `${v.place}E` },
  pts: { en: (v: Vars) => `${v.points} pts`, fr: (v: Vars) => `${v.points} pts` },
  monthlyScore: { en: 'Monthly score', fr: 'Score du mois' },
  wantToBeNextWinner: { en: "Want to be next month's winner?", fr: 'Envie de gagner le mois prochain ?' },
  competitionEncourage: {
    en: 'Come back every day, answer the question correctly, and collect as many points as possible. The leaderboard resets every month, giving everyone a new chance to win.',
    fr: "Revenez chaque jour, répondez correctement à la question et accumulez le plus de points possible. Le classement est remis à zéro chaque mois, donnant à chacun une nouvelle chance de gagner.",
  },
  upcoming: { en: 'Upcoming', fr: 'À venir' },
  pastClasses: { en: 'Past classes', fr: 'Cours passés' },
  classCount: {
    en: (v: Vars) => `${v.count} ${v.count === 1 ? 'class' : 'classes'}`,
    fr: (v: Vars) => `${v.count} cours`,
  },
  noUpcomingClasses: { en: 'No upcoming classes right now.', fr: 'Aucun cours à venir pour le moment.' },
  checkBackSoon: {
    en: 'Check back soon. New technology sessions are added regularly.',
    fr: 'Revenez bientôt. De nouvelles sessions technologiques sont ajoutées régulièrement.',
  },

  // TechnologyAside carousel (aria-labels + slide controls)
  schoolInfoAria: { en: 'School information and announcements', fr: "Informations et annonces de l'école" },
  previousSlide: { en: 'Previous slide', fr: 'Diapositive précédente' },
  nextSlide: { en: 'Next slide', fr: 'Diapositive suivante' },
  openSlide: { en: (v: Vars) => `Open slide ${v.index}: ${v.label}`, fr: (v: Vars) => `Ouvrir la diapositive ${v.index}: ${v.label}` },
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
  return stored === 'en' || stored === 'fr' ? stored : 'en';
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
