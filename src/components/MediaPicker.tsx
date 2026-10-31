import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Modal, PanResponder, Platform, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { gateway } from '../auth/Auth';
import type { MarketplaceCover } from '../data/marketplace';
import { clampCropOffset, MAX_UPLOAD_BYTES, resizedSquare, squareCrop, type SquareCrop } from '../data/image-crop';
import { AppText } from './UI';
import { MarketButton, MarketError, ui } from './MarketplaceUI';
import { FixedContact } from './ContactLink';

type PickedImage = { uri: string; width: number; height: number };
// Expo's picker supports native square editing; web uses the same square framing below.
// https://docs.expo.dev/versions/latest/sdk/imagepicker/
// https://docs.expo.dev/versions/latest/sdk/imagemanipulator/
async function optimizeAndUpload(asset: PickedImage, kind: 'icon' | 'cover', crop: SquareCrop, signal: AbortSignal): Promise<MarketplaceCover> {
  const context = ImageManipulator.manipulate(asset.uri);
  context.crop(crop);
  const size = resizedSquare(crop.width, kind);
  context.resize({ width: size, height: size });
  const image = await context.renderAsync();
  const format = kind === 'icon' ? SaveFormat.PNG : SaveFormat.JPEG;
  let bytes: Uint8Array | undefined;
  for (const quality of kind === 'icon' ? [1] : [0.8, 0.68, 0.55]) {
    if (signal.aborted) throw new Error('Upload cancelled.');
    const result = await image.saveAsync({ format, compress: quality, base64: true });
    if (!result.base64) throw new Error('Could not prepare the image.');
    bytes = Uint8Array.from(atob(result.base64), character => character.charCodeAt(0));
    if (bytes.byteLength <= MAX_UPLOAD_BYTES) break;
  }
  if (!bytes || bytes.byteLength > MAX_UPLOAD_BYTES) throw new Error('Choose a simpler image. The optimized file must be under 512 KiB.');
  if (signal.aborted) throw new Error('Upload cancelled.');
  const mimeType = kind === 'icon' ? 'image/png' : 'image/jpeg';
  const upload = await gateway.request<{ id: string; uploadUrl: string; method: 'PUT' }>('/gateway/media/uploads', { method: 'POST', body: JSON.stringify({ kind, mimeType }), signal });
  const response = await fetch(upload.uploadUrl, { method: upload.method, headers: { 'Content-Type': mimeType }, body: bytes.buffer as ArrayBuffer, signal });
  if (!response.ok) throw new Error('Could not upload the image. Please retry.');
  return gateway.request<MarketplaceCover>('/gateway/media/' + encodeURIComponent(upload.id) + '/finalize', { method: 'POST', body: '{}', signal });
}

function SquareCropEditor({ asset, busy, error, onCancel, onUse }: { asset: PickedImage; busy: boolean; error: string; onCancel(): void; onUse(crop: SquareCrop): void }) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const side = Math.max(120, Math.min(width - 48, height - insets.top - insets.bottom - 250, 360));
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const origin = useRef(offset); const latest = useRef({ zoom, offset, busy, side }); latest.current = { zoom, offset, busy, side };
  const responder = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: () => !latest.current.busy,
    onPanResponderGrant: () => { origin.current = latest.current.offset; },
    onPanResponderMove: (_, gesture) => setOffset(clampCropOffset(asset.width, asset.height, latest.current.side, latest.current.zoom, origin.current.x + gesture.dx, origin.current.y + gesture.dy)),
  })).current;
  const scale = Math.max(side / asset.width, side / asset.height) * zoom;
  const changeZoom = (delta: number) => { const value = Math.max(1, Math.min(3, zoom + delta)); setZoom(value); setOffset(clampCropOffset(asset.width, asset.height, side, value, offset.x, offset.y)); };
  return <Modal transparent={false} animationType="fade" onRequestClose={() => { if (!busy) onCancel(); }}>
    <View style={[styles.editorScreen, { paddingTop: insets.top + 48, paddingBottom: Math.max(24, insets.bottom) }]}>
      <ScrollView contentContainerStyle={styles.editorContent} keyboardShouldPersistTaps="handled">
        <AppText accessibilityRole="header" style={ui.modalTitle}>Crop to square</AppText>
        <AppText style={ui.body}>Drag to position your image. Use + and − to zoom.</AppText>
        <View {...responder.panHandlers} style={[styles.cropWindow, { width: side, height: side }]}>
          <Image source={{ uri: asset.uri }} resizeMode="stretch" style={{ position: 'absolute', width: asset.width * scale, height: asset.height * scale, left: (side - asset.width * scale) / 2 + offset.x, top: (side - asset.height * scale) / 2 + offset.y }} />
        </View>
        <View style={styles.zoomRow}><MarketButton label="−" secondary disabled={busy || zoom <= 1} onPress={() => changeZoom(-0.25)} /><AppText style={ui.body}>{Math.round(zoom * 100)}%</AppText><MarketButton label="+" secondary disabled={busy || zoom >= 3} onPress={() => changeZoom(0.25)} /></View>
        <MarketError text={error} />
        <MarketButton label="Use image" busy={busy} onPress={() => onUse(squareCrop(asset.width, asset.height, side, zoom, offset.x, offset.y))} />
        <MarketButton label="Cancel" secondary disabled={busy} onPress={onCancel} />
      </ScrollView>
      <FixedContact />
    </View>
  </Modal>;
}

export function MediaPicker({ kind, value, onChange, disabled = false, onBusyChange }: { kind: 'icon' | 'cover'; value?: MarketplaceCover | null; onChange(value: MarketplaceCover): void; disabled?: boolean; onBusyChange?(busy: boolean): void }) {
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [webAsset, setWebAsset] = useState<PickedImage | null>(null);
  const mounted = useRef(true), operation = useRef<AbortController | null>(null);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; operation.current?.abort(); }; }, []);
  const upload = async (asset: PickedImage, crop: SquareCrop) => {
    const controller = new AbortController(); operation.current = controller;
    setBusy(true); setError(''); onBusyChange?.(true);
    let uploaded = false;
    try { const result = await optimizeAndUpload(asset, kind, crop, controller.signal); if (mounted.current) { onChange(result); setWebAsset(null); uploaded = true; } }
    catch (failure) { if (mounted.current) setError(failure instanceof Error ? failure.message : 'Could not prepare image.'); }
    finally { if (mounted.current) { setBusy(false); onBusyChange?.(Platform.OS === 'web' && !uploaded); } }
  };
  const choose = async () => {
    if (busy || disabled) return;
    setError(''); setBusy(true); onBusyChange?.(true);
    let editingOnWeb = false;
    try {
      if (Platform.OS !== 'web') { const permission = await ImagePicker.requestMediaLibraryPermissionsAsync(); if (!permission.granted) throw new Error('Allow photo access to choose an image.'); }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: Platform.OS !== 'web', aspect: [1, 1], quality: 1 });
      if (result.canceled || !mounted.current) return;
      const asset = result.assets[0];
      if (!asset.width || !asset.height) throw new Error('Could not read image dimensions.');
      if (Platform.OS === 'web') { setWebAsset(asset); editingOnWeb = true; } else await upload(asset, squareCrop(asset.width, asset.height, 256, 1, 0, 0));
    } catch (failure) { if (mounted.current) setError(failure instanceof Error ? failure.message : 'Could not choose image.'); }
    finally { if (mounted.current) { setBusy(false); onBusyChange?.(editingOnWeb); } }
  };
  return <View style={{ gap: 10 }}>
    {value?.uri && <Image source={{ uri: value.uri }} resizeMode="cover" style={{ width: kind === 'cover' ? 140 : 64, aspectRatio: 1, borderRadius: 12 }} />}
    <MarketButton label={value ? 'Replace uploaded image' : kind === 'cover' ? 'Upload square cover' : 'Upload icon'} secondary disabled={disabled || busy} onPress={() => { void choose(); }} />
    {busy && <ActivityIndicator color="#558dff" />}
    {!webAsset && <MarketError text={error} />}
    {webAsset && <SquareCropEditor asset={webAsset} busy={busy} error={error} onCancel={() => { setWebAsset(null); setError(''); onBusyChange?.(false); }} onUse={crop => { void upload(webAsset, crop); }} />}
  </View>;
}
const styles = StyleSheet.create({
  editorScreen: { flex: 1, backgroundColor: '#0d0d0d' }, editorContent: { paddingHorizontal: 24, gap: 16, paddingBottom: 24 },
  cropWindow: { overflow: 'hidden', alignSelf: 'center', backgroundColor: '#242424', borderWidth: 1, borderColor: '#777' },
  zoomRow: { flexDirection: 'row', gap: 20, alignItems: 'center', justifyContent: 'center' },
});
