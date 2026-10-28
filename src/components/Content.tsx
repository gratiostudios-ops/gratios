import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { colors, fonts } from '../theme';
import type { ContentBlock, TableText } from '../data/types';
import { ActionChip, AppText } from './UI';
import { RichText } from './RichText';

function TableValue({ value }: { value: TableText }) {
  if (typeof value === 'string') return <RichText text={value} style={styles.tableText} />;
  return <>{value.map((span, index) => <RichText key={index} text={span.text} style={[
    styles.tableText,
    span.tone === 'muted' && { color: colors.muted },
    span.tone === 'highlight' && { fontFamily: fonts.bold, color: colors.highlight },
  ]} />)}</>;
}

function Table({ block }: { block: Extract<ContentBlock, { type: 'table' }> }) {
  const [expanded, setExpanded] = useState(false);
  const visibleRows = expanded || !block.previewRows ? block.rows : block.rows.slice(0, block.previewRows);
  const canExpand = block.previewRows !== undefined && block.rows.length > block.previewRows;
  return <View style={styles.table}>
    <RichText style={styles.tableTitle} text={block.title} />
    {block.subtitle ? <RichText style={styles.subtitle} text={block.subtitle} /> : null}
    <ScrollView horizontal={block.columns.length > 2} scrollEnabled={block.columns.length > 2} showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }}>
      <View style={{ flex: 1, minWidth: block.columns.length > 2 ? block.columns.length * 130 : undefined }}>
        {block.columns.some(column => column.label) && <View style={styles.tableRow}>
          {block.columns.map(column => <AppText key={column.id} style={[styles.cell, styles.columnLabel, { textAlign: column.align ?? 'left' }]}>{column.label}</AppText>)}
        </View>}
        {visibleRows.map(row => <View key={row.id} style={styles.tableRow}>
          {block.columns.map((column, index) => <AppText key={column.id} style={[styles.cell, { textAlign: column.align ?? 'left' }]}><TableValue value={row.cells[index] ?? ''} /></AppText>)}
        </View>)}
      </View>
    </ScrollView>
    {canExpand && <Pressable accessibilityRole="button" accessibilityLabel={expanded ? 'Show fewer rows' : 'Show more rows'} accessibilityState={{ expanded }} hitSlop={8} onPress={() => setExpanded(previous => !previous)} style={styles.showMore}>
      <AppText style={styles.showMoreText}>{expanded ? 'Show Less −' : 'Show More +'}</AppText>
    </Pressable>}
  </View>;
}

export function Content({ blocks, onAction }: { blocks: ContentBlock[]; onAction: (message: string) => void }) {
  return <View style={styles.blocks}>{blocks.map(block => {
    switch (block.type) {
      case 'heading': return <RichText key={block.id} style={styles.heading} text={block.text} />;
      case 'paragraph': return <RichText key={block.id} style={styles.paragraph} text={block.text} />;
      case 'table': return <Table key={block.id} block={block} />;
      case 'numbered-list': return <View key={block.id} style={styles.numberedList}>
        {block.items.map((item, index) => <View key={item.id} style={[styles.numberedRow, index === 0 && { minHeight: 48 }]}>
          <AppText style={styles.number}>{index + 1}</AppText>
          <View style={[styles.numberedBody, index === 0 && { minHeight: 48, paddingTop: 0, paddingBottom: 13 }]}><RichText style={styles.listText} text={item.text} /></View>
        </View>)}
      </View>;
      case 'actions': return <View key={block.id} style={styles.actions}>{block.actions.map(action => <ActionChip key={action.id} action={action} onPress={onAction} />)}</View>;
    }
  })}</View>;
}

const styles = StyleSheet.create({
  blocks: { gap: 16 },
  heading: { fontFamily: fonts.semibold, fontSize: 18, lineHeight: 22, marginHorizontal: 4 },
  paragraph: { color: colors.body, fontSize: 16, lineHeight: 21, marginHorizontal: 4, marginTop: -12 },
  numberedList: { paddingRight: 29 },
  numberedRow: { flexDirection: 'row', alignItems: 'center', minHeight: 55 },
  number: { fontFamily: fonts.regular, color: colors.faint, fontSize: 16, lineHeight: 21, textAlign: 'center', width: 30, marginRight: 1 },
  numberedBody: { flex: 1, paddingLeft: 14, paddingVertical: 9, minHeight: 55, justifyContent: 'center', borderBottomWidth: 1, borderBottomColor: colors.divider },
  listText: { color: colors.body, fontSize: 16, lineHeight: 21 },
  table: { backgroundColor: colors.surface, borderRadius: 13, paddingHorizontal: 24, paddingTop: 24, paddingBottom: 8 },
  tableTitle: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 19 },
  subtitle: { fontSize: 12, lineHeight: 14, color: colors.secondary, marginTop: 5, marginBottom: 12 },
  tableRow: { flexDirection: 'row', borderBottomColor: colors.tableDivider, borderBottomWidth: 1, paddingVertical: 8, gap: 12, minHeight: 33 },
  tableText: { fontSize: 14, lineHeight: 17, color: '#d8d8d8' },
  cell: { flex: 1, fontSize: 14, lineHeight: 17, color: '#d8d8d8' },
  columnLabel: { fontFamily: fonts.semibold, color: colors.secondary, fontSize: 12 },
  showMore: { paddingTop: 11, paddingBottom: 1, alignItems: 'center', minHeight: 26 },
  showMoreText: { fontFamily: fonts.bold, fontSize: 12, lineHeight: 14, color: colors.blue },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
