import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Platform } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { COLORS } from '../../constants/theme';

interface Props {
    scrollY: Animated.Value;
    title: string;
    onBack: () => void;
}

const StickyHeader = ({ scrollY, title, onBack }: Props) => {
    // Animation Logic
    const opacity = scrollY.interpolate({
        inputRange: [150, 250],
        outputRange: [0, 1],
        extrapolate: 'clamp',
    });

    const translateY = scrollY.interpolate({
        inputRange: [150, 250],
        outputRange: [20, 0],
        extrapolate: 'clamp',
    });

    return (
        <View style={styles.container}>
            {/* Background Layer */}
            <Animated.View style={[styles.background, { opacity }]} />

            <View style={styles.content}>
                <TouchableOpacity onPress={onBack} style={styles.btn}>
                    <Icon name="arrow-left" size={24} color={COLORS.text} />
                </TouchableOpacity>

                <Animated.View style={[styles.titleContainer, { opacity, transform: [{ translateY }] }]}>
                    <Text style={styles.title} numberOfLines={1}>{title}</Text>
                </Animated.View>

                <TouchableOpacity style={styles.btn}>
                    <Icon name="more-horizontal" size={24} color={COLORS.text} />
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100, paddingTop: Platform.OS === 'android' ? 30 : 0 },
    background: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(16,16,16,0.95)', borderBottomWidth: 1, borderBottomColor: '#333' },
    content: { height: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
    titleContainer: { flex: 1, alignItems: 'center', marginHorizontal: 20 },
    title: { color: COLORS.text, fontWeight: 'bold', fontSize: 16 },
    btn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
});

export default StickyHeader;