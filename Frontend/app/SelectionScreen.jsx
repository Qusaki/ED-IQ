import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, SafeAreaView } from 'react-native';
import Logo from '../assets/img/ED-IQ_LOGO.png';

export default function SelectionScreen({ onSelectRole }) {
    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                <View style={styles.logoContainer}>
                    <Image
                        source={Logo}
                        style={styles.logoImage}
                        resizeMode="contain"
                    />
                    <Text style={styles.brandText}>ED-IQ</Text>
                </View>

                <View style={styles.buttonContainer}>
                    <TouchableOpacity
                        style={[styles.button, styles.studentButton]}
                        onPress={() => onSelectRole('student')}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.buttonText}>STUDENT</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.button, styles.teacherButton]}
                        onPress={() => onSelectRole('teacher')}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.buttonText}>TEACHER</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#ffffff',
    },
    content: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: 60,
    },
    logoImage: {
        width: 120,
        height: 120,
        marginBottom: 15,
    },
    brandText: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#2c3e50',
        letterSpacing: 1,
    },
    buttonContainer: {
        width: '100%',
        paddingHorizontal: 20,
        gap: 20,
    },
    button: {
        width: '100%',
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
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
        letterSpacing: 1,
    },
});
