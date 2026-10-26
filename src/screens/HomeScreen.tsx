import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, FlatList, Keyboard, Platform, Pressable, ScrollView, StyleSheet, TextInput, View, type FlatListProps } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppData } from '../data/AppData';
import type { AgentIcon, Finding, ImageReference } from '../data/types';
import { colors, fonts, layout } from '../theme';
import { keyboardComposerTop } from '../keyboardLayout';
import { ActionChip, AppText, TypingIndicator } from '../components/UI';
import { Icon } from '../components/Icons';
import { Content } from '../components/Content';
import { TaskCard } from '../components/TaskCard';
import { imageSource } from '../assets';

function Figure({ image, heroHeight, taskHeight }: { image: ImageReference; heroHeight: number; taskHeight: number }) {
  const dimensions = useRef(new Animated.Value(0)).current;
  const isFlight = image.asset === 'flight';
  const baseWidth = isFlight ? 181 : 276;
  const baseHeight = isFlight ? 173 : 207;
  const available = Math.max(64, heroHeight - taskHeight + 7);
  const targetHeight = Math.min(taskHeight ? baseHeight : baseHeight * 1.32, available);
  useEffect(() => {
    const animation = Animated.timing(dimensions, { toValue: targetHeight, duration: 240, useNativeDriver: false });
    animation.start();
    return () => animation.stop();
  }, [dimensions, targetHeight]);
  return <View style={{ height: heroHeight, alignItems: 'center', justifyContent: 'flex-end', transform: [{ translateX: -5 }] }}>
    <Animated.View style={{ width: Animated.multiply(dimensions, baseWidth / baseHeight), height: dimensions, overflow: 'hidden', marginBottom: -7 }}>
      <Animated.Image source={imageSource(image)} resizeMode={image.asset === 'mail' ? 'contain' : 'cover'} accessibilityLabel="Agent illustration" style={[
        StyleSheet.absoluteFill, { width: '100%', height: '100%' },
        isFlight && { width: '146.99%', height: '154.08%', left: '-23.5%', top: '-24.64%' },
      ]} />
    </Animated.View>
  </View>;
}

function CanvasPage({ finding, width, height, taskHeight, onAction }: { finding: Finding; width: number; height: number; taskHeight: number; onAction: (message: string) => void }) {
  const insets = useSafeAreaInsets();
  const heroHeight = Math.max(Math.max(insets.top, 27) + 100, height - 244);
  return <ScrollView style={{ width, height }} contentContainerStyle={styles.canvasContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" accessibilityLabel={finding.title}>
    <Figure image={finding.image} heroHeight={heroHeight} taskHeight={taskHeight} />
    <AppText accessibilityRole="header" style={styles.canvasTitle}>{finding.title}</AppText>
    <View style={{ marginTop: finding.blocks[0]?.type === 'table' ? 24 : 32 }}>
      <Content blocks={finding.blocks} onAction={onAction} />
    </View>
  </ScrollView>;
}

function Composer({ value, setValue, onSend, disabled }: {
  value: string; setValue: (text: string) => void; onSend: () => void; disabled: boolean;
}) {
  return <View style={styles.composer}>
    <TextInput accessibilityLabel="Ask anything" placeholder="Ask anything" placeholderTextColor="#555555" value={value} onChangeText={setValue}
      onSubmitEditing={onSend} returnKeyType="send" blurOnSubmit={false} style={styles.input} selectionColor={colors.blue} />
    <Pressable accessibilityRole="button" accessibilityLabel="Send message" accessibilityState={{ disabled: disabled || !value.trim() }} disabled={disabled || !value.trim()} onPress={onSend} hitSlop={4} style={({ pressed }) => [styles.send, (pressed || disabled) && { opacity: 0.4 }]}>
      <Icon name="send" />
    </Pressable>
  </View>;
}

export function HomeScreen() {
  const { snapshot, loading, agents, completeTask, conversation, send } = useAppData();
  const insets = useSafeAreaInsets();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [draft, setDraft] = useState('');
  const [keyboardTop, setKeyboardTop] = useState<number | null>(null);
  const [hostFrame, setHostFrame] = useState({ top: 0, height: 0 });
  const host = useRef<React.ComponentRef<typeof View>>(null);
  const measureHost = useCallback(() => {
    host.current?.measureInWindow((_, top, __, height) => {
      if (height > 0) setHostFrame(previous => previous.top === top && previous.height === height ? previous : { top, height });
    });
  }, []);
  const pager = useRef<FlatList<Finding>>(null);
  const finding = snapshot.findings.find(item => item.id === selectedId) ?? snapshot.findings[0] ?? null;
  const activeId = finding?.id ?? null;
  const seenNavigationIcons = new Set<string>();
  const iconFor = (item: Finding): AgentIcon | undefined => item.navigationIcon ?? agents.find(agent => agent.id === item.agentId)?.icon;
  const activeIconKey = finding ? iconFor(finding) ?? finding.agentId : null;
  const navigationAgents = snapshot.findings.flatMap((item, index) => {
    const icon = iconFor(item);
    const key = icon ?? item.agentId;
    if (seenNavigationIcons.has(key)) return [];
    seenNavigationIcons.add(key);
    return [{ finding: item, index, icon, key, agent: agents.find(candidate => candidate.id === item.agentId) }];
  });
  const state = conversation(activeId);
  const taskTop = Math.max(insets.top, 27) + 18;
  const taskScrollHeight = Math.min(snapshot.tasks.length, 2) * 53 - 8;
  const taskHeight = snapshot.tasks.length ? taskTop + 14 + 8 + taskScrollHeight + 16 : 0;

  useEffect(() => {
    // The first supplied finding becomes visible only when the current finding is absent.
    if (selectedId !== activeId) setSelectedId(activeId);
    const index = snapshot.findings.findIndex(item => item.id === activeId);
    if (index >= 0 && canvasSize.width) pager.current?.scrollToOffset({ offset: index * canvasSize.width, animated: false });
  }, [snapshot.findings, activeId, selectedId, canvasSize.width]);

  useEffect(() => {
    const update = (event: import('react-native').KeyboardEvent) => {
      if (Platform.OS === 'ios') Keyboard.scheduleLayoutAnimation(event);
      setKeyboardTop(event.endCoordinates.screenY);
      measureHost();
    };
    const shown = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', update);
    const changed = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillChangeFrame' : 'keyboardDidChangeFrame', update);
    const hidden = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', event => {
      if (Platform.OS === 'ios') Keyboard.scheduleLayoutAnimation(event);
      setKeyboardTop(null);
    });
    return () => { shown.remove(); changed.remove(); hidden.remove(); };
  }, [measureHost]);

  const sendText = useCallback((text: string) => {
    if (!text.trim() || state.status === 'thinking') return;
    setDraft('');
    Keyboard.dismiss();
    void send(activeId, text);
  }, [activeId, send, state.status]);

  const onVisible = useRef<NonNullable<FlatListProps<Finding>['onViewableItemsChanged']>>(({ viewableItems }) => {
    if (viewableItems[0]?.item) setSelectedId(viewableItems[0].item.id);
  }).current;

  const dockTop = keyboardTop !== null && hostFrame.height > 0 ? keyboardComposerTop({
    keyboardTop, hostTop: hostFrame.top, hostHeight: hostFrame.height,
    composerHeight: layout.inputHeight, gap: layout.keyboardGap,
  }) : null;

  return <View ref={host} collapsable={false} style={styles.screen} onLayout={measureHost}>
    <View style={styles.stage}>
      <LinearGradient pointerEvents="none" colors={['#000000', '#00000000']} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={styles.topFade} />
      <View style={styles.canvasViewport} onLayout={event => setCanvasSize(event.nativeEvent.layout)}>
        {canvasSize.width > 0 && snapshot.findings.length > 0 ? <FlatList ref={pager} horizontal pagingEnabled data={snapshot.findings} keyExtractor={item => item.id}
          showsHorizontalScrollIndicator={false} extraData={[taskHeight, canvasSize.height]} onViewableItemsChanged={onVisible}
          viewabilityConfig={{ itemVisiblePercentThreshold: 60 }} keyboardShouldPersistTaps="handled"
          getItemLayout={(_, index) => ({ length: canvasSize.width, offset: index * canvasSize.width, index })}
          renderItem={({ item }) => <CanvasPage finding={item} width={canvasSize.width} height={canvasSize.height} taskHeight={taskHeight} onAction={text => { void send(item.id, text); }} />}
        /> : <View style={styles.empty}>
          <AppText style={styles.emptyTitle}>{loading ? 'Gathering your updates…' : 'You’re all caught up'}</AppText>
          {!loading && <AppText style={styles.emptyBody}>Your agents’ findings will appear here when there’s something to share.</AppText>}
        </View>}
        <LinearGradient pointerEvents="none" colors={['#0d0d0d00', '#0d0d0d']} style={styles.canvasFade} />
        {snapshot.tasks.length > 0 && <View style={[styles.tasks, { paddingTop: taskTop }]}>
          <LinearGradient pointerEvents="none" colors={['#000000', '#000000', '#00000000']} locations={[0, 0.86, 1]} style={StyleSheet.absoluteFill} />
          <AppText style={styles.taskLabel}>Have you completed this</AppText>
          <ScrollView style={{ maxHeight: taskScrollHeight }} showsVerticalScrollIndicator={false} contentContainerStyle={styles.taskList}>
            {snapshot.tasks.map(task => <TaskCard key={task.id} task={task} onComplete={completeTask} />)}
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

    <View style={styles.conversation}>
      <View style={styles.conversationBody}>
        {state.status === 'thinking' ? <TypingIndicator /> : state.reply ? <ScrollView key={`${activeId}-${state.reply.text}`} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.reply} accessibilityLiveRegion="polite">
          <AppText style={styles.replyText}>{state.reply.text}</AppText>
          {state.reply.actions && <View style={styles.replyActions}>{state.reply.actions.map(action => <ActionChip key={action.id} action={action} onPress={sendText} />)}</View>}
        </ScrollView> : !state.sent && finding ? <View style={styles.suggestions}><View style={styles.suggestionChips}>{finding.suggestions.map(action => <ActionChip key={action.id} action={action} onPress={sendText} />)}</View></View> : null}
      </View>
      <View style={{ height: layout.inputHeight }} />
    </View>
    <View style={[styles.composerDock, dockTop === null ? { bottom: 0 } : { top: dockTop }]}>
      <Composer value={draft} setValue={setDraft} onSend={() => sendText(draft)} disabled={state.status === 'thinking'} />
    </View>
  </View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  stage: { flex: 1, minHeight: 0 },
  canvasViewport: { flex: 1, overflow: 'hidden' },
  canvasContent: { paddingHorizontal: layout.gutter, paddingBottom: 28 },
  canvasTitle: { fontFamily: fonts.semibold, fontSize: 24, lineHeight: 26, color: colors.text, textAlign: 'center', marginRight: 7 },
  topFade: { position: 'absolute', top: 0, left: 0, right: 0, height: 252 },
  canvasFade: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 28 },
  tasks: { position: 'absolute', top: 0, left: 0, right: 0, paddingLeft: 32, paddingRight: 30, paddingBottom: 16 },
  taskLabel: { fontSize: 12, lineHeight: 14, letterSpacing: 0.12, color: colors.muted, marginLeft: 2, marginBottom: 8 },
  taskList: { gap: 8 },
  empty: { flex: 1, paddingHorizontal: 42, justifyContent: 'center', alignItems: 'center' },
  emptyTitle: { fontFamily: fonts.semibold, fontSize: 24, lineHeight: 29, textAlign: 'center' },
  emptyBody: { fontSize: 14, lineHeight: 21, textAlign: 'center', color: colors.muted, marginTop: 12 },
  findingNavigation: { height: layout.findingNavigationHeight, alignItems: 'center', justifyContent: 'center' },
  findingIcons: { alignItems: 'center', justifyContent: 'center', flexGrow: 1 },
  findingButton: { minWidth: 32, height: 40, alignItems: 'center', justifyContent: 'center' },
  pageDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.text },
  conversation: { height: layout.conversationHeight, paddingHorizontal: layout.gutter, paddingTop: 12 },
  conversationBody: { height: 74, marginBottom: 10, overflow: 'hidden' },
  suggestions: { flex: 1, justifyContent: 'flex-end', overflow: 'hidden' },
  suggestionChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, maxHeight: 74, overflow: 'hidden', alignContent: 'flex-start', flexShrink: 0 },
  reply: { paddingBottom: 6, gap: 8 },
  replyText: { fontSize: 14, lineHeight: 19, color: colors.body },
  replyActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  composer: { height: layout.inputHeight, backgroundColor: colors.surface, borderRadius: 26, flexDirection: 'row', alignItems: 'center', paddingLeft: 16, paddingRight: 7 },
  input: { fontFamily: fonts.interface, fontSize: 14, lineHeight: 18, color: colors.text, flex: 1, height: 52, paddingVertical: 0, paddingRight: 8, ...(Platform.OS === 'web' ? { outlineWidth: 0 } : {}) },
  send: { width: 40, height: 44, alignItems: 'center', justifyContent: 'center' },
  composerDock: { position: 'absolute', left: layout.gutter, right: layout.gutter },
});
