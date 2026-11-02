import { HapticPressable as Pressable } from '../components/HapticControls';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, AppState, Keyboard, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurTargetView, BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppData } from '../data/AppData';
import { pendingRequestText, homeFindings, findingPreview } from '../data/home-interaction';
import { responseMessages } from '../data/conversations';
import { gateway } from '../auth/Auth';
import { useTaskStack } from '../data/useTaskCard';
import type { Action, Finding, Reply, Task } from '../data/types';
import { bottomTabHeight, colors, fonts, layout } from '../theme';
import { ActionChip, AppText, TypingIndicator } from '../components/UI';
import { Icon } from '../components/Icons';
import { FindingContent } from '../components/FindingContent';
import { TaskBannerStack } from '../components/TaskBannerStack';
import { type MenuActions } from '../components/Navigation';
import { SafeImage } from '../components/SafeImage';
import { RichText } from '../components/RichText';
import { TalkingCharacter, mouthForWord, type MouthShape } from '../components/TalkingCharacter';
import { visibleText } from '../../../backend/shared/response';

const canvasHeroHeight = (height: number, topInset: number) => Math.max(Math.max(topInset, 27) + 100, height - 244);

const suggestionSets: Action[][] = [
  [{ id: 'day', label: 'Help me plan my day', message: 'Help me plan my day.' }, { id: 'inbox', label: 'Summarise my emails', message: 'Summarise my recent emails.' }],
  [{ id: 'focus', label: 'Help me focus', message: 'Suggest a simple plan to help me focus today.' }, { id: 'priorities', label: 'Set my priorities', message: 'Help me work out my priorities for today.' }],
  [{ id: 'week', label: 'Plan my week', message: 'Help me plan my week.' }, { id: 'break', label: 'Suggest a quick break', message: 'Suggest a refreshing five-minute break.' }],
  [{ id: 'learn', label: 'Teach me something new', message: 'Teach me an interesting useful idea in a few sentences.' }, { id: 'ideas', label: 'Help me brainstorm', message: 'Help me brainstorm. Ask what I am working on.' }],
];
// One selection per JS launch, shared across Home remounts and foreground resumes.
let launchSuggestions: Promise<Action[]> | undefined;
function getLaunchSuggestions() {
  return launchSuggestions ??= (async () => {
    try {
      const previous = Number(await AsyncStorage.getItem('avocado:suggestion-launch'));
      const index = Number.isInteger(previous) && previous >= 0 ? (previous + 1) % suggestionSets.length : 0;
      await AsyncStorage.setItem('avocado:suggestion-launch', String(index));
      return suggestionSets[index];
    } catch { return suggestionSets[Math.floor(Math.random() * suggestionSets.length)]; }
  })();
}

function SuggestionButtons({ actions, onAction }: { actions: Action[]; onAction: (message: string) => void }) {
  return <View style={styles.suggestions}><View style={styles.suggestionChips}>
    {actions.slice(0, 2).map(action => <ActionChip key={action.id} action={action} onPress={onAction} />)}
  </View></View>;
}

function ReplyText({ reply, visibleCharacters }: { reply: Reply; visibleCharacters: number }) {
  return <RichText style={styles.replyText} text={reply.text} highlights={reply.highlights} visibleCharacters={visibleCharacters} />;
}

export function TypewriterReply({ messages, progress, onAction, working, suggestions, onSpeakingChange }: {
  messages: { id: string; reply: Reply }[]; progress: Map<string, number>; onAction: (message: string) => void;
  working: boolean; suggestions?: Action[];
  onSpeakingChange: (speaking: boolean) => void;
}) {
  const latest = messages[messages.length - 1];
  const [displayed, setDisplayed] = useState<(typeof messages)[number] | undefined>(latest);
  const pending = useRef(latest);
  const finishedAt = useRef<number | null>(null);
  const messageId = displayed?.id ?? '';
  const reply = displayed?.reply ?? { text: '' };
  const plainText = visibleText(reply.text);
  const length = Array.from(plainText).length;
  const words = useMemo(() => {
    let end = 0;
    return (plainText.match(/\s*\S+\s*/gu) ?? []).map(token => {
      end += Array.from(token).length;
      return { text: token.trim(), end };
    });
  }, [plainText]);
  const [visibleCharacters, setVisibleCharacters] = useState(() => progress.get(messageId) ?? 0);
  const [mouth, setMouth] = useState<MouthShape>('smile');
  const [finishedSpeaking, setFinishedSpeaking] = useState(() => (progress.get(messageId) ?? 0) >= length);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [wakePrompt, setWakePrompt] = useState(false);
  const scroll = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const followLatest = useRef(true);
  // New snapshots update the pending reply without interrupting the current speech.
  pending.current = latest;
  useEffect(() => {
    if (!latest) {
      setDisplayed(undefined);
      finishedAt.current = null;
      return;
    }
    if (!displayed) {
      setDisplayed(latest);
      return;
    }
    if (!finishedSpeaking) return;
    if (finishedAt.current === null) finishedAt.current = Date.now();
    if (latest.id === displayed.id) return;
    const timer = setTimeout(() => {
      const next = pending.current;
      if (!next || next.id === displayed.id) return;
      finishedAt.current = null;
      setVisibleCharacters(progress.get(next.id) ?? 0);
      setFinishedSpeaking(false);
      setWakePrompt(false);
      scroll.current?.scrollTo({ y: 0, animated: false });
      setDisplayed(next);
    }, Math.max(0, finishedAt.current + 500 - Date.now()));
    return () => clearTimeout(timer);
  }, [latest?.id, displayed?.id, finishedSpeaking, progress]);
  useEffect(() => {
    followLatest.current = true;
    let cursor = progress.get(messageId) ?? 0;
    setVisibleCharacters(cursor);
    finishedAt.current = cursor >= length ? Date.now() : null;
    setFinishedSpeaking(cursor >= length);
    setMouth('smile');
    setWakePrompt(false);
    let timer: ReturnType<typeof setTimeout> | undefined;
    let mouthTimer: ReturnType<typeof setTimeout> | undefined;
    let disposed = false;
    const stopTimers = () => { if (timer) clearTimeout(timer); if (mouthTimer) clearTimeout(mouthTimer); };
    const displayStarted=performance.now();
    let firstTextLogged=false;
    let completionLogged=cursor>=length;
    const revealAll = () => {
      if (disposed) return;
      stopTimers();
      if(!completionLogged){completionLogged=true;console.log(JSON.stringify({event:'app_text_complete',timestamp:new Date().toISOString(),replyId:messageId,durationSeconds:(performance.now()-displayStarted)/1000}));}
      cursor = length;
      progress.set(messageId, cursor);
      setVisibleCharacters(cursor);
      setMouth('smile');
      finishedAt.current = Date.now();
      setFinishedSpeaking(true);
    };
    const motionPreference = (enabled: boolean) => { if (!disposed) { setReduceMotion(enabled); if (enabled) revealAll(); } };
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', motionPreference);
    void AccessibilityInfo.isReduceMotionEnabled().then(motionPreference).catch(() => {});
    let wordIndex = words.findIndex(word => word.end > cursor);
    const revealWord = () => {
      if (disposed) return;
      if (wordIndex < 0 || wordIndex >= words.length) { revealAll(); return; }
      if(!firstTextLogged){firstTextLogged=true;console.log(JSON.stringify({event:'app_first_text',timestamp:new Date().toISOString(),replyId:messageId,durationSeconds:(performance.now()-displayStarted)/1000}));}
      const word = words[wordIndex++];
      cursor = word.end;
      progress.set(messageId, cursor);
      setVisibleCharacters(cursor);
      const shape = mouthForWord(word.text);
      setMouth(shape);
      const duration = (Math.min(260, 110 + Array.from(word.text).length * 15) + (/[.!?]$/.test(word.text) ? 160 : /[,;:]$/.test(word.text) ? 80 : 0)) / 1.15;
      if (Array.from(word.text).length >= 6) mouthTimer = setTimeout(() => {
        if (!disposed) setMouth(shape === 'small' ? 'wide' : 'small');
      }, duration * 0.55);
      timer = setTimeout(revealWord, duration);
    };
    if (cursor < length) timer = setTimeout(revealWord, 60 / 1.15);
    return () => { disposed = true; stopTimers(); subscription.remove(); };
  }, [length, messageId, progress, words]);
  const complete = visibleCharacters >= length;
  useEffect(() => { onSpeakingChange(!!displayed && !finishedSpeaking); }, [displayed, finishedSpeaking, onSpeakingChange]);
  return <View style={styles.replyRow}>
    <View style={styles.assistantSlot}>
      <TalkingCharacter mouth={working && finishedSpeaking ? 'smile' : mouth} sleeping={!working && finishedSpeaking} reduceMotion={reduceMotion}
        onWake={() => setWakePrompt(true)} onSleep={() => setWakePrompt(false)} />
    </View>
    <ScrollView ref={scroll} style={styles.replyScroll} showsVerticalScrollIndicator keyboardShouldPersistTaps="handled" contentContainerStyle={styles.reply}
    onContentSizeChange={() => { if (followLatest.current) scroll.current?.scrollToEnd({ animated: false }); }}
    onScroll={({ nativeEvent }) => { followLatest.current = nativeEvent.contentSize.height - nativeEvent.contentOffset.y - nativeEvent.layoutMeasurement.height < 24; }} scrollEventThrottle={16}
    accessibilityLiveRegion={complete ? 'polite' : 'none'}>
    {wakePrompt ? <AppText accessibilityLiveRegion="polite" style={styles.replyHighlight}>What can I do for you?</AppText> : displayed ? <View key={displayed.id} style={styles.replyBubble}>
      <ReplyText reply={displayed.reply} visibleCharacters={visibleCharacters} />
      {complete && displayed.reply.actions && <View style={styles.replyActions}>{displayed.reply.actions.map(action => <ActionChip key={action.id} action={action} onPress={onAction} />)}</View>}
    </View> : null}
    {!messages.length && suggestions?.length ? <SuggestionButtons actions={suggestions} onAction={onAction} /> : null}
    </ScrollView>
  </View>;
}

export function Composer({ value, setValue, onSend, onCancel, running, keyboardActive }: {
  value: string; setValue: (text: string) => void; onSend: () => void; onCancel: () => void; running: boolean;
  keyboardActive: boolean;
}) {
  const lineHeight = 22;
  const [focused, setFocused] = useState(false);
  const [contentHeight, setContentHeight] = useState(lineHeight);
  useEffect(() => { if (!value) setContentHeight(lineHeight); }, [value]);
  const inputHeight = Math.min(lineHeight * 6, Math.max(lineHeight, contentHeight));
  return <View style={[styles.composer, { height: Math.max(layout.inputHeight, inputHeight + 24) }]}>
    {keyboardActive && <View pointerEvents="none" style={styles.activeInputBorder} />}
    <TextInput accessibilityLabel="Ask anything" placeholder="Ask anything" placeholderTextColor={focused ? '#c9c9c9' : '#999999'} value={value} onChangeText={setValue}
      onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
      multiline submitBehavior="newline" returnKeyType="default" scrollEnabled
      onContentSizeChange={({ nativeEvent: { contentSize } }) => setContentHeight(value ? Math.ceil(contentSize.height) : lineHeight)}
      style={[styles.input, { height: inputHeight }, focused && { color: '#ffffff' }]} selectionColor={colors.blue} />
    <Pressable accessibilityRole="button" accessibilityLabel={running ? 'Stop response' : 'Send message'} accessibilityState={{ disabled: !running && !value.trim() }} disabled={!running && !value.trim()} onPress={() => {  if (running) onCancel(); else onSend(); }} hitSlop={4} style={({ pressed }) => [styles.send, (pressed || !running && !value.trim()) && { opacity: 0.4 }]}>
      <Icon name={running ? 'stop' : 'send'} size={22 * 1.35 * 1.1} />
    </Pressable>
  </View>;
}

export function HomeScreen({ isActive, onNewCard, onContact, onBannerVisibilityChange, onOpenFinding, ...menuActions }: MenuActions & { isActive: boolean; onNewCard: () => void; onContact(): void; onBannerVisibilityChange?(visible: boolean): void; onOpenFinding(finding:Finding):void }) {
  const { snapshot, loading, agents, completeTask, restoreTask, actionErrors, conversation, send, cancel, markCardSeen } = useAppData();
  const insets = useSafeAreaInsets();

  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [draft, setDraft] = useState('');
  const [generalSuggestions, setGeneralSuggestions] = useState<Action[]>(suggestionSets[0]);
  useEffect(() => {
    let active = true;
    void getLaunchSuggestions().then(actions => { if (active) setGeneralSuggestions(actions); });
    return () => { active = false; };
  }, []);
  const [speaking, setSpeaking] = useState(false);
  const replyProgress = useRef(new Map<string, number>()).current;
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [viewportHeight, setViewportHeight] = useState(0);
  const [fullHeight, setFullHeight] = useState(0);
  const blurTarget = useRef<React.ComponentRef<typeof View>>(null);
  const [chromeHeight, setChromeHeight] = useState(0);
  const [undoTaskItem, setUndoTaskItem] = useState<Task | null>(null);
  const undoProgress = useRef(new Animated.Value(0)).current;
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [feedOffset,setFeedOffset]=useState(0);
  const [featuredBounds,setFeaturedBounds]=useState({y:0,height:0});
  const knownCards = useRef<Set<string> | null>(null);
  useEffect(() => {
    if (loading) return;
    const incoming = knownCards.current && snapshot.findings.find(card => !knownCards.current!.has(card.id));
    if (!knownCards.current) knownCards.current = new Set();
    for (const card of snapshot.findings) knownCards.current.add(card.id);
    if (incoming) {
      // Keep the current screen and scroll position when background results arrive.
    }
  }, [snapshot.findings, loading, onNewCard]);
  const {featured:finding,others}=homeFindings(snapshot);
  const state = conversation(finding?.id??null,finding?.agentId);
  const sentText = pendingRequestText(state);
  const taskStack = useTaskStack(snapshot.tasks, loading, isActive, gateway.cacheIdentity??'demo');
  const hasTasks = taskStack.items.length > 0;
  useEffect(() => { onBannerVisibilityChange?.(isActive && hasTasks); }, [hasTasks, isActive, onBannerVisibilityChange]);
  const bottomPadding = 8;
  const reclaimedHeight = Math.max(0, bottomTabHeight(insets.bottom) - bottomPadding);
  const responseHeight = Math.max(74, 74 + reclaimedHeight - 24);
  // Screen-space anchors do not move when the sent text or composer grows.
  const screenHeight = keyboardOpen ? viewportHeight : (fullHeight || viewportHeight);
  const responseBottom = Math.max(0, screenHeight - bottomPadding - layout.inputHeight - 10);
  const responseTop = Math.max(insets.top + 100, responseBottom - responseHeight + Math.max(0, (responseHeight - 74) / 2));
  const canvasBottom = Math.max(0, responseTop - 20);
  const chromeAvailableHeight = Math.max(48, canvasHeroHeight(canvasSize.height, insets.top) - insets.top - 8);

  useEffect(() => {
    const shown = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => setKeyboardOpen(true));
    const hidden = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setKeyboardOpen(false));
    return () => { shown.remove(); hidden.remove(); };
  }, []);

  const sendText = useCallback((text: string) => {
    if (!text.trim() || state.status === 'thinking') return;
    setDraft('');
    Keyboard.dismiss();
    void send(finding?.id??null, text,finding?.agentId);
  }, [send, state.status,finding?.id,finding?.agentId]);

  const completeWithUndo = useCallback(async (task: Task) => {
    if(!await completeTask(task.id,task.kind))return false;
    if (undoTimer.current) clearTimeout(undoTimer.current);
    setUndoTaskItem(task);
    undoProgress.setValue(0);
    Animated.spring(undoProgress, { toValue: 1, speed: 28, bounciness: 4, useNativeDriver: Platform.OS !== 'web' }).start();
    undoTimer.current = setTimeout(() => {
      undoTimer.current = null;
      Animated.timing(undoProgress, { toValue: 0, duration: 180, useNativeDriver: Platform.OS !== 'web' }).start(({ finished }) => {
        if (finished) setUndoTaskItem(null);
      });
    }, 3000);
    return true;
  }, [completeTask, undoProgress]);

  const undoCompletion = useCallback(async () => {
    if (!undoTaskItem) return;
    if (undoTimer.current) clearTimeout(undoTimer.current);
    undoTimer.current = null;
    if(!await restoreTask(undoTaskItem))return;
    setUndoTaskItem(null);
    undoProgress.stopAnimation();
    undoProgress.setValue(0);

  }, [restoreTask, undoProgress, undoTaskItem]);

  useEffect(() => () => { if (undoTimer.current) clearTimeout(undoTimer.current); }, []);

  const visibleCardId=finding&&featuredBounds.height>0&&featuredBounds.y+featuredBounds.height>feedOffset&&featuredBounds.y<feedOffset+canvasSize.height?finding.id:null;
  useEffect(() => {
    const report=()=>{if(isActive&&AppState.currentState==='active'&&visibleCardId)void markCardSeen(visibleCardId).catch(()=>{});};
    report();
    const subscription=AppState.addEventListener('change',state=>{if(state==='active')report();});
    return ()=>subscription.remove();
  },[isActive,visibleCardId,markCardSeen]);

  const keyboardVisible = keyboardOpen || (fullHeight > 0 && fullHeight - viewportHeight > 80);

  const taskList = <TaskBannerStack items={taskStack.items} expanded={taskStack.expanded} onToggle={taskStack.toggle} onComplete={completeWithUndo} errors={actionErrors}/>;

  return <View style={styles.screen} onLayout={({ nativeEvent: { layout: viewport } }) => {
    setViewportHeight(previous => previous === viewport.height ? previous : viewport.height);
    setFullHeight(previous => previous === 0 || viewport.height > previous ||
      (!keyboardOpen && !Keyboard.isVisible() && Math.abs(previous - viewport.height) < 80) ? viewport.height : previous);
  }}>
    <BlurTargetView ref={blurTarget} style={StyleSheet.absoluteFill}>
    <View style={[styles.canvasFrame, screenHeight > 0 ? { height: canvasBottom } : { bottom: 0 }]}>

    <View style={styles.stage}>
      <LinearGradient pointerEvents="none" colors={['#000000', '#00000000']} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={styles.topFade} />
      <View style={styles.canvasViewport} onLayout={event => setCanvasSize(event.nativeEvent.layout)}>
        <ScrollView accessibilityLabel="Home feed" showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled"
          scrollEventThrottle={32} onScroll={({nativeEvent})=>setFeedOffset(nativeEvent.contentOffset.y)}
          contentContainerStyle={{paddingHorizontal:layout.gutter,paddingTop:hasTasks?Math.max(chromeHeight+16,insets.top+118):insets.top+36,paddingBottom:28}}>
          {finding?<>
            <View onLayout={({nativeEvent:{layout:bounds}})=>setFeaturedBounds({y:bounds.y,height:bounds.height})}>
              <FindingContent finding={finding} onAction={sendText}/>
            </View>
            <View style={styles.updates}>
              {others.map(item=><Pressable key={item.id} accessibilityRole="button" accessibilityLabel={'Open '+item.title}
                onPress={()=>{Keyboard.dismiss();onOpenFinding(item);}} style={styles.updateRow}>
                {'uri' in item.image&&<SafeImage image={item.image} allowAvatar={false} resizeMode="cover" style={styles.updateImage}/>}
                <View style={styles.updateCopy}>
                  <AppText style={styles.updateTitle} numberOfLines={2}>{item.title}</AppText>
                  {!!findingPreview(item)&&<AppText style={styles.updatePreview} numberOfLines={2}>{visibleText(findingPreview(item))}</AppText>}
                  <AppText style={styles.agentLabel}>{agents.find(agent=>agent.id===item.agentId)?.name??'Agent update'}</AppText>
                </View>
              </Pressable>)}
            </View>
          </>:<View style={styles.welcomeCard} accessibilityLabel="Welcome card">
            <AppText style={styles.welcomeHello}>hey,</AppText>
            <AppText accessibilityRole="header" style={styles.welcomeTitle}>Glad you’re here.</AppText>
            <AppText style={styles.welcomeBody}>We can figure out what matters today, one thing at a time.</AppText>
          </View>}
        </ScrollView>
        <LinearGradient pointerEvents="none" colors={['#000000', '#00000000']} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={styles.canvasTopFade} />
        {hasTasks && <View pointerEvents="none" style={[styles.bannerBackdrop, { top: insets.top + 40, height: 8 + 14 + 8 + 45 / 2 }]} />}
        {hasTasks && <View style={[styles.topChrome, { paddingTop: insets.top + 40, paddingLeft: insets.left + layout.gutter, paddingRight: insets.right + layout.gutter }]}
          onLayout={({ nativeEvent: { layout: chrome } }) => setChromeHeight(previous => previous === chrome.height ? previous : chrome.height)}>
          <ScrollView style={{ maxHeight: Math.max(48, chromeAvailableHeight - 40), flexGrow: 0 }} nestedScrollEnabled keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {taskList}
          </ScrollView>
        </View>}
      </View>
    </View>

    </View>
    </BlurTargetView>
    {keyboardVisible && <Pressable accessibilityRole="button" accessibilityLabel="Dismiss keyboard"
      onPress={Keyboard.dismiss} style={styles.keyboardBackdrop}>
      <BlurView pointerEvents="none" blurTarget={blurTarget} blurMethod="dimezisBlurViewSdk31Plus" tint="dark" intensity={20} style={StyleSheet.absoluteFill} />
      <View pointerEvents="none" style={styles.keyboardShade} />
    </Pressable>}
    <View style={[styles.responseFrame, { top: responseTop, height: Math.max(74, responseBottom - responseTop) }]}>
      <TypewriterReply
        messages={responseMessages(state)}
        progress={replyProgress} onAction={sendText} working={state.status === 'thinking'}
        onSpeakingChange={setSpeaking}
        suggestions={!state.sent ? generalSuggestions : undefined}
      />
    </View>
    {state.status === 'thinking' && <View pointerEvents="none" style={[styles.thinkingIndicator, { top: Math.max(responseTop, responseBottom - 40) }]}><TypingIndicator style={styles.thinkingDots} /></View>}
    <View style={[styles.composerDock, { bottom: 8 }]}>
      {sentText && <View style={styles.sentMessage}>
        <ScrollView style={{ maxHeight: 80 }} showsVerticalScrollIndicator={false}><AppText selectable accessibilityLabel="Your sent message" style={styles.sentMessageText}>{sentText}</AppText></ScrollView>
      </View>}
      <View style={styles.composerRow}>
        <Composer value={draft} setValue={setDraft} onSend={() => sendText(draft)} onCancel={() => { setSpeaking(false); void cancel(finding?.id??null,finding?.agentId); }} running={state.status === 'thinking' || speaking || state.stopFailed === true} keyboardActive={keyboardVisible} />
      </View>
    </View>
    {undoTaskItem && <Animated.View pointerEvents="box-none" style={[styles.undoToastPosition, { top: hasTasks ? chromeHeight + 8 : Math.max(insets.top, 8) + 8 }, {
      opacity: undoProgress,
      transform: [
        { translateY: undoProgress.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) },
        { scale: undoProgress.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) },
      ],
    }]}>
      <View style={styles.undoToast}>
        <AppText style={styles.undoLabel}>Task not completed?</AppText>
        {actionErrors[undoTaskItem.id] ? <AppText accessibilityLiveRegion="polite">{actionErrors[undoTaskItem.id]}</AppText> : null}
        <Pressable accessibilityRole="button" accessibilityLabel="Undo task completion" onPress={undoCompletion} hitSlop={8}>
          <AppText style={styles.undoAction}>Undo</AppText>
        </Pressable>
      </View>
    </Animated.View>}
  </View>;
}

const styles = StyleSheet.create({
  sentMessage: { alignSelf: 'stretch', marginLeft: 76, marginBottom: 8, paddingHorizontal: 4 },
  sentMessageText: { color: '#A6A6A6', fontFamily: fonts.medium, fontSize: 14, lineHeight: 17, textAlign: 'right' },
  screen: { flex: 1, backgroundColor: colors.background },
  canvasFrame: { position: 'absolute', top: 0, left: 0, right: 0 },
  stage: { flex: 1, minHeight: 0 },
  canvasViewport: { flex: 1, overflow: 'hidden' },
  canvasContent: { paddingHorizontal: layout.gutter, paddingTop: 10, paddingBottom: 28 },
  canvasTitle: { fontFamily: fonts.semibold, fontSize: 24, lineHeight: 26, color: colors.text, textAlign: 'center', marginRight: 7 },
  topFade: { position: 'absolute', top: 0, left: 0, right: 0, height: 252 },
  canvasTopFade: { position: 'absolute', top: 0, left: 0, right: 0, height: 28 },
  canvasFade: { position: 'absolute', left: 0, right: 0, height: 28, zIndex: 1 },
  bannerBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, backgroundColor: '#000000' },
  topChrome: { position: 'absolute', top: 0, left: 0, right: 0, paddingBottom: 8 },
  welcomeCard: { width: '100%', maxWidth: 380, paddingVertical: 36, paddingHorizontal: 28, alignItems: 'center', gap: 8 },
  welcomeHello: { fontFamily: fonts.semibold, color: '#f2e7da', fontSize: 58, lineHeight: 66, letterSpacing: -3.5, marginBottom: 8 },
  welcomeTitle: { fontFamily: fonts.semibold, fontSize: 28, lineHeight: 34, textAlign: 'center', letterSpacing: -0.5, color: '#ffffff' },
  welcomeBody: { maxWidth: 290, fontFamily: fonts.regular, fontSize: 16, lineHeight: 24, textAlign: 'center', color: '#c9c9c9', marginTop: 6 },
  empty: { paddingHorizontal: 42, justifyContent: 'center', alignItems: 'center' },
  emptyTitle: { fontFamily: fonts.semibold, fontSize: 24, lineHeight: 29, textAlign: 'center' },
  emptyBody: { fontSize: 14, lineHeight: 21, textAlign: 'center', color: colors.muted, marginTop: 12 },
  updates:{marginTop:28},
  updateRow:{borderTopWidth:1,borderTopColor:'#414141',paddingVertical:16,flexDirection:'row',gap:12},
  updateImage:{width:88,height:68,borderRadius:4},
  updateCopy:{flex:1,gap:7},
  updateTitle:{fontFamily:fonts.semibold,fontSize:16,lineHeight:21,color:colors.text},
  updatePreview:{fontSize:14,lineHeight:19,color:colors.secondary},
  agentLabel:{fontSize:11,lineHeight:16,color:'#7fa6ff',backgroundColor:'#202020',borderRadius:12,paddingHorizontal:12,paddingVertical:2,alignSelf:'flex-start'},
  responseFrame: { position: 'absolute', left: layout.gutter, right: layout.gutter, zIndex: 31 },
  thinkingIndicator: { position: 'absolute', left: layout.gutter + 5, height: 40, zIndex: 32, justifyContent: 'center' },
  thinkingDots: { height: 28, paddingHorizontal: 10, borderRadius: 14, backgroundColor: '#292929' },
  suggestions: { flex: 1, justifyContent: 'center', overflow: 'hidden' },
  suggestionChips: { gap: 8, flexShrink: 0, alignItems: 'flex-start' },
  replyRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  assistantSlot: { position: 'absolute', left: 0, top: 8, width: 72.5, height: 72.5, alignItems: 'center', justifyContent: 'center' },
  replyScroll: { flex: 1, alignSelf: 'stretch', minWidth: 0, marginLeft: 88 },
  reply: { flexGrow: 1, justifyContent: 'center', gap: 8 },
  replyBubble: { borderRadius: 16, paddingHorizontal: 4, paddingVertical: 4, gap: 8 },
  replyText: { fontFamily: fonts.bold, fontSize: 16, lineHeight: 22, color: colors.body },
  replyHighlight: { fontFamily: fonts.bold, fontSize: 16, lineHeight: 22, color: '#ffffff' },
  replyActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  composer: { flex: 1, minWidth: 0, minHeight: layout.inputHeight, backgroundColor: '#292929', borderRadius: 26, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', paddingLeft: 16, paddingRight: 7 },
  activeInputBorder: { ...StyleSheet.absoluteFill, borderRadius: 26, borderWidth: 1, borderColor: 'rgba(255,255,255,0.11)' },
  input: { fontFamily: fonts.interface, fontSize: 14, lineHeight: 22, color: colors.text, flex: 1, paddingVertical: 0, marginVertical: 12, paddingRight: 8, textAlignVertical: 'top', ...(Platform.OS === 'web' ? { outlineWidth: 0 } : {}) },
  send: { width: 54, height: 44, alignSelf: 'flex-end', marginBottom: 4, alignItems: 'center', justifyContent: 'center' },
  keyboardBackdrop: { ...StyleSheet.absoluteFill, zIndex: 30 },
  keyboardShade: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.78)' },
  composerDock: { position: 'absolute', left: layout.gutter, right: layout.gutter, minHeight: layout.inputHeight, zIndex: 31, shadowColor: '#000000', shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
  composerRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  undoToastPosition: { position: 'absolute', left: 0, right: 0, alignItems: 'center', zIndex: 20 },
  undoToast: { minHeight: 44, borderRadius: 999, backgroundColor: '#292929', paddingLeft: 17, paddingRight: 8, flexDirection: 'row', alignItems: 'center', gap: 16, shadowColor: '#000000', shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 8 },
  undoLabel: { fontSize: 14, lineHeight: 18, color: '#f3f3f3' },
  undoAction: { fontFamily: fonts.semibold, fontSize: 14, lineHeight: 18, color: '#a9c4ff', paddingVertical: 10, paddingHorizontal: 10 },
});
