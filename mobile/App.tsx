import React, { useCallback, useEffect, useState } from 'react';
import { Alert, AppState, Image, Linking, Pressable, RefreshControl, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TextInput, View } from 'react-native';
import { api, Course, Language, Message, Leaderboard, ContestQuestion, ContestHistory, webUrl } from './src/api';

type Page = 'home' | 'detail' | 'chat';
const colors = { bg: '#0b0e20', surface: '#171b38', border: '#343b65', gold: '#eda634', white: '#f7f3ef', muted: '#b9bfd4' };
const copy = {
  ht: { upcoming: 'Kou k ap vini', past: 'Kou ki pase', chat: 'Chat avèk nou', register: 'Enskri', name: 'Non ou', email: 'Imèl ou', send: 'Voye', back: 'Retounen', paid: 'Enskri sou sit la', empty: 'Poko gen kou.', details: 'Detay kou a', loading: 'Ap chaje...' },
  en: { upcoming: 'Upcoming classes', past: 'Past classes', chat: 'Chat with us', register: 'Register', name: 'Your name', email: 'Your email', send: 'Send', back: 'Back', paid: 'Register on website', empty: 'No classes yet.', details: 'Course details', loading: 'Loading...' },
  fr: { upcoming: 'Cours à venir', past: 'Cours passés', chat: 'Discuter avec nous', register: "S'inscrire", name: 'Votre nom', email: 'Votre e-mail', send: 'Envoyer', back: 'Retour', paid: "S'inscrire sur le site", empty: 'Aucun cours.', details: 'Détails du cours', loading: 'Chargement...' },
};
function Button({ title, onPress, secondary = false, light = false }: { title: string; onPress: () => void; secondary?: boolean; light?: boolean }) {
  return <Pressable onPress={onPress} style={[styles.button, secondary && styles.secondary, light && { backgroundColor: secondary ? '#ffffff' : '#eda634', borderColor: '#c9d1e5' }]}><Text style={[styles.buttonText, secondary && { color: light ? '#18213b' : colors.white }]}>{title}</Text></Pressable>;
}
export default function App() {
  const [language, setLanguage] = useState<Language>('ht');
  const [status, setStatus] = useState<'upcoming' | 'past'>('upcoming');
  const [page, setPage] = useState<Page>('home');
  const [courses, setCourses] = useState<Course[]>([]);
  const [homeCourses, setHomeCourses] = useState<Course[]>([]);
  const [homePast, setHomePast] = useState<Course[]>([]);
  const [slide, setSlide] = useState(0);
  const [selected, setSelected] = useState<Course | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [draft, setDraft] = useState('');
  const [showCourses, setShowCourses] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [leaderboard, setLeaderboard] = useState<Leaderboard | null>(null);
  const [contestQuestion, setContestQuestion] = useState<ContestQuestion | null>(null);
  const [contestHistory, setContestHistory] = useState<ContestHistory[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [contestError, setContestError] = useState('');
  const [lightMode, setLightMode] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const t = copy[language];
  const themedStyles = createStyles(lightMode);

  const loadCourses = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try { setCourses(await api.courses(status, language)); setError(''); }
    catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { if (!quiet) setLoading(false); }
  }, [status, language]);
  useEffect(() => { void loadCourses(); }, [loadCourses]);
  const loadHome = useCallback(async () => {
    try {
      const [upcoming, past] = await Promise.all([api.courses('upcoming', language), api.courses('past', language)]);
      setHomeCourses(upcoming.filter(c => c.language === language));
      setHomePast(past.filter(c => c.language === language));
    } catch (e) { console.warn('Home course refresh failed', e); }
  }, [language]);
  useEffect(() => { void loadHome(); }, [loadHome]);
  // Refresh after returning from the background so admin changes appear without a manual reload.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', next => {
      if (next === 'active') { void loadCourses(true); void loadHome(); }
    });
    return () => subscription.remove();
  }, [loadCourses, loadHome]);
  useEffect(() => {
    const interval = setInterval(() => { if (page === 'home') { void loadCourses(true); void loadHome(); } }, 10000);
    return () => clearInterval(interval);
  }, [loadCourses, loadHome, page]);

  const loadContest = useCallback(async () => {
    try {
      const board = await api.leaderboard();
      setLeaderboard(board); setContestError('');
      try { setContestQuestion(await api.contestQuestion(language)); } catch (e) { console.warn('Contest question unavailable', e); setContestQuestion(null); }
    } catch (e) { setContestError(e instanceof Error ? e.message : String(e)); }
  }, [language]);
  useEffect(() => { void loadContest(); const timer = setInterval(() => void loadContest(), 60000); return () => clearInterval(timer); }, [loadContest]);
  const toggleHistory = async () => {
    if (!showHistory && !contestHistory.length) {
      try { setContestHistory(await api.contestHistory()); } catch (e) { Alert.alert('Konkou', String(e)); }
    }
    setShowHistory(!showHistory);
  };

  const openCourse = async (course: Course) => {
    setSelected(course); setPage('detail');
    try { setSelected(await api.course(course.id)); } catch { /* list preview remains available */ }
  };
  const register = async () => {
    if (!selected) return;
    if (selected.isPaid) {
      await Linking.openURL(webUrl + '/classes/' + encodeURIComponent(selected.id));
      return;
    }
    if (!name.trim() || !/^\S+@\S+\.\S+$/.test(email.trim())) { Alert.alert('Please enter a valid name and email'); return; }
    try {
      const result = await api.register(selected.id, name.trim(), email.trim());
      Alert.alert(result.alreadyRegistered ? 'Already registered' : 'Registration successful');
    } catch (e) { Alert.alert('Registration error', String(e)); }
  };
  const loadMessages = async () => {
    if (!email.trim()) return;
    try { setMessages(await api.messages(email.trim())); } catch (e) { Alert.alert('Chat error', String(e)); }
  };
  const send = async () => {
    if (!name.trim() || !/^\S+@\S+\.\S+$/.test(email.trim()) || !draft.trim()) { Alert.alert('Enter your name, email and message'); return; }
    try {
      await api.sendMessage(name.trim(), email.trim(), draft.trim());
      setDraft(''); await loadMessages();
    } catch (e) { Alert.alert('Chat error', String(e)); }
  };
  return <SafeAreaView style={themedStyles.root}>
    <StatusBar barStyle={lightMode ? "dark-content" : "light-content"} />
    <View style={themedStyles.header}>
      <View style={themedStyles.brandContainer}>
        <Text style={themedStyles.brand}>ⓦ WEBSTER</Text>
        <Text style={themedStyles.subtitle}>TECHNOLOGY SCHOOL</Text>
      </View>
    </View>
    <View style={themedStyles.headerControls}>
      <Pressable accessibilityLabel="Notifications" onPress={() => Alert.alert('Notifikasyon','Notifikasyon yo disponib sou sit entènèt la.')} style={themedStyles.headerAction}><Text style={themedStyles.small}>🔔</Text></Pressable>
      <Pressable accessibilityLabel="Select language" onPress={() => setLanguageOpen(!languageOpen)} style={[themedStyles.headerAction, themedStyles.languageAction]}><Text style={themedStyles.small}>{language==='ht'?'Kreyòl':language==='en'?'English':'Français'} ▾</Text></Pressable>
      <Pressable accessibilityLabel="Toggle appearance" onPress={() => setLightMode(!lightMode)} style={themedStyles.headerAction}><Text style={themedStyles.small}>{lightMode?'☾':'☀️'}</Text></Pressable>
      <Pressable accessibilityLabel="Open menu" onPress={() => setMenuOpen(!menuOpen)} style={themedStyles.headerAction}><Text style={themedStyles.small}>{menuOpen?'✕':'☰'}</Text></Pressable>
    </View>
    {languageOpen && <View style={themedStyles.languageMenu}>{(['en','fr','ht'] as Language[]).map(l=><Pressable key={l} onPress={()=>{setLanguage(l);setLanguageOpen(false);}} style={themedStyles.languageOption}><Text style={themedStyles.small}>{l==='ht'?'Kreyòl':l==='en'?'English':'Français'}</Text></Pressable>)}</View>}
    {menuOpen && <View style={themedStyles.nav}><Button light={lightMode} title={t.upcoming} secondary onPress={() => {setStatus('upcoming');setShowCourses(true);setPage('home');setMenuOpen(false);}} /><Button light={lightMode} title={t.past} secondary onPress={() => {setStatus('past');setShowCourses(true);setPage('home');setMenuOpen(false);}} /><Button light={lightMode} title="Rezève yon kou" secondary onPress={()=>{setMenuOpen(false);void Linking.openURL(webUrl+'/book');}} /></View>}
    {page !== 'home' && <View style={themedStyles.back}><Button light={lightMode} title={'← ' + t.back} secondary onPress={() => setPage('home')} /></View>}
    {page === 'home' && <>
      {!showCourses && <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 100 }}>
        <View style={themedStyles.hero}>
          <Text style={themedStyles.heroBadge}>🟢  FÒMASYON TEKNOLOJIK AN DIRÈK</Text>
          <Text style={themedStyles.heroTitle}>Devlope konpetans <Text style={{ color: lightMode ? '#a66b00' : colors.gold }}>teknolojik demen an.</Text></Text>
          <Text style={themedStyles.heroSubtitle}>Patisipe nan kou pratik an dirèk nan entèlijans atifisyèl ak teknoloji modèn.</Text>
          <View style={themedStyles.chips}><Text style={themedStyles.chip}>Kou an dirèk sou Zoom</Text><Text style={themedStyles.chip}>Pwojè pratik</Text><Text style={themedStyles.chip}>Konpetans pwofesyonèl</Text></View>
          <View style={{ alignSelf: 'flex-start', marginTop: 32 }}><Button light={lightMode} title="Dekouvri kou k ap vini yo  →" onPress={() => {setStatus('upcoming');setShowCourses(true);}} /></View>
          <View style={themedStyles.welcome}><Text style={themedStyles.gold}>● BYENVENI                         {String(slide + 1).padStart(2, '0')} / 10</Text><Text style={[themedStyles.gold, { marginTop: 24, letterSpacing: 2 }]}>APRANN. BATI. GRANDI.</Text><Text style={themedStyles.title}>{['Webster Technology School','Kòmanse Vwayaj Teknolojik Ou','Kou an dirèk sou Zoom','Pwojè pratik','Entèlijans Atifisyèl','Aprann avèk pwofesè','Konpetans pwofesyonèl','Aprann nan lang ou','Bati avni ou','Dekouvri kou nou yo'][slide]}</Text><Text style={themedStyles.heroSubtitle}>Aprann konpetans teknolojik pratik atravè kou an dirèk, entèraktif e ki fokis sou karyè.</Text><View style={{flexDirection:'row',gap:12,marginTop:20}}><Button light={lightMode} title="←" secondary onPress={()=>setSlide((slide+9)%10)}/><Button light={lightMode} title="→" secondary onPress={()=>setSlide((slide+1)%10)}/></View></View>
        </View>
        <View style={themedStyles.homeSection}><View style={themedStyles.card}><Text style={themedStyles.gold}>KONKOU CHAK MWA · GENYEN 100 $</Text><Text style={themedStyles.displayTitle}>Gayan mwa a</Text><Text style={themedStyles.body}>Reponn kesyon chak jou a, ranmase pwen, epi monte nan klasman an. Patisipan ki gen plis pwen nan fen chak mwa genyen 100 $.</Text>{[{name:'Ana',points:120,image:'https://randomuser.me/api/portraits/women/44.jpg'},{name:'John',points:95,image:'https://randomuser.me/api/portraits/men/35.jpg'},{name:'Maria',points:78,image:'https://randomuser.me/api/portraits/women/68.jpg'}].map((w,i)=><View key={w.name} style={[themedStyles.winner,i===0&&themedStyles.firstWinner]}><Text style={themedStyles.medal}>{['🥇','🥈','🥉'][i]}</Text><Image source={{uri:w.image}} style={themedStyles.avatar}/><Text style={themedStyles.displayTitle}>{w.name}</Text><Text style={themedStyles.muted}>{i+1}YÈM PLAS</Text><View style={themedStyles.score}><Text style={themedStyles.scoreText}>{w.points} pwen</Text><Text style={themedStyles.scoreSub}>Eskò mwa a</Text></View></View>)}<Text style={themedStyles.muted}>Egzanp gayan ki parèt sou sit entènèt la; yo pa klasman an dirèk.</Text><View style={themedStyles.winner}><Text style={themedStyles.title}>🏆 Ou vle vin gayan mwa pwochen an?</Text><Text style={themedStyles.body}>Tounen vin gade chak jou, reponn kesyon an kòrèkteman, epi ranmase kantite pwen posib.</Text></View></View>
          <View style={themedStyles.statsRow}>
            {[{label:'K AP VINI',value:homeCourses.length},{label:'FINI',value:homePast.length},{label:'ENSKRIPSYON',value:[...homeCourses,...homePast].reduce((sum,c)=>sum+c.registrationCount,0)}].map(item=><View key={item.label} style={themedStyles.statBox}><Text style={themedStyles.statNumber}>{item.value}</Text><Text style={themedStyles.statLabel}>{item.label}</Text></View>)}
          </View>
          <View style={themedStyles.card}>
            <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center'}}><Text style={themedStyles.title}>🏆 Gayan mwa a</Text><Text style={themedStyles.prize}>$100</Text></View>
            <Text style={themedStyles.muted}>Reponn premye a kesyon chak jou a pou fè pwen. Moun ki gen plis pwen nan fen mwa a genyen $100.</Text>
            {contestError ? <Text style={themedStyles.error}>{contestError}</Text> : !leaderboard ? <Text style={themedStyles.muted}>Ap chaje konkou a...</Text> : <>
              <View style={themedStyles.contestNotice}><Text style={themedStyles.medal}>🏆</Text><Text style={themedStyles.body}>{leaderboard.periodEnded ? leaderboard.monthWinner ? leaderboard.monthWinner.name+' — '+leaderboard.monthWinner.points+' pwen' : 'Konkou mwa sa a fini.' : contestQuestion ? contestQuestion.subject+' — '+contestQuestion.questionText : 'Poko gen kesyon pou jodi a.'}</Text>{leaderboard.periodEnded && <Text style={themedStyles.muted}>N ap tann administratè a kòmanse yon nouvo konkou.</Text>}</View>
              <Text style={themedStyles.statLabel}>KLASMAN</Text>
              {leaderboard.contestants.length===0 ? <Text style={themedStyles.muted}>Poko gen patisipan — se ou ki premye pou enskri.</Text> : leaderboard.contestants.map((person,i)=><View key={person.id} style={themedStyles.leaderRow}><Text style={themedStyles.gold}>{i+1}</Text><Image source={{uri:person.imageUrl}} style={themedStyles.leaderAvatar}/><Text style={[themedStyles.body,{flex:1}]}>{person.name}</Text><Text style={themedStyles.gold}>{person.points} pwen</Text></View>)}
              <Pressable onPress={()=>void toggleHistory()}><Text style={[themedStyles.muted,{textAlign:'center',marginTop:10}]}>{showHistory?'Kache ansyen gayan yo':'Gade ansyen gayan yo'}</Text></Pressable>
              {showHistory && (contestHistory.length ? contestHistory.map(h=><Text key={h.id} style={themedStyles.muted}>{h.periodMonth} · {h.contestantName} · {h.points} pwen</Text>) : <Text style={themedStyles.muted}>Poko gen ansyen gayan.</Text>)}
              {!leaderboard.periodEnded && <Button light={lightMode} title="Patisipe nan konkou a →" onPress={()=>void Linking.openURL(webUrl)} />}
            </>}
          </View>
          <Text style={themedStyles.title}>{t.upcoming}</Text>
          <View style={themedStyles.statsRow}>
            <Text style={themedStyles.stat}>{homeCourses.length}  {t.upcoming}</Text>
            <Text style={themedStyles.stat}>{homePast.length}  {t.past}</Text>
          </View>
          {homeCourses.length === 0 && <Text style={themedStyles.muted}>{t.empty}</Text>}
          {homeCourses.map(course => <Pressable key={course.id} style={themedStyles.card} onPress={() => void openCourse(course)}>
            {!!course.imageUrl && <Image source={{ uri: course.imageUrl }} style={themedStyles.poster} resizeMode="contain" />}
            <Text style={themedStyles.title}>{course.title}</Text>
            <Text style={themedStyles.muted}>{course.description}</Text>
            {course.classDate && <Text style={themedStyles.gold}>{new Date(course.classDate).toLocaleString()}</Text>}
            <Text style={themedStyles.gold}>{t.details} →</Text>
          </Pressable>)}
          <Button light={lightMode} title={t.past} secondary onPress={() => { setStatus('past'); setShowCourses(true); }} />
          <Button light={lightMode} title={language === 'ht' ? 'Rezève yon kou' : language === 'fr' ? 'Réserver un cours' : 'Book a class'} onPress={() => void Linking.openURL(webUrl + '/book')} />
        </View>
      </ScrollView>}
      {showCourses && <>
      <View style={themedStyles.back}><Button light={lightMode} title="← Akèy" secondary onPress={() => setShowCourses(false)} /></View>
      <View style={themedStyles.tabs}><Button light={lightMode} title={t.upcoming} secondary={status !== 'upcoming'} onPress={() => setStatus('upcoming')} /><Button light={lightMode} title={t.past} secondary={status !== 'past'} onPress={() => setStatus('past')} /></View>
      <ScrollView contentContainerStyle={themedStyles.content} refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void loadCourses()} />}>
        {!!error && <Text style={themedStyles.error}>{error}</Text>}
        {!loading && !error && courses.length === 0 && <Text style={themedStyles.muted}>{t.empty}</Text>}
        {courses.map(course => <Pressable key={course.id} style={themedStyles.card} onPress={() => void openCourse(course)}>
          {!!course.imageUrl && <Image source={{ uri: course.imageUrl }} style={themedStyles.poster} resizeMode="contain" />}
          <Text style={themedStyles.title}>{course.title}</Text>
          <Text style={themedStyles.muted} numberOfLines={4}>{course.description}</Text>
          <Text style={themedStyles.gold}>{course.isPaid ? 'Paid course' : 'Free course'} · {course.registrationCount} registered</Text>
          <Text style={themedStyles.gold}>{t.details} →</Text>
        </Pressable>)}
      </ScrollView>
      </>}
    </>}
    {page === 'detail' && selected && <ScrollView contentContainerStyle={themedStyles.content}>
      {!!selected.imageUrl && <Image source={{ uri: selected.imageUrl }} style={themedStyles.detailPoster} resizeMode="contain" />}
      <Text style={themedStyles.title}>{selected.title}</Text>
      <Text style={themedStyles.body}>{selected.description}</Text>
      {selected.classDate && <Text style={themedStyles.gold}>{new Date(selected.classDate).toLocaleString()}</Text>}
      {!selected.isPaid && <><TextInput placeholder={t.name} placeholderTextColor={colors.muted} value={name} onChangeText={setName} style={themedStyles.input} />
      <TextInput placeholder={t.email} placeholderTextColor={colors.muted} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" style={themedStyles.input} /></>}
      <Button light={lightMode} title={selected.isPaid ? t.paid : t.register} onPress={() => void register()} />
      {selected.isPaid && <Text style={themedStyles.muted}>Paid enrollment is completed securely on the existing website.</Text>}
    </ScrollView>}
    {page === 'chat' && <ScrollView contentContainerStyle={themedStyles.content}>
      <Text style={themedStyles.title}>{t.chat}</Text>
      <TextInput placeholder={t.name} placeholderTextColor={colors.muted} value={name} onChangeText={setName} style={themedStyles.input} />
      <TextInput placeholder={t.email} placeholderTextColor={colors.muted} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" style={themedStyles.input} />
      <Button light={lightMode} title="Load conversation" secondary onPress={() => void loadMessages()} />
      {messages.map(m => <View key={m.id} style={themedStyles.message}><Text style={themedStyles.gold}>{m.sender === 'admin' ? 'Webster Technology School' : m.name}</Text><Text style={themedStyles.body}>{m.text}</Text></View>)}
      <TextInput placeholder={t.chat} placeholderTextColor={colors.muted} multiline value={draft} onChangeText={setDraft} style={[themedStyles.input, { minHeight: 90 }]} />
      <Button light={lightMode} title={t.send} onPress={() => void send()} />
    </ScrollView>}
    {page !== 'chat' && <View style={themedStyles.chatButton}><Button light={lightMode} title={'💬  ' + t.chat} onPress={() => { setPage('chat'); void loadMessages(); }} /></View>}
  </SafeAreaView>;
}
const createStyles = (light: boolean) => {
  const c = light ? { ...colors, bg: '#f4f6ff', surface: '#ffffff', border: '#c9d1e5', white: '#18213b', muted: '#4f5c76', gold: '#a66b00' } : colors;
  return StyleSheet.create({
  statBox:{flex:1,minWidth:0,borderWidth:1,borderColor:c.border,borderRadius:12,paddingVertical:18,alignItems:'center',backgroundColor:c.surface},statNumber:{fontSize:24,fontWeight:'bold',color:c.white},statLabel:{fontSize:10,color:c.muted,letterSpacing:1},prize:{backgroundColor:c.gold,color:c.bg,paddingHorizontal:12,paddingVertical:6,borderRadius:4},contestNotice:{backgroundColor:c.bg,borderWidth:1,borderColor:c.border,padding:18,alignItems:'center',gap:8},leaderRow:{flexDirection:'row',alignItems:'center',gap:10,paddingVertical:7},leaderAvatar:{width:32,height:32,borderRadius:16},
  brandContainer: { width: '100%', alignItems: 'center', justifyContent: 'center' }, headerControls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-evenly', paddingHorizontal: 12, paddingVertical: 12, gap: 12, borderBottomWidth: 1, borderColor: c.border }, languageAction: { minWidth: 112, alignItems: 'center' }, headerAction: { paddingHorizontal: 12, paddingVertical: 12, borderWidth: 1, borderColor: c.border, marginLeft: 3, minHeight: 52, justifyContent:'center' }, languageMenu: {position:'absolute',zIndex:20,top:112,right:65,backgroundColor:c.surface,borderWidth:1,borderColor:c.border,minWidth:140},languageOption:{padding:12,borderBottomWidth:1,borderColor:c.border},displayTitle:{fontSize:32,fontFamily:'Georgia',fontWeight:'bold',color:c.white},winner:{alignItems:'center',gap:10,borderRadius:16,borderWidth:1,borderColor:c.border,padding:20,backgroundColor:'#202744'},firstWinner:{borderColor:c.gold,borderWidth:2},medal:{fontSize:35},avatar:{height:88,width:88,borderRadius:44,borderWidth:3,borderColor:c.gold},score:{backgroundColor:c.gold,padding:16,borderRadius:12,alignItems:'center',alignSelf:'stretch'},scoreText:{color:c.bg,fontSize:24},scoreSub:{color:c.bg,fontSize:12},
  homeSection: { paddingTop: 28, gap: 16 }, statsRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' }, stat: { color: c.gold, backgroundColor: c.surface, padding: 12, borderRadius: 10 },
  root: { flex: 1, backgroundColor: c.bg }, hero: { backgroundColor: light ? '#ffffff' : '#141936', borderWidth: 1, borderColor: c.border, borderRadius: 18, padding: 20, minHeight: 0 }, heroBadge: { color: c.white, fontSize: 10, letterSpacing: 1, backgroundColor: light ? '#e4eaf7' : '#303550', padding: 12, borderRadius: 25, overflow: 'hidden', alignSelf: 'flex-start' }, heroTitle: { color: c.white, fontSize: 37, fontFamily: 'Georgia', fontWeight: 'bold', lineHeight: 43, marginTop: 28 }, heroSubtitle: { color: c.muted, fontSize: 15, lineHeight: 26, marginTop: 20 }, chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 28 }, chip: { color: c.white, fontSize: 11, backgroundColor: light ? '#e4eaf7' : '#292d45', padding: 10, borderRadius: 24, overflow: 'hidden' }, welcome: { backgroundColor: light ? '#e7ecfb' : '#202a51', borderRadius: 16, padding: 20, marginTop: 44, minHeight: 270, gap: 8 }, header: { paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderColor: c.border, flexDirection: 'row', alignItems: 'center' }, brand: { color: c.white, fontSize: 20, fontWeight: 'bold', textAlign: 'center' }, subtitle: { color: c.gold, fontSize: 10, letterSpacing: 2, marginTop: 5, textAlign: 'center' }, nav: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 8 }, lang: { padding: 9, borderRadius: 8, backgroundColor: c.surface }, active: { backgroundColor: '#8b641e' }, small: { color: c.white, fontSize: 16 }, tabs: { flexDirection: 'row', gap: 8, padding: 12 }, back: { alignItems: 'flex-start', padding: 10 }, button: { paddingHorizontal: 15, paddingVertical: 12, backgroundColor: c.gold, borderRadius: 9, alignItems: 'center' }, secondary: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border }, buttonText: { color: c.bg, fontWeight: 'bold', fontSize: 13 }, content: { padding: 16, paddingBottom: 100, gap: 14 }, card: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 15, padding: 14, gap: 12 }, poster: { width: '100%', height: 340 }, detailPoster: { width: '100%', height: 450 }, title: { color: c.white, fontSize: 24, fontFamily: 'Georgia', fontWeight: 'bold' }, body: { color: c.white, fontSize: 16, lineHeight: 25 }, muted: { color: c.muted, lineHeight: 22 }, gold: { color: c.gold, marginTop: 4 }, error: { color: '#ff8585' }, input: { color: c.white, backgroundColor: c.surface, borderColor: c.border, borderWidth: 1, padding: 14, borderRadius: 8 }, message: { backgroundColor: c.surface, borderRadius: 10, padding: 12, gap: 5 }, chatButton: { position: 'absolute', bottom: 10, right: 10, opacity: 0.95 },
  });
};
const styles = createStyles(false);
