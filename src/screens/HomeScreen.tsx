import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, AppState, FlatList, Keyboard, Platform, Pressable, ScrollView, StyleSheet, TextInput, View, type FlatListProps } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurTargetView, BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppData } from '../data/AppData';
import { useTaskCard } from '../data/useTaskCard';
import type { Action, AgentIcon, Finding, ImageReference, Reply, Task } from '../data/types';
import { bottomTabHeight, colors, fonts, layout } from '../theme';
import { ActionChip, AppText, TypingIndicator } from '../components/UI';
import { Icon } from '../components/Icons';
import { Content } from '../components/Content';
import { TaskCard } from '../components/TaskCard';
import { NavigationButton, type MenuActions } from '../components/Navigation';
import { cardImage } from '../assets';
import { SafeImage } from '../components/SafeImage';
import { RichText } from '../components/RichText';
import { TalkingCharacter, mouthForWord, type MouthShape } from '../components/TalkingCharacter';
import { visibleText } from '../../../shared/response';

const canvasHeroHeight = (height: number, topInset: number) => Math.max(Math.max(topInset, 27) + 100, height - 244);

function SuggestionButtons({ actions, onAction }: { actions: Action[]; onAction: (message: string) => void }) {
  const rows = [actions.slice(0, 1), actions.slice(1, 3)];
  return <View style={styles.suggestions}><View style={styles.suggestionChips}>
    {rows.map((row, index) => row.length > 0 && <View key={index} style={styles.suggestionRow}>
      {row.map(action => <View key={action.id} style={styles.suggestionCell}>
        <ActionChip action={action} onPress={onAction} />
      </View>)}
    </View>)}
  </View></View>;
}

function ReplyText({ reply, visibleCharacters }: { reply: Reply; visibleCharacters: number }) {
  return <RichText style={styles.replyText} text={reply.text} highlights={reply.highlights} visibleCharacters={visibleCharacters} />;
}

function TypewriterReply({ reply, progress, onAction }: {
  reply: Reply; progress: WeakMap<Reply, number>; onAction: (message: string) => void;
}) {
  const plainText = visibleText(reply.text);
  const length = Array.from(plainText).length;
  const words = useMemo(() => {
    let end = 0;
    return (plainText.match(/\s*\S+\s*/gu) ?? []).map(token => {
      end += Array.from(token).length;
      return { text: token.trim(), end };
    });
  }, [plainText]);
  const [visibleCharacters, setVisibleCharacters] = useState(() => progress.get(reply) ?? 0);
  const [mouth, setMouth] = useState<MouthShape>('smile');
  const [finishedSpeaking, setFinishedSpeaking] = useState(() => (progress.get(reply) ?? 0) >= length);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [wakePrompt, setWakePrompt] = useState(false);
  useEffect(() => {
    let cursor = progress.get(reply) ?? 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let mouthTimer: ReturnType<typeof setTimeout> | undefined;
    let disposed = false;
    const stopTimers = () => { if (timer) clearTimeout(timer); if (mouthTimer) clearTimeout(mouthTimer); };
    const revealAll = () => {
      if (disposed) return;
      stopTimers();
      cursor = length;
      progress.set(reply, cursor);
      setVisibleCharacters(cursor);
      setMouth('smile');
      setFinishedSpeaking(true);
    };
    const motionPreference = (enabled: boolean) => { if (!disposed) { setReduceMotion(enabled); if (enabled) revealAll(); } };
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', motionPreference);
    void AccessibilityInfo.isReduceMotionEnabled().then(motionPreference).catch(() => {});
    let wordIndex = words.findIndex(word => word.end > cursor);
    const revealWord = () => {
      if (disposed) return;
      if (wordIndex < 0 || wordIndex >= words.length) { revealAll(); return; }
      const word = words[wordIndex++];
      cursor = word.end;
      progress.set(reply, cursor);
      setVisibleCharacters(cursor);
      const shape = mouthForWord(word.text);
      setMouth(shape);
      const duration = Math.min(260, 110 + Array.from(word.text).length * 15) + (/[.!?]$/.test(word.text) ? 160 : /[,;:]$/.test(word.text) ? 80 : 0);
      if (Array.from(word.text).length >= 6) mouthTimer = setTimeout(() => {
        if (!disposed) setMouth(shape === 'small' ? 'wide' : 'small');
      }, duration * 0.55);
      timer = setTimeout(revealWord, duration);
    };
    if (cursor < length) timer = setTimeout(revealWord, 60);
    return () => { disposed = true; stopTimers(); subscription.remove(); };
  }, [length, progress, reply, words]);
  const complete = visibleCharacters >= length;
  return <View style={styles.replyRow}>
    <TalkingCharacter mouth={mouth} sleeping={finishedSpeaking} reduceMotion={reduceMotion}
      onWake={() => setWakePrompt(true)} onSleep={() => setWakePrompt(false)} />
    <ScrollView style={styles.replyScroll} showsVerticalScrollIndicator keyboardShouldPersistTaps="handled" contentContainerStyle={styles.reply}
    accessibilityLiveRegion={complete ? 'polite' : 'none'}>
    <View style={styles.replyBubble}>
      {wakePrompt ? <AppText accessibilityLiveRegion="polite" style={styles.replyHighlight}>What do you need?</AppText> : <>
        <ReplyText reply={reply} visibleCharacters={visibleCharacters} />
        {complete && reply.actions && <View style={styles.replyActions}>{reply.actions.map(action => <ActionChip key={action.id} action={action} onPress={onAction} />)}</View>}
      </>}
    </View>
    </ScrollView>
  </View>;
}

function Figure({ image, heroHeight, taskHeight, hasTasks }: { image: ImageReference; heroHeight: number; taskHeight: number; hasTasks: boolean }) {
  const dimensions = useRef(new Animated.Value(0)).current;
  const isFlight = image.asset === 'flight';
  const baseWidth = isFlight ? 181 : 276;
  const baseHeight = isFlight ? 173 : 207;
  const available = Math.max(0, heroHeight - taskHeight + 7);
  const targetHeight = Math.min(hasTasks ? baseHeight : baseHeight * 1.32, available);
  useEffect(() => {
    const animation = Animated.timing(dimensions, { toValue: targetHeight, duration: 240, useNativeDriver: false });
    animation.start();
    return () => animation.stop();
  }, [dimensions, targetHeight]);
  return <View style={{ height: heroHeight, alignItems: 'center', justifyContent: 'flex-end', transform: [{ translateX: -5 }] }}>
    <Animated.View style={{ width: Animated.multiply(dimensions, baseWidth / baseHeight), height: dimensions, overflow: 'hidden', marginBottom: -7 }}>
      <SafeImage image={image} allowAvatar={false} resizeMode="contain" accessibilityLabel="Agent illustration" style={[
        StyleSheet.absoluteFill, { width: '100%', height: '100%' },
      ]} />
    </Animated.View>
  </View>;
}

function CanvasPage({ finding, width, height, taskHeight, hasTasks, onAction, scrollPositions }: {
  finding: Finding; width: number; height: number; taskHeight: number; hasTasks: boolean;
  onAction: (message: string) => void; scrollPositions: Map<string, number>;
}) {
  const insets = useSafeAreaInsets();
  const heroHeight = canvasHeroHeight(height, insets.top);
  return <ScrollView style={{ width, height }} contentContainerStyle={styles.canvasContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" accessibilityLabel={finding.title}
    contentOffset={{ x: 0, y: scrollPositions.get(finding.id) ?? 0 }} scrollEventThrottle={32}
    onScroll={({ nativeEvent }) => scrollPositions.set(finding.id, nativeEvent.contentOffset.y)}>
    <Figure image={finding.image} heroHeight={heroHeight} taskHeight={taskHeight} hasTasks={hasTasks} />
    <AppText accessibilityRole="header" style={styles.canvasTitle}>{finding.title}</AppText>
    <View style={{ marginTop: finding.blocks[0]?.type === 'table' ? 24 : 32 }}>
      <Content blocks={finding.blocks} onAction={onAction} />
    </View>
  </ScrollView>;
}

function Composer({ value, setValue, onSend, disabled, keyboardActive }: {
  value: string; setValue: (text: string) => void; onSend: () => void; disabled: boolean;
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
    <Pressable accessibilityRole="button" accessibilityLabel="Send message" accessibilityState={{ disabled: disabled || !value.trim() }} disabled={disabled || !value.trim()} onPress={onSend} hitSlop={4} style={({ pressed }) => [styles.send, (pressed || disabled) && { opacity: 0.4 }]}>
      <Icon name="send" />
    </Pressable>
  </View>;
}

export function HomeScreen({ isActive, ...menuActions }: MenuActions & { isActive: boolean }) {
  const { snapshot, loading, agents, completeTask, restoreTask, conversation, send, markCardSeen } = useAppData();
  const insets = useSafeAreaInsets();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [draft, setDraft] = useState('');
  const replyProgress = useRef(new WeakMap<Reply, number>()).current;
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [viewportHeight, setViewportHeight] = useState(0);
  const [fullHeight, setFullHeight] = useState(0);
  const blurTarget = useRef<React.ComponentRef<typeof View>>(null);
  const [chromeHeight, setChromeHeight] = useState(0);
  const [undoTaskItem, setUndoTaskItem] = useState<Task | null>(null);
  const undoProgress = useRef(new Animated.Value(0)).current;
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pager = useRef<FlatList<Finding>>(null);
  const scrollPositions = useRef(new Map<string, number>()).current;
  const canvasGesture = useRef(false);
  const homeActive = useRef(isActive);
  homeActive.current = isActive && AppState.currentState === 'active';
  const finding = snapshot.findings.find(item => item.id === selectedId) ?? snapshot.findings[0] ?? null;
  const activeId = finding?.id ?? null;
  const seenNavigationIcons = new Set<string>();
  const iconFor = (item: Finding): AgentIcon | undefined => item.navigationIcon ?? agents.find(agent => agent.id === item.agentId)?.icon;
  const activeIconKey = finding?.agentId ?? null;
  const navigationAgents = snapshot.findings.flatMap((item, index) => {
    const icon = iconFor(item);
    const key = item.agentId;
    if (seenNavigationIcons.has(key)) return [];
    seenNavigationIcons.add(key);
    return [{ finding: item, index, icon, key, agent: agents.find(candidate => candidate.id === item.agentId) }];
  });
  const state = conversation(null);
  const visibleTask = useTaskCard(snapshot.tasks, loading, isActive);
  const hasTasks = visibleTask !== null;
  const bottomPadding = Math.max(8, insets.bottom) + 8;
  const reclaimedHeight = Math.max(0, bottomTabHeight(insets.bottom) - bottomPadding);
  const taskHeight = hasTasks ? chromeHeight : 0;
  const chromeAvailableHeight = Math.max(48, canvasHeroHeight(canvasSize.height, insets.top) - insets.top - 8);

  useEffect(() => {
    // The first supplied finding becomes visible only when the current finding is absent.
    if (selectedId !== activeId) setSelectedId(activeId);
    if (!isActive) { canvasGesture.current = false; return; }
    if (canvasGesture.current) return;
    const index = snapshot.findings.findIndex(item => item.id === activeId);
    if (index >= 0 && canvasSize.width) pager.current?.scrollToOffset({ offset: index * canvasSize.width, animated: false });
  }, [snapshot.findings, activeId, selectedId, canvasSize.width, isActive]);

  useEffect(() => {
    const shown = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => setKeyboardOpen(true));
    const hidden = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setKeyboardOpen(false));
    return () => { shown.remove(); hidden.remove(); };
  }, []);

  const sendText = useCallback((text: string) => {
    if (!text.trim() || state.status === 'thinking') return;
    setDraft('');
    Keyboard.dismiss();
    void send(null, text);
  }, [send, state.status]);

  const completeWithUndo = useCallback((task: Task) => {
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
    void completeTask(task.id);
  }, [completeTask, undoProgress]);

  const undoCompletion = useCallback(() => {
    if (!undoTaskItem) return;
    if (undoTimer.current) clearTimeout(undoTimer.current);
    undoTimer.current = null;
    setUndoTaskItem(null);
    undoProgress.stopAnimation();
    undoProgress.setValue(0);
    void restoreTask(undoTaskItem);
  }, [restoreTask, undoProgress, undoTaskItem]);

  useEffect(() => () => { if (undoTimer.current) clearTimeout(undoTimer.current); }, []);

  const markSeenRef = useRef(markCardSeen);
  markSeenRef.current = markCardSeen;
  const [visibleCardId, setVisibleCardId] = useState<string | null>(null);
  useEffect(() => {
    const report = () => { if (isActive && AppState.currentState === 'active' && visibleCardId) void markCardSeen(visibleCardId).catch(() => {}); };
    report();
    const subscription = AppState.addEventListener('change', state => { homeActive.current = isActive && state === 'active'; if (state === 'active') report(); });
    return () => subscription.remove();
  }, [isActive, visibleCardId, markCardSeen]);
  const onVisible = useRef<NonNullable<FlatListProps<Finding>['onViewableItemsChanged']>>(({ viewableItems }) => {
    const visible = viewableItems[0]?.item as Finding | undefined;
    setVisibleCardId(visible?.id ?? null);
    if (homeActive.current && visible) {
      void markSeenRef.current(visible.id).catch(() => {});
      if (canvasGesture.current) setSelectedId(visible.id);
    }
  }).current;

  const keyboardVisible = keyboardOpen || (fullHeight > 0 && fullHeight - viewportHeight > 80);

  const taskList = visibleTask ? <View style={styles.tasks}>
    <AppText style={styles.taskLabel}>{visibleTask.kind === 'calendar' ? 'On your calendar' : 'Have you completed this'}</AppText>
    <TaskCard key={visibleTask.id} task={visibleTask} onComplete={() => completeWithUndo(visibleTask)} />
  </View> : null;

  return <View style={styles.screen} onLayout={({ nativeEvent: { layout: viewport } }) => {
    setViewportHeight(previous => previous === viewport.height ? previous : viewport.height);
    setFullHeight(previous => previous === 0 || viewport.height > previous ||
      (!keyboardOpen && !Keyboard.isVisible() && Math.abs(previous - viewport.height) < 80) ? viewport.height : previous);
  }}>
    <BlurTargetView ref={blurTarget} style={StyleSheet.absoluteFill}>
    <View style={[styles.canvasFrame, fullHeight > 0 ? { height: fullHeight } : { bottom: 0 }, { paddingBottom: bottomPadding }]}>

    <View style={styles.stage}>
      <LinearGradient pointerEvents="none" colors={['#000000', '#00000000']} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={styles.topFade} />
      <View style={styles.canvasViewport} onLayout={event => setCanvasSize(event.nativeEvent.layout)}>
        {canvasSize.width > 0 && snapshot.findings.length > 0 ? <FlatList ref={pager} horizontal pagingEnabled data={snapshot.findings} keyExtractor={item => item.id}
          showsHorizontalScrollIndicator={false} extraData={[taskHeight, canvasSize.height]} onViewableItemsChanged={onVisible}
          onScrollBeginDrag={() => { canvasGesture.current = true; }}
          onMomentumScrollEnd={({ nativeEvent }) => {
            canvasGesture.current = false;
            if (!isActive || !canvasSize.width) return;
            const page = snapshot.findings[Math.round(nativeEvent.contentOffset.x / canvasSize.width)];
            if (page) setSelectedId(page.id);
          }}
          viewabilityConfig={{ itemVisiblePercentThreshold: 60 }} keyboardShouldPersistTaps="handled"
          getItemLayout={(_, index) => ({ length: canvasSize.width, offset: index * canvasSize.width, index })}
          renderItem={({ item }) => <CanvasPage finding={{ ...item, image: cardImage(item.image, iconFor(item)) }} width={canvasSize.width} height={canvasSize.height} taskHeight={taskHeight} hasTasks={hasTasks} scrollPositions={scrollPositions} onAction={sendText} />}
        /> : <View style={styles.empty}>
          <View style={styles.welcomeCard} accessibilityLabel="Welcome card">
            <View style={styles.welcomeIcon}><Icon name="greeting" color="#b8cfff" /></View>
            <AppText accessibilityRole="header" style={styles.emptyTitle}>Hey, glad you’re here.</AppText>
            <AppText style={styles.emptyBody}>A little space for your day.
What’s on your mind?</AppText>
          </View>
        </View>}
        <LinearGradient pointerEvents="none" colors={['#0d0d0d00', '#0d0d0d']} style={styles.canvasFade} />
        {hasTasks && <View style={[styles.topChrome, { paddingTop: insets.top, paddingLeft: insets.left + layout.gutter, paddingRight: insets.right + layout.gutter }]}
          onLayout={({ nativeEvent: { layout: chrome } }) => setChromeHeight(previous => previous === chrome.height ? previous : chrome.height)}>
          <LinearGradient pointerEvents="none" colors={['#000000', '#000000', '#00000000']} locations={[0, 0.86, 1]} style={StyleSheet.absoluteFill} />
          <ScrollView style={{ maxHeight: chromeAvailableHeight, flexGrow: 0 }} nestedScrollEnabled keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {taskList}
          </ScrollView>
        </View>}
      </View>
      <View style={styles.findingNavigation}>

        {snapshot.findings.length > 1 && <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.findingIcons}>
          {navigationAgents.map(({ finding: item, index, agent, icon, key }, navigationIndex) => {
            const selected = activeIconKey === key;
            return <Pressable key={key} accessibilityRole="button" accessibilityLabel={`${item.navigationLabel ?? agent?.name ?? item.title}, ${navigationIndex + 1} of ${navigationAgents.length}`} accessibilityState={{ selected }}
              onPress={() => {
                if (selected) return;
                setSelectedId(item.id);
                pager.current?.scrollToOffset({ offset: index * canvasSize.width, animated: true });
              }} style={styles.findingButton}>
              {icon ? <Icon name={icon} color={selected ? '#ffffff' : '#666666'} /> : <View style={[styles.pageDot, { opacity: selected ? 1 : 0.35 }]} />}
            </Pressable>;
          })}
        </ScrollView>}
      </View>
    </View>

    <View style={[styles.conversation, { height: layout.conversationHeight + reclaimedHeight }]}>
      <View style={[styles.conversationBody, { height: 74 + reclaimedHeight }]}>
        {state.status === 'thinking' ? <TypingIndicator /> : state.reply ? <TypewriterReply key={`${activeId}-${state.reply.text}`} reply={state.reply} progress={replyProgress} onAction={sendText} />
          : !state.sent && finding ? <SuggestionButtons actions={finding.suggestions} onAction={sendText} /> : null}
      </View>
      <View style={{ height: layout.inputHeight }} />
    </View>
    </View>
    </BlurTargetView>
    {keyboardVisible && <Pressable accessibilityRole="button" accessibilityLabel="Dismiss keyboard"
      onPress={Keyboard.dismiss} style={styles.keyboardBackdrop}>
      <BlurView pointerEvents="none" blurTarget={blurTarget} blurMethod="dimezisBlurViewSdk31Plus" tint="dark" intensity={13.125} style={StyleSheet.absoluteFill} />
      <View pointerEvents="none" style={styles.keyboardShade} />
    </Pressable>}
    <View style={[styles.composerDock, { bottom: (keyboardVisible ? layout.keyboardGap : bottomPadding) + 3 }]}>
      <NavigationButton {...menuActions} keyboardActive={keyboardVisible} />
      <Composer value={draft} setValue={setDraft} onSend={() => sendText(draft)} disabled={state.status === 'thinking'} keyboardActive={keyboardVisible} />
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
        <Pressable accessibilityRole="button" accessibilityLabel="Undo task completion" onPress={undoCompletion} hitSlop={8}>
          <AppText style={styles.undoAction}>Undo</AppText>
        </Pressable>
      </View>
    </Animated.View>}
  </View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  canvasFrame: { position: 'absolute', top: 0, left: 0, right: 0 },
  stage: { flex: 1, minHeight: 0 },
  canvasViewport: { flex: 1, overflow: 'hidden' },
  canvasContent: { paddingHorizontal: layout.gutter, paddingTop: 10, paddingBottom: 28 },
  canvasTitle: { fontFamily: fonts.semibold, fontSize: 24, lineHeight: 26, color: colors.text, textAlign: 'center', marginRight: 7 },
  topFade: { position: 'absolute', top: 0, left: 0, right: 0, height: 252 },
  canvasFade: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 28 },
  topChrome: { position: 'absolute', top: 0, left: 0, right: 0, paddingBottom: 8 },
  tasks: { paddingTop: 8, paddingBottom: 8 },
  taskLabel: { fontSize: 12, lineHeight: 14, letterSpacing: 0.12, color: colors.muted, marginLeft: 2, marginBottom: 8 },
  welcomeCard: { width: '100%', maxWidth: 380, paddingVertical: 36, paddingHorizontal: 22, alignItems: 'center' },
  welcomeIcon: { marginBottom: 24, padding: 20, borderRadius: 40, backgroundColor: '#24334f' },
  empty: { flex: 1, paddingHorizontal: 42, justifyContent: 'center', alignItems: 'center' },
  emptyTitle: { fontFamily: fonts.semibold, fontSize: 24, lineHeight: 29, textAlign: 'center' },
  emptyBody: { fontSize: 14, lineHeight: 21, textAlign: 'center', color: colors.muted, marginTop: 12 },
  findingNavigation: { height: layout.findingNavigationHeight, alignItems: 'center', justifyContent: 'center' },
  findingIcons: { alignItems: 'center', justifyContent: 'center', flexGrow: 1 },
  findingButton: { minWidth: 32, height: 40, alignItems: 'center', justifyContent: 'center' },
  pageDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.text },
  conversation: { height: layout.conversationHeight, paddingHorizontal: layout.gutter, paddingTop: 12 },
  conversationBody: { height: 74, marginBottom: 10, overflow: 'hidden', justifyContent: 'flex-end' },
  suggestions: { flex: 1, justifyContent: 'center', overflow: 'hidden' },
  suggestionChips: { gap: 8, maxHeight: 74, overflow: 'hidden', flexShrink: 0, transform: [{ translateY: 25 }] },
  suggestionRow: { flexDirection: 'row', gap: 8 },
  suggestionCell: { flex: 1, minWidth: 0 },
  replyRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  replyScroll: { flex: 1, alignSelf: 'stretch', minWidth: 0 },
  reply: { flexGrow: 1, justifyContent: 'center', paddingBottom: 6, gap: 8 },
  replyBubble: { borderRadius: 16, paddingHorizontal: 4, paddingVertical: 4, gap: 8 },
  replyText: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 22, color: colors.body },
  replyHighlight: { fontFamily: fonts.bold, fontSize: 16, lineHeight: 22, color: '#ffffff' },
  replyActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  composer: { flex: 1, minWidth: 0, minHeight: layout.inputHeight, backgroundColor: colors.surface, borderRadius: 26, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', paddingLeft: 16, paddingRight: 7 },
  activeInputBorder: { ...StyleSheet.absoluteFill, borderRadius: 26, borderWidth: 1, borderColor: 'rgba(255,255,255,0.11)' },
  input: { fontFamily: fonts.interface, fontSize: 14, lineHeight: 22, color: colors.text, flex: 1, paddingVertical: 0, marginVertical: 12, paddingRight: 8, textAlignVertical: 'top', ...(Platform.OS === 'web' ? { outlineWidth: 0 } : {}) },
  send: { width: 40, height: 44, alignSelf: 'flex-end', marginBottom: 4, alignItems: 'center', justifyContent: 'center' },
  keyboardBackdrop: { ...StyleSheet.absoluteFill, zIndex: 30 },
  keyboardShade: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.6)' },
  composerDock: { position: 'absolute', left: layout.gutter, right: layout.gutter, minHeight: layout.inputHeight, flexDirection: 'row', alignItems: 'flex-end', gap: 10, zIndex: 31, shadowColor: '#000000', shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
  undoToastPosition: { position: 'absolute', left: 0, right: 0, alignItems: 'center', zIndex: 20 },
  undoToast: { minHeight: 44, borderRadius: 999, backgroundColor: '#292929', paddingLeft: 17, paddingRight: 8, flexDirection: 'row', alignItems: 'center', gap: 16, shadowColor: '#000000', shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 8 },
  undoLabel: { fontSize: 14, lineHeight: 18, color: '#f3f3f3' },
  undoAction: { fontFamily: fonts.semibold, fontSize: 14, lineHeight: 18, color: '#a9c4ff', paddingVertical: 10, paddingHorizontal: 10 },
});
