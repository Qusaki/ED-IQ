import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, SafeAreaView, ImageBackground } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Logo from '../assets/img/ED-IQ_LOGO.png';

const campusBackground = require('../assets/background/prmsu-logo.png');

export default function SelectionScreen({ onSelectRole }) {
    return (
        <ImageBackground source={campusBackground} style={styles.backgroundImage} resizeMode="contain">
            <View style={styles.backgroundOverlay} />
            <SafeAreaView style={styles.container}>
                <View style={styles.content}>
                    <View style={styles.header}>
                        <View style={styles.logoContainer}>
                            <Image
                                source={Logo}
                                style={styles.logoImage}
                                resizeMode="contain"
                            />
                            <Text style={styles.brandText}>ED-IQ</Text>
                        </View>
                        <Text style={styles.welcomeText}>Welcome! Please select your role to continue.</Text>
                    </View>

                    <View style={styles.buttonContainer}>
                        <TouchableOpacity
                            style={[styles.button, styles.studentButton]}
                            onPress={() => onSelectRole('student')}
                            activeOpacity={0.8}
                        >
                            <View style={styles.buttonInner}>
                                <Ionicons name="school" size={24} color="#ffffff" style={styles.buttonIcon} />
                                <Text style={styles.buttonText}>STUDENT</Text>
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.button, styles.teacherButton]}
                            onPress={() => onSelectRole('teacher')}
                            activeOpacity={0.8}
                        >
                            <View style={styles.buttonInner}>
                                <Ionicons name="briefcase" size={24} color="#ffffff" style={styles.buttonIcon} />
                                <Text style={styles.buttonText}>TEACHER</Text>
                            </View>
                        </TouchableOpacity>
                    </View>
                </View>
            </SafeAreaView>
        </ImageBackground>
    );
}

const styles = StyleSheet.create({
    backgroundImage: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
    backgroundOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
    },
    container: {
        flex: 1,
    },
    content: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 20,
        paddingBottom: 80, // Added padding to bottom to push centered content higher
    },
    header: {
        alignItems: 'center',
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: 20,
    },
    logoImage: {
        width: 100,
        height: 100,
        marginBottom: 10,
    },
    brandText: {
        fontSize: 36,
        fontWeight: 'bold',
        color: '#2ecc71',
        letterSpacing: 2,
    },
    welcomeText: {
        fontSize: 16,
        color: '#6c757d',
        textAlign: 'center',
        marginTop: 10,
        fontWeight: '500',
    },
    buttonContainer: {
        width: '100%',
        paddingHorizontal: 10,
        gap: 20,
        marginTop: 60, // Increased margin to create more space from welcome text
    },
    button: {
        width: '100%',
        height: 70,
        borderRadius: 16,
        justifyContent: 'center',
        elevation: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.27,
        shadowRadius: 4.65,
    },
    buttonInner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonIcon: {
        marginRight: 12,
    },
    studentButton: {
        backgroundColor: '#FF7700',
    },
    teacherButton: {
        backgroundColor: '#070975',
    },
    buttonText: {
        color: '#ffffff',
        fontSize: 18,
        fontWeight: 'bold',
        letterSpacing: 1.5,
    },
});
