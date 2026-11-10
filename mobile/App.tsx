import React, { useCallback, useEffect, useState } from 'react';
import { Alert, AppState, Image, Linking, Pressable, RefreshControl, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TextInput, View } from 'react-native';
import { api, Course, Language, Message, webUrl } from './src/api';

type Page = 'home' | 'detail' | 'chat';
const colors = { bg: '#0b0e20', surface: '#171b38', border: '#343b65', gold: '#eda634', white: '#f7f3ef', muted: '#b9bfd4' };
const copy = {
  ht: { upcoming: 'Kou k ap vini', past: 'Kou ki pase', chat: 'Chat avèk nou', register: 'Enskri', name: 'Non ou', email: 'Imèl ou', send: 'Voye', back: 'Retounen', paid: 'Enskri sou sit la', empty: 'Poko gen kou.', details: 'Detay kou a', loading: 'Ap chaje...' },
  en: { upcoming: 'Upcoming classes', past: 'Past classes', chat: 'Chat with us', register: 'Register', name: 'Your name', email: 'Your email', send: 'Send', back: 'Back', paid: 'Register on website', empty: 'No classes yet.', details: 'Course details', loading: 'Loading...' },
  fr: { upcoming: 'Cours à venir', past: 'Cours passés', chat: 'Discuter avec nous', register: "S'inscrire", name: 'Votre nom', email: 'Votre e-mail', send: 'Envoyer', back: 'Retour', paid: "S'inscrire sur le site", empty: 'Aucun cours.', details: 'Détails du cours', loading: 'Chargement...' },
};
function Button({ title, onPress, secondary = false }: { title: string; onPress: () => void; secondary?: boolean }) {
  return <Pressable onPress={onPress} style={[styles.button, secondary && styles.secondary]}><Text style={[styles.buttonText, secondary && { color: colors.white }]}>{title}</Text></Pressable>;
}
export default function App() {
  const [language, setLanguage] = useState<Language>('ht');
  const [status, setStatus] = useState<'upcoming' | 'past'>('upcoming');
  const [page, setPage] = useState<Page>('home');
  const [courses, setCourses] = useState<Course[]>([]);
  const [selected, setSelected] = useState<Course | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const t = copy[language];

  const loadCourses = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try { setCourses(await api.courses(status, language)); setError(''); }
    catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { if (!quiet) setLoading(false); }
  }, [status, language]);
  useEffect(() => { void loadCourses(); }, [loadCourses]);
  // Refresh after returning from the background so admin changes appear without a manual reload.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', next => {
      if (next === 'active') void loadCourses(true);
    });
    return () => subscription.remove();
  }, [loadCourses]);
  useEffect(() => {
    const interval = setInterval(() => { if (page === 'home') void loadCourses(true); }, 10000);
    return () => clearInterval(interval);
  }, [loadCourses, page]);

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
  return <SafeAreaView style={styles.root}>
    <StatusBar barStyle="light-content" />
    <View style={styles.header}><Text style={styles.brand}>ⓦ  WEBSTER</Text><Text style={styles.subtitle}>TECHNOLOGY SCHOOL</Text></View>
    <View style={styles.nav}>
      {(['ht', 'en', 'fr'] as Language[]).map(l => <Pressable key={l} onPress={() => setLanguage(l)} style={[styles.lang, l === language && styles.active]}><Text style={styles.small}>{l === 'ht' ? 'Kreyòl' : l.toUpperCase()}</Text></Pressable>)}
    </View>
    {page !== 'home' && <View style={styles.back}><Button title={'← ' + t.back} secondary onPress={() => setPage('home')} /></View>}
    {page === 'home' && <>
      <View style={styles.tabs}><Button title={t.upcoming} secondary={status !== 'upcoming'} onPress={() => setStatus('upcoming')} /><Button title={t.past} secondary={status !== 'past'} onPress={() => setStatus('past')} /></View>
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void loadCourses()} />}>
        {!!error && <Text style={styles.error}>{error}</Text>}
        {!loading && !error && courses.length === 0 && <Text style={styles.muted}>{t.empty}</Text>}
        {courses.map(course => <Pressable key={course.id} style={styles.card} onPress={() => void openCourse(course)}>
          {!!course.imageUrl && <Image source={{ uri: course.imageUrl }} style={styles.poster} resizeMode="contain" />}
          <Text style={styles.title}>{course.title}</Text>
          <Text style={styles.muted} numberOfLines={4}>{course.description}</Text>
          <Text style={styles.gold}>{course.isPaid ? 'Paid course' : 'Free course'} · {course.registrationCount} registered</Text>
          <Text style={styles.gold}>{t.details} →</Text>
        </Pressable>)}
      </ScrollView>
    </>}
    {page === 'detail' && selected && <ScrollView contentContainerStyle={styles.content}>
      {!!selected.imageUrl && <Image source={{ uri: selected.imageUrl }} style={styles.detailPoster} resizeMode="contain" />}
      <Text style={styles.title}>{selected.title}</Text>
      <Text style={styles.body}>{selected.description}</Text>
      {selected.classDate && <Text style={styles.gold}>{new Date(selected.classDate).toLocaleString()}</Text>}
      {!selected.isPaid && <><TextInput placeholder={t.name} placeholderTextColor={colors.muted} value={name} onChangeText={setName} style={styles.input} />
      <TextInput placeholder={t.email} placeholderTextColor={colors.muted} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" style={styles.input} /></>}
      <Button title={selected.isPaid ? t.paid : t.register} onPress={() => void register()} />
      {selected.isPaid && <Text style={styles.muted}>Paid enrollment is completed securely on the existing website.</Text>}
    </ScrollView>}
    {page === 'chat' && <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.title}>{t.chat}</Text>
      <TextInput placeholder={t.name} placeholderTextColor={colors.muted} value={name} onChangeText={setName} style={styles.input} />
      <TextInput placeholder={t.email} placeholderTextColor={colors.muted} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" style={styles.input} />
      <Button title="Load conversation" secondary onPress={() => void loadMessages()} />
      {messages.map(m => <View key={m.id} style={styles.message}><Text style={styles.gold}>{m.sender === 'admin' ? 'Webster Technology School' : m.name}</Text><Text style={styles.body}>{m.text}</Text></View>)}
      <TextInput placeholder={t.chat} placeholderTextColor={colors.muted} multiline value={draft} onChangeText={setDraft} style={[styles.input, { minHeight: 90 }]} />
      <Button title={t.send} onPress={() => void send()} />
    </ScrollView>}
    {page !== 'chat' && <View style={styles.chatButton}><Button title={'💬  ' + t.chat} onPress={() => { setPage('chat'); void loadMessages(); }} /></View>}
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg }, header: { padding: 18, borderBottomWidth: 1, borderColor: colors.border }, brand: { color: colors.white, fontSize: 26, fontWeight: 'bold' }, subtitle: { color: colors.gold, fontSize: 10, letterSpacing: 3 }, nav: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 8 }, lang: { padding: 9, borderRadius: 8, backgroundColor: colors.surface }, active: { backgroundColor: '#8b641e' }, small: { color: colors.white, fontSize: 12 }, tabs: { flexDirection: 'row', gap: 8, padding: 12 }, back: { alignItems: 'flex-start', padding: 10 }, button: { paddingHorizontal: 15, paddingVertical: 12, backgroundColor: colors.gold, borderRadius: 9, alignItems: 'center' }, secondary: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }, buttonText: { color: colors.bg, fontWeight: 'bold', fontSize: 13 }, content: { padding: 16, paddingBottom: 100, gap: 14 }, card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 15, padding: 14, gap: 12 }, poster: { width: '100%', height: 340 }, detailPoster: { width: '100%', height: 450 }, title: { color: colors.white, fontSize: 24, fontWeight: 'bold' }, body: { color: colors.white, fontSize: 16, lineHeight: 25 }, muted: { color: colors.muted, lineHeight: 22 }, gold: { color: colors.gold, marginTop: 4 }, error: { color: '#ff8585' }, input: { color: colors.white, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, padding: 14, borderRadius: 8 }, message: { backgroundColor: colors.surface, borderRadius: 10, padding: 12, gap: 5 }, chatButton: { position: 'absolute', bottom: 16, right: 16 },
});
