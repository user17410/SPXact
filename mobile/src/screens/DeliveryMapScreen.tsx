import React, { useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar, Dimensions, Animated, PanResponder } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Typography } from '../constants';

const { width, height } = Dimensions.get('window');

const SLIDER_TRACK_HEIGHT = 56;
const SLIDER_THUMB_SIZE = 46;
const SLIDER_PADDING = 5;
const SLIDER_TRACK_WIDTH = width - 40; // 20px padding each side from bottomSheet
const SLIDER_MAX_TRANSLATE = SLIDER_TRACK_WIDTH - SLIDER_THUMB_SIZE - SLIDER_PADDING * 2;
const SLIDE_THRESHOLD = 0.85; // Must slide 85% to trigger

interface Props {
  onArrive: () => void;
  buyerName: string;
  buyerAddress: string;
  distance: string;
  eta: string;
}

// Slide-to-confirm component
function SlideToConfirm({ onConfirm }: { onConfirm: () => void }) {
  const translateX = useRef(new Animated.Value(0)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const confirmed = useRef(false);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
        Animated.timing(shimmerAnim, { toValue: 0, duration: 0, useNativeDriver: true }),
        Animated.delay(1000),
      ])
    ).start();
  }, []);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          // @ts-ignore
          translateX.setOffset(translateX.__getValue());
          translateX.setValue(0);
        },
        onPanResponderMove: (_, gestureState) => {
          // @ts-ignore
          const currentOffset = translateX.__getValue() + (translateX._offset || 0);
          const newValue = gestureState.dx;
          // Clamp between 0 and max
          // @ts-ignore
          const total = (translateX._offset || 0) + newValue;
          if (total >= 0 && total <= SLIDER_MAX_TRANSLATE) {
            translateX.setValue(newValue);
          } else if (total < 0) {
            // @ts-ignore
            translateX.setValue(-(translateX._offset || 0));
          } else {
            // @ts-ignore
            translateX.setValue(SLIDER_MAX_TRANSLATE - (translateX._offset || 0));
          }
        },
        onPanResponderRelease: (_, gestureState) => {
          translateX.flattenOffset();
          // @ts-ignore
          const currentValue = translateX.__getValue();
          if (currentValue >= SLIDER_MAX_TRANSLATE * SLIDE_THRESHOLD && !confirmed.current) {
            confirmed.current = true;
            Animated.spring(translateX, {
              toValue: SLIDER_MAX_TRANSLATE,
              useNativeDriver: true,
              bounciness: 0,
            }).start(() => {
              onConfirm();
            });
          } else {
            // Snap back
            Animated.spring(translateX, {
              toValue: 0,
              useNativeDriver: true,
              friction: 6,
              tension: 80,
            }).start();
          }
        },
      }),
    []
  );

  // Text opacity fades as thumb slides
  const textOpacity = translateX.interpolate({
    inputRange: [0, SLIDER_MAX_TRANSLATE * 0.5],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  // Shimmer translateX for the hint arrows
  const shimmerTranslate = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 30],
  });

  const shimmerOpacity = shimmerAnim.interpolate({
    inputRange: [0, 0.3, 0.7, 1],
    outputRange: [0, 1, 1, 0],
  });

  return (
    <View style={sliderStyles.track}>
      {/* Track text */}
      <Animated.View style={[sliderStyles.textContainer, { opacity: textOpacity }]}>
        {/* Shimmer arrows hint */}
        <Animated.View
          style={[
            sliderStyles.shimmerContainer,
            {
              opacity: shimmerOpacity,
              transform: [{ translateX: shimmerTranslate }],
            },
          ]}
        >
          <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.6)" />
          <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.4)" style={{ marginLeft: -6 }} />
          <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.2)" style={{ marginLeft: -6 }} />
        </Animated.View>
        <Text style={sliderStyles.text}>Slide to confirm arrival</Text>
      </Animated.View>

      {/* Draggable thumb */}
      <Animated.View
        style={[
          sliderStyles.thumb,
          { transform: [{ translateX }] },
        ]}
        {...panResponder.panHandlers}
      >
        <Ionicons name="chevron-forward" size={22} color="#2E7D32" />
      </Animated.View>
    </View>
  );
}

const sliderStyles = StyleSheet.create({
  track: {
    height: SLIDER_TRACK_HEIGHT,
    borderRadius: 12,
    backgroundColor: '#2E7D32',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  textContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shimmerContainer: {
    flexDirection: 'row',
    position: 'absolute',
    left: SLIDER_THUMB_SIZE + 16,
  },
  text: {
    fontSize: 15,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.9)',
    letterSpacing: 0.3,
  },
  thumb: {
    width: SLIDER_THUMB_SIZE,
    height: SLIDER_THUMB_SIZE,
    borderRadius: SLIDER_THUMB_SIZE / 2,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: SLIDER_PADDING,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
});

export default function DeliveryMapScreen({ onArrive, buyerName, buyerAddress, distance, eta }: Props) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const riderBounce = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.6, duration: 1500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
      ])
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(riderBounce, { toValue: -3, duration: 600, useNativeDriver: true }),
        Animated.timing(riderBounce, { toValue: 3, duration: 600, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* Map Area - Realistic street simulation */}
      <View style={styles.mapArea}>
        {/* Base map color */}
        <View style={styles.mapBase} />

        {/* Major roads */}
        <View style={[styles.road, styles.roadH1]} />
        <View style={[styles.road, styles.roadH2]} />
        <View style={[styles.road, styles.roadH3]} />
        <View style={[styles.road, styles.roadV1]} />
        <View style={[styles.road, styles.roadV2]} />
        <View style={[styles.road, styles.roadV3]} />

        {/* Secondary streets */}
        <View style={[styles.streetH, { top: '25%' }]} />
        <View style={[styles.streetH, { top: '45%' }]} />
        <View style={[styles.streetH, { top: '65%' }]} />
        <View style={[styles.streetH, { top: '80%' }]} />
        <View style={[styles.streetV, { left: '15%' }]} />
        <View style={[styles.streetV, { left: '35%' }]} />
        <View style={[styles.streetV, { left: '55%' }]} />
        <View style={[styles.streetV, { left: '75%' }]} />
        <View style={[styles.streetV, { left: '90%' }]} />

        {/* Building blocks */}
        <View style={[styles.block, { top: '12%', left: '5%', width: 45, height: 35 }]} />
        <View style={[styles.block, { top: '12%', left: '18%', width: 55, height: 30 }]} />
        <View style={[styles.block, { top: '28%', left: '5%', width: 40, height: 50 }]} />
        <View style={[styles.block, { top: '28%', left: '38%', width: 60, height: 45 }]} />
        <View style={[styles.block, { top: '48%', left: '58%', width: 50, height: 40 }]} />
        <View style={[styles.block, { top: '68%', left: '20%', width: 55, height: 35 }]} />
        <View style={[styles.block, { top: '70%', left: '60%', width: 45, height: 40 }]} />
        <View style={[styles.block, { top: '15%', left: '60%', width: 50, height: 35 }]} />
        <View style={[styles.block, { top: '48%', left: '8%', width: 40, height: 45 }]} />

        {/* Active route (dashed blue like Grab) */}
        <View style={styles.routeContainer}>
          <View style={styles.routeSegment1} />
          <View style={styles.routeSegment2} />
          <View style={styles.routeSegment3} />
        </View>

        {/* Destination pin (red, Grab-style) */}
        <View style={styles.destinationContainer}>
          <Animated.View style={[styles.destPulse, { transform: [{ scale: pulseAnim }], opacity: Animated.subtract(1.6, pulseAnim) }]} />
          <View style={styles.destPin}>
            <View style={styles.destPinHead}>
              <Ionicons name="flag" size={14} color={Colors.white} />
            </View>
            <View style={styles.destPinStick} />
            <View style={styles.destPinShadow} />
          </View>
        </View>

        {/* Rider marker (green circle with bike, Grab-style) */}
        <Animated.View style={[styles.riderContainer, { transform: [{ translateY: riderBounce }] }]}>
          <View style={styles.riderShadow} />
          <View style={styles.riderMarker}>
            <MaterialCommunityIcons name="motorbike" size={18} color={Colors.white} />
          </View>
          <View style={styles.riderDirectionArrow} />
        </Animated.View>
      </View>

      {/* Top status bar - Grab/Lalamove style */}
      <View style={styles.topOverlay}>
        <TouchableOpacity style={styles.backButton}>
          <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.statusPill}>
          <View style={styles.liveDot} />
          <Text style={styles.statusText}>Rider is on the way</Text>
        </View>
        <TouchableOpacity style={styles.centerButton}>
          <Ionicons name="locate" size={20} color={Colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* ETA floating card - like Grab */}
      <View style={styles.etaFloat}>
        <MaterialCommunityIcons name="motorbike" size={20} color="#2E7D32" />
        <View style={styles.etaDivider} />
        <View>
          <Text style={styles.etaTime}>{eta}</Text>
          <Text style={styles.etaDistance}>{distance} away</Text>
        </View>
      </View>

      {/* Bottom sheet - Grab/Lalamove style */}
      <View style={styles.bottomSheet}>
        <View style={styles.sheetHandle} />

        {/* Order progress bar */}
        <View style={styles.progressBar}>
          <View style={styles.progressStep}>
            <View style={[styles.progressDot, styles.progressDotDone]} />
            <Text style={styles.progressLabelDone}>Picked Up</Text>
          </View>
          <View style={[styles.progressLine, styles.progressLineDone]} />
          <View style={styles.progressStep}>
            <View style={[styles.progressDot, styles.progressDotActive]} />
            <Text style={styles.progressLabelActive}>On the way</Text>
          </View>
          <View style={styles.progressLine} />
          <View style={styles.progressStep}>
            <View style={styles.progressDot} />
            <Text style={styles.progressLabel}>Delivered</Text>
          </View>
        </View>

        {/* Rider info card */}
        <View style={styles.riderCard}>
          <View style={styles.riderAvatar}>
            <Ionicons name="person" size={20} color={Colors.white} />
          </View>
          <View style={styles.riderInfo}>
            <Text style={styles.riderName}>Marco R.</Text>
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={12} color="#FFC107" />
              <Text style={styles.ratingText}>4.9</Text>
              <Text style={styles.vehicleText}>• Honda Click 150</Text>
            </View>
          </View>
          <View style={styles.contactButtons}>
            <TouchableOpacity style={styles.contactBtn}>
              <Ionicons name="chatbubble" size={18} color="#2E7D32" />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.contactBtn, styles.contactBtnCall]}>
              <Ionicons name="call" size={18} color={Colors.white} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Delivery destination */}
        <View style={styles.destCard}>
          <View style={styles.destIcon}>
            <Ionicons name="location" size={18} color={Colors.primary} />
          </View>
          <View style={styles.destInfo}>
            <Text style={styles.destLabel}>Deliver to</Text>
            <Text style={styles.destAddress}>{buyerAddress}</Text>
            <Text style={styles.destName}>{buyerName}</Text>
          </View>
        </View>

        {/* Slide to confirm */}
        <SlideToConfirm onConfirm={onArrive} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F4F0' },

  // Map
  mapArea: { flex: 1, position: 'relative' },
  mapBase: { ...StyleSheet.absoluteFillObject, backgroundColor: '#EDF2EE' },
  road: { position: 'absolute', backgroundColor: '#FFFFFF' },
  roadH1: { top: '20%', left: 0, right: 0, height: 12 },
  roadH2: { top: '50%', left: 0, right: 0, height: 14 },
  roadH3: { top: '75%', left: 0, right: 0, height: 10 },
  roadV1: { left: '30%', top: 0, bottom: 0, width: 12 },
  roadV2: { left: '60%', top: 0, bottom: 0, width: 14 },
  roadV3: { left: '85%', top: 0, bottom: 0, width: 10 },
  streetH: { position: 'absolute', left: 0, right: 0, height: 6, backgroundColor: '#FAFCFA' },
  streetV: { position: 'absolute', top: 0, bottom: 0, width: 6, backgroundColor: '#FAFCFA' },
  block: { position: 'absolute', backgroundColor: '#D7E3D8', borderRadius: 3 },

  // Route
  routeContainer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  routeSegment1: { position: 'absolute', top: '32%', left: '22%', width: width * 0.25, height: 4, backgroundColor: '#4285F4', borderRadius: 2 },
  routeSegment2: { position: 'absolute', top: '32%', left: '47%', width: 4, height: height * 0.2, backgroundColor: '#4285F4', borderRadius: 2 },
  routeSegment3: { position: 'absolute', top: '52%', left: '47%', width: width * 0.22, height: 4, backgroundColor: '#4285F4', borderRadius: 2 },

  // Destination
  destinationContainer: { position: 'absolute', top: '49%', right: '25%', alignItems: 'center' },
  destPulse: { position: 'absolute', width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(238,77,45,0.2)', top: 8 },
  destPin: { alignItems: 'center' },
  destPinHead: { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center', zIndex: 2 },
  destPinStick: { width: 3, height: 10, backgroundColor: Colors.primary, marginTop: -2 },
  destPinShadow: { width: 10, height: 4, borderRadius: 5, backgroundColor: 'rgba(0,0,0,0.2)', marginTop: 1 },

  // Rider
  riderContainer: { position: 'absolute', top: '29%', left: '20%', alignItems: 'center' },
  riderShadow: { position: 'absolute', bottom: -4, width: 24, height: 6, borderRadius: 6, backgroundColor: 'rgba(0,0,0,0.15)' },
  riderMarker: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#2E7D32', justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: Colors.white, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4 },
  riderDirectionArrow: { width: 0, height: 0, borderLeftWidth: 5, borderRightWidth: 5, borderBottomWidth: 8, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: '#2E7D32', position: 'absolute', top: -6, transform: [{ rotate: '45deg' }] },

  // Top overlay
  topOverlay: { position: 'absolute', top: 50, left: 16, right: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.white, justifyContent: 'center', alignItems: 'center', elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.15, shadowRadius: 3 },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.white, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.15, shadowRadius: 3 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#2E7D32' },
  statusText: { ...Typography.caption, fontWeight: '600', color: Colors.textPrimary },
  centerButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.white, justifyContent: 'center', alignItems: 'center', elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.15, shadowRadius: 3 },

  // ETA float
  etaFloat: { position: 'absolute', top: 100, left: 16, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.white, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.12, shadowRadius: 4 },
  etaDivider: { width: 1, height: 24, backgroundColor: Colors.border },
  etaTime: { fontSize: 16, fontWeight: '700', color: '#2E7D32' },
  etaDistance: { ...Typography.small, color: Colors.textSecondary },

  // Bottom sheet
  bottomSheet: { backgroundColor: Colors.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 34, elevation: 12, shadowColor: '#000', shadowOffset: { width: 0, height: -3 }, shadowOpacity: 0.1, shadowRadius: 10 },
  sheetHandle: { width: 36, height: 4, backgroundColor: Colors.gray300, borderRadius: 2, alignSelf: 'center', marginBottom: 14 },

  // Progress
  progressBar: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, paddingHorizontal: 4 },
  progressStep: { alignItems: 'center' },
  progressDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.gray300, marginBottom: 4 },
  progressDotDone: { backgroundColor: '#2E7D32' },
  progressDotActive: { backgroundColor: '#4285F4', width: 12, height: 12, borderRadius: 6 },
  progressLine: { flex: 1, height: 2, backgroundColor: Colors.gray200, marginHorizontal: 6, marginBottom: 14 },
  progressLineDone: { backgroundColor: '#2E7D32' },
  progressLabel: { ...Typography.small, color: Colors.textLight },
  progressLabelDone: { ...Typography.small, color: '#2E7D32', fontWeight: '600' },
  progressLabelActive: { ...Typography.small, color: '#4285F4', fontWeight: '600' },

  // Rider card
  riderCard: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  riderAvatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#2E7D32', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  riderInfo: { flex: 1 },
  riderName: { ...Typography.bodyBold, color: Colors.textPrimary },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  ratingText: { ...Typography.caption, color: Colors.textPrimary, fontWeight: '600' },
  vehicleText: { ...Typography.caption, color: Colors.textSecondary },
  contactButtons: { flexDirection: 'row', gap: 8 },
  contactBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#E8F5E9', justifyContent: 'center', alignItems: 'center' },
  contactBtnCall: { backgroundColor: '#2E7D32' },

  // Destination card
  destCard: { flexDirection: 'row', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border, marginBottom: 14 },
  destIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.primaryLight, justifyContent: 'center', alignItems: 'center', marginRight: 10, marginTop: 2 },
  destInfo: { flex: 1 },
  destLabel: { ...Typography.small, color: Colors.textLight, textTransform: 'uppercase', fontWeight: '600', letterSpacing: 0.5 },
  destAddress: { ...Typography.body, color: Colors.textPrimary, marginTop: 2 },
  destName: { ...Typography.caption, color: Colors.textSecondary, marginTop: 2 },

  // Arrive button (kept for reference, replaced by SlideToConfirm)
  arriveButton: { backgroundColor: '#2E7D32', borderRadius: 12, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  arriveText: { fontSize: 15, fontWeight: '700', color: Colors.white },
});
