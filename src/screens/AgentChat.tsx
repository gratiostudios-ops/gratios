import React, { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { pendingRequestText } from '../data/home-interaction';
import { useAppData } from '../data/AppData';
import { ActionChip, AppText, TypingIndicator } from '../components/UI';
import { RichText } from '../components/RichText';
import { colors, fonts } from '../theme';

export function AgentChat({ agent, onClose }: { agent: { id: string; name: string }; onClose(): void }) {
  const { conversations, conversation, send } = useAppData();
  const [draft, setDraft] = useState('');
  const insets = useSafeAreaInsets();
  const history = conversations.find(item => item.agentId === agent.id)?.history ?? [];
  const state = conversation(null, agent.id);
  const sentText = pendingRequestText(state);
  const latest = history[history.length - 1];
  return <Modal animationType="slide" onRequestClose={onClose}>
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={[styles.screen, { paddingTop: Math.max(insets.top, 20), paddingBottom: Math.max(insets.bottom, 16) }]}>
      <View style={styles.header}><AppText accessibilityRole="header" style={styles.title}>{agent.name}</AppText><Pressable accessibilityRole="button" onPress={onClose} style={styles.button}><AppText style={styles.link}>Close</AppText></Pressable></View>
      <ScrollView style={styles.history} contentContainerStyle={{ gap: 16, padding: 20 }} keyboardShouldPersistTaps="handled">
        {history.map(message => <View key={message.id} style={styles.message}><AppText style={styles.label}>{message.role === 'user' ? 'You' : agent.name}</AppText><RichText style={styles.text} text={message.reply?.text ?? message.text} highlights={message.reply?.highlights} />{message.reply?.actions && <View style={styles.actions}>{message.reply.actions.map(action => <ActionChip key={action.id} action={action} onPress={text => { void send(null, text, agent.id); }} disabled={state.status === 'thinking'} />)}</View>}</View>)}
        {history.length === 0 && !state.sent && <AppText style={styles.text}>Start a conversation with {agent.name}.</AppText>}
        {state.status === 'thinking' && <TypingIndicator />}
        {state.reply?.text && (latest?.role !== 'assistant' || latest.text !== state.reply.text) && <View><RichText accessibilityLiveRegion="polite" style={styles.text} text={state.reply.text} highlights={state.reply.highlights} />{state.reply.actions && <View style={styles.actions}>{state.reply.actions.map(action => <ActionChip key={action.id} action={action} onPress={text => { void send(null, text, agent.id); }} disabled={state.status === 'thinking'} />)}</View>}</View>}
      </ScrollView>
      {sentText && <View style={{ alignSelf: 'flex-end', maxWidth: '88%', marginHorizontal: 20, marginBottom: 8, padding: 12, borderRadius: 16, backgroundColor: '#242424' }}><AppText selectable style={styles.text}>{sentText}</AppText></View>}
      <View style={styles.composer}><TextInput accessibilityLabel={`Message ${agent.name}`} value={draft} onChangeText={setDraft} placeholder="Your message" placeholderTextColor={colors.muted} multiline style={styles.input} /><Pressable accessibilityRole="button" disabled={!draft.trim() || state.status === 'thinking'} onPress={() => { const text = draft.trim(); setDraft(''); void send(null, text, agent.id); }} style={styles.button}><AppText style={styles.link}>Send</AppText></Pressable></View>
    </KeyboardAvoidingView>
  </Modal>;
}
const styles = StyleSheet.create({
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  screen: { flex: 1, backgroundColor: colors.background }, header: { minHeight: 56, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center' }, title: { fontFamily: fonts.semibold, fontSize: 20, flex: 1 }, button: { padding: 12, minHeight: 44, justifyContent: 'center' }, link: { color: colors.blue }, history: { flex: 1 }, message: { gap: 5 }, label: { color: colors.muted, fontSize: 12 }, text: { color: colors.body, lineHeight: 23 }, composer: { paddingHorizontal: 16, flexDirection: 'row', gap: 8, alignItems: 'center' }, input: { flex: 1, maxHeight: 130, minHeight: 48, color: colors.text, backgroundColor: colors.surface, padding: 12, borderRadius: 16 },
});
